'use client';

import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';

export default function TestDailyTicPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [distributionResult, setDistributionResult] = useState<any>(null);
  const [distributionStatus, setDistributionStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');

  const handleTriggerDistribution = async () => {
    setIsLoading(true);
    setError(null);
    setDistributionResult(null);

    try {
      const response = await fetch('/api/admin/distribute-daily-tic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setDistributionResult(data);
      toast({
        title: 'Distribution Completed!',
        description: `Distributed to ${data.distributed} users, ${data.skipped} skipped, ${data.errors} errors`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Distribution Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/distribute-daily-tic', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setDistributionStatus(data);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh">
      <VStack spacing={6} align="stretch" maxW="6xl" mx="auto">
        <Heading as="h1" size="xl" color={textColor} textAlign="center">
          Daily TIC Distribution Test
        </Heading>

        <Text textAlign="center" color="gray.500">
          Test the daily TIC token distribution system for active plan subscribers
        </Text>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            colorScheme="blue"
            onClick={handleTriggerDistribution}
            isLoading={isLoading}
            loadingText="Distributing..."
            size="lg"
          >
            Trigger Daily Distribution
          </Button>
          <Button
            colorScheme="green"
            variant="outline"
            onClick={handleCheckStatus}
            isLoading={isLoading}
            loadingText="Checking..."
            size="lg"
          >
            Check Status
          </Button>
        </HStack>

        {/* Error Display */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Distribution Status */}
        {distributionStatus && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md" color={textColor}>
                  Today's Distribution Status
                </Heading>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Stat textAlign="center">
                    <StatLabel>Date</StatLabel>
                    <StatNumber fontSize="lg">{distributionStatus.date}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Active Subscriptions</StatLabel>
                    <StatNumber color="blue.500">{distributionStatus.total_active_subscriptions}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Distributed</StatLabel>
                    <StatNumber color="green.500">{distributionStatus.total_distributed}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Pending</StatLabel>
                    <StatNumber color="orange.500">{distributionStatus.pending}</StatNumber>
                  </Stat>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Distribution Result */}
        {distributionResult && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md" color={textColor}>
                  Distribution Results
                </Heading>
                
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Stat textAlign="center">
                    <StatLabel>Total Subscriptions</StatLabel>
                    <StatNumber>{distributionResult.total_subscriptions}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Distributed</StatLabel>
                    <StatNumber color="green.500">{distributionResult.distributed}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Skipped</StatLabel>
                    <StatNumber color="orange.500">{distributionResult.skipped}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Errors</StatLabel>
                    <StatNumber color="red.500">{distributionResult.errors}</StatNumber>
                  </Stat>
                </SimpleGrid>

                {/* Individual Results */}
                {distributionResult.results && distributionResult.results.length > 0 && (
                  <VStack spacing={3} align="stretch">
                    <Text fontWeight="semibold" color={textColor}>Individual Results:</Text>
                    {distributionResult.results.map((result: any, index: number) => (
                      <HStack key={index} justify="space-between" p={3} bg={useColorModeValue('gray.50', 'gray.600')} borderRadius="md">
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">{result.user_email}</Text>
                          <Text fontSize="xs" color="gray.500">{result.plan_name || result.plan_id}</Text>
                        </VStack>
                        <VStack align="end" spacing={0}>
                          <Badge colorScheme={result.status === 'success' ? 'green' : result.status === 'error' ? 'red' : 'orange'}>
                            {result.status}
                          </Badge>
                          {result.tokens_distributed && (
                            <Text fontSize="xs" color="gray.500">{result.tokens_distributed} TIC</Text>
                          )}
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Information */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading as="h4" size="sm" color={textColor}>
                How Daily TIC Distribution Works:
              </Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm" color="gray.600">
                  • <strong>Starter Plan:</strong> 500 TIC tokens per year = ~1.37 TIC per day
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • <strong>VIP Plan:</strong> 6900 TIC tokens per year = ~18.9 TIC per day
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • Tokens are distributed once per day to users with active subscriptions
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • TIC balance is updated in user wallets and transaction history is recorded
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • Distribution is skipped if already completed for the day
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
