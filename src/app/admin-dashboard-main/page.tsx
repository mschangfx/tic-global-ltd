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
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
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
  FaSync,
  FaEye
} from 'react-icons/fa';

// Allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'admin@ticgloballtd.com',
  'support@ticgloballtd.com',
  'mschangfx@gmail.com',
  'client@ticgloballtd.com',
  'manager@ticgloballtd.com'
];

export default function AdminDashboardMain() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState(0); // Use index instead of string
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check if current user is allowed admin
  const isAllowedAdmin = session?.user?.email && ALLOWED_ADMIN_ACCOUNTS.includes(session.user.email);

  // Tab change handler
  const handleTabChange = (tabIndex: number) => {
    console.log('Tab changed to index:', tabIndex);
    setActiveTab(tabIndex);
  };

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

  // Tab definitions
  const tabs = [
    { label: 'Admin Dashboard', icon: FaTachometerAlt, color: 'blue' },
    { label: 'Manage Deposits', icon: FaArrowDown, color: 'green' },
    { label: 'Manage Withdrawals', icon: FaArrowUp, color: 'red' },
    { label: 'Manage Users', icon: FaUsers, color: 'purple' }
  ];

  // Content for each tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Admin Dashboard
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="success">
              <AlertIcon />
              <Text fontWeight="bold">✅ ADMIN DASHBOARD ACTIVE</Text>
            </Alert>
            <Heading size="lg">Admin Dashboard</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Pending Withdrawals</StatLabel>
                    <StatNumber color="red.500">5</StatNumber>
                    <StatHelpText>Awaiting approval</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Pending Deposits</StatLabel>
                    <StatNumber color="green.500">3</StatNumber>
                    <StatHelpText>Awaiting approval</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Total Users</StatLabel>
                    <StatNumber color="blue.500">150</StatNumber>
                    <StatHelpText>Registered users</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Total Transactions</StatLabel>
                    <StatNumber color="purple.500">1,250</StatNumber>
                    <StatHelpText>All time</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        );

      case 1: // Manage Deposits
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="success">
              <AlertIcon />
              <Text fontWeight="bold">✅ MANAGE DEPOSITS ACTIVE</Text>
            </Alert>
            <Heading size="lg">Manage Deposits</Heading>
            <Card>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">Pending Deposits (3)</Heading>
                  <Button leftIcon={<FaSync />} colorScheme="green" size="sm">
                    Refresh
                  </Button>
                </HStack>
              </CardHeader>
              <CardBody>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>User</Th>
                        <Th>Amount</Th>
                        <Th>Method</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>user1@example.com</Td>
                        <Td>$500 USD</Td>
                        <Td>Bank Transfer</Td>
                        <Td>Today</Td>
                        <Td>
                          <Button size="xs" colorScheme="blue" leftIcon={<FaEye />}>
                            Review
                          </Button>
                        </Td>
                      </Tr>
                      <Tr>
                        <Td>user2@example.com</Td>
                        <Td>$1,000 USD</Td>
                        <Td>Crypto</Td>
                        <Td>Yesterday</Td>
                        <Td>
                          <Button size="xs" colorScheme="blue" leftIcon={<FaEye />}>
                            Review
                          </Button>
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          </VStack>
        );

      case 2: // Manage Withdrawals
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="warning">
              <AlertIcon />
              <Text fontWeight="bold">✅ MANAGE WITHDRAWALS ACTIVE</Text>
            </Alert>
            <Heading size="lg">Manage Withdrawals</Heading>
            <Card>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">Pending Withdrawals (5)</Heading>
                  <Button leftIcon={<FaSync />} colorScheme="red" size="sm">
                    Refresh
                  </Button>
                </HStack>
              </CardHeader>
              <CardBody>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>User</Th>
                        <Th>Amount</Th>
                        <Th>Method</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>user3@example.com</Td>
                        <Td>$750 USD</Td>
                        <Td>Bank Transfer</Td>
                        <Td>Today</Td>
                        <Td>
                          <Button size="xs" colorScheme="blue" leftIcon={<FaEye />}>
                            Review
                          </Button>
                        </Td>
                      </Tr>
                      <Tr>
                        <Td>user4@example.com</Td>
                        <Td>$2,000 USD</Td>
                        <Td>Crypto</Td>
                        <Td>Yesterday</Td>
                        <Td>
                          <Button size="xs" colorScheme="blue" leftIcon={<FaEye />}>
                            Review
                          </Button>
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          </VStack>
        );

      case 3: // Manage Users
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Text fontWeight="bold">✅ MANAGE USERS ACTIVE</Text>
            </Alert>
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

      default:
        return (
          <Alert status="error">
            <AlertIcon />
            <Text>Unknown tab: {activeTab}</Text>
          </Alert>
        );
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
              {tabs.map((tab, index) => (
                <Button
                  key={index}
                  leftIcon={<Icon as={tab.icon} />}
                  variant={activeTab === index ? 'solid' : 'ghost'}
                  colorScheme={activeTab === index ? tab.color : 'gray'}
                  justifyContent="flex-start"
                  size="lg"
                  onClick={() => handleTabChange(index)}
                  _hover={{
                    bg: activeTab === index ? undefined : `${tab.color}.50`
                  }}
                >
                  {tab.label}
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
                <Text><strong>Active Tab Index: {activeTab}</strong></Text>
                <Text fontSize="sm">Tab Name: {tabs[activeTab]?.label}</Text>
                <Text fontSize="sm">URL: /admin-dashboard-main (no routing)</Text>
              </VStack>
            </Alert>
            
            {renderTabContent()}
          </Container>
        </Box>
      </Flex>
    </Box>
  );
}
