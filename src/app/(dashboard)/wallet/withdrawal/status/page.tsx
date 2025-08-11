'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  useToast,
  Code,
  Divider,
  Icon,
  Center,
  Card,
  CardBody,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import { FaClock, FaArrowLeft, FaCheck, FaTimes, FaHeadset } from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

interface WithdrawalDetails {
  transactionId: string;
  transactionHash?: string;
  amount: string;
  currency: string;
  method: string;
  destinationAddress: string;
  status: string;
  processingTime?: string;
  isTronpy?: boolean;
  network?: string;
  processingFee?: number;
  finalAmount?: number;
  originalAmount?: number;
}

function WithdrawalStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [withdrawalDetails, setWithdrawalDetails] = useState<WithdrawalDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  // Check withdrawal status from database
  const checkWithdrawalStatus = async (transactionId: string) => {
    try {
      setIsCheckingStatus(true);
      const response = await fetch(`/api/withdrawals/status?transactionId=${transactionId}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.withdrawal) {
          const newStatus = data.withdrawal.status;
          const withdrawal = data.withdrawal;

          // Update withdrawal details with fee information from database
          if (withdrawalDetails) {
            setWithdrawalDetails({
              ...withdrawalDetails,
              processingFee: withdrawal.processing_fee || 0,
              finalAmount: withdrawal.final_amount || parseFloat(withdrawalDetails.amount),
              originalAmount: withdrawal.amount || parseFloat(withdrawalDetails.amount)
            });
          }

          if (newStatus !== currentStatus) {
            setCurrentStatus(newStatus);

            // Show notification when status changes
            if (newStatus === 'completed') {
              toast({
                title: 'Withdrawal Completed!',
                description: 'Your withdrawal has been processed successfully.',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            } else if (newStatus === 'rejected') {
              toast({
                title: 'Withdrawal Rejected',
                description: 'Your withdrawal was not approved. Please contact support for details.',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking withdrawal status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    // Get withdrawal details from URL parameters
    const transactionId = searchParams?.get('transactionId');
    const transactionHash = searchParams?.get('transactionHash');
    const amount = searchParams?.get('amount');
    const currency = searchParams?.get('currency');
    const method = searchParams?.get('method');
    const destinationAddress = searchParams?.get('destinationAddress');
    const status = searchParams?.get('status');
    const processingTime = searchParams?.get('processingTime');
    const isTronpy = searchParams?.get('tronpy') === 'true';
    const network = searchParams?.get('network');

    if (transactionId && amount && method && destinationAddress) {
      const details = {
        transactionId,
        transactionHash: transactionHash || undefined,
        amount,
        currency: currency || 'USD',
        method,
        destinationAddress,
        status: status || 'pending',
        processingTime: processingTime || 'Instant - 24 hours',
        isTronpy,
        network: network || undefined
      };

      setWithdrawalDetails(details);
      setCurrentStatus(details.status);

      // Fetch fee information from database
      checkWithdrawalStatus(transactionId);
    }

    setIsLoading(false);
  }, [searchParams]);

  // Auto-check status every 10 seconds if still pending
  useEffect(() => {
    if (!withdrawalDetails || (currentStatus !== 'pending' && currentStatus !== 'broadcasted')) return;

    // For TronPy withdrawals, we monitor blockchain transactions
    if (withdrawalDetails.isTronpy && withdrawalDetails.transactionHash) {
      const interval = setInterval(async () => {
        try {
          // Check blockchain transaction status
          const response = await fetch(`/api/tronpy/withdrawals?action=check-transaction&hash=${withdrawalDetails.transactionHash}&network=${withdrawalDetails.network}`);
          const data = await response.json();

          if (data.success && data.status === 'confirmed') {
            setCurrentStatus('completed');
            toast({
              title: 'Withdrawal Confirmed!',
              description: 'Your blockchain withdrawal has been confirmed and completed.',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
          }
        } catch (error) {
          console.error('Error checking TronPy withdrawal status:', error);
        }
      }, 15000); // Check every 15 seconds for TronPy

      return () => clearInterval(interval);
    } else {
      // For traditional withdrawals, check transaction status
      if (!withdrawalDetails.transactionId) return;

      // Check status immediately when page loads
      checkWithdrawalStatus(withdrawalDetails.transactionId);

      // Then check every 10 seconds
      const interval = setInterval(() => {
        checkWithdrawalStatus(withdrawalDetails.transactionId);
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [withdrawalDetails, currentStatus]);

  if (isLoading) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <Center minH="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color={textColor}>Loading withdrawal details...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  if (!withdrawalDetails) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Alert status="error" maxW="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Invalid Withdrawal Request</AlertTitle>
              <AlertDescription>
                No withdrawal details found. Please start a new withdrawal request.
              </AlertDescription>
            </Box>
          </Alert>
          <Button colorScheme="blue" onClick={() => router.push('/wallet/withdrawal')}>
            Start New Withdrawal
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="3xl" mx="auto">
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          {(currentStatus === 'pending' || currentStatus === 'broadcasted') && (
            <>
              <Icon as={FaClock} boxSize={10} color="orange.500" />
              <Heading as="h1" size="xl" color={textColor}>
                {withdrawalDetails.isTronpy ? 'TRON Blockchain Withdrawal Processing' : 'Withdrawal Processing'}
              </Heading>
              <Text fontSize="lg" color={subtleTextColor}>
                {withdrawalDetails.isTronpy
                  ? 'Your withdrawal has been broadcasted to the TRON blockchain'
                  : 'Your withdrawal request is being processed'
                }
              </Text>
            </>
          )}
          {currentStatus === 'completed' && (
            <>
              <Icon as={FaCheck} boxSize={10} color="green.500" />
              <Heading as="h1" size="xl" color={textColor}>
                {withdrawalDetails.isTronpy ? 'TRON Blockchain Withdrawal Confirmed!' : 'Withdrawal Completed!'}
              </Heading>
              <Text fontSize="lg" color={subtleTextColor}>
                {withdrawalDetails.isTronpy
                  ? 'Your withdrawal has been confirmed on the TRON blockchain'
                  : 'Your withdrawal has been processed successfully'
                }
              </Text>
            </>
          )}
          {currentStatus === 'rejected' && (
            <>
              <Icon as={FaTimes} boxSize={10} color="red.500" />
              <Heading as="h1" size="xl" color={textColor}>
                Withdrawal Rejected
              </Heading>
              <Text fontSize="lg" color={subtleTextColor}>
                Your withdrawal was not approved. Please contact support for details.
              </Text>
            </>
          )}
        </VStack>

        {/* Status-based Instructions */}
        {(currentStatus === 'pending' || currentStatus === 'broadcasted') && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              {withdrawalDetails.isTronpy ? (
                <>
                  <AlertTitle>🔗 TRON Blockchain Transaction</AlertTitle>
                  <AlertDescription display="block">
                    Your withdrawal of <strong>{withdrawalDetails.amount} {withdrawalDetails.currency}</strong> has been broadcasted to the {withdrawalDetails.network} blockchain.
                    {withdrawalDetails.transactionHash && (
                      <>
                        <br />Transaction Hash: {withdrawalDetails.transactionHash.slice(0, 20)}...
                      </>
                    )}
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTitle>Transaction ID: {withdrawalDetails.transactionId}</AlertTitle>
                  <AlertDescription display="block">
                    Your withdrawal of <strong>${withdrawalDetails.amount} {withdrawalDetails.currency}</strong> to {withdrawalDetails.destinationAddress.slice(0, 10)}... is being processed.
                  </AlertDescription>
                </>
              )}
            </Box>
          </Alert>
        )}

        {currentStatus === 'completed' && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              {withdrawalDetails.isTronpy ? (
                <>
                  <AlertTitle>✅ TRON Blockchain Withdrawal Confirmed</AlertTitle>
                  <AlertDescription display="block">
                    Your withdrawal of <strong>{withdrawalDetails.amount} {withdrawalDetails.currency}</strong> has been confirmed on the {withdrawalDetails.network} blockchain and sent to your wallet!
                    {withdrawalDetails.transactionHash && (
                      <>
                        <br />Transaction Hash: {withdrawalDetails.transactionHash.slice(0, 20)}...
                      </>
                    )}
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTitle>Transaction ID: {withdrawalDetails.transactionId}</AlertTitle>
                  <AlertDescription display="block">
                    Your withdrawal of <strong>${withdrawalDetails.amount} {withdrawalDetails.currency}</strong> has been successfully sent to your wallet!
                  </AlertDescription>
                </>
              )}
            </Box>
          </Alert>
        )}

        {currentStatus === 'rejected' && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Transaction ID: {withdrawalDetails.transactionId}</AlertTitle>
              <AlertDescription display="block">
                Your withdrawal of <strong>${withdrawalDetails.amount} {withdrawalDetails.currency}</strong> was rejected. Please save your transaction ID for reference and contact support for assistance.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Withdrawal Details Card */}
        <Card bg={cardBgColor} shadow="lg" borderWidth="2px"
              borderColor={currentStatus === 'completed' ? 'green.200' :
                          currentStatus === 'rejected' ? 'red.200' : 'orange.200'}>
          <CardBody p={6}>
            <VStack spacing={6} align="stretch">
              {/* Amount and Method */}
              <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {withdrawalDetails.method}
                  </Text>
                  <Text fontSize="sm" color={subtleTextColor}>
                    Processing time: {withdrawalDetails.processingTime}
                  </Text>
                </VStack>
                <Badge colorScheme="blue" fontSize="lg" p={3}>
                  ${withdrawalDetails.amount} {withdrawalDetails.currency}
                </Badge>
              </HStack>

              <Divider />

              {/* Fee Breakdown - Only show for manual methods with fees */}
              {withdrawalDetails.processingFee !== undefined && withdrawalDetails.processingFee > 0 && (
                <>
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="lg" fontWeight="bold" color={textColor} textAlign="center">
                      Fee Breakdown:
                    </Text>

                    <Box
                      p={4}
                      bg={useColorModeValue('orange.50', 'orange.900')}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={useColorModeValue('orange.200', 'orange.600')}
                    >
                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                          <Text fontSize="sm" color={subtleTextColor}>Original Amount:</Text>
                          <Text fontSize="sm" fontWeight="bold" color={textColor}>
                            ${(withdrawalDetails.originalAmount || parseFloat(withdrawalDetails.amount)).toFixed(2)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color={subtleTextColor}>Processing Fee (10%):</Text>
                          <Text fontSize="sm" fontWeight="bold" color="red.500">
                            -${withdrawalDetails.processingFee.toFixed(2)}
                          </Text>
                        </HStack>
                        <Divider borderColor={useColorModeValue('orange.300', 'orange.600')} />
                        <HStack justify="space-between">
                          <Text fontSize="md" fontWeight="bold" color={textColor}>You Will Receive:</Text>
                          <Text fontSize="md" fontWeight="bold" color="green.500">
                            ${(withdrawalDetails.finalAmount || (parseFloat(withdrawalDetails.amount) - withdrawalDetails.processingFee)).toFixed(2)}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  </VStack>

                  <Divider />
                </>
              )}

              {/* Destination Address */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" color={textColor} textAlign="center">
                  Destination Address:
                </Text>
                
                <Box
                  p={4}
                  bg={useColorModeValue('gray.50', 'gray.600')}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.500')}
                  textAlign="center"
                >
                  <Code
                    fontSize="sm"
                    p={2}
                    borderRadius="md"
                    w="full"
                    wordBreak="break-all"
                    bg={useColorModeValue('white', 'gray.800')}
                    color={textColor}
                    fontFamily="mono"
                  >
                    {withdrawalDetails.destinationAddress}
                  </Code>
                </Box>
              </VStack>

              <Divider />

              {/* Status and Actions */}
              <VStack spacing={4}>
                <HStack spacing={2} align="center">
                  {currentStatus === 'pending' && (
                    <>
                      <Icon as={FaClock} color="orange.500" />
                      <Text fontSize="sm" color={subtleTextColor}>
                        Status: Processing withdrawal
                      </Text>
                      {isCheckingStatus && <Spinner size="sm" color="blue.500" />}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => checkWithdrawalStatus(withdrawalDetails.transactionId)}
                        isLoading={isCheckingStatus}
                        loadingText="Checking..."
                      >
                        Check Status
                      </Button>
                    </>
                  )}
                  {currentStatus === 'completed' && (
                    <>
                      <Icon as={FaCheck} color="green.500" />
                      <Text fontSize="sm" color="green.500" fontWeight="bold">
                        Status: Withdrawal Completed
                      </Text>
                    </>
                  )}
                  {currentStatus === 'rejected' && (
                    <>
                      <Icon as={FaTimes} color="red.500" />
                      <Text fontSize="sm" color="red.500" fontWeight="bold">
                        Status: Withdrawal Rejected
                      </Text>
                    </>
                  )}
                </HStack>

                <HStack spacing={3} justify="center" pt={2} flexWrap="wrap">
                  <Button
                    leftIcon={<Icon as={FaArrowLeft} />}
                    onClick={() => router.push('/wallet')}
                    variant="outline"
                  >
                    Back to Wallet
                  </Button>
                  <Button
                    onClick={() => router.push('/wallet/withdrawal')}
                    colorScheme="blue"
                    variant="outline"
                  >
                    New Withdrawal
                  </Button>
                  {currentStatus === 'rejected' && (
                    <Button
                      leftIcon={<Icon as={FaHeadset} />}
                      onClick={() => {
                        const supportUrl = new URL('/support-hub', window.location.origin);
                        supportUrl.searchParams.set('transactionId', withdrawalDetails.transactionId);
                        supportUrl.searchParams.set('issueType', 'withdrawal-rejected');
                        supportUrl.searchParams.set('amount', withdrawalDetails.amount);
                        router.push(supportUrl.pathname + supportUrl.search);
                      }}
                      colorScheme="red"
                      variant="solid"
                    >
                      Contact Support
                    </Button>
                  )}
                </HStack>
              </VStack>
            </VStack>
          </CardBody>
        </Card>


      </VStack>
    </Box>
  );
}

export default function WithdrawalStatusPage() {
  return (
    <Suspense fallback={
      <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="calc(100vh - 60px)">
        <Center minH="400px">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </Box>
    }>
      <WithdrawalStatusContent />
    </Suspense>
  );
}
