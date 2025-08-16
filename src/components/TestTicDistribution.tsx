'use client';

import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Divider,
  useToast,
  useColorModeValue
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { FaCoins, FaPlay, FaSync, FaUser, FaGem, FaHandshake, FaRocket } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface DistributionResult {
  plan_id: string;
  plan_name: string;
  tokens_distributed?: number;
  status: string;
  reason?: string;
  error?: string;
}

interface WalletBalance {
  tic_balance: number;
  gic_balance: number;
  partner_wallet_balance: number;
  total_balance: number;
}

const TestTicDistribution: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [message, setMessage] = useState<string>('');
  const { data: session } = useSession();
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const handleDistribute = async () => {
    setIsLoading(true);
    setResults([]);
    setMessage('');

    try {
      const response = await fetch('/api/test/distribute-tic-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setWalletBalance(data.updatedWallet);
        setMessage(data.message);

        // Force refresh the page to update navbar wallet balance
        setTimeout(() => {
          window.location.reload();
        }, 2000);

        toast({
          title: 'Distribution Complete',
          description: `${data.message} - Page will refresh in 2 seconds to update navbar balance`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setMessage(data.error || 'Distribution failed');
        toast({
          title: 'Distribution Failed',
          description: data.error || 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error distributing tokens:', error);
      setMessage('Network error occurred');
      toast({
        title: 'Network Error',
        description: 'Failed to connect to server',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshBalance = async () => {
    try {
      const response = await fetch('/api/test/distribute-tic-tokens', {
        method: 'GET'
      });

      const data = await response.json();

      if (data.wallet) {
        setWalletBalance(data.wallet);

        // Also refresh the page to update navbar
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        toast({
          title: 'Balance Updated',
          description: 'Wallet balance refreshed - Page will reload to update navbar',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  const handleCheckNavbarBalance = async () => {
    try {
      if (!session?.user?.email) {
        toast({
          title: 'Error',
          description: 'No user logged in',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log('🔍 Testing wallet balance API for:', session.user.email);

      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          userEmail: session.user.email,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      console.log('🔍 Raw API response:', data);

      if (data.wallet) {
        const wallet = data.wallet;
        console.log('🔍 Wallet object:', wallet);
        console.log('🪙 TIC balance from API:', wallet.tic_balance, typeof wallet.tic_balance);
        console.log('💎 GIC balance from API:', wallet.gic_balance, typeof wallet.gic_balance);
        console.log('🤝 Partner balance from API:', wallet.partner_wallet_balance, typeof wallet.partner_wallet_balance);

        setWalletBalance({
          tic_balance: parseFloat(wallet.tic_balance),
          gic_balance: parseFloat(wallet.gic_balance),
          partner_wallet_balance: parseFloat(wallet.partner_wallet_balance),
          total_balance: parseFloat(wallet.total_balance)
        });

        toast({
          title: 'API Response Received',
          description: `TIC: ${wallet.tic_balance}, GIC: ${wallet.gic_balance}, Partner: $${wallet.partner_wallet_balance}. Check console for details.`,
          status: 'info',
          duration: 8000,
          isClosable: true,
        });
      } else {
        console.error('❌ No wallet data in response:', data);
        toast({
          title: 'API Error',
          description: data.error || 'No wallet data returned',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error checking navbar balance:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to fetch wallet balance',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDebugWalletBalance = async () => {
    try {
      const response = await fetch('/api/debug/wallet-balance');
      const data = await response.json();

      console.log('🔍 Debug wallet balance:', data);

      if (data.error) {
        toast({
          title: 'Debug Error',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const ticBalance = data.wallet?.tic_balance || 0;
        const hasDistributions = (data.recentDistributions || []).length > 0;

        toast({
          title: 'Debug Results',
          description: `User: ${data.debug.currentUser}, TIC: ${ticBalance}, Distributions: ${hasDistributions ? 'Yes' : 'No'}. Check console for details.`,
          status: 'info',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error in debug:', error);
      toast({
        title: 'Debug Failed',
        description: 'Check console for details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleTestDailyDistribution = async () => {
    try {
      if (!session?.user?.email) {
        toast({
          title: 'Error',
          description: 'No user logged in',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cron/daily-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Daily TIC Distribution Complete',
          description: `Distributed ${data.summary.totalTicDistributed.toFixed(2)} TIC to ${data.uniqueUsers} users`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Refresh page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error || 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error in daily distribution:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to run daily distribution',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestUnilevelCommissions = async () => {
    try {
      if (!session?.user?.email) {
        toast({
          title: 'Error',
          description: 'No user logged in',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cron/daily-unilevel-commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Unilevel Commission Test Complete',
          description: `Distributed daily commissions based on VIP accounts ($0.44 per VIP per day)`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Refresh page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: 'Commission Test Result',
          description: data.message || 'No commissions distributed',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing unilevel commissions:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test unilevel commissions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg={cardBg} p={6} borderRadius="lg" shadow="md" maxW="600px" mx="auto">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={2}>
            <FaCoins color="orange" />
            <Text fontSize="lg" fontWeight="bold" color={textColor}>
              Test Distribution Systems
            </Text>
          </HStack>
          <Badge colorScheme="orange" variant="outline">
            Testing Only
          </Badge>
        </HStack>

        <Text fontSize="sm" color={subtleTextColor}>
          Test the distribution systems: Daily TIC tokens and Unilevel Partner commissions.
          Note: GIC tokens are earned from monthly ranking bonuses, not daily distribution.
        </Text>

        {/* Show current user email for debugging */}
        <Box bg={useColorModeValue('blue.50', 'blue.900')} p={3} borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
          <VStack spacing={2} align="start">
            <HStack spacing={2}>
              <FaUser color="blue" />
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Current User: {session?.user?.email || 'Not logged in'}
              </Text>
            </HStack>
            <Text fontSize="xs" color={subtleTextColor}>
              Use "Debug Wallet Balance" to check if your account has TIC tokens.
            </Text>
            <Text fontSize="xs" color={subtleTextColor}>
              If you have no TIC balance, run "Test TIC Distribution" to earn tokens.
            </Text>
          </VStack>
        </Box>

        <VStack spacing={3}>
          <HStack spacing={3} w="full">
            <Button
              leftIcon={<FaPlay />}
              colorScheme="orange"
              onClick={handleDistribute}
              isLoading={isLoading}
              loadingText="Distributing..."
              size="md"
              flex={1}
            >
              Test TIC Distribution
            </Button>

            <Button
              leftIcon={<FaSync />}
              variant="outline"
              onClick={handleRefreshBalance}
              size="md"
            >
              Refresh
            </Button>
          </HStack>

          <HStack spacing={3} w="full">
            <Button
              leftIcon={<FaRocket />}
              colorScheme="purple"
              onClick={handleTestDailyDistribution}
              isLoading={isLoading}
              loadingText="Running..."
              size="sm"
              flex={1}
            >
              Test Daily TIC Distribution (All Users)
            </Button>

            <Button
              leftIcon={<FaHandshake />}
              colorScheme="green"
              onClick={handleTestUnilevelCommissions}
              isLoading={isLoading}
              loadingText="Testing..."
              size="sm"
              flex={1}
            >
              Test Unilevel Commissions
            </Button>
          </HStack>

          <VStack spacing={2} w="full">
            <Button
              leftIcon={<FaCoins />}
              colorScheme="blue"
              variant="outline"
              onClick={handleCheckNavbarBalance}
              size="sm"
              w="full"
            >
              Check Navbar Balance API
            </Button>

            <HStack spacing={2} w="full">
              <Button
                colorScheme="teal"
                variant="outline"
                onClick={handleDebugWalletBalance}
                size="sm"
                flex={1}
              >
                Debug Wallet Balance
              </Button>

              <Button
                colorScheme="orange"
                variant="outline"
                onClick={() => window.location.reload()}
                size="sm"
                flex={1}
              >
                Force Refresh Page
              </Button>
            </HStack>
          </VStack>
        </VStack>

        {message && (
          <Alert status={results.length > 0 ? 'success' : 'warning'}>
            <AlertIcon />
            <AlertTitle>Distribution Result:</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {walletBalance && (
          <Box bg={useColorModeValue('gray.50', 'gray.600')} p={4} borderRadius="md">
            <Text fontSize="sm" fontWeight="medium" color={textColor} mb={2}>
              Updated Wallet Balance:
            </Text>
            <VStack spacing={1} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>TIC Balance:</Text>
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  {walletBalance.tic_balance.toFixed(4)} TIC
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>GIC Balance:</Text>
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  {walletBalance.gic_balance.toFixed(4)} GIC
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>Partner Wallet:</Text>
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  ${walletBalance.partner_wallet_balance.toFixed(2)}
                </Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {results.length > 0 && (
          <>
            <Divider />
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Distribution Results:
              </Text>
              {results.map((result, index) => (
                <Box
                  key={index}
                  p={3}
                  bg={useColorModeValue('gray.50', 'gray.600')}
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderLeftColor={
                    result.status === 'success' ? 'green.400' :
                    result.status === 'already_distributed' ? 'blue.400' :
                    'red.400'
                  }
                >
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        {result.plan_name}
                      </Text>
                      <Text fontSize="xs" color={subtleTextColor}>
                        {result.reason || `${result.tokens_distributed?.toFixed(4)} TIC distributed`}
                      </Text>
                    </VStack>
                    <Badge
                      colorScheme={
                        result.status === 'success' ? 'green' :
                        result.status === 'already_distributed' ? 'blue' :
                        'red'
                      }
                      size="sm"
                    >
                      {result.status}
                    </Badge>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </>
        )}

        <Text fontSize="xs" color={subtleTextColor} textAlign="center">
          💡 After distribution, check the wallet dropdown in the navbar to see updated TIC balance
        </Text>
      </VStack>
    </Box>
  );
};

export default TestTicDistribution;
