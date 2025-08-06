'use client';

import {
  Box,
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
  Icon
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown, FaUsers, FaSync, FaEye } from 'react-icons/fa';
import { useAdminPanel } from '@/contexts/AdminPanelContext';

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
  const { activeSection, setActiveSection } = useAdminPanel();
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  console.log('AdminPanel rendered with activeSection:', activeSection);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [stats, setStats] = useState({
    pendingWithdrawals: 0,
    pendingDeposits: 0,
    totalUsers: 0,
    totalTransactions: 0
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

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

  // Render based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'deposits':
        return renderDeposits();
      case 'withdrawals':
        return renderWithdrawals();
      case 'users':
        return renderUsers();
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      {/* Debug Section Indicator */}
      <Alert status="info" mb={4}>
        <AlertIcon />
        <VStack align="start" spacing={2}>
          <Text>Current Section: <strong>{activeSection}</strong></Text>
          <HStack spacing={2}>
            <Text fontSize="sm">Quick Test:</Text>
            <Button size="xs" onClick={() => setActiveSection('dashboard')}>Dashboard</Button>
            <Button size="xs" onClick={() => setActiveSection('deposits')}>Deposits</Button>
            <Button size="xs" onClick={() => setActiveSection('withdrawals')}>Withdrawals</Button>
            <Button size="xs" onClick={() => setActiveSection('users')}>Users</Button>
          </HStack>
        </VStack>
      </Alert>

      {renderContent()}

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
    </>
  );
}
