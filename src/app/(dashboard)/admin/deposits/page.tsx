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
  Tooltip
} from '@chakra-ui/react';
import { FaCheck, FaTimes, FaEye, FaSync, FaExternalLinkAlt } from 'react-icons/fa';
import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  network: string;
  wallet_address: string;
  status: string;
  created_at: string;
  request_metadata?: any;
}

export default function AdminDepositsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');

  // Fetch pending deposits
  const fetchPendingDeposits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/deposits?status=pending');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.deposits || []);
      } else {
        throw new Error('Failed to fetch deposits');
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending deposits',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update transaction status
  const updateTransactionStatus = async (transactionId: string, status: 'completed' | 'rejected', notes: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/deposits/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          status,
          adminNotes: notes,
          adminEmail: 'admin@ticglobal.com' // You can make this dynamic
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Deposit ${status === 'completed' ? 'approved' : 'rejected'} successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh the list
        await fetchPendingDeposits();
        onClose();
        setAdminNotes('');
      } else {
        throw new Error('Failed to update transaction');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to update transaction status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open transaction details modal
  const openTransactionModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setAdminNotes('');
    onOpen();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  // Open blockchain explorer
  const openBlockchainExplorer = (address: string) => {
    window.open(`https://tronscan.org/#/address/${address}`, '_blank');
  };

  useEffect(() => {
    fetchPendingDeposits();
  }, []);

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  Admin - Deposit Management
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Monitor and approve pending deposit requests
                </Text>
              </VStack>
              <Spacer />
              <Button
                leftIcon={<FaSync />}
                onClick={fetchPendingDeposits}
                isLoading={isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Refresh
              </Button>
            </Flex>
          </CardHeader>
        </Card>

        {/* Stats */}
        <HStack spacing={4}>
          <Card bg={cardBgColor} shadow="sm" flex="1">
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                {transactions.filter(t => t.status === 'pending').length}
              </Text>
              <Text fontSize="sm" color="gray.500">Pending Deposits</Text>
            </CardBody>
          </Card>
          <Card bg={cardBgColor} shadow="sm" flex="1">
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                ${transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
              </Text>
              <Text fontSize="sm" color="gray.500">Pending Amount</Text>
            </CardBody>
          </Card>
        </HStack>

        {/* Deposits Table */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading size="md" color={textColor}>Pending Deposits</Heading>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Center py={10}>
                <VStack spacing={4}>
                  <Spinner size="xl" color="blue.500" />
                  <Text color="gray.500">Loading deposits...</Text>
                </VStack>
              </Center>
            ) : transactions.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>No Pending Deposits</AlertTitle>
                  <AlertDescription>
                    All deposits have been processed or no new deposits are available.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>User Email</Th>
                      <Th>Amount</Th>
                      <Th>Network</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((transaction) => (
                      <Tr key={transaction.id}>
                        <Td fontSize="sm">
                          {formatDate(transaction.created_at)}
                        </Td>
                        <Td fontSize="sm">{transaction.user_email}</Td>
                        <Td fontSize="sm" fontWeight="bold">
                          ${transaction.amount.toFixed(2)} {transaction.currency}
                        </Td>
                        <Td>
                          <Badge colorScheme="blue" size="sm">
                            {transaction.network}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(transaction.status)} size="sm">
                            {transaction.status.toUpperCase()}
                          </Badge>
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
                            <Tooltip label="Check Blockchain">
                              <IconButton
                                aria-label="Check blockchain"
                                icon={<FaExternalLinkAlt />}
                                size="sm"
                                variant="outline"
                                colorScheme="blue"
                                onClick={() => openBlockchainExplorer(transaction.wallet_address)}
                              />
                            </Tooltip>
                            {transaction.status === 'pending' && (
                              <>
                                <Button
                                  leftIcon={<FaCheck />}
                                  size="sm"
                                  colorScheme="green"
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setAdminNotes('Payment verified on blockchain');
                                    updateTransactionStatus(transaction.id, 'completed', 'Payment verified on blockchain');
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  leftIcon={<FaTimes />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setAdminNotes('Payment not received or incorrect amount');
                                    updateTransactionStatus(transaction.id, 'rejected', 'Payment not received or incorrect amount');
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
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
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Transaction Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTransaction && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Transaction ID:</Text>
                  <Text fontSize="sm" fontFamily="mono">{selectedTransaction.id}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">User Email:</Text>
                  <Text>{selectedTransaction.user_email}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Amount:</Text>
                  <Text>${selectedTransaction.amount.toFixed(2)} {selectedTransaction.currency}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Network:</Text>
                  <Text>{selectedTransaction.network}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Wallet Address (Our Address):</Text>
                  <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                    {selectedTransaction.wallet_address}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Created:</Text>
                  <Text>{formatDate(selectedTransaction.created_at)}</Text>
                </Box>
                
                <FormControl>
                  <FormLabel>Admin Notes</FormLabel>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about verification, blockchain hash, etc..."
                    rows={3}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => selectedTransaction && updateTransactionStatus(selectedTransaction.id, 'rejected', adminNotes)}
                isLoading={isProcessing}
              >
                Reject
              </Button>
              <Button
                colorScheme="green"
                onClick={() => selectedTransaction && updateTransactionStatus(selectedTransaction.id, 'completed', adminNotes)}
                isLoading={isProcessing}
              >
                Approve
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
