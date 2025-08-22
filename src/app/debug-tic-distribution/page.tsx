'use client';

import { useState, useEffect } from 'react';
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
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export default function DebugTicDistributionPage() {
  const { data: session } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');

  const fetchDebugInfo = async () => {
    if (!session?.user?.email) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug/tic-distribution');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setDebugInfo(data.debug_info);
      toast({
        title: 'Debug Info Loaded',
        description: 'TIC distribution debug information retrieved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Debug Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchDebugInfo();
    }
  }, [session]);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to view TIC distribution debug information
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh">
      <VStack spacing={6} align="stretch" maxW="6xl" mx="auto">
        <Heading as="h1" size="xl" color={textColor} textAlign="center">
          TIC Distribution Debug
        </Heading>

        <Text textAlign="center" color="gray.500">
          Debug information for TIC daily token distribution system
        </Text>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            colorScheme="blue"
            onClick={fetchDebugInfo}
            isLoading={isLoading}
            loadingText="Loading..."
            size="lg"
          >
            Refresh Debug Info
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

        {/* Loading State */}
        {isLoading && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4}>
                <Spinner size="xl" />
                <Text>Loading debug information...</Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Debug Information */}
        {debugInfo && (
          <VStack spacing={6} align="stretch">
            
            {/* Summary Stats */}
            <Card bg={cardBg}>
              <CardBody>
                <Heading as="h3" size="md" mb={4}>Summary</Heading>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Stat>
                    <StatLabel>Active Subscriptions</StatLabel>
                    <StatNumber>{debugInfo.active_subscriptions.count}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>TIC Balance</StatLabel>
                    <StatNumber>{debugInfo.wallet.tic_balance || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Today's Distributions</StatLabel>
                    <StatNumber>{debugInfo.today_distributions.count}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Recent Distributions (7d)</StatLabel>
                    <StatNumber>{debugInfo.recent_distributions.count}</StatNumber>
                  </Stat>
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* Token Calculations */}
            <Card bg={cardBg}>
              <CardBody>
                <Heading as="h3" size="md" mb={4}>Token Calculations</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Stat>
                    <StatLabel>Expected Tokens</StatLabel>
                    <StatNumber color="blue.500">
                      {debugInfo.token_calculations.expected_tokens_total.toFixed(4)}
                    </StatNumber>
                    <StatHelpText>Based on subscription days</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Actual Tokens Received</StatLabel>
                    <StatNumber color="green.500">
                      {debugInfo.token_calculations.actual_tokens_received.toFixed(4)}
                    </StatNumber>
                    <StatHelpText>From distribution records</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Difference</StatLabel>
                    <StatNumber color={debugInfo.token_calculations.difference > 0 ? "red.500" : "green.500"}>
                      {debugInfo.token_calculations.difference.toFixed(4)}
                    </StatNumber>
                    <StatHelpText>Missing tokens</StatHelpText>
                  </Stat>
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* System Status */}
            <Card bg={cardBg}>
              <CardBody>
                <Heading as="h3" size="md" mb={4}>System Status</Heading>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text>Database Function</Text>
                    <Badge colorScheme={debugInfo.database_function.exists ? 'green' : 'red'}>
                      {debugInfo.database_function.exists ? 'EXISTS' : 'MISSING'}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>User Wallet</Text>
                    <Badge colorScheme={debugInfo.wallet.exists ? 'green' : 'red'}>
                      {debugInfo.wallet.exists ? 'EXISTS' : 'MISSING'}
                    </Badge>
                  </HStack>
                </VStack>
                {debugInfo.database_function.error && (
                  <Alert status="error" mt={4}>
                    <AlertIcon />
                    <AlertDescription>
                      Database Function Error: {debugInfo.database_function.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardBody>
            </Card>

            {/* Detailed Information */}
            <Accordion allowMultiple>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Active Subscriptions ({debugInfo.active_subscriptions.count})
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Code display="block" whiteSpace="pre" p={4} borderRadius="md">
                    {JSON.stringify(debugInfo.active_subscriptions, null, 2)}
                  </Code>
                </AccordionPanel>
              </AccordionItem>

              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Recent Distributions ({debugInfo.recent_distributions.count})
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  {debugInfo.recent_distributions.distributions.length > 0 ? (
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Plan</Th>
                            <Th>Amount</Th>
                            <Th>Status</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {debugInfo.recent_distributions.distributions.map((dist: any, index: number) => (
                            <Tr key={index}>
                              <Td>{dist.distribution_date}</Td>
                              <Td>{dist.plan_name}</Td>
                              <Td>{parseFloat(dist.token_amount).toFixed(4)} TIC</Td>
                              <Td>
                                <Badge colorScheme={dist.status === 'completed' ? 'green' : 'yellow'}>
                                  {dist.status}
                                </Badge>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Text color="gray.500">No recent distributions found</Text>
                  )}
                </AccordionPanel>
              </AccordionItem>

              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Raw Debug Data
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Code display="block" whiteSpace="pre" p={4} borderRadius="md" fontSize="xs">
                    {JSON.stringify(debugInfo, null, 2)}
                  </Code>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
