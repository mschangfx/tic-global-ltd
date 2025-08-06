'use client'; // Add this directive

import React from 'react';
import { Box, Flex, VStack, HStack, Text, useColorModeValue, Icon, Link as ChakraLink, Divider } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import ThemeToggle from '@/components/ThemeToggle';
import { FaChartLine, FaGamepad, FaLifeRing, FaUserCheck, FaTachometerAlt, FaHome, FaArrowCircleDown, FaArrowCircleUp, FaHistory, FaShieldAlt, FaUsers, FaCog } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSession } from 'next-auth/react';

// Move this inside the component to access the translation function
// const dashboardNavItems will be defined inside DashboardLayout

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sidebarBg = useColorModeValue('white', 'gray.700');
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const { t } = useLanguage();
  const { data: session } = useSession();

  // Check if user is admin (you can customize this logic)
  const isAdmin = session?.user?.email === 'admin@ticgloballtd.com' ||
                  session?.user?.email === 'mschangfx@gmail.com' ||
                  session?.user?.email?.includes('admin');

  const dashboardNavItems = [
    { icon: FaHome, label: t('navbar.overview'), href: '/dashboard' },
    { icon: FaTachometerAlt, label: t('navbar.myAccounts'), href: '/my-accounts' },
    { icon: FaArrowCircleDown, label: t('navbar.deposit'), href: '/wallet/deposit' },
    { icon: FaArrowCircleUp, label: t('navbar.withdrawal'), href: '/wallet/withdrawal' },
    { icon: FaHistory, label: t('navbar.transactionHistory'), href: '/wallet/history' },
    { icon: FaChartLine, label: t('navbar.becomeTrader'), href: '/trader-dashboard' },
    { icon: FaGamepad, label: t('navbar.games'), href: '/games' },
    { icon: FaUserCheck, label: t('navbar.partnership'), href: '/referrals' },
    { icon: FaLifeRing, label: t('navbar.supportHub'), href: '/support-hub' },
  ];

  // Admin navigation items
  const adminNavItems = [
    { icon: FaShieldAlt, label: 'Admin Dashboard', href: '/admin' },
    { icon: FaArrowCircleDown, label: 'Manage Deposits', href: '/admin/deposits' },
    { icon: FaArrowCircleUp, label: 'Manage Withdrawals', href: '/admin/withdrawals' },
    { icon: FaUsers, label: 'Manage Users', href: '/admin/users' },
  ];

  return (
    <Flex direction="column" h="100vh" bg={bgColor}>
      <DashboardNavbar />
      <Flex flex="1" overflow="hidden"> {/* Ensures inner content scrolls, not the whole page below navbar */}
        {/* Sidebar */}
        <Box
          w={{ base: '60px', md: '250px' }}
          bg={sidebarBg}
          p={{ base: 2, md: 4 }}
          boxShadow="md"
          display="flex"
          flexDirection="column"
          h="full" // Make sidebar take full height of its parent Flex
        >
          <VStack align="stretch" spacing={1} flexGrow={1} overflowY="auto" pt={4}>
            {dashboardNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <React.Fragment key={item.label}>
                  <NextLink href={item.href} passHref legacyBehavior>
                    <ChakraLink _hover={{ textDecoration: 'none' }}>
                      <Box
                        p={3}
                        _hover={{
                          bg: useColorModeValue('gray.300', 'gray.700'),
                          transform: 'scale(1.05)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        borderRadius="md"
                        transition="all 0.2s ease-in-out"
                        cursor="pointer"
                        color="black"
                        bg={isActive ? '#14c3cb' : 'transparent'}
                        boxShadow={isActive ? 'lg' : 'none'}
                        borderLeft={isActive ? '4px solid #E0B528' : 'none'}
                      >
                        <HStack>
                          <Icon
                            as={item.icon}
                            mr={{ base: 0, md: 3 }}
                            fontSize={{ base: "xl", md: "md"}}
                            color={isActive ? 'white' : 'black'}
                          />
                          <Text
                            display={{ base: 'none', md: 'inline' }}
                            color={isActive ? 'white' : 'black'}
                            fontWeight={isActive ? 'bold' : 'normal'}
                          >
                            {item.label}
                          </Text>
                        </HStack>
                      </Box>
                    </ChakraLink>
                  </NextLink>
                </React.Fragment>
              );
            })}

            {/* Admin Section */}
            {isAdmin && (
              <>
                <Divider my={4} />
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="red.500"
                  textTransform="uppercase"
                  px={3}
                  display={{ base: 'none', md: 'block' }}
                >
                  🛡️ Admin Panel
                </Text>
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <React.Fragment key={item.label}>
                      <NextLink href={item.href} passHref legacyBehavior>
                        <ChakraLink _hover={{ textDecoration: 'none' }}>
                          <Box
                            p={3}
                            _hover={{
                              bg: useColorModeValue('red.100', 'red.900'),
                              transform: 'scale(1.05)',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            borderRadius="md"
                            transition="all 0.2s ease-in-out"
                            cursor="pointer"
                            color="red.600"
                            bg={isActive ? 'red.500' : 'transparent'}
                            boxShadow={isActive ? 'lg' : 'none'}
                            borderLeft={isActive ? '4px solid #E53E3E' : 'none'}
                          >
                            <HStack>
                              <Icon
                                as={item.icon}
                                mr={{ base: 0, md: 3 }}
                                fontSize={{ base: "xl", md: "md"}}
                                color={isActive ? 'white' : 'red.600'}
                              />
                              <Text
                                display={{ base: 'none', md: 'inline' }}
                                color={isActive ? 'white' : 'red.600'}
                                fontWeight={isActive ? 'bold' : 'normal'}
                                fontSize="sm"
                              >
                                {item.label}
                              </Text>
                            </HStack>
                          </Box>
                        </ChakraLink>
                      </NextLink>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </VStack>

          {/* Theme Toggle at bottom of sidebar */}
          <Box
            p={3}
            borderTop="1px"
            borderColor={useColorModeValue('gray.200', 'gray.600')}
            mt={2}
          >
            <HStack justify={{ base: 'center', md: 'flex-start' }}>
              <ThemeToggle variant="switch" showLabel={true} size="sm" />
            </HStack>
          </Box>
        </Box>
        {/* Main Content Area */}
        <Box as="main" flex="1" overflowY="auto" h="full"> {/* Ensure main content takes remaining height and scrolls */}
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}