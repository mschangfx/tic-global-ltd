'use client';

import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Flex,
  SimpleGrid,
  Progress,
  Divider
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaWallet, FaCoins, FaCrown, FaArrowRight, FaSync, FaCheckCircle } from 'react-icons/fa';

interface WalletRoutingStatus {
  partner_wallet: {
    current_balance: number;
    total_commissions_earned: number;
    commission_count: number;
    purpose: string;
  };
  tic_wallet: {
    current_balance: number;
    total_from_rank_bonuses: number;
    purpose: string;
  };
  gic_wallet: {
    current_balance: number;
    total_from_rank_bonuses: number;
    purpose: string;
  };
  main_wallet: {
    current_balance: number;
    purpose: string;
  };
}

export default function TestWalletRouting() {
  const { data: session } = useSession();
  const [routingStatus, setRoutingStatus] = useState<WalletRoutingStatus | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchRoutingStatus = async () => {
    if (!session?.user?.email) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/test/wallet-routing');
      const data = await response.json();

      if (data.success) {
        setRoutingStatus(data.wallet_routing_status);
      } else {
        setError(data.error || 'Failed to fetch routing status');
      }
    } catch (err) {
      console.error('Error fetching routing status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testCommissionRouting = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/test/wallet-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-commission-routing' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Commission Routing Test Successful',
          description: `Added $${data.data.commission_added} to partner wallet`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setTestResults(prev => ({ ...prev, commission_test: data.data }));
        fetchRoutingStatus(); // Refresh status
      } else {
        toast({
          title: 'Commission Test Failed',
          description: data.error || 'Failed to test commission routing',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing commission routing:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test commission routing',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRankBonusRouting = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/test/wallet-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-rank-bonus-routing' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Rank Bonus Routing Test Successful',
          description: 'Rank bonus split 50/50 between TIC and GIC wallets',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setTestResults(prev => ({ ...prev, rank_bonus_test: data.data }));
        fetchRoutingStatus(); // Refresh status
      } else {
        toast({
          title: 'Rank Bonus Test Failed',
          description: data.error || 'Failed to test rank bonus routing',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing rank bonus routing:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test rank bonus routing',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWalletSeparation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/test/wallet-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-wallet-separation' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Wallet Separation Verified',
          description: 'All wallet types are properly separated and working',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setTestResults(prev => ({ ...prev, separation_test: data.data }));
      } else {
        toast({
          title: 'Verification Failed',
          description: data.error || 'Failed to verify wallet separation',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error verifying wallet separation:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to verify wallet separation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchRoutingStatus();
    }
  }, [session]);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test wallet routing
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            Wallet Routing Test
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchRoutingStatus}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        <Text color="gray.600">
          Testing wallet routing for user: {session.user.email}
        </Text>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Wallet Routing Overview */}
        {routingStatus && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Current Wallet Balances</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Partner Wallet</StatLabel>
                    <StatNumber color="green.500">${routingStatus.partner_wallet.current_balance.toFixed(2)}</StatNumber>
                    <Text fontSize="xs" color="gray.500">Referral Commissions</Text>
                  </Stat>
                  <Stat>
                    <StatLabel>TIC Balance</StatLabel>
                    <StatNumber color="blue.500">{routingStatus.tic_wallet.current_balance.toFixed(4)} TIC</StatNumber>
                    <Text fontSize="xs" color="gray.500">50% Rank Bonuses</Text>
                  </Stat>
                  <Stat>
                    <StatLabel>GIC Balance</StatLabel>
                    <StatNumber color="purple.500">{routingStatus.gic_wallet.current_balance.toFixed(4)} GIC</StatNumber>
                    <Text fontSize="xs" color="gray.500">50% Rank Bonuses</Text>
                  </Stat>
                  <Stat>
                    <StatLabel>Main Wallet</StatLabel>
                    <StatNumber color="orange.500">${routingStatus.main_wallet.current_balance.toFixed(2)}</StatNumber>
                    <Text fontSize="xs" color="gray.500">USD Balance</Text>
                  </Stat>
                </StatGroup>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Test Controls */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Wallet Routing Tests</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Button
                  leftIcon={<FaCoins />}
                  colorScheme="green"
                  onClick={testCommissionRouting}
                  isLoading={isLoading}
                  size="lg"
                >
                  Test Commission Routing
                </Button>
                
                <Button
                  leftIcon={<FaCrown />}
                  colorScheme="purple"
                  onClick={testRankBonusRouting}
                  isLoading={isLoading}
                  size="lg"
                >
                  Test Rank Bonus Routing
                </Button>
                
                <Button
                  leftIcon={<FaCheckCircle />}
                  colorScheme="blue"
                  onClick={verifyWalletSeparation}
                  isLoading={isLoading}
                  size="lg"
                >
                  Verify Separation
                </Button>
              </SimpleGrid>

              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Wallet Routing Rules:</Text>
                  <Text fontSize="sm">
                    🟢 Referral Commissions → Partner Wallet (USD)<br/>
                    🔵 Rank Bonuses → 50% TIC Wallet + 50% GIC Wallet<br/>
                    🟠 Plan Purchases → Deducted from Main Wallet<br/>
                    🟡 Daily TIC Distribution → TIC Wallet
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Tabs variant="enclosed" colorScheme="blue">
                <TabList>
                  {testResults.commission_test && <Tab>Commission Test</Tab>}
                  {testResults.rank_bonus_test && <Tab>Rank Bonus Test</Tab>}
                  {testResults.separation_test && <Tab>Separation Test</Tab>}
                </TabList>

                <TabPanels>
                  {testResults.commission_test && (
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Commission Routing Test Results</Heading>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <Stat>
                            <StatLabel>Commission Added</StatLabel>
                            <StatNumber color="green.500">
                              ${testResults.commission_test.commission_added}
                            </StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Partner Wallet Balance</StatLabel>
                            <StatNumber color="green.500">
                              ${testResults.commission_test.partner_wallet_balance}
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Alert status="success">
                          <AlertIcon />
                          <Text>{testResults.commission_test.explanation}</Text>
                        </Alert>
                      </VStack>
                    </TabPanel>
                  )}

                  {testResults.rank_bonus_test && (
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Rank Bonus Routing Test Results</Heading>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                          <Stat>
                            <StatLabel>TIC Balance</StatLabel>
                            <StatNumber color="blue.500">
                              {testResults.rank_bonus_test.tic_balance} TIC
                            </StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>GIC Balance</StatLabel>
                            <StatNumber color="purple.500">
                              {testResults.rank_bonus_test.gic_balance} GIC
                            </StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Partner Wallet</StatLabel>
                            <StatNumber color="green.500">
                              ${testResults.rank_bonus_test.partner_wallet_balance}
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Alert status="success">
                          <AlertIcon />
                          <Text>{testResults.rank_bonus_test.explanation}</Text>
                        </Alert>
                      </VStack>
                    </TabPanel>
                  )}

                  {testResults.separation_test && (
                    <TabPanel>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Wallet Separation Verification</Heading>
                        
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                          <Card>
                            <CardBody>
                              <VStack spacing={3} align="stretch">
                                <Heading size="sm">Commission Earnings</Heading>
                                <HStack justify="space-between">
                                  <Text fontSize="sm">Total Count:</Text>
                                  <Badge colorScheme="green">
                                    {testResults.separation_test.commission_earnings.count}
                                  </Badge>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="sm">Total Amount:</Text>
                                  <Text fontWeight="bold" color="green.500">
                                    ${testResults.separation_test.commission_earnings.total_amount.toFixed(2)}
                                  </Text>
                                </HStack>
                              </VStack>
                            </CardBody>
                          </Card>

                          <Card>
                            <CardBody>
                              <VStack spacing={3} align="stretch">
                                <Heading size="sm">Rank Bonuses</Heading>
                                <HStack justify="space-between">
                                  <Text fontSize="sm">Total Count:</Text>
                                  <Badge colorScheme="purple">
                                    {testResults.separation_test.rank_bonuses.count}
                                  </Badge>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="sm">Total TIC:</Text>
                                  <Text fontWeight="bold" color="blue.500">
                                    {testResults.separation_test.rank_bonuses.total_tic.toFixed(4)} TIC
                                  </Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="sm">Total GIC:</Text>
                                  <Text fontWeight="bold" color="purple.500">
                                    {testResults.separation_test.rank_bonuses.total_gic.toFixed(4)} GIC
                                  </Text>
                                </HStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        </SimpleGrid>

                        <Alert status="success">
                          <AlertIcon />
                          <Text>{testResults.separation_test.routing_verification.explanation}</Text>
                        </Alert>
                      </VStack>
                    </TabPanel>
                  )}
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        )}

        {/* Routing Flow Diagram */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Wallet Routing Flow</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <VStack spacing={4}>
                  <Heading size="sm" color="green.500">Referral Commissions</Heading>
                  <HStack spacing={2}>
                    <Badge colorScheme="blue">User Earns Commission</Badge>
                    <Icon as={FaArrowRight} />
                    <Badge colorScheme="green">Partner Wallet</Badge>
                  </HStack>
                  <Text fontSize="sm" textAlign="center" color="gray.600">
                    Daily unilevel commissions from referral network
                  </Text>
                </VStack>

                <VStack spacing={4}>
                  <Heading size="sm" color="purple.500">Rank Bonuses</Heading>
                  <VStack spacing={2}>
                    <HStack spacing={2}>
                      <Badge colorScheme="purple">Monthly Rank Bonus</Badge>
                      <Icon as={FaArrowRight} />
                      <Badge colorScheme="blue">50% TIC Wallet</Badge>
                    </HStack>
                    <HStack spacing={2}>
                      <Badge colorScheme="purple">Monthly Rank Bonus</Badge>
                      <Icon as={FaArrowRight} />
                      <Badge colorScheme="purple">50% GIC Wallet</Badge>
                    </HStack>
                  </VStack>
                  <Text fontSize="sm" textAlign="center" color="gray.600">
                    Monthly bonuses based on referral count
                  </Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
