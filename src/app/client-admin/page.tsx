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
  useColorModeValue,
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
  Container,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  Input,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

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

export default function ClientAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');

  // Client admin login (separate from Supabase)
  const handleClientLogin = async () => {
    if (adminPassword === 'TICAdmin2024!') {
      setIsAuthenticated(true);
      toast({
        title: 'Login Successful',
        description: 'Welcome to TIC Global Admin Panel',
        status: 'success',
        duration: 3000,
      });
      loadPendingTransactions();
    } else {
      toast({
        title: 'Login Failed',
        description: 'Invalid admin password',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Load pending transactions
  const loadPendingTransactions = async () => {
    setIsLoading(true);
    try {
      // Load withdrawals
      const withdrawalResponse = await fetch('/api/client-admin?type=withdrawals&status=pending');
      const withdrawalData = await withdrawalResponse.json();
      
      // Load deposits  
      const depositResponse = await fetch('/api/client-admin?type=deposits&status=pending');
      const depositData = await depositResponse.json();

      const allTransactions = [
        ...(withdrawalData.data || []).map((t: any) => ({ ...t, type: 'withdrawal' })),
        ...(depositData.data || []).map((t: any) => ({ ...t, type: 'deposit' }))
      ];

      setTransactions(allTransactions);
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

  // Handle transaction approval/rejection
  const handleTransactionAction = async (action: 'approve' | 'reject') => {
    if (!selectedTransaction) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/client-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          transactionId: selectedTransaction.id,
          transactionType: selectedTransaction.type,
          adminNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Transaction ${action}d successfully`,
          status: 'success',
          duration: 3000,
        });
        onClose();
        loadPendingTransactions(); // Reload
      } else {
        throw new Error(data.error);
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

  if (!isAuthenticated) {
    return (
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="md">
          <VStack spacing={6}>
            <Card bg={cardBgColor} w="full">
              <CardHeader textAlign="center">
                <Heading size="xl" color="blue.600">
                  🛡️ TIC Global Client Admin
                </Heading>
                <Text color="gray.500" mt={2}>
                  Secure admin access for transaction management
                </Text>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Admin Password</FormLabel>
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      onKeyPress={(e) => e.key === 'Enter' && handleClientLogin()}
                    />
                  </FormControl>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={handleClientLogin}
                    w="full"
                  >
                    Login to Admin Panel
                  </Button>
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    Contact the developer if you need the admin password
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="7xl">
        <VStack spacing={6}>
          {/* Header */}
          <Card bg={cardBgColor} w="full">
            <CardHeader>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Heading size="xl" color="blue.600">
                    🛡️ TIC Global Admin Panel
                  </Heading>
                  <Text color="gray.500">
                    Manage pending deposits and withdrawals
                  </Text>
                </VStack>
                <VStack>
                  <Button
                    colorScheme="blue"
                    onClick={loadPendingTransactions}
                    isLoading={isLoading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAuthenticated(false)}
                  >
                    Logout
                  </Button>
                </VStack>
              </HStack>
            </CardHeader>
          </Card>

          {/* Statistics */}
          <Card bg={cardBgColor} w="full">
            <CardBody>
              <HStack spacing={8} justify="center">
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    {transactions.filter(t => t.type === 'withdrawal').length}
                  </Text>
                  <Text color="gray.500">Pending Withdrawals</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {transactions.filter(t => t.type === 'deposit').length}
                  </Text>
                  <Text color="gray.500">Pending Deposits</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                    {transactions.length}
                  </Text>
                  <Text color="gray.500">Total Pending</Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>

          {/* Transactions Table */}
          {isLoading ? (
            <Center py={10}>
              <Spinner size="xl" />
            </Center>
          ) : transactions.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              No pending transactions found
            </Alert>
          ) : (
            <Card bg={cardBgColor} w="full">
              <CardHeader>
                <Heading size="md">Pending Transactions</Heading>
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
                      {transactions.map((transaction) => (
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
          )}

          {/* Action Modal */}
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
        </VStack>
      </Container>
    </Box>
  );
}
