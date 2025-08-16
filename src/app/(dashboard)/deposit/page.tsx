'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  SimpleGrid,
  Icon,
  useColorModeValue,
  Badge,
  Input,
  FormControl,
  FormLabel,
  Select,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Image,
  useToast
} from '@chakra-ui/react';
import {
  FaBitcoin,
  FaEthereum,
  FaCopy,
  FaArrowLeft,
  FaWallet,
  FaQrcode
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { convertUsdToPhp, formatCurrency, CONVERSION_RATES } from '@/lib/utils/currency';

// Manual crypto payment methods - TRC20 (requires admin approval)
const CRYPTO_METHODS = [
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC20) - Manual Verification',
    symbol: 'USDT',
    icon: FaBitcoin,
    network: 'Tron (TRC20)',
    address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
    minAmount: 10,
    fee: 1,
    processingTime: 'Manual approval: 1-24 hours',
    iconColor: 'orange.500',
    instructions: 'Send USDT to wallet address and upload transaction receipt'
  }
];

// Manual payment methods - GCash and PayMaya (USD input, PHP payment)
const MANUAL_METHODS = [
  {
    id: 'gcash',
    name: 'GCash',
    symbol: 'USD', // USD is always the deposit amount
    icon: '/img/gcash.png',
    qrCode: '/img/GCASH QR CODE.jpg',
    network: 'Digital Wallet',
    minAmount: 10, // $10 USD minimum
    fee: 0,
    processingTime: '5-30 minutes',
    iconColor: 'blue.500',
    instructions: 'Enter USD amount - you will pay PHP equivalent to GCash',
    accountNumber: '09675131248',
    accountName: 'Patricia Marie Joble'
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    symbol: 'USD', // USD is always the deposit amount
    icon: '/img/paymaya.jpg',
    qrCode: '/img/PAYMAYA QR CODE.jpg',
    network: 'Digital Wallet',
    minAmount: 10, // $10 USD minimum
    fee: 0,
    processingTime: '5-30 minutes',
    iconColor: 'green.500',
    instructions: 'Enter USD amount - you will pay PHP equivalent to PayMaya',
    accountNumber: '09675131248',
    accountName: 'Patricia Marie Joble'
  },
  {
    id: 'gotyme',
    name: 'GoTyme',
    symbol: 'USD', // USD is always the deposit amount
    icon: '/img/GOTYME ICON LOGO.jpg',
    qrCode: '/img/GOTYME QR CODE.jpg',
    network: 'Digital Wallet',
    minAmount: 10, // $10 USD minimum
    fee: 0,
    processingTime: '5-30 minutes',
    iconColor: 'purple.500',
    instructions: 'Enter USD amount - you will pay PHP equivalent to GoTyme',
    accountNumber: '09675131248',
    accountName: 'Patricia Marie Joble'
  }
];

// Available Soon payment methods
const AVAILABLE_SOON_METHODS = [
  {
    id: 'usdt_bep20',
    name: 'USDT (BEP20)',
    symbol: 'USDT',
    icon: '/img/USDT-BEP20-1.png',
    network: 'BSC (BEP20)',
    minAmount: 10,
    fee: 1,
    processingTime: '3-5 minutes',
    iconColor: 'yellow.500'
  },
  {
    id: 'usdt_erc20',
    name: 'USDT (ERC20)',
    symbol: 'USDT',
    icon: '/img/usdt etherium.png',
    network: 'Ethereum (ERC20)',
    minAmount: 10,
    fee: 1,
    processingTime: '5-15 minutes',
    iconColor: 'blue.500'
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin (BTC)',
    symbol: 'BTC',
    icon: '/img/Bitcoin.svg.png',
    network: 'Bitcoin Network',
    minAmount: 0.001,
    fee: 0.0001,
    processingTime: '10-60 minutes',
    iconColor: 'orange.500'
  },
  {
    id: 'ethereum',
    name: 'Ethereum (ETH)',
    symbol: 'ETH',
    icon: '/img/Ethereum-Logo-PNG-Free-Image.png',
    network: 'Ethereum Network',
    minAmount: 0.01,
    fee: 0.001,
    processingTime: '5-15 minutes',
    iconColor: 'purple.500'
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    symbol: 'PHP',
    icon: '/img/paymaya.jpg',
    network: 'Digital Wallet',
    minAmount: 100,
    fee: 0,
    processingTime: 'Instant',
    iconColor: 'green.500'
  },
  {
    id: 'gcash',
    name: 'GCash',
    symbol: 'PHP',
    icon: '/img/gcash.png',
    network: 'Digital Wallet',
    minAmount: 100,
    fee: 0,
    processingTime: 'Instant',
    iconColor: 'blue.500'
  }
];

type PaymentMethod = typeof CRYPTO_METHODS[0] | typeof MANUAL_METHODS[0];

export default function DepositPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1: Select method, 2: Enter amount, 3: Payment details, 4: Upload receipt (manual)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep(2);
  };

  const handleAmountSubmit = () => {
    if (!amount || parseFloat(amount) < (selectedMethod?.minAmount || 0)) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum deposit amount is ${selectedMethod?.minAmount} ${selectedMethod?.symbol}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setStep(3);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Address copied to clipboard',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleConfirmDeposit = async () => {
    if (!selectedMethod) return;

    setIsSubmitting(true);

    try {
      // For manual methods, require receipt upload
      if ('accountNumber' in selectedMethod && !receiptFile) {
        toast({
          title: 'Receipt Required',
          description: 'Please upload your payment receipt before confirming.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare form data for manual methods with receipt
      let requestData;

      // ALL DEPOSITS ARE NOW MANUAL - require receipt upload and admin approval
      console.log('🔍 Selected method:', selectedMethod.id, selectedMethod);
      console.log('🔍 Has receipt file:', !!receiptFile);

      if (!receiptFile) {
        throw new Error('Receipt upload is required for all deposits. Please upload your payment receipt.');
      }

      console.log('📋 Using manual API for ALL deposits (manual approval required):', selectedMethod.id);

      const formData = new FormData();
      formData.append('userEmail', 'user@ticglobal.com'); // Temporary user email
      formData.append('amount', amount);
      formData.append('currency', selectedMethod.symbol);
      formData.append('paymentMethod', selectedMethod.id);
      formData.append('network', selectedMethod.network);

      // Add account details for manual methods, wallet address for crypto
      if (selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya') {
        formData.append('accountNumber', (selectedMethod as any).accountNumber);
        formData.append('accountName', (selectedMethod as any).accountName);
      } else {
        // For crypto methods, use the wallet address
        formData.append('accountNumber', (selectedMethod as any).address || 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh');
        formData.append('accountName', `${selectedMethod.name} Wallet`);
      }

      formData.append('receipt', receiptFile);

      const response = await fetch('/api/deposits/manual', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      requestData = await response.json();

      if (requestData.success) {
        toast({
          title: 'Deposit Request Created',
          description: 'Your deposit is now being processed. You will be redirected to track the status.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Redirect to status page to show "Processing" status
        setTimeout(() => {
          window.location.href = `/wallet/deposit/status?id=${requestData.deposit.id}`;
        }, 1500);
      } else {
        throw new Error(requestData.message || 'Failed to create deposit request');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);

      // Try to get more specific error message
      let errorMessage = 'Failed to create deposit request. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Submission Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack spacing={4}>
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            variant="ghost"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Heading as="h1" size="xl" color={textColor}>
            Deposit Funds
          </Heading>
        </HStack>

        {/* Step 1: Select Payment Method */}
        {step === 1 && (
          <Card bg={cardBg} shadow="md">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <Heading as="h2" size="lg" color={textColor}>
                  Select Payment Method
                </Heading>
                
                {/* Crypto Payment Methods */}
                <VStack spacing={4}>
                  <Text fontSize="lg" fontWeight="bold" color="orange.500">Cryptocurrency (Manual Verification)</Text>
                  <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4} maxW="400px" mx="auto">
                    {CRYPTO_METHODS.map((method) => (
                      <Card
                        key={method.id}
                        bg={cardBg}
                        border="2px"
                        borderColor={borderColor}
                        cursor="pointer"
                        _hover={{ borderColor: 'green.400', transform: 'translateY(-2px)' }}
                        transition="all 0.2s"
                        onClick={() => handleMethodSelect(method)}
                      >
                        <CardBody p={6} textAlign="center">
                          <VStack spacing={4}>
                            <Icon as={method.icon} boxSize={12} color={method.iconColor} />
                            <VStack spacing={1}>
                              <Text fontWeight="bold" color={textColor}>
                                {method.name}
                              </Text>
                              <Badge colorScheme="green" variant="subtle">
                                {method.network}
                              </Badge>
                            </VStack>
                            <VStack spacing={1} fontSize="sm" color={subtleTextColor}>
                              <Text>Min: {method.minAmount} {method.symbol}</Text>
                              <Text>Fee: {method.fee} {method.symbol}</Text>
                              <Text>{method.processingTime}</Text>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>

                {/* Manual Payment Methods */}
                <VStack spacing={4} mt={8}>
                  <Text fontSize="lg" fontWeight="bold" color="blue.500">Digital Wallets (Manual Verification)</Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} maxW="600px" mx="auto">
                    {MANUAL_METHODS.map((method) => (
                      <Card
                        key={method.id}
                        bg={cardBg}
                        border="2px"
                        borderColor={borderColor}
                        cursor="pointer"
                        _hover={{ borderColor: 'blue.400', transform: 'translateY(-2px)' }}
                        transition="all 0.2s"
                        onClick={() => handleMethodSelect(method)}
                      >
                        <CardBody p={6} textAlign="center">
                          <VStack spacing={4}>
                            <Box>
                              <Image
                                src={method.icon}
                                alt={method.name}
                                boxSize={12}
                                objectFit="contain"
                                fallback={<Box boxSize={12} bg="gray.200" borderRadius="md" />}
                              />
                            </Box>
                            <VStack spacing={1}>
                              <Text fontWeight="bold" color={textColor}>
                                {method.name}
                              </Text>
                              <Badge colorScheme="blue" variant="subtle">
                                {method.network}
                              </Badge>
                            </VStack>
                            <VStack spacing={1} fontSize="sm" color={subtleTextColor}>
                              <Text>Min: ₱{method.minAmount.toLocaleString()}</Text>
                              <Text>Fee: Free</Text>
                              <Text>{method.processingTime}</Text>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>

                {/* Available Soon Section */}
                <VStack spacing={4} mt={8}>
                  <Heading as="h3" size="md" color={textColor} textAlign="center">
                    Available Soon
                  </Heading>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} maxW="900px" mx="auto">
                    {AVAILABLE_SOON_METHODS.map((method) => (
                      <Card
                        key={method.id}
                        bg={cardBg}
                        border="2px"
                        borderColor={borderColor}
                        opacity={0.6}
                        cursor="not-allowed"
                      >
                        <CardBody p={4} textAlign="center">
                          <VStack spacing={3}>
                            <Image
                              src={method.icon}
                              alt={`${method.name} logo`}
                              boxSize={8}
                              objectFit="contain"
                              filter="grayscale(100%)"
                            />
                            <VStack spacing={1}>
                              <Text fontSize="sm" fontWeight="bold" color="gray.500">
                                {method.name}
                              </Text>
                              <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                                {method.network}
                              </Badge>
                            </VStack>
                            <Text
                              fontSize="xs"
                              color="orange.500"
                              bg="orange.50"
                              px={2}
                              py={1}
                              borderRadius="md"
                              fontWeight="bold"
                            >
                              Coming Soon
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Step 2: Enter Amount */}
        {step === 2 && selectedMethod && (
          <Card bg={cardBg} shadow="md">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h2" size="lg" color={textColor}>
                    Enter Amount
                  </Heading>
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    Change Method
                  </Button>
                </HStack>

                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Selected: {selectedMethod.name}</AlertTitle>
                    <AlertDescription>
                      Network: {selectedMethod.network} | Min: {selectedMethod.minAmount} {selectedMethod.symbol}
                    </AlertDescription>
                  </Box>
                </Alert>

                <FormControl>
                  <FormLabel color={textColor}>Amount (USD)</FormLabel>
                  <Input
                    type="number"
                    placeholder={`Enter USD amount (min: $${selectedMethod.minAmount})`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min={selectedMethod.minAmount}
                  />
                </FormControl>

                {amount && parseFloat(amount) >= selectedMethod.minAmount && (
                  <Alert status="success">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Transaction Summary</AlertTitle>
                      <AlertDescription>
                        {selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ? (
                          <>
                            Deposit: ${amount} USD |
                            You'll pay: ₱{convertUsdToPhp(parseFloat(amount)).toFixed(2)} PHP |
                            Fee: Free |
                            Wallet credit: ${amount} USD
                          </>
                        ) : (
                          <>
                            Amount: {amount} {selectedMethod.symbol} |
                            Fee: {selectedMethod.fee} {selectedMethod.symbol} |
                            You'll receive: {(parseFloat(amount) - selectedMethod.fee).toFixed(6)} {selectedMethod.symbol}
                          </>
                        )}
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}

                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleAmountSubmit}
                  isDisabled={!amount || parseFloat(amount) < selectedMethod.minAmount}
                >
                  Continue to Payment
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Step 3: Payment Details */}
        {step === 3 && selectedMethod && (
          <Card bg={cardBg} shadow="md">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h2" size="lg" color={textColor}>
                    Payment Details
                  </Heading>
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    Edit Amount
                  </Button>
                </HStack>

                {/* Crypto Payment Flow */}
                {'address' in selectedMethod && (
                  <>
                    <Alert status="warning">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Important!</AlertTitle>
                        <AlertDescription>
                          Send exactly {amount} {selectedMethod.symbol} to the address below.
                          Sending a different amount may result in loss of funds.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </>
                )}

                {/* Manual Payment Flow */}
                {'accountNumber' in selectedMethod && (
                  <>
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Manual Payment Process</AlertTitle>
                        <AlertDescription>
                          Send ₱{amount} to the {selectedMethod.name} account below, then upload your receipt for verification.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </>
                )}

                {/* Crypto Payment Details */}
                {'address' in selectedMethod && (
                  <VStack spacing={4} align="stretch">
                    <Alert status="warning">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>⚠️ Manual Verification Required</AlertTitle>
                        <AlertDescription>
                          <strong>ALL CRYPTO DEPOSITS REQUIRE MANUAL ADMIN APPROVAL:</strong><br/>
                          1. Send exactly ${amount} {selectedMethod.symbol} to the address below<br/>
                          2. Take a screenshot of your transaction confirmation<br/>
                          3. Upload the screenshot below (REQUIRED)<br/>
                          4. Wait for admin approval (usually within {selectedMethod.processingTime})<br/>
                          <strong>⚠️ No automatic processing - admin verification required</strong>
                        </AlertDescription>
                      </Box>
                    </Alert>

                    <Box p={4} bg={useColorModeValue('gray.50', 'gray.600')} borderRadius="md">
                      <VStack spacing={3}>
                        <Text fontWeight="bold" color={textColor}>
                          Send {amount} {selectedMethod.symbol} to:
                        </Text>
                        <HStack spacing={2} w="full">
                          <Input
                            value={selectedMethod.address}
                            isReadOnly
                            bg={cardBg}
                            fontSize="sm"
                          />
                          <Button
                            leftIcon={<Icon as={FaCopy} />}
                            onClick={() => copyToClipboard(selectedMethod.address)}
                            size="sm"
                          >
                            Copy
                          </Button>
                        </HStack>
                        <Text fontSize="sm" color={subtleTextColor}>
                          Network: {selectedMethod.network}
                        </Text>
                      </VStack>
                    </Box>

                    <Divider />

                    <VStack spacing={2} align="stretch" fontSize="sm" color={subtleTextColor}>
                      <HStack justify="space-between">
                        <Text>Processing Time:</Text>
                        <Text>{selectedMethod.processingTime}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Network Fee:</Text>
                        <Text>{selectedMethod.fee} {selectedMethod.symbol}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>You'll Receive:</Text>
                        <Text fontWeight="bold">
                          ${(parseFloat(amount) - selectedMethod.fee).toFixed(2)} USD
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Receipt Upload for Crypto */}
                    <FormControl isRequired>
                      <FormLabel>Upload Transaction Receipt (Required)</FormLabel>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        p={1}
                        bg={cardBg}
                      />
                      <Text fontSize="sm" color={subtleTextColor} mt={1}>
                        Upload a clear screenshot of your crypto transaction confirmation
                      </Text>
                    </FormControl>
                  </VStack>
                )}

                {/* Manual Payment Details */}
                {'accountNumber' in selectedMethod && (
                  <VStack spacing={4} align="stretch">
                    <Box p={4} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md" border="1px" borderColor={useColorModeValue('blue.200', 'blue.600')}>
                      <VStack spacing={3}>
                        <Text fontWeight="bold" color={textColor}>
                          {selectedMethod.name} Payment Details:
                        </Text>

                        {/* QR Code Section */}
                        {'qrCode' in selectedMethod && (
                          <VStack spacing={2}>
                            <Text fontSize="sm" color={subtleTextColor}>
                              Scan QR Code to Pay:
                            </Text>
                            <Box
                              p={3}
                              bg="white"
                              borderRadius="md"
                              border="2px"
                              borderColor={useColorModeValue('gray.200', 'gray.600')}
                              maxW="200px"
                            >
                              <Image
                                src={selectedMethod.qrCode}
                                alt={`${selectedMethod.name} QR Code`}
                                boxSize="180px"
                                objectFit="contain"
                                mx="auto"
                              />
                            </Box>
                            <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                              Or use the account details below
                            </Text>
                          </VStack>
                        )}

                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text fontWeight="medium">Account Number:</Text>
                            <HStack>
                              <Text fontFamily="mono" fontSize="lg" fontWeight="bold">
                                {selectedMethod.accountNumber}
                              </Text>
                              <Button
                                size="sm"
                                leftIcon={<Icon as={FaCopy} />}
                                onClick={() => copyToClipboard(selectedMethod.accountNumber)}
                              >
                                Copy
                              </Button>
                            </HStack>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="medium">Account Name:</Text>
                            <Text fontWeight="bold">{selectedMethod.accountName}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="medium">Amount to Send:</Text>
                            <Text fontWeight="bold" fontSize="lg" color="green.500">
                              ₱{parseFloat(amount).toLocaleString()}
                            </Text>
                          </HStack>
                        </VStack>
                      </VStack>
                    </Box>

                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Next Steps:</AlertTitle>
                        <AlertDescription>
                          1. Send ₱{amount} to the {selectedMethod.name} account above<br/>
                          2. Take a screenshot of your transaction receipt<br/>
                          3. Upload the receipt below for verification<br/>
                          4. Wait for admin approval (usually within {selectedMethod.processingTime})
                        </AlertDescription>
                      </Box>
                    </Alert>

                    <FormControl>
                      <FormLabel>Upload Payment Receipt</FormLabel>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        p={1}
                      />
                      <Text fontSize="sm" color={subtleTextColor} mt={1}>
                        Upload a clear screenshot of your payment receipt
                      </Text>
                    </FormControl>

                    <VStack spacing={2} align="stretch" fontSize="sm" color={subtleTextColor}>
                      <HStack justify="space-between">
                        <Text>Processing Time:</Text>
                        <Text>{selectedMethod.processingTime}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Fee:</Text>
                        <Text>Free</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>You'll Receive:</Text>
                        <Text fontWeight="bold">
                          ${(parseFloat(amount) * 0.018).toFixed(2)} USD
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color={subtleTextColor}>
                        *Conversion rate: ₱1 = $0.018 USD (approximate)
                      </Text>
                    </VStack>
                  </VStack>
                )}

                <Button
                  colorScheme="orange"
                  size="lg"
                  onClick={handleConfirmDeposit}
                  isLoading={isSubmitting}
                  loadingText="Submitting for Manual Approval..."
                  isDisabled={!receiptFile}
                >
                  Submit Deposit for Manual Approval
                </Button>

                <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                  ⚠️ All deposits require manual admin verification of your receipt. Processing time: 1-24 hours.
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}
