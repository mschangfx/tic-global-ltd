'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
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
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Spacer,
  IconButton,
  Tooltip,
  Select,
  Input,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import { FaCheck, FaTimes, FaEye, FaSync, FaExternalLinkAlt, FaSearch, FaFilter } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface WithdrawalTransaction {
  id: string;
  user_email: string;
  amount: number;
  method: string;
  wallet_address?: string;
  account_number?: string;
  account_name?: string;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  transaction_hash?: string;
}

export default function AdminWithdrawals() {
  const [transactions, setTransactions] = useState<WithdrawalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<WithdrawalTransaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { data: session } = useSession();
  const router = useRouter();

  // Check if user is admin
  const isAdmin = session?.user?.email === 'admin@ticgloballtd.com' ||
                  session?.user?.email === 'mschangfx@gmail.com' ||
                  session?.user?.email?.includes('admin');

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch withdrawals
  const fetchWithdrawals = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping fetch');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        method: methodFilter,
        limit: '50'
      });

      if (searchTerm) {
        params.append('userEmail', searchTerm);
      }

      console.log('Fetching withdrawals with params:', params.toString());
      const response = await fetch(`/api/admin/withdrawals?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Withdrawal data received:', data);
        setTransactions(data.withdrawals || []);

        if (data.withdrawals && data.withdrawals.length === 0) {
          console.log('No withdrawals found');
        }
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);

        if (response.status === 401) {
          // Authentication failed, reset auth state
          setIsAuthenticated(false);
          toast({
            title: 'Authentication Required',
            description: 'Please login as admin to access withdrawals',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else {
          throw new Error(`Failed to fetch withdrawals: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch withdrawal requests',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle withdrawal action (approve/reject)
  const handleWithdrawalAction = async (action: 'approve' | 'reject') => {
    if (!selectedTransaction) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${selectedTransaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          admin_notes: adminNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Withdrawal ${action}d successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onClose();
        fetchWithdrawals();
      } else {
        throw new Error(`Failed to ${action} withdrawal`);
      }
    } catch (error) {
      console.error(`Error ${action}ing withdrawal:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} withdrawal`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open transaction details modal
  const openTransactionModal = (transaction: WithdrawalTransaction) => {
    setSelectedTransaction(transaction);
    setAdminNotes(transaction.admin_notes || '');
    onOpen();
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'completed': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  // Get method display name
  const getMethodDisplay = (method: string) => {
    switch (method) {
      case 'usdt_trc20': return 'USDT (TRC20)';
      case 'usdt_bep20': return 'USDT (BEP20)';
      case 'usdt_polygon': return 'USDT (Polygon)';
      case 'gcash': return 'GCash';
      case 'paymaya': return 'PayMaya';
      default: return method.toUpperCase();
    }
  };

  // Check admin authentication
  const checkAdminAuth = async () => {
    try {
      // First, try to fetch withdrawals directly to test if we're already authenticated
      const testResponse = await fetch('/api/admin/withdrawals?limit=1');
      if (testResponse.ok) {
        setIsAuthenticated(true);
        return true;
      }

      // Check if we have an admin token cookie
      const cookies = document.cookie;
      if (cookies.includes('admin-token')) {
        setIsAuthenticated(true);
        return true;
      }

      // If user is logged in as admin via session, auto-login
      if (isAdmin && session?.user?.email) {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: session.user.email,
            password: 'admin1223!' // Default admin password
          }),
        });

        if (response.ok) {
          setIsAuthenticated(true);
          return true;
        }
      }

      // If not authenticated, show login prompt
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authenticated = await checkAdminAuth();
        if (authenticated) {
          await fetchWithdrawals();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      initAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [session, isAdmin]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWithdrawals();
    }
  }, [statusFilter, methodFilter, searchTerm, isAuthenticated]);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchTerm ||
      transaction.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Manual admin login function
  const handleAdminLogin = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login...');
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@ticgloballtd.com',
          password: 'admin1223!'
        }),
      });

      const responseData = await response.json();
      console.log('Login response:', responseData);

      if (response.ok) {
        toast({
          title: 'Login Successful',
          description: 'Admin access granted!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setIsAuthenticated(true);
        // Wait a moment for the cookie to be set
        setTimeout(() => {
          fetchWithdrawals();
        }, 500);
      } else {
        console.error('Login failed:', responseData);
        toast({
          title: 'Login Failed',
          description: responseData.error || 'Invalid admin credentials',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Network error during login',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="stretch" maxW="md" mx="auto" mt={20}>
          <Card bg={cardBgColor} shadow="lg">
            <CardHeader textAlign="center">
              <VStack spacing={3}>
                <Box
                  p={4}
                  borderRadius="full"
                  bg="red.500"
                  color="white"
                  fontSize="2xl"
                >
                  🛡️
                </Box>
                <Heading as="h1" size="lg" color={textColor}>
                  Admin Authentication Required
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Please authenticate to access withdrawal management
                </Text>
              </VStack>
            </CardHeader>
            <CardBody textAlign="center">
              <VStack spacing={4}>
                <Button
                  colorScheme="red"
                  size="lg"
                  onClick={handleAdminLogin}
                  isLoading={isLoading}
                >
                  Login as Admin
                </Button>
                <Button
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Debug info:');
                    console.log('Session:', session);
                    console.log('IsAdmin:', isAdmin);
                    console.log('IsAuthenticated:', isAuthenticated);
                    console.log('Cookies:', document.cookie);
                  }}
                >
                  Debug Info
                </Button>
                <Text fontSize="xs" color="gray.500">
                  This will authenticate you with admin credentials
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Center h="calc(100vh - 60px)">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading withdrawal requests...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  Admin - Withdrawal Management
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Monitor and process withdrawal requests
                </Text>
              </VStack>
              <Spacer />
              <Button
                leftIcon={<FaSync />}
                onClick={fetchWithdrawals}
                isLoading={isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Refresh
              </Button>
            </Flex>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Status</FormLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </FormControl>

              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Method</FormLabel>
                <Select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  size="sm"
                >
                  <option value="all">All Methods</option>
                  <option value="usdt_trc20">USDT (TRC20)</option>
                  <option value="usdt_bep20">USDT (BEP20)</option>
                  <option value="usdt_polygon">USDT (Polygon)</option>
                  <option value="gcash">GCash</option>
                  <option value="paymaya">PayMaya</option>
                </Select>
              </FormControl>

              <FormControl maxW="300px">
                <FormLabel fontSize="sm">Search User</FormLabel>
                <InputGroup size="sm">
                  <InputLeftElement>
                    <FaSearch color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </FormControl>
            </HStack>
          </CardBody>
        </Card>

        {/* Withdrawals Table */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <HStack>
              <Heading as="h2" size="md" color={textColor}>
                Withdrawal Requests ({transactions.length})
              </Heading>
              <Spacer />
              <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Requests
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            {transactions.length === 0 ? (
              <Center py={10}>
                <VStack spacing={4}>
                  <Text color="gray.500" fontSize="lg">
                    No withdrawal requests found
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Try adjusting your filters or check back later
                  </Text>
                </VStack>
              </Center>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>User</Th>
                      <Th>Amount</Th>
                      <Th>Method</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((transaction) => (
                      <Tr key={transaction.id}>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm" fontWeight="medium">
                              {transaction.user_email}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              ID: {transaction.id.slice(0, 8)}...
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <Text fontWeight="bold" color="green.500">
                            ${transaction.amount.toLocaleString()}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme="blue" variant="subtle">
                            {getMethodDisplay(transaction.method)}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(transaction.status)}>
                            {transaction.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Tooltip label="View Details">
                              <IconButton
                                aria-label="View details"
                                icon={<FaEye />}
                                size="sm"
                                variant="outline"
                                onClick={() => openTransactionModal(transaction)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Transaction Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Withdrawal Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTransaction && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="bold">Status:</Text>
                  <Badge colorScheme={getStatusColor(selectedTransaction.status)}>
                    {selectedTransaction.status.toUpperCase()}
                  </Badge>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">User:</Text>
                  <Text>{selectedTransaction.user_email}</Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Amount:</Text>
                  <Text fontWeight="bold" color="green.500">
                    ${selectedTransaction.amount.toLocaleString()}
                  </Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Method:</Text>
                  <Badge colorScheme="blue">
                    {getMethodDisplay(selectedTransaction.method)}
                  </Badge>
                </HStack>

                {selectedTransaction.wallet_address && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="bold">Wallet Address:</Text>
                    <Text fontSize="sm" fontFamily="mono" bg="gray.100" p={2} borderRadius="md">
                      {selectedTransaction.wallet_address}
                    </Text>
                  </VStack>
                )}

                {(selectedTransaction.account_number || selectedTransaction.account_name) && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="bold">Account Details:</Text>
                    {selectedTransaction.account_name && (
                      <Text fontSize="sm">Name: {selectedTransaction.account_name}</Text>
                    )}
                    {selectedTransaction.account_number && (
                      <Text fontSize="sm">Number: {selectedTransaction.account_number}</Text>
                    )}
                  </VStack>
                )}

                <FormControl>
                  <FormLabel>Admin Notes</FormLabel>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this withdrawal..."
                    rows={3}
                  />
                </FormControl>

                {selectedTransaction.status === 'pending' && (
                  <Alert status="info">
                    <AlertIcon />
                    <AlertTitle>Action Required!</AlertTitle>
                    <AlertDescription>
                      This withdrawal is pending your approval or rejection.
                    </AlertDescription>
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              {selectedTransaction?.status === 'pending' && (
                <>
                  <Button
                    colorScheme="red"
                    leftIcon={<FaTimes />}
                    onClick={() => handleWithdrawalAction('reject')}
                    isLoading={isProcessing}
                  >
                    Reject
                  </Button>
                  <Button
                    colorScheme="green"
                    leftIcon={<FaCheck />}
                    onClick={() => handleWithdrawalAction('approve')}
                    isLoading={isProcessing}
                  >
                    Approve
                  </Button>
                </>
              )}
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
