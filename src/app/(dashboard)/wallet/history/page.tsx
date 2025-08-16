'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import { createClient } from '@/lib/supabase/client'; // For Supabase client
import { getSession } from 'next-auth/react';
import {
  Box,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Icon,
  SimpleGrid,
  Badge,
  HStack,
  Button,
  Input,
  Select,
  Flex,
  Spacer,
  Link as ChakraLink,
  Tag,
  TagLabel,
  TagLeftIcon,
  StackDivider,
  Menu, // Added
  MenuButton, // Added
  MenuList, // Added
  MenuItem, // Added
  Card,
  CardBody,
  CardHeader,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FaSearch, FaFilter, FaCalendarAlt, FaDownload, FaCoins, FaCheckCircle, FaClock, FaTimesCircle, FaArrowCircleDown, FaArrowCircleUp, FaUserFriends, FaPiggyBank, FaSync, FaTrophy, FaUnlock, FaDatabase, FaLock, FaCog, FaExchangeAlt, FaGift, FaChartLine, FaCreditCard } from 'react-icons/fa'; // Added more transaction icons
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Define a type for our transaction data for better type safety
interface Transaction {
  id: string;
  date: string; // Should be YYYY-MM-DD
  type: string;
  time: string; // HH:MM
  invoiceId: string;
  fromSystem: string;
  toSystem: string;
  status: string;
  amount: string; // e.g., "+0.01 USD" or "-50.00 USDT"
  currency?: string; // e.g., USD, USDT, TIC (extracted from amount or separate)
  icon: React.ElementType;
  details?: any;
}

// This can be used for initial state or if API fails and you want to show some demo data.
// For a production app, you'd likely start with an empty array and rely on the API.
const fallbackMockTransactions: Transaction[] = [
    {
    id: 'txn_1', date: '2025-06-02', type: 'Reward', time: '20:21',
    invoiceId: '2251800080142053', fromSystem: 'System', toSystem: 'Your Account',
    status: 'Done', amount: '+0.01 USD', icon: FaCoins, currency: 'USD'
  },
  {
    id: 'txn_5', date: '2025-06-01', type: 'Deposit', time: '10:05',
    invoiceId: 'DEP1234567890', fromSystem: 'External Wallet', toSystem: 'My Wallet',
    status: 'Pending', amount: '+100.00 USDT', icon: FaArrowCircleDown, currency: 'USDT'
  },
  // Add a mock withdrawal for testing filters
  {
    id: 'txn_6', date: '2025-05-30', type: 'Withdrawal', time: '15:00',
    invoiceId: 'WTHDRAW001', fromSystem: 'My Wallet', toSystem: 'External Address',
    status: 'Completed', amount: '-50.00 USDT', icon: FaArrowCircleUp, currency: 'USDT'
  }
];

// Helper to group transactions by date with proper sorting
const groupTransactionsByDate = (transactions: Transaction[]) => {
  // First, sort all transactions by date and time (most recent first)
  const sortedTransactions = transactions.sort((a, b) => {
    const dateTimeA = new Date(`${a.date} ${a.time}`).getTime();
    const dateTimeB = new Date(`${b.date} ${b.time}`).getTime();
    return dateTimeB - dateTimeA;
  });

  return sortedTransactions.reduce((acc, transaction) => {
    const date = transaction.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);
};


export default function TransactionHistoryPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const subtleTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]); // Start with empty array
  const [isLoading, setIsLoading] = useState(false); // Start with false so UI shows immediately
  const [error, setError] = useState<string | null>(null);

  const allTransactionTypes = ["All transaction types", "Deposit", "Withdrawal", "Transfer", "Payment", "Plan Purchase", "TIC", "GIC", "Staking", "Trader"];
  const allStatuses = ["All statuses", "Done", "Pending", "Failed"];
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>(allTransactionTypes[0]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(allStatuses[0]);



  // Helper method to get authenticated user email from both auth methods
  const getAuthenticatedUserEmail = async (): Promise<string | null> => {
    try {
      // Method 1: Try NextAuth session (Google OAuth)
      const nextAuthSession = await getSession();
      if (nextAuthSession?.user?.email) {
        return nextAuthSession.user.email;
      }

      // Method 2: Try Supabase auth (manual login)
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }

      return null;
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
  };



  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userEmail = await getAuthenticatedUserEmail();
        if (!userEmail) {
          setError("User not authenticated. Please log in.");
          setTransactions([]);
          setIsLoading(false);
          return;
        }



        // Map filter types to API parameters
        const typeMapping: Record<string, string> = {
          "All transaction types": "all",
          "Deposit": "deposit",
          "Withdrawal": "withdrawal",
          "Transfer": "transfer",
          "Payment": "payment",
          "Plan Purchase": "plan",
          "TIC": "tic",
          "GIC": "gic",
          "Staking": "staking",
          "Trader": "trader"
        };

        const statusMapping: Record<string, string> = {
          "All statuses": "all",
          "Done": "done",
          "Pending": "pending",
          "Failed": "failed"
        };

        // Fetch all transactions using the new comprehensive API (userEmail is now handled server-side)
        const apiUrl = new URL('/api/transactions/history', window.location.origin);
        apiUrl.searchParams.set('type', typeMapping[selectedTypeFilter] || 'all');
        apiUrl.searchParams.set('status', statusMapping[selectedStatusFilter] || 'all');
        apiUrl.searchParams.set('limit', '100');

        console.log('Fetching transactions from:', apiUrl.toString());

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch transactions');
        }

        // Format transactions for the UI
        const formattedTransactions: Transaction[] = (data.transactions || []).map((tx: any) => {
          // Determine icon based on transaction type
          let icon = FaCoins;
          if (tx.type === 'Deposit') icon = FaArrowCircleDown;
          else if (tx.type === 'Withdrawal') icon = FaArrowCircleUp;
          else if (tx.type.includes('Transfer')) icon = FaExchangeAlt;
          else if (tx.type.includes('Plan Purchase') || tx.type.includes('Wallet Payment')) icon = FaCreditCard;
          else if (tx.type.includes('Trader')) icon = FaTrophy;
          else if (tx.type.includes('TIC') || tx.type.includes('Tic')) icon = FaCoins;
          else if (tx.type.includes('GIC') || tx.type.includes('Gic')) icon = FaDatabase;
          else if (tx.type.includes('Staking')) icon = FaChartLine;
          else if (tx.type.includes('Reward') || tx.type.includes('Bonus')) icon = FaGift;

          return {
            id: tx.id,
            date: tx.date,
            time: tx.time,
            type: tx.type,
            invoiceId: tx.invoiceId,
            fromSystem: tx.fromSystem,
            toSystem: tx.toSystem,
            status: tx.status,
            amount: tx.amount,
            currency: tx.currency,
            icon: icon,
            details: tx.details
          };
        });

        setTransactions(formattedTransactions);

        console.log(`Loaded ${formattedTransactions.length} transactions`);

      } catch (e: any) {
        console.error("Error fetching transactions:", e);
        setError(e.message || "Failed to fetch transactions.");
        setTransactions([]); // Don't show mock data, show empty state
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedTypeFilter, selectedStatusFilter]);

  const groupedTransactions = groupTransactionsByDate(transactions);

  const getStatusTag = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return <Tag size="sm" colorScheme="green" borderRadius="full"><TagLeftIcon boxSize="12px" as={FaCheckCircle} /> <TagLabel>Done</TagLabel></Tag>;
      case 'pending':
        return <Tag size="sm" colorScheme="yellow" borderRadius="full"><TagLeftIcon boxSize="12px" as={FaClock} /> <TagLabel>Pending</TagLabel></Tag>;
      case 'failed':
      case 'rejected':
        return <Tag size="sm" colorScheme="red" borderRadius="full"><TagLeftIcon boxSize="12px" as={FaTimesCircle} /> <TagLabel>Failed</TagLabel></Tag>;
      case 'processing':
        return <Tag size="sm" colorScheme="blue" borderRadius="full"><TagLeftIcon boxSize="12px" as={FaClock} /> <TagLabel>Processing</TagLabel></Tag>;
      default:
        return <Tag size="sm" borderRadius="full">{status}</Tag>;
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            Transaction history
          </Heading>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={FaSync} />}
              onClick={() => {
                setIsLoading(true);
                // Trigger re-fetch by updating a dependency
                setSelectedTypeFilter(prev => prev);
              }}
              variant="outline"
              size="sm"
              isLoading={isLoading}
            >
              Refresh
            </Button>

            <ChakraLink href="/support-hub" color="blue.500" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
              Get support
            </ChakraLink>
          </HStack>
        </Flex>



        {/* Filter Buttons */}
        <HStack spacing={3} overflowX="auto" py={2}>
          <Button leftIcon={<Icon as={FaCalendarAlt} />} colorScheme="blue" variant="solid" size="sm">Last 7 days</Button>

          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline" size="sm" minW="200px">
              {selectedTypeFilter}
            </MenuButton>
            <MenuList bg={cardBgColor} zIndex={10} maxH="300px" overflowY="auto">
              {allTransactionTypes.map(type => (
                <MenuItem
                  key={type}
                  onClick={() => setSelectedTypeFilter(type)}
                  bg={selectedTypeFilter === type ? useColorModeValue('blue.100', 'blue.700') : undefined}
                  fontSize="sm"
                >
                  {type}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline" size="sm" minW="120px">
              {selectedStatusFilter}
            </MenuButton>
            <MenuList bg={cardBgColor} zIndex={10}>
              {allStatuses.map(status => (
                <MenuItem
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  bg={selectedStatusFilter === status ? useColorModeValue('blue.100', 'blue.700') : undefined}
                >
                  {status}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Button variant="outline" size="sm">All accounts</Button>
        </HStack>

        {/* Transaction Summary */}
        {!isLoading && !error && transactions.length > 0 && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
            <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
              <VStack>
                <Icon as={FaArrowCircleDown} color="green.500" boxSize={5} />
                <Text fontWeight="bold" color="green.700" fontSize="sm">Deposits</Text>
                <Text fontSize="lg" fontWeight="bold">
                  {transactions.filter(tx => tx.type === 'Deposit').length}
                </Text>
              </VStack>
            </Box>
            <Box p={4} bg="red.50" borderRadius="md" border="1px" borderColor="red.200">
              <VStack>
                <Icon as={FaArrowCircleUp} color="red.500" boxSize={5} />
                <Text fontWeight="bold" color="red.700" fontSize="sm">Withdrawals</Text>
                <Text fontSize="lg" fontWeight="bold">
                  {transactions.filter(tx => tx.type === 'Withdrawal').length}
                </Text>
              </VStack>
            </Box>
            <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
              <VStack>
                <Icon as={FaExchangeAlt} color="blue.500" boxSize={5} />
                <Text fontWeight="bold" color="blue.700" fontSize="sm">Transfers</Text>
                <Text fontSize="lg" fontWeight="bold">
                  {transactions.filter(tx => tx.type.includes('Transfer')).length}
                </Text>
              </VStack>
            </Box>
            <Box p={4} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
              <VStack>
                <Icon as={FaCoins} color="purple.500" boxSize={5} />
                <Text fontWeight="bold" color="purple.700" fontSize="sm">Other</Text>
                <Text fontSize="lg" fontWeight="bold">
                  {transactions.filter(tx => !['Deposit', 'Withdrawal'].includes(tx.type) && !tx.type.includes('Transfer')).length}
                </Text>
              </VStack>
            </Box>
          </SimpleGrid>
        )}

        {/* Transaction List */}
        {isLoading && (
          <VStack spacing={4} py={10} textAlign="center">
            <Spinner size="xl" color="blue.500" />
            <Text color={subtleTextColor}>Loading transactions...</Text>
          </VStack>
        )}
        {error && <Text color="red.500">Error: {error}</Text>}
        {!isLoading && !error && Object.keys(groupedTransactions).length > 0 ? (
          Object.entries(groupedTransactions).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, dateTransactions]) => (
            <Box key={date}>
              <Text fontSize="sm" color={subtleTextColor} fontWeight="medium" my={4}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) === new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                 ? `Today, ${new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
                 : new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <VStack spacing={3} align="stretch" divider={<StackDivider borderColor={borderColor} />}>
                {dateTransactions.sort((a,b) => {
                  const dateTimeA = new Date(`${a.date} ${a.time}`).getTime();
                  const dateTimeB = new Date(`${b.date} ${b.time}`).getTime();
                  return dateTimeB - dateTimeA;
                }).map((tx) => ( // Sort by actual timestamp for accuracy
                  <Flex key={tx.id} p={4} bg={cardBgColor} borderRadius="md" boxShadow="sm" alignItems="center">
                    <Icon as={tx.icon} boxSize={6} color={tx.type.includes('Reward') ? 'yellow.500' : tx.amount.startsWith('+') ? 'green.500' : 'red.500'} mr={4}/>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="medium" color={textColor}>{tx.type}</Text>
                      <Text fontSize="xs" color={subtleTextColor}>Time: {tx.time}</Text>
                      <Text fontSize="xs" color={subtleTextColor}>ID: {tx.invoiceId.substring(0, 8)}...</Text>
                      {tx.details?.network && (
                        <Text fontSize="xs" color={subtleTextColor}>Network: {tx.details.network}</Text>
                      )}
                      {tx.details?.admin_notes && (
                        <Text fontSize="xs" color="red.500" noOfLines={1}>Note: {tx.details.admin_notes}</Text>
                      )}
                    </VStack>
                    <VStack align="center" spacing={0} flex={1.5} display={{base: 'none', md: 'flex'}}>
                      <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                        {tx.fromSystem}
                        <Icon
                          as={FaArrowCircleDown} // This icon could be dynamic based on tx type or amount sign
                          transform={tx.amount.startsWith('+') ? 'rotate(0deg)' : 'rotate(180deg)'}
                          mx={1}
                          color={tx.amount.startsWith('+') ? 'green.500' : 'red.500'}
                        />
                        {tx.toSystem}
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={0} flex={1} textAlign="right">
                      {getStatusTag(tx.status)}
                      <Text fontWeight="medium" color={tx.amount.startsWith('+') ? 'green.500' : 'red.500'} fontSize="sm" mt={1}>
                        {tx.amount}
                      </Text>
                    </VStack>
                  </Flex>
                ))}
              </VStack>
            </Box>
          ))
        ) : (
          !isLoading && !error && ( // Only show "No transactions" if not loading and no error
            <VStack spacing={4} py={10} textAlign="center" bg={cardBgColor} borderRadius="lg" shadow="md">
              <Icon as={FaSearch} boxSize={16} color={subtleTextColor} />
              <Heading as="h4" size="md" color={textColor}>
                No transactions found.
              </Heading>
              <Text fontSize="sm" color={subtleTextColor}>
                Your transaction history will appear here.
              </Text>
            </VStack>
          )
        )}
      </VStack>




    </Box>
  );
}