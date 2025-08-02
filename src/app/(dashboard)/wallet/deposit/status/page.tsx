'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  Button,
  Spinner,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast
} from '@chakra-ui/react';
import { FaCheckCircle, FaClock, FaWallet, FaSync } from 'react-icons/fa';
import WalletService from '@/lib/services/walletService';
import { getSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';

interface DepositStatus {
  id: string;
  status: 'pending' | 'completed' | 'rejected';
  amount: number;
  method: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
}

export default function DepositStatusPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();
  
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const [hasProcessedCompletion, setHasProcessedCompletion] = useState(false);
  
  const depositId = searchParams?.get('depositId');
  const amount = searchParams?.get('amount');
  const method = searchParams?.get('method');
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  // Poll for deposit status updates
  const checkDepositStatus = async () => {
    if (!depositId) return;
    
    try {
      const response = await fetch(`/api/deposits/status?depositId=${depositId}`);
      const data = await response.json();
      
      if (data.success) {
        const previousStatus = depositStatus?.status;
        setDepositStatus(data.deposit);

        // Only show completion toast if this is a real-time status change (not initial load)
        // Don't show toast if deposit was already completed when page loaded
        if (data.deposit.status === 'completed' && previousStatus && previousStatus !== 'completed') {
          console.log('🎉 Deposit status changed from', previousStatus, 'to completed - showing toast');

          toast({
            title: 'Deposit Completed',
            status: 'success',
            duration: 5000,
            isClosable: true,
          });

          console.log('🎉 Deposit completed - wallet will update automatically via its own refresh mechanisms');
        }
      } else {
        setError(data.error || 'Failed to fetch deposit status');
      }
    } catch (error) {
      console.error('Error checking deposit status:', error);
      setError('Failed to check deposit status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (depositId) {
      checkDepositStatus();

      // Poll every 10 seconds for status updates, but stop if completed
      const interval = setInterval(() => {
        if (depositStatus?.status !== 'completed' && !hasProcessedCompletion) {
          checkDepositStatus();
        }
      }, 10000);

      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
      setError('No deposit ID provided');
    }
  }, [depositId, depositStatus?.status, hasProcessedCompletion]);

  const getStatusDisplay = () => {
    if (!depositStatus) return { text: 'Processing', color: 'blue', icon: FaClock };

    switch (depositStatus.status) {
      case 'completed':
        return { text: 'DONE', color: 'green', icon: FaCheckCircle };
      case 'rejected':
        return { text: 'REJECTED', color: 'red', icon: FaClock };
      default:
        return { text: 'Processing', color: 'blue', icon: FaClock };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Manual wallet refresh function
  const handleRefreshWallet = async () => {
    try {
      setIsRefreshingWallet(true);

      // Get authenticated user email
      const nextAuthSession = await getSession();
      let userEmail = nextAuthSession?.user?.email;

      if (!userEmail) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        userEmail = supabaseUser?.email;
      }

      if (!userEmail) {
        throw new Error('No authenticated user found');
      }

      console.log('🔄 Refreshing wallet balance for:', userEmail);

      // Call the wallet balance API directly
      const response = await fetch(`/api/wallet/balance?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      if (data.success) {
        console.log('✅ Wallet balance refreshed:', data.balance);
        toast({
          title: 'Wallet Refreshed!',
          description: `Balance: $${parseFloat(data.balance.total_balance).toFixed(2)}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to refresh balance');
      }
    } catch (error) {
      console.error('Error refreshing wallet:', error);
      toast({
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Could not refresh wallet balance. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRefreshingWallet(false);
    }
  };

  if (isLoading && !depositStatus) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Spinner size="xl" color="blue.500" />
          <Text fontSize="lg" color={textColor}>Loading deposit status...</Text>
        </VStack>
      </Box>
    );
  }

  if (error && !depositStatus) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Alert status="error" maxW="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
          <Button onClick={() => router.push('/wallet/deposit')}>
            Back to Deposit
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="2xl" mx="auto">
        <VStack spacing={4} textAlign="center">
          <Heading as="h1" size="xl" color={textColor}>
            Deposit Status
          </Heading>
          <Text fontSize="lg" color={subtleTextColor}>
            Track your {method || depositStatus?.method} deposit progress
          </Text>
        </VStack>

        <Card bg={cardBgColor} borderRadius="xl" boxShadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="center">
              {/* Status Icon and Text */}
              <VStack spacing={4}>
                <Box
                  bg={`${statusDisplay.color}.100`}
                  borderRadius="full"
                  p={6}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {statusDisplay.text === 'Processing' ? (
                    <Spinner size="lg" color={`${statusDisplay.color}.500`} />
                  ) : (
                    <Icon as={statusDisplay.icon} boxSize={12} color={`${statusDisplay.color}.500`} />
                  )}
                </Box>
                
                <Heading as="h2" size="lg" color={`${statusDisplay.color}.500`}>
                  {statusDisplay.text}
                </Heading>
              </VStack>

              {/* Deposit Details */}
              <VStack spacing={4} w="full">
                <HStack justify="space-between" w="full">
                  <Text fontWeight="medium" color={subtleTextColor}>Amount:</Text>
                  <Text fontWeight="bold" fontSize="lg" color={textColor}>
                    ${amount || depositStatus?.amount}
                  </Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontWeight="medium" color={subtleTextColor}>Method:</Text>
                  <Text fontWeight="bold" color={textColor}>
                    {method || depositStatus?.method}
                  </Text>
                </HStack>
                
                {depositStatus && (
                  <>
                    <HStack justify="space-between" w="full">
                      <Text fontWeight="medium" color={subtleTextColor}>Submitted:</Text>
                      <Text color={textColor}>
                        {new Date(depositStatus.created_at).toLocaleString()}
                      </Text>
                    </HStack>
                    
                    {depositStatus.status === 'completed' && (
                      <HStack justify="space-between" w="full">
                        <Text fontWeight="medium" color={subtleTextColor}>Completed:</Text>
                        <Text color={textColor}>
                          {new Date(depositStatus.updated_at).toLocaleString()}
                        </Text>
                      </HStack>
                    )}
                  </>
                )}
              </VStack>

              {/* Status Messages */}

              {depositStatus?.status === 'completed' && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Deposit Completed</AlertTitle>
                  </Box>
                </Alert>
              )}

              {depositStatus?.status === 'rejected' && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Deposit Rejected</AlertTitle>
                    <AlertDescription>
                      {depositStatus.admin_notes || 'Please contact support for more information.'}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {/* Action Buttons */}
              <VStack spacing={3} w="full">
                {depositStatus?.status === 'completed' && (
                  <>
                    <Button
                      colorScheme="green"
                      size="lg"
                      w="full"
                      leftIcon={<Icon as={FaWallet} />}
                      onClick={() => router.push('/wallet')}
                    >
                      View Wallet Balance
                    </Button>

                    <Button
                      colorScheme="blue"
                      variant="outline"
                      size="lg"
                      w="full"
                      leftIcon={<Icon as={FaSync} />}
                      onClick={handleRefreshWallet}
                      isLoading={isRefreshingWallet}
                      loadingText="Refreshing..."
                    >
                      Refresh Wallet Balance
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="lg"
                  w="full"
                  onClick={() => router.push('/wallet/deposit')}
                >
                  Make Another Deposit
                </Button>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
