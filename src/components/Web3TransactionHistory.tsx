'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  SimpleGrid,
  useColorModeValue,
  Icon,
  Link as ChakraLink,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Spacer
} from '@chakra-ui/react';
import { 
  FaArrowCircleDown, 
  FaArrowCircleUp, 
  FaExternalLinkAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle
} from 'react-icons/fa';

interface BlockchainTransaction {
  id: string;
  transaction_type: 'deposit' | 'withdrawal';
  transaction_hash: string;
  network: string;
  token_symbol: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at?: string;
  from_address?: string;
  to_address?: string;
  confirmations?: number;
}

interface Web3TransactionHistoryProps {
  userEmail?: string;
}

export default function Web3TransactionHistory({ userEmail }: Web3TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [deposits, setDeposits] = useState<BlockchainTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<BlockchainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch blockchain transaction history
      const response = await fetch('/api/web3/deposits?action=blockchain-history');

      // Check if response is ok first
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from Web3 deposits:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch transactions');
      }

      const allTransactions = data.transactions || [];
      setTransactions(allTransactions);

      // Separate deposits and withdrawals
      setDeposits(allTransactions.filter((tx: BlockchainTransaction) => tx.transaction_type === 'deposit'));
      setWithdrawals(allTransactions.filter((tx: BlockchainTransaction) => tx.transaction_type === 'withdrawal'));

    } catch (error) {
      console.error('Error fetching Web3 transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch transactions');

      // Set empty arrays on error to prevent further issues
      setTransactions([]);
      setDeposits([]);
      setWithdrawals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Icon as={FaCheckCircle} color="green.500" />;
      case 'pending':
        return <Icon as={FaClock} color="yellow.500" />;
      case 'failed':
        return <Icon as={FaTimesCircle} color="red.500" />;
      default:
        return <Icon as={FaClock} color="gray.500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colorScheme = status === 'confirmed' ? 'green' : 
                       status === 'pending' ? 'yellow' : 'red';
    return (
      <Badge colorScheme={colorScheme} variant="subtle">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getExplorerUrl = (network: string, hash: string) => {
    const explorers: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx/',
      bsc: 'https://bscscan.com/tx/',
      tron: 'https://tronscan.org/#/transaction/'
    };
    return explorers[network] ? `${explorers[network]}${hash}` : '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const TransactionTable = ({ transactions, type }: { transactions: BlockchainTransaction[], type: string }) => (
    <TableContainer>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Network</Th>
            <Th>Token</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Transaction</Th>
          </Tr>
        </Thead>
        <Tbody>
          {transactions.map((tx) => (
            <Tr key={tx.id}>
              <Td>
                <Text fontSize="sm">{formatDate(tx.created_at)}</Text>
              </Td>
              <Td>
                <Badge variant="outline" colorScheme="blue">
                  {tx.network.toUpperCase()}
                </Badge>
              </Td>
              <Td>
                <HStack>
                  <Icon 
                    as={type === 'deposit' ? FaArrowCircleDown : FaArrowCircleUp} 
                    color={type === 'deposit' ? 'green.500' : 'red.500'} 
                  />
                  <Text fontWeight="medium">{tx.token_symbol}</Text>
                </HStack>
              </Td>
              <Td>
                <Text 
                  fontWeight="bold" 
                  color={type === 'deposit' ? 'green.500' : 'red.500'}
                >
                  {type === 'deposit' ? '+' : '-'}{tx.amount}
                </Text>
              </Td>
              <Td>
                <HStack>
                  {getStatusIcon(tx.status)}
                  {getStatusBadge(tx.status)}
                </HStack>
              </Td>
              <Td>
                {tx.transaction_hash && (
                  <ChakraLink
                    href={getExplorerUrl(tx.network, tx.transaction_hash)}
                    isExternal
                    color="blue.500"
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <Text>{tx.transaction_hash.slice(0, 8)}...{tx.transaction_hash.slice(-6)}</Text>
                      <Icon as={FaExternalLinkAlt} boxSize={3} />
                    </HStack>
                  </ChakraLink>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );

  if (isLoading) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text>Loading Web3 transactions...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
        <Button mt={4} onClick={fetchTransactions} colorScheme="blue" size="sm">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      <Flex mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">Blockchain Transactions</Heading>
          <Text color="gray.500">Real-time blockchain transaction history</Text>
        </VStack>
        <Spacer />
        <Button onClick={fetchTransactions} size="sm" variant="outline">
          Refresh
        </Button>
      </Flex>

      {transactions.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No blockchain transactions found</Text>
          <Text fontSize="sm" color="gray.400" mt={2}>
            Your deposits and withdrawals will appear here once processed on the blockchain
          </Text>
        </Box>
      ) : (
        <Tabs variant="enclosed">
          <TabList>
            <Tab>All Transactions ({transactions.length})</Tab>
            <Tab>Deposits ({deposits.length})</Tab>
            <Tab>Withdrawals ({withdrawals.length})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <TransactionTable transactions={transactions} type="all" />
            </TabPanel>
            <TabPanel px={0}>
              <TransactionTable transactions={deposits} type="deposit" />
            </TabPanel>
            <TabPanel px={0}>
              <TransactionTable transactions={withdrawals} type="withdrawal" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      {/* Transaction Statistics */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={6}>
        <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
          <VStack>
            <Icon as={FaArrowCircleDown} color="green.500" boxSize={6} />
            <Text fontWeight="bold" color="green.700">Total Deposits</Text>
            <Text fontSize="lg" fontWeight="bold">{deposits.length}</Text>
          </VStack>
        </Box>
        <Box p={4} bg="red.50" borderRadius="md" border="1px" borderColor="red.200">
          <VStack>
            <Icon as={FaArrowCircleUp} color="red.500" boxSize={6} />
            <Text fontWeight="bold" color="red.700">Total Withdrawals</Text>
            <Text fontSize="lg" fontWeight="bold">{withdrawals.length}</Text>
          </VStack>
        </Box>
        <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
          <VStack>
            <Icon as={FaCheckCircle} color="blue.500" boxSize={6} />
            <Text fontWeight="bold" color="blue.700">Confirmed</Text>
            <Text fontSize="lg" fontWeight="bold">
              {transactions.filter(tx => tx.status === 'confirmed').length}
            </Text>
          </VStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
