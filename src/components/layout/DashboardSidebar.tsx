'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  useColorModeValue,
  Flex,
  Divider,
  Button,
} from '@chakra-ui/react';
import {
  FaHome,
  FaUser,
  FaWallet,
  FaChartLine,
  FaGamepad,
  FaCog,
  FaSignOutAlt,
  FaUserFriends,
  FaGift,
  FaHistory,
} from 'react-icons/fa';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@chakra-ui/react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive?: boolean;
}

const SidebarItem = ({ icon, label, href, isActive }: SidebarItemProps) => {
  const bgColor = useColorModeValue(
    isActive ? 'blue.50' : 'transparent',
    isActive ? 'blue.900' : 'transparent'
  );
  const textColor = useColorModeValue(
    isActive ? 'blue.600' : 'gray.600',
    isActive ? 'blue.200' : 'gray.400'
  );
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Link href={href} style={{ width: '100%' }}>
      <Box
        w="full"
        p={3}
        borderRadius="lg"
        bg={bgColor}
        color={textColor}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          bg: isActive ? bgColor : hoverBg,
          transform: 'translateX(4px)',
        }}
      >
        <HStack spacing={3}>
          <Icon as={icon} boxSize={5} />
          <Text fontWeight={isActive ? 'semibold' : 'medium'} fontSize="sm">
            {label}
          </Text>
        </HStack>
      </Box>
    </Link>
  );
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been successfully signed out.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        router.push('/join'); // Redirect to join page
      }
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const menuItems = [
    { icon: FaHome, label: 'Overview', href: '/dashboard' },
    { icon: FaUser, label: 'My Dashboard', href: '/my-accounts' },
    { icon: FaChartLine, label: 'Trading', href: '/trading' },
    { icon: FaGamepad, label: 'Games', href: '/games' },
    { icon: FaUserFriends, label: 'Referrals', href: '/referrals' },
    { icon: FaGift, label: 'Rewards', href: '/rewards' },
    { icon: FaHistory, label: 'History', href: '/history' },
    { icon: FaCog, label: 'Settings', href: '/settings' },
  ];

  return (
    <Box
      w="250px"
      h="full"
      bg={bgColor}
      borderRightWidth="1px"
      borderColor={borderColor}
      p={4}
      display={{ base: 'none', md: 'block' }}
    >
      <VStack spacing={1} align="stretch">
        {/* Logo/Brand */}
        <Box mb={6}>
          <Text fontSize="xl" fontWeight="bold" color="blue.500">
            TIC GLOBAL
          </Text>
          <Text fontSize="xs" color="gray.500">
            Dashboard
          </Text>
        </Box>

        <Divider mb={4} />

        {/* Menu Items */}
        {menuItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={pathname === item.href}
          />
        ))}

        <Divider my={4} />

        {/* Logout Button */}
        <Button
          leftIcon={<Icon as={FaSignOutAlt} />}
          variant="ghost"
          justifyContent="flex-start"
          color="red.500"
          _hover={{ bg: 'red.50', color: 'red.600' }}
          onClick={handleLogout}
          size="sm"
        >
          Sign Out
        </Button>
      </VStack>
    </Box>
  );
}
