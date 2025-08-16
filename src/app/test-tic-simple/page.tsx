'use client';

import { useState } from 'react';
import { 
  Box, 
  Button, 
  Heading, 
  Text, 
  VStack, 
  Alert, 
  AlertIcon, 
  AlertTitle, 
  AlertDescription,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Divider,
  useToast
} from '@chakra-ui/react';

interface DistributionResult {
  user_email: string;
  plan_id: string;
  plan_name?: string;
  tokens_distributed?: number;
  status: 'success' | 'error' | 'skipped';
  reason?: string;
  error?: string;
}

interface DistributionResponse {
  success: boolean;
  message: string;
  date: string;
  total_subscriptions: number;
  distributed: number;
  skipped: number;
  errors: number;
  results: DistributionResult[];
}

export default function TestTicSimplePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DistributionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const triggerDistribution = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/daily-tic-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        toast({
          title: 'Distribution Successful',
          description: `Distributed TIC tokens to ${data.distributed} users`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setError(data.error || 'Failed to execute distribution');
        toast({
          title: 'Distribution Failed',
          description: data.error || 'Unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      toast({
        title: 'Network Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/test/daily-tic-simple', {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Distribution Status',
          description: `${data.total_distributed} of ${data.total_active_subscriptions} distributions completed today`,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Status Check Failed',
          description: data.error || 'Unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Network Error',
        description: 'Failed to check status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box maxW="6xl" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={2}>
            Simple Daily TIC Distribution Test
          </Heading>
          <Text color="gray.600">
            Test the daily TIC token distribution system for active plan subscribers (No Auth Required)
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={triggerDistribution}
            isLoading={isLoading}
            loadingText="Distributing..."
          >
            Trigger Daily Distribution
          </Button>
          <Button
            colorScheme="green"
            variant="outline"
            size="lg"
            onClick={checkStatus}
          >
            Check Status
          </Button>
        </SimpleGrid>

        {error && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">
                  Distribution Results
                </Heading>
                
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {result.distributed}
                    </Text>
                    <Text fontSize="sm" color="gray.600">Distributed</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="yellow.500">
                      {result.skipped}
                    </Text>
                    <Text fontSize="sm" color="gray.600">Skipped</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="red.500">
                      {result.errors}
                    </Text>
                    <Text fontSize="sm" color="gray.600">Errors</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {result.total_subscriptions}
                    </Text>
                    <Text fontSize="sm" color="gray.600">Total</Text>
                  </Box>
                </SimpleGrid>

                <Divider />

                <Box>
                  <Heading as="h4" size="sm" mb={3}>
                    Detailed Results
                  </Heading>
                  <VStack spacing={2} align="stretch">
                    {result.results.map((item, index) => (
                      <Box
                        key={index}
                        p={3}
                        border="1px"
                        borderColor="gray.200"
                        borderRadius="md"
                        bg={
                          item.status === 'success' ? 'green.50' :
                          item.status === 'error' ? 'red.50' : 'yellow.50'
                        }
                      >
                        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={2} alignItems="center">
                          <Text fontWeight="medium">{item.user_email}</Text>
                          <Badge
                            colorScheme={
                              item.status === 'success' ? 'green' :
                              item.status === 'error' ? 'red' : 'yellow'
                            }
                          >
                            {item.status}
                          </Badge>
                          <Text fontSize="sm">
                            {item.plan_name || item.plan_id}
                            {item.tokens_distributed && ` (${item.tokens_distributed} TIC)`}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {item.reason || item.error || 'Success'}
                          </Text>
                        </SimpleGrid>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}

        <Box bg="gray.50" p={4} borderRadius="md">
          <Heading as="h3" size="sm" mb={2}>
            How Daily TIC Distribution Works:
          </Heading>
          <VStack spacing={1} align="start" fontSize="sm" color="gray.700">
            <Text>• <strong>Starter Plan:</strong> 500 TIC tokens per year = ~1.37 TIC per day</Text>
            <Text>• <strong>VIP Plan:</strong> 6900 TIC tokens per year = ~18.9 TIC per day</Text>
            <Text>• Tokens are distributed once per day to users with active subscriptions</Text>
            <Text>• TIC balance is updated in user wallets and transaction history is recorded</Text>
            <Text>• Distribution is skipped if already completed for the day</Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
