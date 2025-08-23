'use client';

import { useState, useEffect } from 'react';
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
  Icon,
  useColorModeValue,
  SimpleGrid,
  Badge,
  useToast,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup
} from '@chakra-ui/react';
import {
  FaArrowLeft,
  FaExchangeAlt,
  FaUser,
  FaUserFriends,
  FaDollarSign,
  FaCoins
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';

interface WalletBalance {
  user_email: string;
  total_balance: string;
  tic_balance: string;
  gic_balance: string;
  staking_balance: string;
  partner_wallet_balance: string;
  last_updated: string;
}

export default function TransferPage() {
  const router = useRouter();
  const toast = useToast();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  // Debug logging
  console.log('🔄 Transfer page loaded successfully');
  console.log('🔍 Current wallet balance state:', walletBalance);
  console.log('🔍 Is loading balance:', isLoadingBalance);

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Helper method to get authenticated user email from both auth methods
  const getAuthenticatedUserEmail = async () => {
    try {
      // Try NextAuth first
      const session = await getSession();
      if (session?.user?.email) {
        console.log('🔍 NextAuth user email:', session.user.email);
        return session.user.email;
      }

      // Try Supabase auth
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('❌ Supabase auth error:', error);
        return null;
      }

      if (user?.email) {
        console.log('🔍 Supabase user email:', user.email);
        return user.email;
      }

      console.warn('⚠️ No authenticated user found in either NextAuth or Supabase');
      return null;
    } catch (error) {
      console.error('❌ Error getting authenticated user:', error);
      return null;
    }
  };

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        setIsLoadingBalance(true);
        console.log('🔄 Fetching wallet balance...');

        // Get user email first
        const userEmail = await getAuthenticatedUserEmail();
        if (!userEmail) {
          console.error('❌ No authenticated user email found');
          toast({
            title: 'Authentication Error',
            description: 'Please log in to view your wallet balance',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return;
        }

        console.log('🔍 Fetching balance for user:', userEmail);
        const response = await fetch('/api/wallet/balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userEmail })
        });
        const data = await response.json();

        if (response.ok && data.wallet) {
          console.log('✅ Wallet balance fetched:', data.wallet);
          setWalletBalance(data.wallet);
        } else {
          console.error('❌ Failed to fetch wallet balance:', data.error);
          toast({
            title: 'Error',
            description: data.error || 'Failed to load wallet balance',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error('❌ Error fetching wallet balance:', error);
        toast({
          title: 'Error',
          description: 'Failed to load wallet balance',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [toast]);

  const handleBetweenAccounts = () => {
    router.push('/wallet/transfer/between-accounts');
  };

  const handleToAnotherUser = () => {
    router.push('/wallet/transfer/to-user');
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
            Transfer
          </Heading>
        </HStack>

        {/* Wallet Balance Display */}
        <Card bg={cardBg} border="1px" borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="md" color={textColor}>
                Your Account Balances
              </Heading>

              {isLoadingBalance ? (
                <HStack justify="center" py={4}>
                  <Spinner size="md" />
                  <Text color={subtleTextColor}>Loading balances...</Text>
                </HStack>
              ) : walletBalance ? (
                <StatGroup>
                  <Stat>
                    <StatLabel color={subtleTextColor}>
                      <HStack>
                        <Icon as={FaDollarSign} />
                        <Text>Total Balance</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color={textColor}>
                      ${parseFloat(walletBalance.total_balance || '0').toFixed(2)}
                    </StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel color={subtleTextColor}>
                      <HStack>
                        <Icon as={FaCoins} color="orange.500" />
                        <Text>TIC Balance</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color={textColor}>
                      {parseFloat(walletBalance.tic_balance || '0').toFixed(2)} TIC
                    </StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel color={subtleTextColor}>
                      <HStack>
                        <Icon as={FaCoins} color="purple.500" />
                        <Text>GIC Balance</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color={textColor}>
                      {parseFloat(walletBalance.gic_balance || '0').toFixed(3)} GIC
                    </StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel color={subtleTextColor}>
                      <HStack>
                        <Icon as={FaDollarSign} color="green.500" />
                        <Text>Partner Wallet</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color={textColor}>
                      ${parseFloat(walletBalance.partner_wallet_balance || '0').toFixed(2)}
                    </StatNumber>
                  </Stat>
                </StatGroup>
              ) : (
                <Text color="red.500" textAlign="center">
                  Failed to load wallet balances
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Transfer Section */}
        <Box>
          <Heading as="h2" size="lg" color={textColor} mb={6}>
            Transfer
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {/* Between your accounts */}
            <Card
              bg={cardBg}
              border="1px"
              borderColor={borderColor}
              cursor="pointer"
              _hover={{
                borderColor: 'blue.400',
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
              onClick={handleBetweenAccounts}
            >
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Box
                      bg="black"
                      borderRadius="full"
                      p={2}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={FaExchangeAlt} color="white" boxSize={4} />
                    </Box>
                    <Heading as="h3" size="md" color={textColor}>
                      Between your accounts
                    </Heading>
                  </HStack>

                  <VStack spacing={1} align="start" fontSize="sm" color={subtleTextColor}>
                    <HStack>
                      <Text fontWeight="medium">Processing time</Text>
                      <Text>instant - 1 day</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Fee</Text>
                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                        0%
                      </Badge>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Limits</Text>
                      <Text>1 - 1,000,000 USD</Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* To another user */}
            <Card
              bg={cardBg}
              border="1px"
              borderColor={borderColor}
              cursor="pointer"
              _hover={{
                borderColor: 'blue.400',
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
              onClick={handleToAnotherUser}
            >
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Box
                      bg="orange.500"
                      borderRadius="full"
                      p={2}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={FaUserFriends} color="white" boxSize={4} />
                    </Box>
                    <Heading as="h3" size="md" color={textColor}>
                      To another user
                    </Heading>
                  </HStack>

                  <VStack spacing={1} align="start" fontSize="sm" color={subtleTextColor}>
                    <HStack>
                      <Text fontWeight="medium">Processing time</Text>
                      <Text>instant - 1 day</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Fee</Text>
                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                        0%
                      </Badge>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Limits</Text>
                      <Text>1 - 1,000,000 USD</Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  );
}
