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
  status: string;
  created_at: string;
  transaction_hash?: string;
  wallet_address?: string;
  notes?: string;
  proof_image?: string;
}

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<Transaction | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const fetchDeposits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/deposits');
      if (response.ok) {
        const data = await response.json();
        setDeposits(data.deposits || []);
      } else {
        throw new Error('Failed to fetch deposits');
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deposits',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedDeposit) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/deposits/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          depositId: selectedDeposit.id,
          action,
          notes: actionNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Deposit ${action}d successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh the deposits list
        await fetchDeposits();
        onClose();
        setActionNotes('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} deposit`);
      }
    } catch (error) {
      console.error(`Error ${action}ing deposit:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} deposit`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDepositModal = (deposit: Transaction) => {
    setSelectedDeposit(deposit);
    setActionNotes('');
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'completed': return 'blue';
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
          <Text>Loading deposits...</Text>
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
                  💰 Deposit Management
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Review and manage user deposit requests
                </Text>
              </VStack>
              <Spacer />
              <Button
                leftIcon={<FaSync />}
                onClick={fetchDeposits}
                isLoading={isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Refresh
              </Button>
            </Flex>
          </CardHeader>
        </Card>

        {/* Deposits Table */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            {deposits.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                <AlertTitle>No Deposits Found</AlertTitle>
                <AlertDescription>
                  There are currently no deposit requests to review.
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
                    {deposits.map((deposit) => (
                      <Tr key={deposit.id}>
                        <Td>
                          <Text fontWeight="medium">{deposit.user_email}</Text>
                        </Td>
                        <Td>
                          <Text fontWeight="bold">
                            {formatAmount(deposit.amount, deposit.currency)}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(deposit.status)}>
                            {deposit.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm">{formatDate(deposit.created_at)}</Text>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Tooltip label="View Details">
                              <IconButton
                                aria-label="View deposit details"
                                icon={<FaEye />}
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => openDepositModal(deposit)}
                              />
                            </Tooltip>
                            {deposit.status === 'pending' && (
                              <>
                                <Tooltip label="Approve">
                                  <IconButton
                                    aria-label="Approve deposit"
                                    icon={<FaCheck />}
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => openDepositModal(deposit)}
                                  />
                                </Tooltip>
                                <Tooltip label="Reject">
                                  <IconButton
                                    aria-label="Reject deposit"
                                    icon={<FaTimes />}
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => openDepositModal(deposit)}
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

        {/* Deposit Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Deposit Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedDeposit && (
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">User:</Text>
                    <Text>{selectedDeposit.user_email}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Amount:</Text>
                    <Text>{formatAmount(selectedDeposit.amount, selectedDeposit.currency)}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Status:</Text>
                    <Badge colorScheme={getStatusColor(selectedDeposit.status)}>
                      {selectedDeposit.status.toUpperCase()}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Date:</Text>
                    <Text>{formatDate(selectedDeposit.created_at)}</Text>
                  </HStack>
                  
                  {selectedDeposit.status === 'pending' && (
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
              {selectedDeposit?.status === 'pending' ? (
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
