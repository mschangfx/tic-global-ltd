'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  useToast,
  Spinner,
  Divider,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { getSession } from 'next-auth/react';

interface WalletBalance {
  total: number;
  tic: number;
  gic: number;
  staking: number;
  partner_wallet: number;
  lastUpdated: Date;
}

export default function DebugBalancesPage() {
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const toast = useToast();

  const loadWalletBalance = async () => {
    setIsLoading(true);
    try {
      // Try multiple authentication methods
      let userEmail: string | null = null;

      // Method 1: NextAuth session
      const session = await getSession();
      if (session?.user?.email) {
        userEmail = session.user.email;
        console.log('✅ Debug: Found NextAuth user:', userEmail);
      }

      // Method 2: Check if we can call the API without explicit auth (it will use server-side session)
      if (!userEmail) {
        console.log('🔍 Debug: No NextAuth session, trying API call with server-side auth...');
      }

      console.log('🔄 Loading wallet balance for debug...');

      const response = await fetch('/api/wallet/balance', {
        method: 'POST', // Changed to POST to match the API
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Send empty body, let server-side handle authentication
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Raw balance data:', data);

      if (data.success && data.wallet) {
        const balance: WalletBalance = {
          total: parseFloat(data.wallet.total_balance || '0'),
          tic: parseFloat(data.wallet.tic_balance || '0'),
          gic: parseFloat(data.wallet.gic_balance || '0'),
          staking: parseFloat(data.wallet.staking_balance || '0'),
          partner_wallet: parseFloat(data.wallet.partner_wallet_balance || '0'),
          lastUpdated: new Date(data.wallet.last_updated || new Date()),
        };

        console.log('✅ Parsed balance:', balance);
        setWalletBalance(balance);
        setLastRefresh(new Date());
      } else {
        throw new Error(data.message || 'Failed to load balance');
      }
    } catch (error) {
      console.error('❌ Error loading balance:', error);
      toast({
        title: 'Error Loading Balance',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testTransfer = async (fromAccount: string, toAccount: string, amount: number) => {
    try {
      console.log(`🧪 Testing transfer: ${amount} from ${fromAccount} to ${toAccount}`);
      
      const response = await fetch('/api/wallet/transfer-between-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_account: fromAccount,
          to_account: toAccount,
          amount: amount,
          description: `Debug test transfer: ${fromAccount} → ${toAccount}`,
          metadata: {
            test: true,
            debug: true
          }
        })
      });

      const result = await response.json();
      console.log('🔍 Transfer result:', result);

      if (response.ok && result.success) {
        toast({
          title: 'Transfer Successful',
          description: `Transferred $${amount} from ${fromAccount} to ${toAccount}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Wait a moment then refresh balance
        setTimeout(() => {
          loadWalletBalance();
        }, 1000);
      } else {
        throw new Error(result.message || 'Transfer failed');
      }
    } catch (error) {
      console.error('❌ Transfer error:', error);
      toast({
        title: 'Transfer Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    loadWalletBalance();
  }, []);

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="lg">Debug: Wallet Balances</Heading>
              <HStack>
                <Badge colorScheme="blue">
                  Last Refresh: {lastRefresh.toLocaleTimeString()}
                </Badge>
                <Button
                  onClick={loadWalletBalance}
                  isLoading={isLoading}
                  colorScheme="blue"
                  size="sm"
                >
                  Refresh
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            {isLoading && !walletBalance ? (
              <HStack justify="center" py={8}>
                <Spinner />
                <Text>Loading balances...</Text>
              </HStack>
            ) : walletBalance ? (
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                <GridItem>
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="start">
                        <Text fontWeight="bold" color="blue.500">Main Wallet</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          ${walletBalance.total.toFixed(2)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">total_balance</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="start">
                        <Text fontWeight="bold" color="green.500">TIC Wallet</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          ${walletBalance.tic.toFixed(2)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">tic_balance</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="start">
                        <Text fontWeight="bold" color="purple.500">GIC Wallet</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          ${walletBalance.gic.toFixed(2)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">gic_balance</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="start">
                        <Text fontWeight="bold" color="orange.500">Staking Wallet</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          ${walletBalance.staking.toFixed(2)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">staking_balance</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="start">
                        <Text fontWeight="bold" color="teal.500">Partner Wallet</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          ${walletBalance.partner_wallet.toFixed(2)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">partner_wallet_balance</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            ) : (
              <Text>No balance data available</Text>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">Test Transfers</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Click buttons below to test small transfers and see if balances update
              </Text>
              
              <Divider />
              
              <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4} w="full">
                <Button
                  onClick={() => testTransfer('tic', 'total', 0.01)}
                  colorScheme="green"
                  size="sm"
                  isDisabled={!walletBalance || walletBalance.tic < 0.01}
                >
                  TIC → Main ($0.01)
                </Button>
                
                <Button
                  onClick={() => testTransfer('total', 'tic', 0.01)}
                  colorScheme="blue"
                  size="sm"
                  isDisabled={!walletBalance || walletBalance.total < 0.01}
                >
                  Main → TIC ($0.01)
                </Button>
                
                <Button
                  onClick={() => testTransfer('gic', 'total', 0.01)}
                  colorScheme="purple"
                  size="sm"
                  isDisabled={!walletBalance || walletBalance.gic < 0.01}
                >
                  GIC → Main ($0.01)
                </Button>
                
                <Button
                  onClick={() => testTransfer('total', 'gic', 0.01)}
                  colorScheme="blue"
                  size="sm"
                  isDisabled={!walletBalance || walletBalance.total < 0.01}
                >
                  Main → GIC ($0.01)
                </Button>
                
                <Button
                  onClick={() => testTransfer('partner_wallet', 'total', 0.01)}
                  colorScheme="teal"
                  size="sm"
                  isDisabled={!walletBalance || walletBalance.partner_wallet < 0.01}
                >
                  Partner → Main ($0.01)
                </Button>
                
                <Button
                  onClick={() => testTransfer('total', 'partner_wallet', 0.01)}
                  colorScheme="blue"
                  size="sm"
                  isDisabled={!walletBalance || walletBalance.total < 0.01}
                >
                  Main → Partner ($0.01)
                </Button>
              </Grid>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
