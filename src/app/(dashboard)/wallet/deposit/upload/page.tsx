'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  FormControl,
  FormLabel,
  Input,
  Image,
  Card,
  CardBody,
  useToast,
  Spinner,
  Badge,
  SimpleGrid,
  Divider
} from '@chakra-ui/react';

function DepositUploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // Get parameters from URL
  const amount = searchParams?.get('amount') || '';
  const method = searchParams?.get('method') || '';
  const address = searchParams?.get('address') || '';
  const methodId = searchParams?.get('methodId') || '';

  // Method configurations
  const methodConfig = {
    'usdt-trc20': {
      name: 'USDT (TRC20)',
      symbol: 'USD',
      icon: '/img/USDT-TRC20.png',
      color: 'green',
      instructions: [
        `Send exactly $${amount} USDT (TRC20) to the address below`,
        'Take a screenshot of your transaction confirmation',
        'Upload the screenshot below for verification',
        'Wait for admin approval (usually within 5-30 minutes)'
      ],
      uploadLabel: 'Upload Transaction Screenshot',
      uploadHint: 'Upload a clear screenshot of your USDT transaction confirmation'
    },
    'usdt-bep20': {
      name: 'USDT (BEP20)',
      symbol: 'USD',
      icon: '/img/USDT-BEP20-1.png',
      color: 'yellow',
      instructions: [
        `Send exactly $${amount} USDT (BEP20) to the address below`,
        'Take a screenshot of your transaction confirmation',
        'Upload the screenshot below for verification',
        'Wait for admin approval (usually within 5-30 minutes)'
      ],
      uploadLabel: 'Upload Transaction Screenshot',
      uploadHint: 'Upload a clear screenshot of your USDT transaction confirmation'
    },
    'usdt-polygon': {
      name: 'USDT (Polygon)',
      symbol: 'USD',
      icon: '/img/USDT-Polygon.png',
      color: 'purple',
      instructions: [
        `Send exactly $${amount} USDT (Polygon) to the address below`,
        'Take a screenshot of your transaction confirmation',
        'Upload the screenshot below for verification',
        'Wait for admin approval (usually within 5-30 minutes)'
      ],
      uploadLabel: 'Upload Transaction Screenshot',
      uploadHint: 'Upload a clear screenshot of your USDT transaction confirmation'
    },
    'gcash': {
      name: 'GCash',
      symbol: 'PHP',
      icon: '/img/gcash.png',
      color: 'blue',
      instructions: [
        `Send ₱${(parseFloat(amount) * 55.5).toLocaleString()} to the GCash number below`,
        'Take a screenshot of your payment receipt',
        'Upload the receipt below for verification',
        'Wait for admin approval (usually within 5-30 minutes)'
      ],
      uploadLabel: 'Upload Payment Receipt',
      uploadHint: 'Upload a clear screenshot of your GCash payment receipt'
    },
    'paymaya': {
      name: 'PayMaya',
      symbol: 'PHP',
      icon: '/img/paymaya.jpg',
      color: 'purple',
      instructions: [
        `Send ₱${(parseFloat(amount) * 55.5).toLocaleString()} to the PayMaya number below`,
        'Take a screenshot of your payment receipt',
        'Upload the receipt below for verification',
        'Wait for admin approval (usually within 5-30 minutes)'
      ],
      uploadLabel: 'Upload Payment Receipt',
      uploadHint: 'Upload a clear screenshot of your PayMaya payment receipt'
    }
  };

  const config = methodConfig[methodId as keyof typeof methodConfig];

  useEffect(() => {
    if (!session?.user?.email) {
      router.push('/auth/signin');
      return;
    }

    if (!amount || !method || !address || !methodId) {
      toast({
        title: 'Missing Information',
        description: 'Please go back and select a deposit method.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/wallet/deposit');
      return;
    }
  }, [session, amount, method, address, methodId, router, toast]);

  const handleSubmit = async () => {
    if (!receiptFile) {
      toast({
        title: 'Receipt Required',
        description: 'Please upload your payment receipt before submitting.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!session?.user?.email) {
      toast({
        title: 'Authentication Error',
        description: 'Please refresh the page and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('userEmail', session.user.email);
      formData.append('amount', amount);
      formData.append('currency', config.symbol);
      formData.append('paymentMethod', methodId);
      formData.append('network', (methodId === 'usdt-trc20' || methodId === 'usdt-bep20' || methodId === 'usdt-polygon') ?
        methodId.split('-')[1].toUpperCase() : 'Digital Wallet');
      formData.append('accountNumber', address);
      formData.append('accountName', (methodId === 'usdt-trc20' || methodId === 'usdt-bep20' || methodId === 'usdt-polygon') ?
        'USDT Wallet' : 'TIC Global');
      formData.append('receipt', receiptFile);

      const response = await fetch('/api/deposits/manual', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Deposit Request Submitted',
          description: 'Your deposit request has been submitted successfully and is pending verification.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Redirect to wallet page
        router.push('/wallet?tab=deposits');
      } else {
        throw new Error(data.message || 'Failed to submit deposit request');
      }
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Internal server error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!config) {
    return (
      <Container maxW="4xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          <Text>Invalid deposit method. Please go back and try again.</Text>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <HStack spacing={4} align="center">
            <Image src={config.icon} alt={config.name} boxSize="48px" />
            <VStack spacing={1} align="start">
              <Heading size="lg">{config.name} Deposit</Heading>
              <Badge colorScheme={config.color} size="lg">
                {(methodId === 'usdt-trc20' || methodId === 'usdt-bep20' || methodId === 'usdt-polygon') ?
                  `$${amount} USD` : `₱${(parseFloat(amount) * 55.5).toLocaleString()} PHP`}
              </Badge>
            </VStack>
          </HStack>
          <Text color="gray.600">
            Complete your deposit by following the instructions below
          </Text>
        </VStack>

        {/* Payment Details */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md" textAlign="center">Payment Details</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <VStack spacing={3} align="start">
                  <Text fontWeight="bold" color="gray.700">
                    {(methodId === 'usdt-trc20' || methodId === 'usdt-bep20' || methodId === 'usdt-polygon') ?
                      `USDT Address (${methodId.split('-')[1].toUpperCase()})` : `${config.name} Number`}
                  </Text>
                  <Box
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    border="2px dashed"
                    borderColor="gray.300"
                    w="full"
                  >
                    <Text fontFamily="mono" fontSize="lg" fontWeight="bold" textAlign="center">
                      {address}
                    </Text>
                  </Box>
                  <Button
                    size="sm"
                    colorScheme={config.color}
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      toast({
                        title: 'Copied!',
                        description: 'Address copied to clipboard',
                        status: 'success',
                        duration: 2000,
                        isClosable: true,
                      });
                    }}
                  >
                    Copy Address
                  </Button>
                </VStack>

                <VStack spacing={3} align="start">
                  <Text fontWeight="bold" color="gray.700">Amount to Send</Text>
                  <Box
                    p={4}
                    bg={`${config.color}.50`}
                    borderRadius="md"
                    border="2px solid"
                    borderColor={`${config.color}.200`}
                    w="full"
                  >
                    <Text fontSize="xl" fontWeight="bold" textAlign="center" color={`${config.color}.700`}>
                      {(methodId === 'usdt-trc20' || methodId === 'usdt-bep20' || methodId === 'usdt-polygon') ?
                        `$${amount} USDT` : `₱${(parseFloat(amount) * 55.5).toLocaleString()}`}
                    </Text>
                  </Box>
                  {!(methodId === 'usdt-trc20' || methodId === 'usdt-bep20' || methodId === 'usdt-polygon') && (
                    <Text fontSize="sm" color="gray.600" textAlign="center" w="full">
                      (≈ ${amount} USD)
                    </Text>
                  )}
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Alert status="info">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Instructions:</AlertTitle>
            <AlertDescription display="block">
              <VStack spacing={2} align="start" mt={2}>
                {config.instructions.map((instruction, index) => (
                  <Text key={index}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
              </VStack>
            </AlertDescription>
          </Box>
        </Alert>

        {/* Upload Section */}
        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="md" textAlign="center">Upload Receipt</Heading>
              
              <FormControl>
                <FormLabel>{config.uploadLabel}</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  p={1}
                />
                <Text fontSize="sm" color="gray.600" mt={2}>
                  {config.uploadHint}
                </Text>
              </FormControl>

              {receiptFile && (
                <Alert status="success">
                  <AlertIcon />
                  <Text>Receipt uploaded: {receiptFile.name}</Text>
                </Alert>
              )}

              <Divider />

              <HStack spacing={4} justify="center">
                <Button
                  variant="outline"
                  onClick={() => router.push('/wallet/deposit')}
                  isDisabled={isSubmitting}
                >
                  Go Back
                </Button>
                <Button
                  colorScheme={config.color}
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  loadingText="Submitting..."
                  isDisabled={!receiptFile}
                  size="lg"
                >
                  Submit Deposit Request
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}

export default function DepositUploadPage() {
  return (
    <Suspense fallback={
      <Container maxW="4xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Text textAlign="center">Loading...</Text>
        </VStack>
      </Container>
    }>
      <DepositUploadPageContent />
    </Suspense>
  );
}
