'use client';

import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaCoins, FaCalendarAlt, FaSync } from 'react-icons/fa';

interface TicDistribution {
  id: string;
  plan_id: string;
  plan_name: string;
  token_amount: number;
  distribution_date: string;
  status: string;
  created_at: string;
}

interface TransactionHistoryResponse {
  success: boolean;
  transactions: any[];
  message?: string;
}

export default function TestTicDistributionHistory() {
  const { data: session } = useSession();
  const [distributions, setDistributions] = useState<TicDistribution[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const fetchDistributionHistory = async () => {
    if (!session?.user?.email) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Test the distribution history API
      const distributionResponse = await fetch('/api/distribution/history');
      
      if (distributionResponse.ok) {
        const distributionData = await distributionResponse.json();
        if (distributionData.success) {
          setDistributions(distributionData.distributions || []);
        }
      }

      // Test the transaction history API for TIC transactions
      const transactionResponse = await fetch('/api/transactions/history?type=tic');
      
      if (transactionResponse.ok) {
        const transactionData: TransactionHistoryResponse = await transactionResponse.json();
        if (transactionData.success) {
          setAllTransactions(transactionData.transactions || []);
        } else {
          setError(transactionData.message || 'Failed to fetch transaction history');
        }
      } else {
        const errorData = await transactionResponse.json();
        setError(errorData.error || 'Failed to fetch transaction history');
      }

    } catch (err) {
      console.error('Error fetching distribution history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testManualDistribution = async () => {
    if (!session?.user?.email) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('/api/distribution/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'vip' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Distributed ${data.distribution.token_amount} TIC tokens`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchDistributionHistory(); // Refresh the data
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to distribute tokens',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error in manual distribution:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to distribute tokens',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchDistributionHistory();
    }
  }, [session]);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="800px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to view TIC distribution history
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <FaCoins color="orange" />
                  <Heading size="lg">TIC Distribution History Test</Heading>
                </HStack>
                <HStack spacing={2}>
                  <Button
                    leftIcon={<FaSync />}
                    onClick={fetchDistributionHistory}
                    isLoading={isLoading}
                    size="sm"
                  >
                    Refresh
                  </Button>
                  <Button
                    colorScheme="orange"
                    onClick={testManualDistribution}
                    size="sm"
                  >
                    Test Manual Distribution
                  </Button>
                </HStack>
              </HStack>

              <Text color="gray.600">
                Testing TIC distribution history display for user: {session.user.email}
              </Text>

              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Distribution History from /api/distribution/history */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Distribution History API Results</Heading>
              
              {isLoading ? (
                <HStack justify="center" py={8}>
                  <Spinner />
                  <Text>Loading distribution history...</Text>
                </HStack>
              ) : distributions.length > 0 ? (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Plan</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {distributions.map((dist) => (
                        <Tr key={dist.id}>
                          <Td>
                            <Text fontSize="sm">
                              {new Date(dist.distribution_date).toLocaleDateString()}
                            </Text>
                          </Td>
                          <Td>
                            <Badge colorScheme="blue" variant="outline">
                              {dist.plan_name}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontWeight="medium" color="green.500">
                              +{parseFloat(dist.token_amount.toString()).toFixed(4)} TIC
                            </Text>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={dist.status === 'completed' ? 'green' : 'yellow'}
                              size="sm"
                            >
                              {dist.status}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  No distribution history found
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Transaction History from /api/transactions/history */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Transaction History API Results (TIC)</Heading>
              
              {allTransactions.length > 0 ? (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Type</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                        <Th>From</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {allTransactions.slice(0, 10).map((tx, index) => (
                        <Tr key={tx.id || index}>
                          <Td>
                            <Text fontSize="sm">
                              {tx.date} {tx.time}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontSize="sm" fontWeight="medium">
                              {tx.type}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontWeight="medium" color="green.500">
                              {tx.amount}
                            </Text>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={tx.status === 'Done' ? 'green' : 'yellow'}
                              size="sm"
                            >
                              {tx.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="sm" color="gray.600">
                              {tx.fromSystem}
                            </Text>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  No TIC transactions found in transaction history
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
