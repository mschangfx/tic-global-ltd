'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardBody,
  Divider,
  Select,
  useToast,
  Link,
  Code,
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
  FormLabel
} from '@chakra-ui/react';
import {
  FaMoneyBillWave,
  FaClock,
  FaCheck,
  FaTimes,
  FaEye,
  FaExternalLinkAlt,
  FaPlus,
  FaSync
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  network: string;
  wallet_address: string;
  transaction_hash?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  processing_fee: number;
  network_fee: number;
  final_amount: number;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  request_metadata?: any;
}

interface WalletInfo {
  total_balance: number;
  tic_balance: number;
  gic_balance: number;
  staking_balance: number;
  last_updated: string;
}

interface DepositStats {
  total_deposits: number;
  total_amount: number;
  pending_deposits: number;
  approved_deposits: number;
  success_rate: string;
}

export default function UserDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [stats, setStats] = useState<DepositStats>({
    total_deposits: 0,
    total_amount: 0,
    pending_deposits: 0,
    approved_deposits: 0,
    success_rate: '0'
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [previousDeposits, setPreviousDeposits] = useState<Deposit[]>([]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onClose: onCancelClose
  } = useDisclosure();
  
  const toast = useToast();
  const router = useRouter();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    loadDeposits();
  }, [statusFilter]);

  // Auto-refresh every 30 seconds for pending deposits
  useEffect(() => {
    const interval = setInterval(() => {
      if (statusFilter === 'pending' || statusFilter === 'all') {
        loadDeposits();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadDeposits = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '50'
      });

      const response = await fetch(`/api/user/deposits?${params}`);
      const data = await response.json();

      if (data.success) {
        // Check for status changes
        if (previousDeposits.length > 0) {
          data.deposits.forEach((newDeposit: Deposit) => {
            const oldDeposit = previousDeposits.find(d => d.id === newDeposit.id);
            if (oldDeposit && oldDeposit.status !== newDeposit.status) {
              // Status changed - show notification
              const statusColor = newDeposit.status === 'completed' ? 'success' :
                                newDeposit.status === 'rejected' ? 'error' : 'info';
              toast({
                title: 'Deposit Status Updated',
                description: `Your $${newDeposit.amount} deposit is now ${newDeposit.status}`,
                status: statusColor,
                duration: 5000,
                isClosable: true,
              });
            }
          });
        }

        setPreviousDeposits(data.deposits);
        setDeposits(data.deposits);
        setWallet(data.wallet);
        setStats(data.statistics);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading deposits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deposits',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDeposit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    onOpen();
  };

  const handleCancelDeposit = async () => {
    if (!selectedDeposit) return;

    try {
      setIsCancelling(true);
      const response = await fetch('/api/user/deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedDeposit.id,
          reason: cancelReason
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Deposit cancelled successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onCancelClose();
        onClose();
        loadDeposits();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error cancelling deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel deposit',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'approved': return 'green';
      case 'completed': return 'blue';
      case 'rejected': return 'red';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'TRC20': return 'green';
      case 'BEP20': return 'yellow';
      case 'Polygon': return 'purple';
      default: return 'gray';
    }
  };

  const getExplorerUrl = (network: string, address: string) => {
    switch (network) {
      case 'TRC20':
        return `https://tronscan.org/#/address/${address}`;
      case 'BEP20':
        return `https://bscscan.com/address/${address}`;
      case 'Polygon':
        return `https://polygonscan.com/address/${address}`;
      default:
        return null;
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="full" mx="auto">
        <HStack justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            💰 My Deposits
          </Heading>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={FaSync} />}
              onClick={loadDeposits}
              isLoading={isLoading}
              size="sm"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Icon as={FaPlus} />}
              colorScheme="blue"
              onClick={() => router.push('/wallet/deposit')}
              size="sm"
            >
              New Deposit
            </Button>
          </HStack>
        </HStack>

        {/* Wallet Balance Card */}
        {wallet && (
          <Card bg={cardBgColor}>
            <CardBody>
              <VStack spacing={4}>
                <Heading as="h2" size="md" color={textColor}>
                  Current Wallet Balance
                </Heading>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} w="full">
                  <Stat textAlign="center">
                    <StatLabel>Total Balance</StatLabel>
                    <StatNumber color="green.500">${parseFloat(wallet.total_balance.toString()).toFixed(2)}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>TIC Balance</StatLabel>
                    <StatNumber color="blue.500">${(wallet.tic_balance * 0.02).toFixed(2)}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>GIC Balance</StatLabel>
                    <StatNumber color="purple.500">${parseFloat(wallet.gic_balance.toString()).toFixed(2)}</StatNumber>
                  </Stat>
                </SimpleGrid>
                <Text fontSize="sm" color="gray.500">
                  Last updated: {new Date(wallet.last_updated).toLocaleString()}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Statistics Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
          <Card bg={cardBgColor}>
            <CardBody>
              <Stat>
                <StatLabel color={textColor}>Total Deposits</StatLabel>
                <StatNumber color="blue.500">{stats.total_deposits}</StatNumber>
                <StatHelpText>
                  <Icon as={FaMoneyBillWave} mr={1} />
                  All time
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor}>
            <CardBody>
              <Stat>
                <StatLabel color={textColor}>Total Amount</StatLabel>
                <StatNumber color="green.500">${stats.total_amount.toFixed(2)}</StatNumber>
                <StatHelpText>
                  <Icon as={FaMoneyBillWave} mr={1} />
                  Deposited
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor}>
            <CardBody>
              <Stat>
                <StatLabel color={textColor}>Pending</StatLabel>
                <StatNumber color="yellow.500">{stats.pending_deposits}</StatNumber>
                <StatHelpText>
                  <Icon as={FaClock} mr={1} />
                  Awaiting approval
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor}>
            <CardBody>
              <Stat>
                <StatLabel color={textColor}>Approved</StatLabel>
                <StatNumber color="green.500">{stats.approved_deposits}</StatNumber>
                <StatHelpText>
                  <Icon as={FaCheck} mr={1} />
                  Processed
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor}>
            <CardBody>
              <Stat>
                <StatLabel color={textColor}>Success Rate</StatLabel>
                <StatNumber color="blue.500">{stats.success_rate}%</StatNumber>
                <StatHelpText>
                  <Icon as={FaCheck} mr={1} />
                  Approval rate
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Filter and Deposits Table */}
        <Card bg={cardBgColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading as="h2" size="md" color={textColor}>
                  Deposit History
                </Heading>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  maxW="200px"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </HStack>

              {isLoading ? (
                <Text color={textColor}>Loading deposits...</Text>
              ) : deposits.length === 0 ? (
                <Alert status="info">
                  <AlertIcon />
                  <AlertTitle>No deposits found</AlertTitle>
                  <AlertDescription>
                    You haven't made any deposits yet. 
                    <Link href="/wallet/deposit" color="blue.500" ml={1}>
                      Make your first deposit
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Amount</Th>
                        <Th>Network</Th>
                        <Th>Status</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {deposits.map((deposit) => (
                        <Tr key={deposit.id}>
                          <Td color={textColor}>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold">${deposit.amount.toFixed(2)}</Text>
                              {deposit.processing_fee > 0 && (
                                <Text fontSize="xs" color="gray.500">
                                  Fee: ${deposit.processing_fee.toFixed(2)}
                                </Text>
                              )}
                            </VStack>
                          </Td>
                          <Td>
                            <Badge colorScheme={getNetworkColor(deposit.network)}>
                              {deposit.network}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(deposit.status)}>
                              {deposit.status}
                            </Badge>
                          </Td>
                          <Td color={textColor}>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm">
                                {new Date(deposit.created_at).toLocaleDateString()}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {new Date(deposit.created_at).toLocaleTimeString()}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>
                            <Button
                              size="sm"
                              leftIcon={<Icon as={FaEye} />}
                              onClick={() => handleViewDeposit(deposit)}
                            >
                              View
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* Deposit Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack spacing={2} align="start">
              <Text>Deposit Details</Text>
              {selectedDeposit && (
                <Badge colorScheme={getStatusColor(selectedDeposit.status)}>
                  {selectedDeposit.status.toUpperCase()}
                </Badge>
              )}
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDeposit && (
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontWeight="bold">Amount:</Text>
                    <Text>${selectedDeposit.amount.toFixed(2)} {selectedDeposit.currency}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Network:</Text>
                    <Badge colorScheme={getNetworkColor(selectedDeposit.network)}>
                      {selectedDeposit.network}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Processing Fee:</Text>
                    <Text>${selectedDeposit.processing_fee.toFixed(2)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Final Amount:</Text>
                    <Text fontWeight="bold" color="green.500">
                      ${selectedDeposit.final_amount.toFixed(2)}
                    </Text>
                  </Box>
                </SimpleGrid>

                <Box>
                  <Text fontWeight="bold">Deposit Address:</Text>
                  <Code fontSize="sm" p={2} borderRadius="md" wordBreak="break-all">
                    {selectedDeposit.wallet_address}
                  </Code>
                  {getExplorerUrl(selectedDeposit.network, selectedDeposit.wallet_address) && (
                    <Link
                      href={getExplorerUrl(selectedDeposit.network, selectedDeposit.wallet_address)!}
                      isExternal
                      color="blue.500"
                      mt={2}
                      display="block"
                    >
                      <Icon as={FaExternalLinkAlt} mr={1} />
                      View on Explorer
                    </Link>
                  )}
                </Box>

                {selectedDeposit.transaction_hash && (
                  <Box>
                    <Text fontWeight="bold">Transaction Hash:</Text>
                    <Code fontSize="sm" p={2} borderRadius="md" wordBreak="break-all">
                      {selectedDeposit.transaction_hash}
                    </Code>
                  </Box>
                )}

                <Box>
                  <Text fontWeight="bold">Created:</Text>
                  <Text>{new Date(selectedDeposit.created_at).toLocaleString()}</Text>
                </Box>

                {selectedDeposit.approved_at && (
                  <Box>
                    <Text fontWeight="bold">Approved:</Text>
                    <Text>{new Date(selectedDeposit.approved_at).toLocaleString()}</Text>
                    {selectedDeposit.approved_by && (
                      <Text fontSize="sm" color="gray.500">
                        by {selectedDeposit.approved_by}
                      </Text>
                    )}
                  </Box>
                )}

                {selectedDeposit.admin_notes && (
                  <Box>
                    <Text fontWeight="bold">Admin Notes:</Text>
                    <Text>{selectedDeposit.admin_notes}</Text>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              {selectedDeposit?.status === 'pending' && (
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onCancelOpen();
                  }}
                >
                  Cancel Deposit
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Cancel Deposit Modal */}
      <Modal isOpen={isCancelOpen} onClose={onCancelClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cancel Deposit</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning">
                <AlertIcon />
                <AlertDescription>
                  Are you sure you want to cancel this deposit? This action cannot be undone.
                </AlertDescription>
              </Alert>
              
              <FormControl>
                <FormLabel>Reason for cancellation (optional):</FormLabel>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="outline" onClick={onCancelClose}>
                Keep Deposit
              </Button>
              <Button
                colorScheme="red"
                onClick={handleCancelDeposit}
                isLoading={isCancelling}
              >
                Cancel Deposit
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
