'use client';

import { useState, useEffect, Suspense } from 'react';
import '@/styles/page-transitions.css';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Divider,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Input,
  FormControl,
  FormLabel,
  Select,
  Checkbox,
  Badge,
  Flex,
  Image,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast
} from '@chakra-ui/react';
import { FaArrowLeft, FaCheckCircle, FaCreditCard, FaBitcoin, FaPaypal, FaLock, FaShieldAlt, FaWallet, FaExclamationTriangle } from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { getSession } from 'next-auth/react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';

// Plan data (same as in my-accounts page)
const INVESTMENT_TIERS_DATA = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 10,
    description: 'Perfect for beginners entering the TIC ecosystem. Get essential access and start your journey.',
    ticTokens: '500',
    communityEarnings: '1st Level',
    dailyUnilevel: '138 Potential',
    gamingAccess: 'Basic',
    support: 'Standard',
    brandColor: '#14c3cb',
  },
  {
    id: 'vip',
    name: 'VIP Plan',
    price: 138,
    description: 'Premium experience with enhanced earning potential and exclusive benefits.',
    ticTokens: '6900',
    communityEarnings: '1st - 15th Level',
    dailyUnilevel: '1380 Potential',
    gamingAccess: 'Premium (All Titles)',
    support: 'Exclusive VIP Channel',
    brandColor: '#E0B528',
    popular: true,
  },
];

// Removed multiple payment methods - only wallet balance allowed
// const PAYMENT_METHODS = [
//   { id: 'wallet', name: 'Wallet Balance', icon: FaWallet, description: 'Pay from your TIC wallet balance' },
// ];

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams?.get('plan') || 'vip';
  const toast = useToast();
  const { language } = useLanguage();

  // Removed payment method selection - only wallet balance allowed
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const selectedPlan = INVESTMENT_TIERS_DATA.find(plan => plan.id === planId) || INVESTMENT_TIERS_DATA[1];
  const planPrice = selectedPlan.price;
  const hasSufficientBalance = walletBalance ? walletBalance.total >= planPrice : false;

  const walletService = WalletService.getInstance();
  const supabase = createClient();

  // Helper method to get authenticated user email from both auth methods
  const getAuthenticatedUserEmail = async (): Promise<string | null> => {
    try {
      // Method 1: Try NextAuth session (Google OAuth)
      const nextAuthSession = await getSession();
      if (nextAuthSession?.user?.email) {
        return nextAuthSession.user.email;
      }

      // Method 2: Try Supabase auth (manual login)
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }

      return null;
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
  };

  // Fetch wallet balance on component mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        setIsLoadingBalance(true);

        // Get authenticated user email
        const userEmail = await getAuthenticatedUserEmail();
        if (!userEmail) {
          console.error('No authenticated user found');
          setIsLoadingBalance(false);
          return;
        }

        // Use WalletService directly instead of dev sync API
        // This works in both development and production
        const balance = await walletService.getBalance();
        setWalletBalance(balance);

        setIsLoadingBalance(false);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setIsLoadingBalance(false);
      }
    };

    loadBalance();

    // Subscribe to balance updates from WalletService
    const unsubscribe = walletService.subscribe((balance: WalletBalance) => {
      setWalletBalance(balance);
    });

    return unsubscribe;
  }, [walletService]);

  const handlePayment = async () => {
    // Check if terms are accepted
    if (!termsAccepted) {
      toast({
        title: 'Terms Required',
        description: 'Please accept the Terms of Service and Privacy Policy to continue.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!hasSufficientBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need ${formatCurrency(planPrice - (walletBalance?.total || 0), language)} more to purchase this plan.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setShowDepositForm(true);
      return;
    }

    setIsProcessing(true);
    try {
      // Use the correct parameters: planId and planName
      const result = await walletService.processPayment(selectedPlan.id, selectedPlan.name);

      if (result.success) {
        // Force refresh wallet balance to reflect the payment
        try {
          await walletService.forceRefreshBalance();
          console.log('✅ Wallet balance refreshed after payment');
        } catch (refreshError) {
          console.error('Error refreshing wallet balance:', refreshError);
        }

        // Show success toast
        toast({
          title: 'Payment Successful! 🎉',
          description: `Your ${selectedPlan.name} has been activated successfully! Wallet balance updated.`,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });

        // Wait a moment for user to see the success message, then redirect to accounts page
        setTimeout(() => {
          router.push('/my-accounts');
        }, 2000);
      } else {
        // Show error toast
        toast({
          title: 'Payment Failed',
          description: result.message || 'An error occurred while processing your payment.',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = () => {
    // Navigate to deposit page
    router.push('/wallet/deposit');
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)" className="page-container page-slide-enter">
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        {/* Header with Back Button */}
        <HStack spacing={3} cursor="pointer" onClick={() => router.back()} _hover={{ color: 'blue.500' }}>
          <Icon as={FaArrowLeft} />
          <Text fontWeight="medium" color={textColor}>Back to Plan Selection</Text>
        </HStack>

        {/* Page Title */}
        <Heading as="h1" size="xl" color={textColor} textAlign="center">
          Complete Your Purchase
        </Heading>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          {/* Left Column - Order Summary */}
          <Card bg={cardBgColor} borderRadius="xl" boxShadow="lg" className="card-slide-up">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <Heading as="h3" size="md" color={textColor}>
                  Order Summary
                </Heading>
                
                {/* Selected Plan Details */}
                <Box
                  p={4}
                  borderRadius="lg"
                  border="2px"
                  borderColor={selectedPlan.brandColor}
                  bg={`${selectedPlan.brandColor}10`}
                  position="relative"
                >
                  {selectedPlan.popular && (
                    <Badge
                      position="absolute"
                      top="-8px"
                      right="16px"
                      bg={selectedPlan.brandColor}
                      color={selectedPlan.id === 'vip' ? 'black' : 'white'}
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      RECOMMENDED
                    </Badge>
                  )}
                  
                  <VStack spacing={3} align="start">
                    <HStack justify="space-between" w="full">
                      <Heading as="h4" size="sm" color={selectedPlan.brandColor}>
                        {selectedPlan.name}
                      </Heading>
                      <Text fontSize="xl" fontWeight="bold" color={textColor}>
                        {formatCurrency(selectedPlan.price, language)}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color={subtleTextColor}>
                      {selectedPlan.description}
                    </Text>
                  </VStack>
                </Box>

                <Divider />

                {/* Plan Features */}
                <VStack spacing={3} align="start">
                  <Text fontWeight="semibold" color={textColor}>What's Included:</Text>
                  <VStack spacing={2} align="start" w="full">
                    <HStack>
                      <Icon as={FaCheckCircle} color="green.500" />
                      <Text fontSize="sm" color={textColor}>{selectedPlan.ticTokens} TIC Tokens</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaCheckCircle} color="green.500" />
                      <Text fontSize="sm" color={textColor}>{selectedPlan.communityEarnings} Community Earnings</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaCheckCircle} color="green.500" />
                      <Text fontSize="sm" color={textColor}>{selectedPlan.dailyUnilevel}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaCheckCircle} color="green.500" />
                      <Text fontSize="sm" color={textColor}>{selectedPlan.gamingAccess} Gaming Access</Text>
                    </HStack>
                  </VStack>
                </VStack>

                <Divider />

                {/* Wallet Balance */}
                <VStack spacing={3} align="stretch">
                  <Text fontWeight="semibold" color={textColor}>Payment Information:</Text>
                  <HStack justify="space-between" p={3} bg={hasSufficientBalance ? 'green.50' : 'red.50'} borderRadius="lg">
                    <HStack>
                      <Icon as={FaWallet} color={hasSufficientBalance ? 'green.500' : 'red.500'} />
                      <Text fontSize="sm" color={textColor}>Wallet Balance:</Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold" color={hasSufficientBalance ? 'green.600' : 'red.600'}>
                      {isLoadingBalance ? 'Loading...' : `$${walletBalance?.total.toFixed(2) || '0.00'}`}
                    </Text>
                  </HStack>

                  {!hasSufficientBalance && !isLoadingBalance && (
                    <Alert status="warning" borderRadius="lg">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">Insufficient Balance!</AlertTitle>
                        <AlertDescription fontSize="xs">
                          You need {formatCurrency(planPrice - (walletBalance?.total || 0), language)} more to purchase this plan.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </VStack>

                <Divider />

                {/* Total */}
                <HStack justify="space-between">
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>Total:</Text>
                  <Text fontSize="2xl" fontWeight="bold" color={selectedPlan.brandColor}>
                    {formatCurrency(selectedPlan.price, language)}
                  </Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Right Column - Payment Details */}
          <Card bg={cardBgColor} borderRadius="xl" boxShadow="lg" className="card-slide-up">
            <CardBody p={6}>
              <VStack spacing={6} align="stretch">
                <Heading as="h3" size="md" color={textColor}>
                  Payment Method
                </Heading>

                {/* Wallet Balance Payment Method (Only Option) */}
                <Box
                  p={4}
                  borderRadius="lg"
                  border="2px"
                  borderColor={hasSufficientBalance ? '#14c3cb' : 'red.300'}
                  bg={hasSufficientBalance ? 'rgba(20, 195, 203, 0.1)' : 'red.50'}
                  transition="all 0.2s"
                >
                  <HStack spacing={3}>
                    <Icon
                      as={FaWallet}
                      boxSize={5}
                      color={hasSufficientBalance ? '#14c3cb' : 'red.500'}
                    />
                    <VStack spacing={0} align="start" flex={1}>
                      <HStack>
                        <Text fontWeight="medium" color={textColor}>Wallet Balance</Text>
                        <Badge colorScheme={hasSufficientBalance ? 'green' : 'red'} size="sm">
                          ${isLoadingBalance ? '...' : walletBalance?.total.toFixed(2) || '0.00'}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color={subtleTextColor}>
                        {hasSufficientBalance
                          ? 'Pay from your TIC wallet balance'
                          : 'Insufficient balance - deposit required'
                        }
                      </Text>
                    </VStack>
                    {hasSufficientBalance && (
                      <Icon as={FaCheckCircle} color="#14c3cb" />
                    )}
                    {!hasSufficientBalance && (
                      <Icon as={FaExclamationTriangle} color="red.500" />
                    )}
                  </HStack>
                </Box>

                <Divider />

                {/* Security Notice */}
                <HStack spacing={3} p={3} bg="blue.50" borderRadius="lg">
                  <Icon as={FaShieldAlt} color="blue.500" />
                  <Text fontSize="sm" color="blue.700">
                    Your wallet payment is secured with blockchain technology
                  </Text>
                </HStack>

                {/* Terms Checkbox */}
                <Checkbox
                  colorScheme="blue"
                  isChecked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                >
                  <Text fontSize="sm" color={textColor}>
                    I agree to the Terms of Service and Privacy Policy
                  </Text>
                </Checkbox>

                {/* Action Buttons */}
                <VStack spacing={3}>
                  {hasSufficientBalance ? (
                    <Button
                      size="lg"
                      bg="#14c3cb"
                      color="white"
                      _hover={{ bg: "#0891b2" }}
                      onClick={handlePayment}
                      isLoading={isProcessing}
                      loadingText="Processing Payment..."
                      leftIcon={<Icon as={FaWallet} />}
                      w="full"
                      isDisabled={!termsAccepted}
                      opacity={!termsAccepted ? 0.6 : 1}
                    >
                      Pay from Wallet {formatCurrency(selectedPlan.price, language)}
                    </Button>
                  ) : (
                    <VStack spacing={2} w="full">
                      <Alert status="error" borderRadius="lg">
                        <AlertIcon />
                        <Box>
                          <AlertTitle fontSize="sm">Insufficient Wallet Balance</AlertTitle>
                          <AlertDescription fontSize="xs">
                            Please deposit {formatCurrency(planPrice - (walletBalance?.total || 0), language)} to complete this purchase.
                          </AlertDescription>
                        </Box>
                      </Alert>
                      <Button
                        size="lg"
                        bg="orange.500"
                        color="white"
                        _hover={{ bg: "orange.600" }}
                        onClick={handleDeposit}
                        leftIcon={<Icon as={FaWallet} />}
                        w="full"
                      >
                        Go to Wallet to Deposit
                      </Button>
                    </VStack>
                  )}

                  <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                    All plan purchases are processed through your TIC wallet balance only
                  </Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<Box p={8}><Text>Loading...</Text></Box>}>
      <BillingPageContent />
    </Suspense>
  );
}
