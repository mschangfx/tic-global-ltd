'use client';

import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  Spinner,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  useColorModeValue,
  Container,
  Divider
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaShieldAlt, 
  FaTachometerAlt,
  FaArrowDown,
  FaArrowUp,
  FaUsers,
  FaSignOutAlt,
  FaSync
} from 'react-icons/fa';

// Allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'admin@ticgloballtd.com',
  'support@ticgloballtd.com',
  'mschangfx@gmail.com',
  'client@ticgloballtd.com',
  'manager@ticgloballtd.com'
];

export default function AdminControl() {
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState({
    pendingWithdrawals: 0,
    pendingDeposits: 0,
    totalUsers: 0,
    totalTransactions: 0
  });
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check if current user is allowed admin
  const isAllowedAdmin = session?.user?.email && ALLOWED_ADMIN_ACCOUNTS.includes(session.user.email);

  // Simple view switcher with debugging
  const switchView = (view: string) => {
    console.log('=== SWITCHING VIEW ===');
    console.log('From:', currentView);
    console.log('To:', view);
    setCurrentView(view);
    console.log('View switched to:', view);
    console.log('=== END SWITCH ===');
  };

  // Load statistics
  const loadStats = async () => {
    try {
      // Mock data for now
      setStats({
        pendingWithdrawals: 5,
        pendingDeposits: 3,
        totalUsers: 150,
        totalTransactions: 1250
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <Box bg={bgColor} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading admin access...</Text>
        </VStack>
      </Box>
    );
  }

  // Not logged in or not authorized
  if (status === 'unauthenticated' || !isAllowedAdmin) {
    return (
      <Box bg={bgColor} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Icon as={FaShieldAlt} boxSize={12} color="red.500" />
          <Heading size="lg" color="red.600">Access Denied</Heading>
          <Text color="gray.500">Admin access required</Text>
          <Text fontSize="sm" color="gray.400">
            Account: {session?.user?.email || 'Not logged in'}
          </Text>
          <Button onClick={() => window.location.href = '/join'}>
            Login to Continue
          </Button>
        </VStack>
      </Box>
    );
  }

  // Menu items
  const menuItems = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: FaTachometerAlt, color: 'blue' },
    { id: 'deposits', label: 'Manage Deposits', icon: FaArrowDown, color: 'green' },
    { id: 'withdrawals', label: 'Manage Withdrawals', icon: FaArrowUp, color: 'red' },
    { id: 'users', label: 'Manage Users', icon: FaUsers, color: 'purple' }
  ];

  // Dashboard content
  const DashboardContent = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Admin Dashboard</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Withdrawals</StatLabel>
              <StatNumber color="red.500">{stats.pendingWithdrawals}</StatNumber>
              <StatHelpText>Awaiting approval</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Deposits</StatLabel>
              <StatNumber color="green.500">{stats.pendingDeposits}</StatNumber>
              <StatHelpText>Awaiting approval</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Users</StatLabel>
              <StatNumber color="blue.500">{stats.totalUsers}</StatNumber>
              <StatHelpText>Registered users</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Transactions</StatLabel>
              <StatNumber color="purple.500">{stats.totalTransactions}</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );

  // Deposits content
  const DepositsContent = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Manage Deposits</Heading>
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Pending Deposits</Heading>
            <Button leftIcon={<FaSync />} colorScheme="green">
              Refresh Deposits
            </Button>
          </HStack>
        </CardHeader>
        <CardBody>
          <Alert status="info">
            <AlertIcon />
            <Text>Deposit management functionality will be loaded here</Text>
          </Alert>
        </CardBody>
      </Card>
    </VStack>
  );

  // Withdrawals content
  const WithdrawalsContent = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Manage Withdrawals</Heading>
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Pending Withdrawals</Heading>
            <Button leftIcon={<FaSync />} colorScheme="red">
              Refresh Withdrawals
            </Button>
          </HStack>
        </CardHeader>
        <CardBody>
          <Alert status="info">
            <AlertIcon />
            <Text>Withdrawal management functionality will be loaded here</Text>
          </Alert>
        </CardBody>
      </Card>
    </VStack>
  );

  // Users content
  const UsersContent = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Manage Users</Heading>
      <Card>
        <CardBody>
          <Alert status="info">
            <AlertIcon />
            <Text>User management features coming soon...</Text>
          </Alert>
        </CardBody>
      </Card>
    </VStack>
  );

  // Render current view
  const renderCurrentView = () => {
    console.log('RENDERING VIEW:', currentView);
    switch (currentView) {
      case 'deposits':
        return <DepositsContent />;
      case 'withdrawals':
        return <WithdrawalsContent />;
      case 'users':
        return <UsersContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <Box bg={bgColor} minH="100vh">
      <Flex>
        {/* Sidebar */}
        <Box
          w="280px"
          bg={sidebarBg}
          borderRight="1px"
          borderColor={borderColor}
          minH="100vh"
          p={6}
        >
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <VStack spacing={2}>
              <HStack>
                <Icon as={FaShieldAlt} color="red.500" boxSize={6} />
                <Heading size="md" color="red.600">
                  ADMIN PANEL
                </Heading>
              </HStack>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                {session?.user?.email}
              </Text>
              <Badge colorScheme="green" size="sm">
                Authorized Admin
              </Badge>
            </VStack>

            <Divider />

            {/* Navigation Menu */}
            <VStack spacing={2} align="stretch">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  leftIcon={<Icon as={item.icon} />}
                  variant={currentView === item.id ? 'solid' : 'ghost'}
                  colorScheme={currentView === item.id ? item.color : 'gray'}
                  justifyContent="flex-start"
                  size="lg"
                  onClick={() => switchView(item.id)}
                  _hover={{
                    bg: currentView === item.id ? undefined : `${item.color}.50`
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </VStack>

            <Divider />

            <Button
              leftIcon={<Icon as={FaSignOutAlt} />}
              variant="outline"
              colorScheme="gray"
              onClick={() => window.location.href = '/api/auth/signout'}
            >
              Logout
            </Button>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex="1" p={6}>
          <Container maxW="full">
            {/* Debug Info */}
            <Alert status="info" mb={4}>
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text><strong>Current View: {currentView}</strong></Text>
                <Text fontSize="sm">URL: /admin-control (no routing conflicts)</Text>
              </VStack>
            </Alert>
            
            {renderCurrentView()}
          </Container>
        </Box>
      </Flex>
    </Box>
  );
}
