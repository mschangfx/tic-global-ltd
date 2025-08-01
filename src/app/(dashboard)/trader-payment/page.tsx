'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  Checkbox,
  Divider,
  Badge,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { FaWallet, FaCheckCircle, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function TraderPaymentPage() {
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  
  const packagePrice = 138; // $138 USD per account
  const packageCount = 25;
  const totalCost = packagePrice * packageCount; // $3,450 USD

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        setUser(user);
        
        // Get wallet balance
        const walletResponse = await fetch('/api/wallet/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: user.email })
        });

        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          if (walletData.success) {
            setWalletBalance(walletData.balance);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user?.email) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to complete purchase.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the Terms of Service and Privacy Policy.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!walletBalance || walletBalance.total_balance < totalCost) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please deposit more funds to complete this purchase.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/trader/activate-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          packageCount: packageCount
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Purchase Successful!',
          description: `Trader activation completed! $${data.total_cost} deducted from wallet.`,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });

        // Redirect to trader dashboard
        setTimeout(() => {
          router.push('/trader-dashboard');
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to complete purchase');
      }

    } catch (error) {
      console.error('Error processing purchase:', error);
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to complete purchase',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToDeposit = () => {
    router.push('/wallet/deposit');
  };

  if (isLoading) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <Container maxW="7xl">
          <VStack spacing={6} align="center" justify="center" minH="400px">
            <Spinner size="xl" color="cyan.500" />
            <Text color={textColor}>Loading payment information...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  const hasInsufficientBalance = !walletBalance || walletBalance.total_balance < totalCost;

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <Container maxW="6xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Heading as="h1" size="xl" color={textColor} textAlign="center">
            Complete Your Purchase
          </Heading>

          <HStack spacing={8} align="start" flexDirection={{ base: 'column', lg: 'row' }}>
            {/* Order Summary */}
            <Card bg={cardBgColor} shadow="sm" flex="1">
              <CardHeader>
                <Heading size="md" color={textColor}>Order Summary</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {/* Package Info */}
                  <Box 
                    p={4} 
                    border="2px solid" 
                    borderColor="orange.300" 
                    borderRadius="md" 
                    position="relative"
                  >
                    <Badge 
                      colorScheme="orange" 
                      position="absolute" 
                      top="-10px" 
                      left="16px" 
                      px={2}
                    >
                      RECOMMENDED
                    </Badge>
                    <HStack justify="space-between" mt={2}>
                      <Text fontWeight="bold" fontSize="lg">Trader Activation</Text>
                      <Text fontWeight="bold" fontSize="lg">${totalCost.toFixed(2)}</Text>
                    </HStack>
                    <Text fontSize="sm" color={subtleTextColor} mt={1}>
                      Unlock trader features with 25 account activation and exclusive benefits.
                    </Text>
                  </Box>

                  {/* What's Included */}
                  <Box>
                    <Text fontWeight="bold" mb={3}>What's Included:</Text>
                    <VStack spacing={2} align="start">
                      <HStack>
                        <Icon as={FaCheckCircle} color="green.500" />
                        <Text fontSize="sm">25 Account Activations</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaCheckCircle} color="green.500" />
                        <Text fontSize="sm">GIC Token Trading Access (Buy $63, Sell $60)</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaCheckCircle} color="green.500" />
                        <Text fontSize="sm">Unlimited Account Creation</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaCheckCircle} color="green.500" />
                        <Text fontSize="sm">Premium Community Bonuses</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaCheckCircle} color="green.500" />
                        <Text fontSize="sm">Rank-up Rewards Access</Text>
                      </HStack>
                    </VStack>
                  </Box>

                  <Divider />

                  {/* Payment Information */}
                  <Box>
                    <Text fontWeight="bold" mb={3}>Payment Information:</Text>
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaWallet} color="red.500" />
                        <Text>Wallet Balance:</Text>
                      </HStack>
                      <Text fontWeight="bold" color={hasInsufficientBalance ? "red.500" : "green.500"}>
                        ${walletBalance?.total_balance?.toFixed(2) || '0.00'}
                      </Text>
                    </HStack>
                  </Box>

                  {hasInsufficientBalance && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Insufficient Balance!</Text>
                        <Text fontSize="sm">
                          You need ${(totalCost - (walletBalance?.total_balance || 0)).toFixed(2)} more to purchase this plan.
                        </Text>
                      </Box>
                    </Alert>
                  )}

                  <Divider />

                  {/* Total */}
                  <HStack justify="space-between" fontSize="xl" fontWeight="bold">
                    <Text>Total:</Text>
                    <Text color="orange.500">${totalCost.toFixed(2)}</Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Payment Method */}
            <Card bg={cardBgColor} shadow="sm" flex="1">
              <CardHeader>
                <Heading size="md" color={textColor}>Payment Method</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {/* Wallet Balance Payment Method */}
                  <Box
                    p={4}
                    border="2px solid"
                    borderColor={hasInsufficientBalance ? "red.300" : "green.300"}
                    borderRadius="md"
                  >
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaWallet} color={hasInsufficientBalance ? "red.500" : "green.500"} />
                        <Text fontWeight="bold">Wallet Balance</Text>
                      </HStack>
                      <Text fontWeight="bold" color={hasInsufficientBalance ? "red.500" : "green.500"}>
                        ${walletBalance?.total_balance?.toFixed(2) || '0.00'}
                      </Text>
                    </HStack>
                    {hasInsufficientBalance && (
                      <HStack mt={2}>
                        <Icon as={FaExclamationTriangle} color="red.500" />
                        <Text fontSize="sm" color="red.500">
                          Insufficient balance - deposit required
                        </Text>
                      </HStack>
                    )}
                  </Box>

                  {/* Security Info */}
                  <Alert status="info" borderRadius="md">
                    <Icon as={FaShieldAlt} color="blue.500" />
                    <Text fontSize="sm" ml={2}>
                      Your wallet payment is secured with blockchain technology
                    </Text>
                  </Alert>

                  {/* Terms Agreement */}
                  <Checkbox
                    isChecked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    colorScheme="cyan"
                  >
                    <Text fontSize="sm">
                      I agree to the Terms of Service and Privacy Policy
                    </Text>
                  </Checkbox>

                  {/* Insufficient Balance Alert */}
                  {hasInsufficientBalance && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Insufficient Wallet Balance</Text>
                        <Text fontSize="sm">
                          Please deposit ${totalCost.toFixed(2)} to complete this purchase.
                        </Text>
                      </Box>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  {hasInsufficientBalance ? (
                    <Button
                      colorScheme="orange"
                      size="lg"
                      leftIcon={<Icon as={FaWallet} />}
                      onClick={handleGoToDeposit}
                      w="full"
                      py={6}
                      fontSize="lg"
                      fontWeight="bold"
                    >
                      Go to Wallet to Deposit
                    </Button>
                  ) : (
                    <Button
                      colorScheme="cyan"
                      size="lg"
                      onClick={handlePurchase}
                      isLoading={isProcessing}
                      loadingText="Processing..."
                      isDisabled={!agreedToTerms}
                      w="full"
                      py={6}
                      fontSize="lg"
                      fontWeight="bold"
                    >
                      Complete Purchase
                    </Button>
                  )}

                  {/* Footer Info */}
                  <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                    All plan purchases are processed through your TIC wallet balance only
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}
