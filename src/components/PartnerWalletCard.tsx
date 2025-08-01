'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Input,
  FormControl,
  FormLabel,
  useToast,
  useColorModeValue,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner,
  Divider
} from '@chakra-ui/react';
import { FaDollarSign, FaExchangeAlt, FaHistory, FaUsers, FaArrowRight } from 'react-icons/fa';
import WalletService from '@/lib/services/walletService';

interface CommissionEarning {
  id: string;
  referred_email: string;
  commission_type: string;
  commission_amount: number;
  commission_rate: number;
  description: string;
  created_at: string;
  status: string;
}

export default function PartnerWalletCard() {
  const [partnerBalance, setPartnerBalance] = useState(0);
  const [transferAmount, setTransferAmount] = useState('');
  const [commissionHistory, setCommissionHistory] = useState<CommissionEarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const walletService = WalletService.getInstance();

  useEffect(() => {
    loadPartnerWalletData();
  }, []);

  const loadPartnerWalletData = async () => {
    setIsLoading(true);
    try {
      const balance = await walletService.getBalance();
      setPartnerBalance(balance.partner_wallet);
    } catch (error) {
      console.error('Error loading partner wallet data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load partner wallet data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommissionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/partner-wallet/commissions');
      const data = await response.json();
      
      if (data.success) {
        setCommissionHistory(data.commissions || []);
      } else {
        throw new Error(data.error || 'Failed to load commission history');
      }
    } catch (error) {
      console.error('Error loading commission history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load commission history',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid transfer amount',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (amount > partnerBalance) {
      toast({
        title: 'Insufficient Balance',
        description: 'Transfer amount exceeds partner wallet balance',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsTransferring(true);
    try {
      const result = await walletService.transferPartnerToMainWallet(amount);
      
      if (result.success) {
        toast({
          title: 'Transfer Successful',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        setTransferAmount('');
        await loadPartnerWalletData(); // Refresh balance
      } else {
        toast({
          title: 'Transfer Failed',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error during transfer:', error);
      toast({
        title: 'Transfer Error',
        description: 'An unexpected error occurred during transfer',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleViewHistory = () => {
    loadCommissionHistory();
    onOpen();
  };

  const getCommissionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'signup': return 'green';
      case 'purchase': return 'blue';
      case 'activity': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <>
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
              <HStack>
                <Icon as={FaDollarSign} color="blue.500" boxSize={6} />
                <Heading size="md" color={textColor}>Partner Wallet</Heading>
              </HStack>
              <Badge colorScheme="blue" variant="subtle">Commission Earnings</Badge>
            </HStack>

            <Divider />

            {/* Balance Display */}
            <Stat textAlign="center">
              <StatLabel color={subtleTextColor}>Outstanding Commission</StatLabel>
              <StatNumber color="blue.500" fontSize="3xl">
                {isLoading ? <Spinner size="md" /> : `$${partnerBalance.toFixed(2)}`}
              </StatNumber>
              <StatHelpText color={subtleTextColor}>
                Available for transfer to main wallet
              </StatHelpText>
            </Stat>

            <Divider />

            {/* Transfer Section */}
            <VStack spacing={4} align="stretch">
              <Text fontWeight="medium" color={textColor}>Transfer to Main Wallet</Text>
              
              <FormControl>
                <FormLabel color={subtleTextColor}>Amount (USD)</FormLabel>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  max={partnerBalance}
                  step="0.01"
                />
              </FormControl>

              <HStack spacing={3}>
                <Button
                  colorScheme="blue"
                  leftIcon={<Icon as={FaExchangeAlt} />}
                  onClick={handleTransfer}
                  isLoading={isTransferring}
                  loadingText="Transferring..."
                  isDisabled={!transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > partnerBalance}
                  flex={1}
                >
                  Transfer Now
                </Button>
                
                <Button
                  variant="outline"
                  leftIcon={<Icon as={FaHistory} />}
                  onClick={handleViewHistory}
                  flex={1}
                >
                  View History
                </Button>
              </HStack>
            </VStack>

            {partnerBalance === 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="medium">Unilevel Commission Structure</Text>
                  <Text fontSize="xs">• Base earnings: $0.44 daily per VIP plan ($138 x 10% = $13.8 monthly)</Text>
                  <Text fontSize="xs">• Level 1: 10% = $0.044 daily bonus per VIP account</Text>
                  <Text fontSize="xs">• Levels 2-6: 5% = $0.022 daily bonus per VIP account</Text>
                  <Text fontSize="xs">• Levels 7-10: 2.5% = $0.011 daily bonus per VIP account</Text>
                  <Text fontSize="xs">• Levels 11-15: 1% = $0.0044 daily bonus per VIP account</Text>
                  <Text fontSize="xs" fontWeight="medium" color="blue.600">
                    VIP members earn up to 15 levels, Starter members earn level 1 only
                  </Text>
                </VStack>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Commission History Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <HStack>
              <Icon as={FaUsers} color="blue.500" />
              <Text>Commission History</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isLoadingHistory ? (
              <VStack py={8}>
                <Spinner size="lg" />
                <Text color={subtleTextColor}>Loading commission history...</Text>
              </VStack>
            ) : commissionHistory.length > 0 ? (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Referred User</Th>
                      <Th>Rate</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {commissionHistory.map((commission) => (
                      <Tr key={commission.id}>
                        <Td fontSize="sm">
                          {new Date(commission.created_at).toLocaleDateString()}
                        </Td>
                        <Td>
                          <Badge colorScheme={getCommissionTypeColor(commission.commission_type)} size="sm">
                            {commission.commission_type}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">{commission.referred_email}</Td>
                        <Td fontSize="sm">{(commission.commission_rate * 100).toFixed(1)}%</Td>
                        <Td fontSize="sm" fontWeight="bold" color="green.500">
                          ${commission.commission_amount.toFixed(2)}
                        </Td>
                        <Td>
                          <Badge colorScheme={commission.status === 'paid' ? 'green' : 'yellow'} size="sm">
                            {commission.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Alert status="info">
                <AlertIcon />
                <VStack align="start">
                  <Text>No commission history found</Text>
                  <Text fontSize="sm">
                    Commission earnings from your referrals will appear here
                  </Text>
                </VStack>
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
