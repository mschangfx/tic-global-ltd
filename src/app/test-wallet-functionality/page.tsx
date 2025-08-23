'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  useToast,
  Spinner,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider
} from '@chakra-ui/react';
import { useWallet } from '@/providers/WalletProvider';
import WalletService from '@/lib/services/walletService';
import { getSession } from 'next-auth/react';

export default function TestWalletFunctionality() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const { wallet, refresh: refreshWalletProvider, isLoading: isWalletLoading } = useWallet();
  const toast = useToast();
  const walletService = WalletService.getInstance();

  useEffect(() => {
    const getUserEmail = async () => {
      const session = await getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getUserEmail();
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testWalletBalance = async () => {
    setIsLoading(true);
    addTestResult('🔄 Testing wallet balance fetch...');

    try {
      // Test 1: Direct API call
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });
      const data = await response.json();
      
      if (data.wallet) {
        addTestResult(`✅ API Balance: $${data.wallet.total_balance}`);
      } else {
        addTestResult('❌ API call failed');
      }

      // Test 2: WalletService call
      const serviceBalance = await walletService.getBalance();
      addTestResult(`✅ Service Balance: $${serviceBalance.total}`);

      // Test 3: WalletProvider balance
      addTestResult(`✅ Provider Balance: $${wallet?.total || 0}`);

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPlanPurchase = async () => {
    setIsLoading(true);
    addTestResult('🔄 Testing plan purchase (Starter Plan - $10)...');

    try {
      const initialBalance = wallet?.total || 0;
      addTestResult(`💰 Initial balance: $${initialBalance}`);

      if (initialBalance < 10) {
        addTestResult('❌ Insufficient balance for test purchase');
        setIsLoading(false);
        return;
      }

      // Test plan purchase
      const result = await walletService.processPayment('starter', 'Starter Plan');
      
      if (result.success) {
        addTestResult('✅ Payment processed successfully');
        addTestResult(`💰 New balance: $${result.newBalance?.total || 0}`);
        
        // Refresh WalletProvider
        await refreshWalletProvider();
        addTestResult('✅ WalletProvider refreshed');
        
        const balanceChange = initialBalance - (result.newBalance?.total || 0);
        addTestResult(`📊 Balance change: -$${balanceChange.toFixed(2)}`);
        
        if (Math.abs(balanceChange - 10) < 0.01) {
          addTestResult('✅ Correct deduction amount');
        } else {
          addTestResult('❌ Incorrect deduction amount');
        }
      } else {
        addTestResult(`❌ Payment failed: ${result.message}`);
      }

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCacheInvalidation = async () => {
    setIsLoading(true);
    addTestResult('🔄 Testing cache invalidation...');

    try {
      // Get initial balance
      const balance1 = await walletService.getBalance();
      addTestResult(`📊 Balance 1: $${balance1.total}`);

      // Force refresh
      const balance2 = await walletService.forceRefreshBalance();
      addTestResult(`📊 Balance 2 (after force refresh): $${balance2.total}`);

      // Refresh WalletProvider
      await refreshWalletProvider();
      addTestResult(`📊 Provider Balance: $${wallet?.total || 0}`);

      addTestResult('✅ Cache invalidation test completed');

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="lg">🧪 Wallet Functionality Test</Heading>
              <Text color="gray.600">
                Test wallet balance fetching, plan purchases, and cache invalidation
              </Text>
              
              {userEmail && (
                <Badge colorScheme="blue" alignSelf="flex-start">
                  Testing for: {userEmail}
                </Badge>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Current Wallet State */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Current Wallet State</Heading>
            {isWalletLoading ? (
              <HStack justify="center">
                <Spinner />
                <Text>Loading wallet...</Text>
              </HStack>
            ) : wallet ? (
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Balance</StatLabel>
                  <StatNumber>${wallet.total.toFixed(2)}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>TIC Balance</StatLabel>
                  <StatNumber>{wallet.tic.toFixed(2)} TIC</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>GIC Balance</StatLabel>
                  <StatNumber>{wallet.gic.toFixed(2)} GIC</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Partner Wallet</StatLabel>
                  <StatNumber>${wallet.partner_wallet.toFixed(2)}</StatNumber>
                </Stat>
              </SimpleGrid>
            ) : (
              <Text color="red.500">No wallet data available</Text>
            )}
          </CardBody>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <Heading size="md">Test Controls</Heading>
              <HStack spacing={4} wrap="wrap">
                <Button
                  onClick={testWalletBalance}
                  isLoading={isLoading}
                  colorScheme="blue"
                >
                  Test Balance Fetch
                </Button>
                <Button
                  onClick={testPlanPurchase}
                  isLoading={isLoading}
                  colorScheme="green"
                  isDisabled={!wallet || wallet.total < 10}
                >
                  Test Plan Purchase ($10)
                </Button>
                <Button
                  onClick={testCacheInvalidation}
                  isLoading={isLoading}
                  colorScheme="purple"
                >
                  Test Cache Invalidation
                </Button>
                <Button
                  onClick={clearResults}
                  variant="outline"
                  colorScheme="gray"
                >
                  Clear Results
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Results */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Test Results</Heading>
            {testResults.length === 0 ? (
              <Text color="gray.500">No test results yet. Run a test to see results.</Text>
            ) : (
              <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                {testResults.map((result, index) => (
                  <Box key={index} p={2} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" fontFamily="mono">
                      {result}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
