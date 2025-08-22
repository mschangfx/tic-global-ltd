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
  Spacer
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaCalendarAlt, FaSync, FaShoppingCart, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

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

export default function SubscriptionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchSubscriptions = async () => {
    if (!session?.user?.email) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/subscriptions');
      const data = await response.json();

      if (data.success) {
        setActiveSubscriptions(data.active_subscriptions || []);
        setAllSubscriptions(data.all_subscriptions || []);
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
          Please log in to view your subscriptions
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

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.status === 'expired' || new Date(subscription.end_date) <= new Date()) {
      return (
        <Badge colorScheme="red" variant="solid" size="sm">
          <HStack spacing={1}>
            <Icon as={FaTimesCircle} boxSize={3} />
            <Text>Expired</Text>
          </HStack>
        </Badge>
      );
    } else if (subscription.status === 'active') {
      return (
        <Badge colorScheme="green" variant="solid" size="sm">
          <HStack spacing={1}>
            <Icon as={FaCheckCircle} boxSize={3} />
            <Text>Active</Text>
          </HStack>
        </Badge>
      );
    } else {
      return (
        <Badge colorScheme="yellow" variant="solid" size="sm">
          <HStack spacing={1}>
            <Icon as={FaClock} boxSize={3} />
            <Text>{subscription.status}</Text>
          </HStack>
        </Badge>
      );
    }
  };

  const expiredSubscriptions = allSubscriptions.filter(sub => 
    sub.status === 'expired' || new Date(sub.end_date) <= new Date()
  );

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            My Subscriptions
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchSubscriptions}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<FaShoppingCart />}
              colorScheme="blue"
              onClick={() => router.push('/my-accounts')}
              size="sm"
            >
              Buy Plans
            </Button>
          </HStack>
        </Flex>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Statistics */}
        {stats && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Heading size="md" mb={4}>Subscription Overview</Heading>
              <StatGroup>
                <Stat>
                  <StatLabel>Total Subscriptions</StatLabel>
                  <StatNumber>{stats.total_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Active Plans</StatLabel>
                  <StatNumber color="green.500">{stats.active_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Expired Plans</StatLabel>
                  <StatNumber color="red.500">{stats.expired_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Spent</StatLabel>
                  <StatNumber>${stats.total_spent.toFixed(2)}</StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>
        )}

        {/* Subscriptions Tabs */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text>Active Plans ({activeSubscriptions.length})</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaTimesCircle} color="red.500" />
                    <Text>Expired Plans ({expiredSubscriptions.length})</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaCalendarAlt} />
                    <Text>All History ({allSubscriptions.length})</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* Active Subscriptions */}
                <TabPanel>
                  {isLoading ? (
                    <HStack justify="center" py={8}>
                      <Spinner />
                      <Text>Loading active subscriptions...</Text>
                    </HStack>
                  ) : activeSubscriptions.length > 0 ? (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Plan</Th>
                            <Th>Status</Th>
                            <Th>Start Date</Th>
                            <Th>End Date</Th>
                            <Th>Duration</Th>
                            <Th>Days Remaining</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {activeSubscriptions.map((sub) => {
                            const daysRemaining = Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                            return (
                              <Tr key={sub.id}>
                                <Td>
                                  <Badge 
                                    colorScheme={sub.plan_id === 'vip' ? 'purple' : 'blue'} 
                                    variant="outline"
                                  >
                                    {sub.plan_name}
                                  </Badge>
                                </Td>
                                <Td>{getStatusBadge(sub)}</Td>
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
                                  <Text fontSize="sm" fontWeight="medium" color={daysRemaining < 30 ? 'red.500' : 'green.500'}>
                                    {daysRemaining} days
                                  </Text>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <VStack spacing={4} py={10} textAlign="center">
                      <Icon as={FaShoppingCart} boxSize={12} color="gray.400" />
                      <Text color="gray.500" fontSize="lg">No active subscriptions</Text>
                      <Text color="gray.400" fontSize="sm">Purchase a plan to start earning TIC tokens daily</Text>
                      <Button colorScheme="blue" onClick={() => router.push('/my-accounts')}>
                        Browse Plans
                      </Button>
                    </VStack>
                  )}
                </TabPanel>

                {/* Expired Subscriptions */}
                <TabPanel>
                  {expiredSubscriptions.length > 0 ? (
                    <>
                      <Alert status="info" mb={4}>
                        <AlertIcon />
                        Expired subscriptions are automatically removed from active plans and no longer receive TIC distributions.
                      </Alert>
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Plan</Th>
                              <Th>Status</Th>
                              <Th>Start Date</Th>
                              <Th>End Date</Th>
                              <Th>Duration</Th>
                              <Th>Expired</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {expiredSubscriptions.map((sub) => {
                              const daysExpired = Math.ceil((new Date().getTime() - new Date(sub.end_date).getTime()) / (1000 * 60 * 60 * 24));
                              return (
                                <Tr key={sub.id} opacity={0.7}>
                                  <Td>
                                    <Badge 
                                      colorScheme={sub.plan_id === 'vip' ? 'purple' : 'blue'} 
                                      variant="outline"
                                    >
                                      {sub.plan_name}
                                    </Badge>
                                  </Td>
                                  <Td>{getStatusBadge(sub)}</Td>
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
                                    <Text fontSize="sm" color="red.500">
                                      {daysExpired} days ago
                                    </Text>
                                  </Td>
                                </Tr>
                              );
                            })}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <VStack spacing={4} py={10} textAlign="center">
                      <Icon as={FaCheckCircle} boxSize={12} color="green.400" />
                      <Text color="gray.500" fontSize="lg">No expired subscriptions</Text>
                      <Text color="gray.400" fontSize="sm">All your subscriptions are still active</Text>
                    </VStack>
                  )}
                </TabPanel>

                {/* All Subscriptions History */}
                <TabPanel>
                  {allSubscriptions.length > 0 ? (
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Plan</Th>
                            <Th>Status</Th>
                            <Th>Start Date</Th>
                            <Th>End Date</Th>
                            <Th>Duration</Th>
                            <Th>Current Status</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {allSubscriptions.map((sub) => (
                            <Tr key={sub.id} opacity={isActive(sub) ? 1 : 0.7}>
                              <Td>
                                <Badge 
                                  colorScheme={sub.plan_id === 'vip' ? 'purple' : 'blue'} 
                                  variant="outline"
                                >
                                  {sub.plan_name}
                                </Badge>
                              </Td>
                              <Td>{getStatusBadge(sub)}</Td>
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
                                  {isActive(sub) ? 'Active' : 'Expired'}
                                </Badge>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <VStack spacing={4} py={10} textAlign="center">
                      <Icon as={FaCalendarAlt} boxSize={12} color="gray.400" />
                      <Text color="gray.500" fontSize="lg">No subscription history</Text>
                      <Text color="gray.400" fontSize="sm">Your subscription history will appear here</Text>
                    </VStack>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
