'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Icon,
  Badge,
  Flex,
  Spacer,
  useToast,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import {
  FaWallet,
  FaArrowDown,
  FaArrowUp,
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaEye,
  FaCog,
  FaShieldAlt,
  FaSync
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  deposits: {
    total: number;
    pending: number;
    approved: number;
    totalAmount: number;
    pendingAmount: number;
    todayCount: number;
  };
  withdrawals: {
    total: number;
    pending: number;
    completed: number;
    totalAmount: number;
    pendingAmount: number;
    todayCount: number;
  };
  users: {
    total: number;
    activeToday: number;
    newToday: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Check admin authentication (simplified)
  const checkAdminAuth = async () => {
    try {
      // For now, just check if we have an admin token cookie
      const cookies = document.cookie;
      if (cookies.includes('admin-token')) {
        return true;
      }

      // Also allow access if coming from same domain (for testing)
      const currentUrl = window.location.href;
      if (currentUrl.includes('vercel.app') || currentUrl.includes('localhost')) {
        return true;
      }

      // If no token, redirect to login after a delay
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return true; // Allow access if check fails
    }
  };

  // Fetch admin statistics
  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching admin statistics...');

      // Fetch withdrawal stats
      const withdrawalResponse = await fetch('/api/admin/withdrawals?limit=1', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      let withdrawalStats = {
        total: 0,
        pending: 0,
        completed: 0,
        totalAmount: 0,
        pendingAmount: 0,
        todayCount: 0,
      };

      if (withdrawalResponse.ok) {
        const withdrawalData = await withdrawalResponse.json();
        console.log('Withdrawal data:', withdrawalData);
        if (withdrawalData.stats) {
          const stats = withdrawalData.stats;
          withdrawalStats = {
            total: stats.total_withdrawals || 0,
            pending: stats.pending_withdrawals || 0,
            completed: stats.completed_withdrawals || 0,
            totalAmount: parseFloat(stats.total_amount) || 0,
            pendingAmount: parseFloat(stats.pending_amount) || 0,
            todayCount: stats.withdrawals_today || 0,
          };
        }
      } else {
        const errorText = await withdrawalResponse.text();
        console.warn('Failed to fetch withdrawal stats:', withdrawalResponse.status, errorText);
      }

      // Fetch deposit stats
      const depositResponse = await fetch('/api/admin/deposits?limit=1', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      let depositStats = {
        total: 0,
        pending: 0,
        approved: 0,
        totalAmount: 0,
        pendingAmount: 0,
        todayCount: 0,
      };

      if (depositResponse.ok) {
        const depositData = await depositResponse.json();
        console.log('Deposit data:', depositData);
        if (depositData.stats) {
          const stats = depositData.stats;
          depositStats = {
            total: stats.total_deposits || 0,
            pending: stats.pending_deposits || 0,
            approved: stats.approved_deposits || 0,
            totalAmount: parseFloat(stats.total_amount) || 0,
            pendingAmount: parseFloat(stats.pending_amount) || 0,
            todayCount: stats.deposits_today || 0,
          };
        }
      } else {
        const errorText = await depositResponse.text();
        console.warn('Failed to fetch deposit stats:', depositResponse.status, errorText);
      }

      // Set the combined stats
      setStats({
        deposits: depositStats,
        withdrawals: withdrawalStats,
        users: {
          total: 0,
          activeToday: 0,
          newToday: 0,
        }
      });

      console.log('Admin statistics loaded successfully');
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setError('Failed to load admin statistics');

      // Set fallback stats on error
      setStats({
        deposits: {
          total: 0,
          pending: 0,
          approved: 0,
          totalAmount: 0,
          pendingAmount: 0,
          todayCount: 0,
        },
        withdrawals: {
          total: 0,
          pending: 0,
          completed: 0,
          totalAmount: 0,
          pendingAmount: 0,
          todayCount: 0,
        },
        users: {
          total: 0,
          activeToday: 0,
          newToday: 0,
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Simple admin login function
  const handleAdminLogin = async () => {
    try {
      console.log('Attempting admin login...');
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@ticgloballtd.com',
          password: 'admin1223!'
        }),
      });

      if (response.ok) {
        console.log('Admin login successful');
        toast({
          title: 'Login Successful',
          description: 'Admin access granted! Refreshing statistics...',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        // Wait a moment for the cookie to be set, then refresh stats
        setTimeout(() => {
          fetchStats();
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('Admin login failed:', errorData);
        toast({
          title: 'Login Failed',
          description: errorData.error || 'Invalid admin credentials',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Network error during login',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    // Simplified initialization - just load stats
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Center h="calc(100vh - 60px)">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading admin dashboard...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <VStack spacing={4} maxW="md" mx="auto">
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Card bg={cardBgColor} shadow="sm" w="full">
            <CardBody textAlign="center">
              <VStack spacing={4}>
                <Text color="gray.600">
                  This might be an authentication issue. Try logging in as admin:
                </Text>
                <Button
                  colorScheme="red"
                  onClick={handleAdminLogin}
                  leftIcon={<Icon as={FaShieldAlt} />}
                >
                  Login as Admin
                </Button>
                <Button
                  colorScheme="blue"
                  variant="outline"
                  onClick={fetchStats}
                  leftIcon={<Icon as={FaSync} />}
                >
                  Retry Loading Stats
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  🛡️ Admin Dashboard
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Monitor and manage deposits, withdrawals, and user activities
                </Text>
              </VStack>
              <Spacer />
              <Button
                leftIcon={<FaChartLine />}
                onClick={fetchStats}
                isLoading={isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Refresh Stats
              </Button>
            </Flex>
          </CardHeader>
        </Card>

        {/* Quick Stats Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          {/* Pending Deposits */}
          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="orange.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaArrowDown} color="orange.400" />
                    <Text>Pending Deposits</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="orange.400">{stats?.deposits.pending || 0}</StatNumber>
                <StatHelpText>
                  ${(stats?.deposits.pendingAmount || 0).toLocaleString()} pending
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Pending Withdrawals */}
          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="red.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaArrowUp} color="red.400" />
                    <Text>Pending Withdrawals</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="red.400">{stats?.withdrawals.pending || 0}</StatNumber>
                <StatHelpText>
                  ${(stats?.withdrawals.pendingAmount || 0).toLocaleString()} pending
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Today's Deposits */}
          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="green.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.400" />
                    <Text>Today's Deposits</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="green.400">{stats?.deposits.todayCount || 0}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  New deposits today
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Today's Withdrawals */}
          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="blue.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaClock} color="blue.400" />
                    <Text>Today's Withdrawals</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="blue.400">{stats?.withdrawals.todayCount || 0}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  New withdrawals today
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Quick Actions */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading as="h2" size="md" color={textColor}>
              🚀 Quick Actions
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              <Button
                leftIcon={<FaArrowDown />}
                colorScheme="orange"
                variant="outline"
                size="lg"
                onClick={() => router.push('/admin/deposits')}
                rightIcon={
                  stats?.deposits.pending ? (
                    <Badge colorScheme="orange" borderRadius="full">
                      {stats.deposits.pending}
                    </Badge>
                  ) : undefined
                }
              >
                Manage Deposits
              </Button>

              <Button
                leftIcon={<FaArrowUp />}
                colorScheme="red"
                variant="outline"
                size="lg"
                onClick={() => router.push('/admin/withdrawals')}
                rightIcon={
                  stats?.withdrawals.pending ? (
                    <Badge colorScheme="red" borderRadius="full">
                      {stats.withdrawals.pending}
                    </Badge>
                  ) : undefined
                }
              >
                Manage Withdrawals
              </Button>

              <Button
                leftIcon={<FaUsers />}
                colorScheme="blue"
                variant="outline"
                size="lg"
                onClick={() => router.push('/admin/users')}
              >
                Manage Users
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
