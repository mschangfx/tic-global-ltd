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

interface Withdrawal {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  wallet_address?: string;
  notes?: string;
  transaction_hash?: string;
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/withdrawals');
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      } else {
        throw new Error('Failed to fetch withdrawals');
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawals',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes: actionNotes,
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
        
        // Refresh the withdrawals list
        await fetchWithdrawals();
        onClose();
        setActionNotes('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} withdrawal`);
      }
    } catch (error) {
      console.error(`Error ${action}ing withdrawal:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} withdrawal`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openWithdrawalModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setActionNotes('');
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'completed': return 'blue';
      case 'processing': return 'yellow';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
  };

  if (isLoading) {
    return (
      <Center h="calc(100vh - 200px)">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading withdrawals...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 80px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  💸 Withdrawal Management
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Review and process user withdrawal requests
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

        {/* Withdrawals Table */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            {withdrawals.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                <AlertTitle>No Withdrawals Found</AlertTitle>
                <AlertDescription>
                  There are currently no withdrawal requests to review.
                </AlertDescription>
              </Alert>
            ) : (
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>User</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {withdrawals.map((withdrawal) => (
                      <Tr key={withdrawal.id}>
                        <Td>
                          <Text fontWeight="medium">{withdrawal.user_email}</Text>
                        </Td>
                        <Td>
                          <Text fontWeight="bold">
                            {formatAmount(withdrawal.amount, withdrawal.currency)}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(withdrawal.status)}>
                            {withdrawal.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm">{formatDate(withdrawal.created_at)}</Text>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Tooltip label="View Details">
                              <IconButton
                                aria-label="View withdrawal details"
                                icon={<FaEye />}
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => openWithdrawalModal(withdrawal)}
                              />
                            </Tooltip>
                            {withdrawal.status === 'pending' && (
                              <>
                                <Tooltip label="Approve">
                                  <IconButton
                                    aria-label="Approve withdrawal"
                                    icon={<FaCheck />}
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => openWithdrawalModal(withdrawal)}
                                  />
                                </Tooltip>
                                <Tooltip label="Reject">
                                  <IconButton
                                    aria-label="Reject withdrawal"
                                    icon={<FaTimes />}
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => openWithdrawalModal(withdrawal)}
                                  />
                                </Tooltip>
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

        {/* Withdrawal Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Withdrawal Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedWithdrawal && (
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">User:</Text>
                    <Text>{selectedWithdrawal.user_email}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Amount:</Text>
                    <Text>{formatAmount(selectedWithdrawal.amount, selectedWithdrawal.currency)}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Status:</Text>
                    <Badge colorScheme={getStatusColor(selectedWithdrawal.status)}>
                      {selectedWithdrawal.status.toUpperCase()}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Date:</Text>
                    <Text>{formatDate(selectedWithdrawal.created_at)}</Text>
                  </HStack>
                  {selectedWithdrawal.wallet_address && (
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Wallet:</Text>
                      <Text fontSize="sm" fontFamily="mono">
                        {selectedWithdrawal.wallet_address}
                      </Text>
                    </HStack>
                  )}
                  
                  {selectedWithdrawal.status === 'pending' && (
                    <FormControl>
                      <FormLabel>Admin Notes</FormLabel>
                      <Textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Add notes about this action..."
                        rows={3}
                      />
                    </FormControl>
                  )}
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              {selectedWithdrawal?.status === 'pending' ? (
                <HStack spacing={3}>
                  <Button
                    colorScheme="green"
                    onClick={() => handleAction('approve')}
                    isLoading={isProcessing}
                    leftIcon={<FaCheck />}
                  >
                    Approve
                  </Button>
                  <Button
                    colorScheme="red"
                    onClick={() => handleAction('reject')}
                    isLoading={isProcessing}
                    leftIcon={<FaTimes />}
                  >
                    Reject
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                </HStack>
              ) : (
                <Button onClick={onClose}>Close</Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
}
