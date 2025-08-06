'use client';

import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  useColorModeValue,
  Container,
  Divider
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  FaArrowUp,
  FaArrowDown,
  FaUsers,
  FaSync,
  FaEye,
  FaShieldAlt,
  FaTachometerAlt,
  FaSignOutAlt
} from 'react-icons/fa';

// Allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'admin@ticgloballtd.com',
  'support@ticgloballtd.com',
  'mschangfx@gmail.com',
  'client@ticgloballtd.com',
  'manager@ticgloballtd.com'
];

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  method_id: string;
  destination_address?: string;
  status: string;
  created_at: string;
  type: 'withdrawal' | 'deposit';
}

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Simple direct section management - no routing
  const changeSection = (section: string) => {
    console.log('DIRECT: Changing section to:', section);
    setActiveSection(section);
    console.log('DIRECT: Active section set to:', section);
  };
  const [stats, setStats] = useState({
    pendingWithdrawals: 0,
    pendingDeposits: 0,
    totalUsers: 0,
    totalTransactions: 0
  });
  const [forceRender, setForceRender] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Force re-render when section changes
  useEffect(() => {
    console.log('EFFECT: Active section changed to:', activeSection);
    setForceRender(prev => prev + 1);
  }, [activeSection]);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Check if current user is allowed admin
  const isAllowedAdmin = session?.user?.email && ALLOWED_ADMIN_ACCOUNTS.includes(session.user.email);

  // Loading state
  if (status === 'loading') {
    return (
      <Box bg={bgColor} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading admin access...</Text>
        </VStack>
      </Box>
    );
  }

  // Not logged in or not authorized
  if (status === 'unauthenticated' || !isAllowedAdmin) {
    return (
      <Box bg={bgColor} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Icon as={FaShieldAlt} boxSize={12} color="red.500" />
          <Heading size="lg" color="red.600">Access Denied</Heading>
          <Text color="gray.500">Admin access required</Text>
          <Text fontSize="sm" color="gray.400">
            Account: {session?.user?.email || 'Not logged in'}
          </Text>
          <Button onClick={() => window.location.href = '/join'}>
            Login to Continue
          </Button>
        </VStack>
      </Box>
    );
  }

  // Menu items for sidebar
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Admin Dashboard',
      icon: FaTachometerAlt,
      color: 'blue'
    },
    {
      id: 'deposits',
      label: 'Manage Deposits',
      icon: FaArrowDown,
      color: 'green'
    },
    {
      id: 'withdrawals',
      label: 'Manage Withdrawals',
      icon: FaArrowUp,
      color: 'red'
    },
    {
      id: 'users',
      label: 'Manage Users',
      icon: FaUsers,
      color: 'purple'
    }
  ];

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin-panel/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load transactions based on type
  const loadTransactions = async (type: 'withdrawals' | 'deposits' | 'all') => {
    setIsLoading(true);
    try {
      let url = '/api/admin-panel/transactions?';
      if (type !== 'all') {
        url += `type=${type}&`;
      }
      url += 'status=pending&limit=50';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        toast({
          title: 'Success',
          description: `Loaded ${data.transactions?.length || 0} transactions`,
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error(`API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transaction action
  const handleTransactionAction = async (action: 'approve' | 'reject') => {
    if (!selectedTransaction) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-panel/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          transactionId: selectedTransaction.id,
          transactionType: selectedTransaction.type,
          adminNotes
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: data.message,
          status: 'success',
          duration: 3000,
        });
        onClose();
        loadTransactions('all'); // Reload
        loadStats(); // Update stats
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} transaction`,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    console.log('useEffect triggered, activeSection:', activeSection);
    loadStats();
    if (activeSection !== 'dashboard') {
      loadTransactions('all');
    }
  }, [activeSection]);

  // Force re-render when activeSection changes
  useEffect(() => {
    console.log('Active section changed to:', activeSection);
  }, [activeSection]);

  // Dashboard Section
  const renderDashboard = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Admin Dashboard</Heading>
      
      {/* Statistics Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Withdrawals</StatLabel>
              <StatNumber color="red.500">{stats.pendingWithdrawals}</StatNumber>
              <StatHelpText>Awaiting approval</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Deposits</StatLabel>
              <StatNumber color="green.500">{stats.pendingDeposits}</StatNumber>
              <StatHelpText>Awaiting approval</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Users</StatLabel>
              <StatNumber color="blue.500">{stats.totalUsers}</StatNumber>
              <StatHelpText>Registered users</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Transactions</StatLabel>
              <StatNumber color="purple.500">{stats.totalTransactions}</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <Heading size="md">Quick Actions</Heading>
        </CardHeader>
        <CardBody>
          <HStack spacing={4}>
            <Button
              leftIcon={<FaArrowUp />}
              colorScheme="red"
              onClick={() => loadTransactions('withdrawals')}
            >
              View Pending Withdrawals
            </Button>
            <Button
              leftIcon={<FaArrowDown />}
              colorScheme="green"
              onClick={() => loadTransactions('deposits')}
            >
              View Pending Deposits
            </Button>
            <Button
              leftIcon={<FaSync />}
              colorScheme="blue"
              onClick={loadStats}
            >
              Refresh Stats
            </Button>
          </HStack>
        </CardBody>
      </Card>
    </VStack>
  );

  // Deposits Section
  const renderDeposits = () => (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="lg">Manage Deposits</Heading>
        <Button
          leftIcon={<FaSync />}
          colorScheme="green"
          onClick={() => loadTransactions('deposits')}
          isLoading={isLoading}
        >
          Refresh Deposits
        </Button>
      </HStack>
      
      {renderTransactionTable('deposit')}
    </VStack>
  );

  // Withdrawals Section
  const renderWithdrawals = () => (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="lg">Manage Withdrawals</Heading>
        <Button
          leftIcon={<FaSync />}
          colorScheme="red"
          onClick={() => loadTransactions('withdrawals')}
          isLoading={isLoading}
        >
          Refresh Withdrawals
        </Button>
      </HStack>
      
      {renderTransactionTable('withdrawal')}
    </VStack>
  );

  // Users Section
  const renderUsers = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Manage Users</Heading>
      <Alert status="info">
        <AlertIcon />
        User management features coming soon...
      </Alert>
    </VStack>
  );

  // Transaction Table
  const renderTransactionTable = (filterType?: 'deposit' | 'withdrawal') => {
    const filteredTransactions = filterType 
      ? transactions.filter(t => t.type === filterType)
      : transactions;

    if (isLoading) {
      return (
        <Center py={10}>
          <Spinner size="xl" />
        </Center>
      );
    }

    if (filteredTransactions.length === 0) {
      return (
        <Alert status="info">
          <AlertIcon />
          No pending {filterType ? `${filterType}s` : 'transactions'} found
        </Alert>
      );
    }

    return (
      <Card>
        <CardHeader>
          <Heading size="md">
            Pending {filterType ? `${filterType}s` : 'Transactions'} ({filteredTransactions.length})
          </Heading>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>User</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTransactions.map((transaction) => (
                  <Tr key={transaction.id}>
                    <Td>
                      <Badge colorScheme={transaction.type === 'withdrawal' ? 'red' : 'green'}>
                        {transaction.type}
                      </Badge>
                    </Td>
                    <Td>{transaction.user_email}</Td>
                    <Td>${transaction.amount} {transaction.currency}</Td>
                    <Td>{transaction.method_id}</Td>
                    <Td>{new Date(transaction.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <Badge colorScheme="yellow">
                        {transaction.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        leftIcon={<FaEye />}
                        colorScheme="blue"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setAdminNotes('');
                          onOpen();
                        }}
                      >
                        Review
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>
    );
  };

  // Render based on active section with clear debugging
  const renderContent = () => {
    console.log('RENDER: Rendering content for section:', activeSection);

    switch (activeSection) {
      case 'deposits':
        console.log('RENDER: Showing deposits section');
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="success">
              <AlertIcon />
              <Text><strong>DEPOSITS SECTION LOADED</strong> - This is the Manage Deposits page</Text>
            </Alert>
            {renderDeposits()}
          </VStack>
        );
      case 'withdrawals':
        console.log('RENDER: Showing withdrawals section');
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="warning">
              <AlertIcon />
              <Text><strong>WITHDRAWALS SECTION LOADED</strong> - This is the Manage Withdrawals page</Text>
            </Alert>
            {renderWithdrawals()}
          </VStack>
        );
      case 'users':
        console.log('RENDER: Showing users section');
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Text><strong>USERS SECTION LOADED</strong> - This is the Manage Users page</Text>
            </Alert>
            {renderUsers()}
          </VStack>
        );
      default:
        console.log('RENDER: Showing dashboard section');
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="success">
              <AlertIcon />
              <Text><strong>DASHBOARD SECTION LOADED</strong> - This is the Admin Dashboard</Text>
            </Alert>
            {renderDashboard()}
          </VStack>
        );
    }
  };

  // Authorized admin interface with complete layout
  return (
    <Box bg={bgColor} minH="100vh">
      <Flex>
        {/* Sidebar */}
        <Box
          w="280px"
          bg={sidebarBg}
          borderRight="1px"
          borderColor={borderColor}
          minH="100vh"
          p={6}
        >
          <VStack spacing={6} align="stretch">
            {/* Admin Panel Header */}
            <VStack spacing={2}>
              <HStack>
                <Icon as={FaShieldAlt} color="red.500" boxSize={6} />
                <Heading size="md" color="red.600">
                  ADMIN PANEL
                </Heading>
              </HStack>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                {session?.user?.email}
              </Text>
              <Badge colorScheme="green" size="sm">
                Authorized Admin
              </Badge>
            </VStack>

            <Divider />

            {/* Navigation Menu */}
            <VStack spacing={2} align="stretch">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  leftIcon={<Icon as={item.icon} />}
                  variant={activeSection === item.id ? 'solid' : 'ghost'}
                  colorScheme={activeSection === item.id ? item.color : 'gray'}
                  justifyContent="flex-start"
                  size="lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Sidebar button clicked for section:', item.id);
                    changeSection(item.id);
                  }}
                  _hover={{
                    bg: activeSection === item.id ? undefined : `${item.color}.50`
                  }}
                  as="button"
                  type="button"
                >
                  {item.label}
                </Button>
              ))}
            </VStack>

            <Divider />

            {/* Logout Button */}
            <Button
              leftIcon={<Icon as={FaSignOutAlt} />}
              variant="outline"
              colorScheme="gray"
              onClick={() => window.location.href = '/api/auth/signout'}
            >
              Logout
            </Button>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex="1" p={6}>
          <Container maxW="full">
            {/* Debug Section Indicator */}
            <Alert status="info" mb={4}>
              <AlertIcon />
              <VStack align="start" spacing={2}>
                <Text>Current Section: <strong>{activeSection}</strong></Text>
                <HStack spacing={2}>
                  <Text fontSize="sm">Quick Test:</Text>
                  <Button size="xs" onClick={() => changeSection('dashboard')}>Dashboard</Button>
                  <Button size="xs" onClick={() => changeSection('deposits')}>Deposits</Button>
                  <Button size="xs" onClick={() => changeSection('withdrawals')}>Withdrawals</Button>
                  <Button size="xs" onClick={() => changeSection('users')}>Users</Button>
                </HStack>
              </VStack>
            </Alert>

            {renderContent()}
          </Container>
        </Box>
      </Flex>

      {/* Transaction Review Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Review {selectedTransaction?.type === 'withdrawal' ? 'Withdrawal' : 'Deposit'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTransaction && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">User:</Text>
                  <Text>{selectedTransaction.user_email}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Amount:</Text>
                  <Text>${selectedTransaction.amount} {selectedTransaction.currency}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Method:</Text>
                  <Text>{selectedTransaction.method_id}</Text>
                </Box>
                {selectedTransaction.destination_address && (
                  <Box>
                    <Text fontWeight="bold">Destination:</Text>
                    <Text fontSize="sm" wordBreak="break-all">
                      {selectedTransaction.destination_address}
                    </Text>
                  </Box>
                )}
                <Box>
                  <Text fontWeight="bold">Admin Notes:</Text>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes for this action..."
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button
                colorScheme="green"
                onClick={() => handleTransactionAction('approve')}
                isLoading={isLoading}
              >
                Approve
              </Button>
              <Button
                colorScheme="red"
                onClick={() => handleTransactionAction('reject')}
                isLoading={isLoading}
              >
                Reject
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
