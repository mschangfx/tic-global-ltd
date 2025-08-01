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
  Progress
} from '@chakra-ui/react';
import { FaCopy, FaQrcode, FaClock, FaArrowLeft, FaExclamationTriangle, FaCheck, FaTimes, FaHeadset } from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

interface DepositDetails {
  transactionId?: string;
  amount: string;
  currency: string;
  network: string;
  address: string;
  method: string;
  processingTime: string;
  status: string;
  isWeb3?: boolean;
  web3Network?: string;
  tokenSymbol?: string;
}



function DepositPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [depositDetails, setDepositDetails] = useState<DepositDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);



  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = 'blue.500';
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Check transaction status from database
  const checkTransactionStatus = async (transactionId: string) => {
    try {
      setIsCheckingStatus(true);
      const response = await fetch(`/api/deposits/status?transactionId=${transactionId}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.transaction) {
          const newStatus = data.transaction.status;

          if (newStatus !== currentStatus) {
            setCurrentStatus(newStatus);

            // Show notification when status changes
            if (newStatus === 'completed') {
              toast({
                title: 'Deposit Completed',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            } else if (newStatus === 'rejected') {
              toast({
                title: 'Deposit Rejected',
                description: 'Your deposit was not approved. Please contact support for details.',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    // Get deposit details from URL parameters
    const transactionId = searchParams?.get('transactionId');
    const amount = searchParams?.get('amount');
    const currency = searchParams?.get('currency');
    const network = searchParams?.get('network');
    const address = searchParams?.get('address');
    const method = searchParams?.get('method');
    const processingTime = searchParams?.get('processingTime');
    const status = searchParams?.get('status');
    const isWeb3 = searchParams?.get('web3') === 'true';
    const web3Network = searchParams?.get('web3Network');
    const tokenSymbol = searchParams?.get('tokenSymbol');

    // For Web3 deposits, we don't need a transactionId initially
    if (amount && network && address) {
      const details = {
        transactionId: transactionId || undefined,
        amount,
        currency: currency || 'USD',
        network,
        address,
        method: method || 'USDT',
        processingTime: processingTime || 'Instant - 15 minutes',
        status: status || 'pending',
        isWeb3,
        web3Network: web3Network || undefined,
        tokenSymbol: tokenSymbol || undefined
      };

      setDepositDetails(details);
      setCurrentStatus(details.status);
    }

    setIsLoading(false);
  }, [searchParams]);

  // Auto-check status every 10 seconds if still pending
  useEffect(() => {
    if (!depositDetails || currentStatus !== 'pending') return;

    // For Web3 deposits, we monitor blockchain transactions
    if (depositDetails.isWeb3) {
      // Web3 deposits are automatically monitored by the blockchain monitor
      // We can check for blockchain transactions periodically
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/web3/deposits?action=history');
          const data = await response.json();

          if (data.success && data.deposits.length > 0) {
            // Check if there's a recent deposit for this address
            const recentDeposit = data.deposits.find((deposit: any) =>
              deposit.to_address === depositDetails.address &&
              deposit.status === 'confirmed'
            );

            if (recentDeposit) {
              setCurrentStatus('completed');
              toast({
                title: 'Deposit Completed',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        } catch (error) {
          console.error('Error checking Web3 deposit status:', error);
        }
      }, 15000); // Check every 15 seconds for Web3

      return () => clearInterval(interval);
    } else {
      // For traditional deposits, check transaction status
      if (!depositDetails.transactionId) return;

      const interval = setInterval(() => {
        checkTransactionStatus(depositDetails.transactionId!);
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [depositDetails, currentStatus]);

  const handleCopyAddress = async () => {
    if (!depositDetails) return;

    try {
      await navigator.clipboard.writeText(depositDetails.address);
      toast({
        title: 'Address Copied!',
        description: 'Wallet address has been copied to clipboard.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = depositDetails.address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();

        toast({
          title: 'Address Copied!',
          description: 'Wallet address has been copied to clipboard.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } catch (fallbackErr) {
        toast({
          title: 'Failed to copy',
          description: 'Please copy the address manually',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const generateQRCode = async () => {
    if (!depositDetails) return;

    try {
      const response = await fetch('/api/deposits/trc20', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: depositDetails.address,
          size: 300,
          format: 'dataurl',
          includeAmount: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Open QR code in new window
          const newWindow = window.open('', '_blank', 'width=400,height=500');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>Deposit QR Code</title></head>
                <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                  <h2>Deposit Address QR Code</h2>
                  <p>${depositDetails.method} (${depositDetails.network})</p>
                  <img src="${data.qrCode}" alt="Deposit QR Code" style="max-width: 300px; border: 1px solid #ccc; border-radius: 8px; padding: 10px; background: white;" />
                  <p style="font-size: 12px; word-break: break-all; margin: 20px 0;">${depositDetails.address}</p>
                  <button onclick="window.close()" style="padding: 10px 20px; background: #4299e1; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                </body>
              </html>
            `);
          }
        } else {
          throw new Error(data.error || 'Failed to generate QR code');
        }
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <Center minH="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color={accentColor} />
            <Text color={textColor}>Loading payment details...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  if (!depositDetails) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Alert status="error" maxW="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Invalid Payment Request</AlertTitle>
              <AlertDescription>
                No payment details found. Please start a new deposit request.
              </AlertDescription>
            </Box>
          </Alert>
          <Button colorScheme="blue" onClick={() => router.push('/wallet/deposit')}>
            Start New Deposit
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
          {currentStatus === 'pending' && (
            <>
              <Icon as={FaClock} boxSize={10} color="orange.500" />
              <Heading as="h1" size="xl" color={textColor}>
                Complete Your Deposit
              </Heading>
              <Text fontSize="lg" color={subtleTextColor}>
                Send your payment to the address below
              </Text>
            </>
          )}
          {currentStatus === 'completed' && (
            <>
              <Icon as={FaCheck} boxSize={10} color="green.500" />
              <Heading as="h1" size="xl" color={textColor}>
                Deposit Completed
              </Heading>
            </>
          )}
          {currentStatus === 'rejected' && (
            <>
              <Icon as={FaTimes} boxSize={10} color="red.500" />
              <Heading as="h1" size="xl" color={textColor}>
                Deposit Rejected
              </Heading>
              <Text fontSize="lg" color={subtleTextColor}>
                Your deposit was not approved. Please contact support for details.
              </Text>
            </>
          )}
        </VStack>



        {/* Status-based Instructions */}
        {currentStatus === 'pending' && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              {depositDetails.isWeb3 ? (
                <>
                  <AlertTitle>🔗 Blockchain Deposit</AlertTitle>
                  <AlertDescription display="block">
                    Send exactly <strong>{depositDetails.amount} {depositDetails.currency}</strong> to the address below using the {depositDetails.network} network.
                    Your deposit will be automatically detected and credited once confirmed on the blockchain.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTitle>Transaction ID: {depositDetails.transactionId}</AlertTitle>
                  <AlertDescription display="block">
                    Send exactly <strong>${depositDetails.amount} {depositDetails.currency}</strong> worth of {depositDetails.method} to the address below using the {depositDetails.network} network.
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
              <AlertTitle>Deposit Completed</AlertTitle>
            </Box>
          </Alert>
        )}

        {currentStatus === 'rejected' && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              {depositDetails.isWeb3 ? (
                <>
                  <AlertTitle>❌ Blockchain Deposit Issue</AlertTitle>
                  <AlertDescription display="block">
                    There was an issue with your blockchain deposit. Please contact support for assistance.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTitle>Transaction ID: {depositDetails.transactionId}</AlertTitle>
                  <AlertDescription display="block">
                    Your deposit of <strong>${depositDetails.amount} {depositDetails.currency}</strong> was rejected. Please contact support for assistance.
                  </AlertDescription>
                </>
              )}
            </Box>
          </Alert>
        )}

        {/* Payment Details Card */}
        <Card bg={cardBgColor} shadow="lg" borderWidth="2px"
              borderColor={currentStatus === 'completed' ? 'green.200' :
                          currentStatus === 'rejected' ? 'red.200' : 'blue.200'}>
          <CardBody p={6}>
            <VStack spacing={6} align="stretch">
              {/* Amount and Method */}
              <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {depositDetails.method} ({depositDetails.network})
                  </Text>
                  <Text fontSize="sm" color={subtleTextColor}>
                    Processing time: {depositDetails.processingTime}
                  </Text>
                </VStack>
                <Badge colorScheme="blue" fontSize="lg" p={3}>
                  ${depositDetails.amount} {depositDetails.currency}
                </Badge>
              </HStack>

              <Divider />

              {/* Deposit Address Section - Only show for pending deposits */}
              {currentStatus === 'pending' && (
                <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" color={textColor} textAlign="center">
                  Send {depositDetails.method} to this address:
                </Text>
                
                <Box
                  p={6}
                  bg={useColorModeValue('blue.50', 'blue.900')}
                  borderRadius="lg"
                  border="2px solid"
                  borderColor="blue.200"
                  textAlign="center"
                >
                  <Text fontSize="sm" color={subtleTextColor} mb={3}>
                    {depositDetails.network} Network Address
                  </Text>
                  <Code
                    fontSize="md"
                    p={4}
                    borderRadius="md"
                    w="full"
                    wordBreak="break-all"
                    bg={useColorModeValue('white', 'gray.800')}
                    color={textColor}
                    fontFamily="mono"
                    fontWeight="bold"
                  >
                    {depositDetails.address}
                  </Code>
                </Box>

                <HStack spacing={3} justify="center">
                  <Button
                    leftIcon={<Icon as={FaCopy} />}
                    onClick={handleCopyAddress}
                    colorScheme="blue"
                    size="lg"
                  >
                    Copy Address
                  </Button>
                  <Button
                    leftIcon={<Icon as={FaQrcode} />}
                    onClick={generateQRCode}
                    colorScheme="green"
                    variant="outline"
                    size="lg"
                  >
                    QR Code
                  </Button>
                </HStack>
                </VStack>
              )}

              <Divider />

              {/* Status-specific content */}
              {currentStatus === 'pending' && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Critical Instructions</AlertTitle>
                    <AlertDescription display="block">
                      <strong>ONLY send {depositDetails.method} via {depositDetails.network} network to this address.</strong><br/>
                      • Sending any other cryptocurrency will result in permanent loss<br/>
                      • Double-check the network before sending<br/>
                      {depositDetails.isWeb3 ? (
                        <>• Your deposit will be automatically detected and credited once confirmed on the blockchain<br/>
                        • No admin approval required - fully automated process</>
                      ) : (
                        <>• Your deposit will be credited after admin approval</>
                      )}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {/* Web3-specific information */}
              {depositDetails.isWeb3 && currentStatus === 'pending' && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>🔗 Blockchain Monitoring Active</AlertTitle>
                    <AlertDescription display="block">
                      • Real-time blockchain monitoring is active<br/>
                      • Your deposit will be automatically detected<br/>
                      • Estimated confirmation time: {depositDetails.processingTime}<br/>
                      • No manual approval needed - fully automated<br/>
                      • You can verify your transaction on the blockchain explorer
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {(currentStatus === 'received' || currentStatus === 'confirmed') && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Payment Under Review</AlertTitle>
                    <AlertDescription display="block">
                      Your payment has been received and is being processed.<br/>
                      • Payment detected on the blockchain<br/>
                      • Admin is reviewing your transaction<br/>
                      • You will be notified once approved<br/>
                      • This page will automatically update when completed
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {currentStatus === 'completed' && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Deposit Completed</AlertTitle>
                    <AlertDescription>
                      • Transaction details are available in your deposit history
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {currentStatus === 'rejected' && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Deposit Rejected</AlertTitle>
                    <AlertDescription display="block">
                      Your deposit could not be processed.<br/>
                      • Payment may not have been received<br/>
                      • Incorrect amount or network used<br/>
                      • Please save your transaction ID for reference<br/>
                      • Please contact support for assistance<br/>
                      • You can try making a new deposit
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {/* Status and Actions */}
              <VStack spacing={4}>
                <HStack spacing={2} align="center">
                  {currentStatus === 'pending' && (
                    <>
                      <Icon as={FaClock} color="orange.500" />
                      <Text fontSize="sm" color={subtleTextColor}>
                        Status: Waiting for payment
                      </Text>
                      {isCheckingStatus && <Spinner size="sm" color="blue.500" />}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => depositDetails.transactionId && checkTransactionStatus(depositDetails.transactionId)}
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
                        Status: Deposit Completed
                      </Text>
                    </>
                  )}
                  {currentStatus === 'rejected' && (
                    <>
                      <Icon as={FaTimes} color="red.500" />
                      <Text fontSize="sm" color="red.500" fontWeight="bold">
                        Status: Deposit Rejected
                      </Text>
                    </>
                  )}
                  {(currentStatus === 'received' || currentStatus === 'confirmed') && (
                    <>
                      <Icon as={FaClock} color="blue.500" />
                      <Text fontSize="sm" color="blue.500" fontWeight="bold">
                        Status: Under Review
                      </Text>
                      {isCheckingStatus && <Spinner size="sm" color="blue.500" />}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => depositDetails.transactionId && checkTransactionStatus(depositDetails.transactionId)}
                        isLoading={isCheckingStatus}
                        loadingText="Checking..."
                      >
                        Check Status
                      </Button>
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
                    onClick={() => router.push('/wallet/deposit')}
                    colorScheme="blue"
                    variant="outline"
                  >
                    New Deposit
                  </Button>
                  {currentStatus === 'rejected' && (
                    <Button
                      leftIcon={<Icon as={FaHeadset} />}
                      onClick={() => {
                        const supportUrl = new URL('/support-hub', window.location.origin);
                        supportUrl.searchParams.set('transactionId', depositDetails.transactionId || 'unknown');
                        supportUrl.searchParams.set('issueType', 'deposit-rejected');
                        supportUrl.searchParams.set('amount', depositDetails.amount || '0');
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

        {/* Additional Info */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody p={4}>
            <VStack spacing={2} align="start">
              <Text fontSize="sm" fontWeight="bold" color={textColor}>
                What happens next?
              </Text>
              <Text fontSize="sm" color={subtleTextColor}>
                1. Send the exact amount to the provided address
              </Text>
              <Text fontSize="sm" color={subtleTextColor}>
                2. Save your transaction ID for reference
              </Text>
              <Text fontSize="sm" color={subtleTextColor}>
                3. Your transaction will be monitored by our admin team
              </Text>
              <Text fontSize="sm" color={subtleTextColor}>
                4. Once confirmed, funds will be credited to your wallet
              </Text>
              <Text fontSize="sm" color={subtleTextColor}>
                5. You'll receive a notification when the deposit is complete
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}

export default function DepositPaymentPage() {
  return (
    <Suspense fallback={
      <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="calc(100vh - 60px)">
        <Center minH="400px">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </Box>
    }>
      <DepositPaymentContent />
    </Suspense>
  );
}
