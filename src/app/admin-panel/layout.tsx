'use client';

import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Icon,
  Button,
  useColorModeValue,
  Container,
  Heading,
  Divider,
  Badge
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import {
  FaShieldAlt,
  FaTachometerAlt,
  FaArrowDown,
  FaArrowUp,
  FaUsers,
  FaSignOutAlt
} from 'react-icons/fa';
import { AdminPanelProvider, useAdminPanel } from '@/contexts/AdminPanelContext';

// Allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'admin@ticgloballtd.com',
  'support@ticgloballtd.com',
  'mschangfx@gmail.com',
  'client@ticgloballtd.com',
  'manager@ticgloballtd.com'
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const { activeSection, setActiveSection } = useAdminPanel();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check if current user is allowed admin
  const isAllowedAdmin = session?.user?.email && ALLOWED_ADMIN_ACCOUNTS.includes(session.user.email);

  // Loading state
  if (status === 'loading') {
    return (
      <Box bg={bgColor} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading admin access...</Text>
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
          <Button onClick={() => window.location.href = '/join'}>
            Login to Continue
          </Button>
        </VStack>
      </Box>
    );
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Admin Dashboard',
      icon: FaTachometerAlt,
      color: 'blue'
    },
    {
      id: 'deposits',
      label: 'Manage Deposits',
      icon: FaArrowDown,
      color: 'green'
    },
    {
      id: 'withdrawals',
      label: 'Manage Withdrawals',
      icon: FaArrowUp,
      color: 'red'
    },
    {
      id: 'users',
      label: 'Manage Users',
      icon: FaUsers,
      color: 'purple'
    }
  ];

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
          {/* Admin Panel Header */}
          <VStack spacing={6} align="stretch">
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
                  variant={activeSection === item.id ? 'solid' : 'ghost'}
                  colorScheme={activeSection === item.id ? item.color : 'gray'}
                  justifyContent="flex-start"
                  size="lg"
                  onClick={() => setActiveSection(item.id)}
                  _hover={{
                    bg: activeSection === item.id ? undefined : `${item.color}.50`
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </VStack>

            <Divider />

            {/* Logout Button */}
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
            {children}
          </Container>
        </Box>
      </Flex>
    </Box>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminPanelProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminPanelProvider>
  );
}
