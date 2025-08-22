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
  StatGroup
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaCalendarAlt, FaCoins, FaSync, FaShoppingCart } from 'react-icons/fa';

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  total_spent: number;
}

export default function TestSubscriptionSystem() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');

  const fetchSubscriptions = async () => {
    if (!session?.user?.email) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/subscriptions');
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.all_subscriptions || []);
        setStats(data.statistics);
      } else {
        setError(data.error || 'Failed to fetch subscriptions');
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testPurchase = async (planId: string) => {
    try {
      const response = await fetch('/api/user/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Purchase Successful',
          description: `Successfully purchased ${planId.toUpperCase()} plan`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchSubscriptions(); // Refresh data
      } else {
        toast({
          title: 'Purchase Failed',
          description: data.error || 'Failed to purchase plan',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error purchasing plan:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to process purchase',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchSubscriptions();
    }
  }, [session]);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test the subscription system
        </Alert>
      </Box>
    );
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isActive = (subscription: Subscription) => {
    return subscription.status === 'active' && new Date(subscription.end_date) > new Date();
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <FaCalendarAlt color="blue" />
                  <Heading size="lg">Subscription System Test</Heading>
                </HStack>
                <HStack spacing={2}>
                  <Button
                    leftIcon={<FaSync />}
                    onClick={fetchSubscriptions}
                    isLoading={isLoading}
                    size="sm"
                  >
                    Refresh
                  </Button>
                  <Button
                    leftIcon={<FaShoppingCart />}
                    colorScheme="blue"
                    onClick={() => testPurchase('starter')}
                    size="sm"
                  >
                    Buy Starter ($50)
                  </Button>
                  <Button
                    leftIcon={<FaShoppingCart />}
                    colorScheme="purple"
                    onClick={() => testPurchase('vip')}
                    size="sm"
                  >
                    Buy VIP ($500)
                  </Button>
                </HStack>
              </HStack>

              <Text color="gray.600">
                Testing subscription system for user: {session.user.email}
              </Text>

              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              {/* Statistics */}
              {stats && (
                <StatGroup>
                  <Stat>
                    <StatLabel>Total Subscriptions</StatLabel>
                    <StatNumber>{stats.total_subscriptions}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Active</StatLabel>
                    <StatNumber color="green.500">{stats.active_subscriptions}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Expired</StatLabel>
                    <StatNumber color="red.500">{stats.expired_subscriptions}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Spent</StatLabel>
                    <StatNumber>${stats.total_spent.toFixed(2)}</StatNumber>
                  </Stat>
                </StatGroup>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Subscriptions Table */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">All Subscriptions</Heading>
              
              {isLoading ? (
                <HStack justify="center" py={8}>
                  <Spinner />
                  <Text>Loading subscriptions...</Text>
                </HStack>
              ) : subscriptions.length > 0 ? (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Plan</Th>
                        <Th>Status</Th>
                        <Th>Start Date</Th>
                        <Th>End Date</Th>
                        <Th>Duration</Th>
                        <Th>Active</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {subscriptions.map((sub) => (
                        <Tr key={sub.id}>
                          <Td>
                            <Badge 
                              colorScheme={sub.plan_id === 'vip' ? 'purple' : 'blue'} 
                              variant="outline"
                            >
                              {sub.plan_name}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={sub.status === 'active' ? 'green' : 'red'}
                              size="sm"
                            >
                              {sub.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="sm">
                              {new Date(sub.start_date).toLocaleDateString()}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontSize="sm">
                              {new Date(sub.end_date).toLocaleDateString()}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontSize="sm" fontWeight="medium">
                              {calculateDuration(sub.start_date, sub.end_date)} days
                            </Text>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={isActive(sub) ? 'green' : 'red'}
                              size="sm"
                            >
                              {isActive(sub) ? 'Yes' : 'No'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  No subscriptions found
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Test Results */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">System Verification</Heading>
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text>✅ 1-Year Duration:</Text>
                  <Text fontWeight="bold">
                    {subscriptions.every(sub => calculateDuration(sub.start_date, sub.end_date) === 365) 
                      ? 'PASS' : 'FAIL'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>✅ Multiple Plans Allowed:</Text>
                  <Text fontWeight="bold">
                    {subscriptions.length > 1 ? 'PASS' : 'PENDING'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>✅ Active Status Check:</Text>
                  <Text fontWeight="bold">
                    {subscriptions.some(sub => isActive(sub)) ? 'PASS' : 'PENDING'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>✅ Expired Handling:</Text>
                  <Text fontWeight="bold">
                    {subscriptions.some(sub => !isActive(sub)) ? 'PASS' : 'PENDING'}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
