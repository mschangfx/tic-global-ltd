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

// Crypto payment methods - TRC20 only
const CRYPTO_METHODS = [
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC20)',
    symbol: 'USDT',
    icon: FaBitcoin,
    network: 'Tron (TRC20)',
    address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
    minAmount: 10,
    fee: 1,
    processingTime: '5-15 minutes',
    iconColor: 'green.500'
  }
];

// Manual payment methods - GCash and PayMaya
const MANUAL_METHODS = [
  {
    id: 'gcash',
    name: 'GCash',
    symbol: 'PHP',
    icon: '/img/gcash.png',
    qrCode: '/img/gcash qr.jpg',
    network: 'Digital Wallet',
    minAmount: 500, // 500 PHP minimum
    fee: 0,
    processingTime: '5-30 minutes',
    iconColor: 'blue.500',
    instructions: 'Send payment to GCash number and upload receipt',
    accountNumber: '09675131248',
    accountName: 'Patricia Marie Joble'
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    symbol: 'PHP',
    icon: '/img/paymaya.jpg',
    qrCode: '/img/paymaya qr.jpg',
    network: 'Digital Wallet',
    minAmount: 500, // 500 PHP minimum
    fee: 0,
    processingTime: '5-30 minutes',
    iconColor: 'green.500',
    instructions: 'Send payment to PayMaya number and upload receipt',
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

      if ('accountNumber' in selectedMethod) {
        // Manual payment with receipt
        const formData = new FormData();
        formData.append('userEmail', 'user@ticglobal.com'); // Temporary user email
        formData.append('amount', amount);
        formData.append('currency', selectedMethod.symbol);
        formData.append('paymentMethod', selectedMethod.id);
        formData.append('network', selectedMethod.network);
        formData.append('accountNumber', selectedMethod.accountNumber);
        formData.append('accountName', selectedMethod.accountName);
        if (receiptFile) {
          formData.append('receipt', receiptFile);
        }

        const response = await fetch('/api/deposits/manual', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        requestData = await response.json();
      } else {
        // Crypto payment - check if receipt is uploaded
        if (receiptFile) {
          // Crypto payment with receipt - use manual API
          const formData = new FormData();
          formData.append('userEmail', 'user@ticglobal.com'); // Temporary user email
          formData.append('amount', amount);
          formData.append('currency', selectedMethod.symbol);
          formData.append('paymentMethod', selectedMethod.id);
          formData.append('network', selectedMethod.network);
          formData.append('accountNumber', selectedMethod.address);
          formData.append('accountName', `${selectedMethod.name} Wallet`);
          if (receiptFile) {
            formData.append('receipt', receiptFile);
          }

          const response = await fetch('/api/deposits/manual', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          }
          requestData = await response.json();
        } else {
          // Crypto payment without receipt - use regular API
          const response = await fetch('/api/deposits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: 'user@ticglobal.com', // Temporary user email
              methodId: selectedMethod.id,
              amount: parseFloat(amount)
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          }
          requestData = await response.json();
        }
      }

      if (requestData.success) {
        toast({
          title: 'Deposit Request Created',
          description: 'accountNumber' in selectedMethod
            ? 'Your deposit request has been submitted with receipt. Please wait for admin approval.'
            : 'Your deposit request has been submitted. Please send the payment to the provided address.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Redirect to success page
        setTimeout(() => {
          window.location.href = '/deposit/success';
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
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>Cryptocurrency</Text>
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
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>Digital Wallets (Philippines)</Text>

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
                  <FormLabel color={textColor}>Amount ({selectedMethod.symbol})</FormLabel>
                  <Input
                    type="number"
                    placeholder={`Enter amount (min: ${selectedMethod.minAmount})`}
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
                        Amount: {amount} {selectedMethod.symbol} | 
                        Fee: {selectedMethod.fee} {selectedMethod.symbol} | 
                        You'll receive: {(parseFloat(amount) - selectedMethod.fee).toFixed(6)} {selectedMethod.symbol}
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
                  colorScheme="green"
                  size="lg"
                  onClick={handleConfirmDeposit}
                  isLoading={isSubmitting}
                  loadingText={'accountNumber' in selectedMethod ? 'Submitting...' : 'Creating Request...'}
                  isDisabled={'accountNumber' in selectedMethod && !receiptFile}
                >
                  {'accountNumber' in selectedMethod ? 'Submit Deposit Request' : "I've Sent the Payment"}
                </Button>

                <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                  {'accountNumber' in selectedMethod
                    ? 'Your deposit will be processed after admin verification of your receipt.'
                    : 'After sending the payment, it will be automatically detected and credited to your account. Please save your transaction ID for reference.'
                  }
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}
