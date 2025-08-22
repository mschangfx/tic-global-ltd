'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // For logout redirect
import { createClient } from '@/lib/supabase/client'; // For logout functionality
import { useLanguage } from '@/contexts/LanguageContext'; // For language switching
import { useWallet } from '@/providers/WalletProvider';
import { WalletBalance } from '@/lib/services/walletService';
import { TOKEN_PRICES } from '@/lib/constants/tokens';
import { useSession } from 'next-auth/react'; // For NextAuth session
import {
  Box,
  Flex,
  HStack,
  VStack,
  IconButton,
  Button,
  Text,
  useColorModeValue,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Icon,
  Spacer,
  Link as ChakraLink,
  Image,
  Tooltip
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaBars, FaWallet, FaBell, FaDownload, FaGlobe, FaUserCircle, FaGem, FaChevronDown, FaArrowCircleDown, FaArrowCircleUp, FaExchangeAlt, FaSync, FaBitcoin, FaEthereum, FaHandshake, FaHistory, FaHome, FaTachometerAlt, FaUser } from 'react-icons/fa'; // Added action icons
import ThemeToggle from '@/components/ThemeToggle';
import NotificationDropdown from '@/components/NotificationDropdown';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Placeholder for a function to toggle the sidebar in the main dashboard layout
// This would typically be passed as a prop or managed via context
interface DashboardNavbarProps {
  onOpenSidebar?: () => void; // Optional: if sidebar toggle is handled by this navbar
}

export default function DashboardNavbar({ onOpenSidebar }: DashboardNavbarProps) {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const router = useRouter();
  const bgColor = useColorModeValue('gray.800', 'gray.900'); // Darker theme for dashboard navbar
  const textColor = useColorModeValue('white', 'gray.200');
  const iconButtonBg = useColorModeValue('whiteAlpha.200', 'whiteAlpha.100');
  const iconButtonHoverBg = useColorModeValue('whiteAlpha.300', 'whiteAlpha.200');
  const { wallet: walletBalance, refresh: refreshWallet, isLoading: isLoadingBalance } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const { language, setLanguage, t } = useLanguage();

  // Get STABLE portfolio value that doesn't change during internal transfers
  // This represents the true total value and only changes with external transactions:
  // - Deposits (increases portfolio)
  // - Withdrawals (decreases portfolio)
  // - Transfers to other users (decreases portfolio)
  // Internal transfers between own wallets do NOT affect this value
  const getPortfolioValue = (balance: WalletBalance | null): number => {
    if (!balance) return 0;

    // Use stored portfolio_value if available (preferred method)
    if (balance.portfolio_value !== undefined && balance.portfolio_value !== null) {
      console.log('🏦 Using Stored Portfolio Value:', {
        storedPortfolioValue: balance.portfolio_value,
        note: 'This stable value only changes with external transactions'
      });
      return balance.portfolio_value;
    }

    // Fallback: Calculate from individual balances (for backward compatibility)
    const ticInUsd = (balance.tic || 0) * TOKEN_PRICES.TIC;
    const gicInUsd = (balance.gic || 0) * TOKEN_PRICES.GIC;

    const calculatedValue =
      (balance.total || 0) +           // Main Wallet (USD)
      ticInUsd +                       // TIC Wallet (converted to USD)
      gicInUsd +                       // GIC Wallet (converted to USD)
      (balance.staking || 0) +         // Staking Wallet (USD)
      (balance.partner_wallet || 0);   // Partner Wallet (USD)

    // Portfolio value calculated successfully

    return calculatedValue;
  };
  const { data: nextAuthSession, status: sessionStatus } = useSession(); // Get NextAuth session

  // Handle My Dashboard navigation
  const handleGoToDashboard = () => {
    console.log('🏠 Navigating to My Dashboard from wallet menu...');

    // Add a small delay to allow for visual feedback
    setTimeout(() => {
      router.push('/my-accounts');
    }, 100);

    // Optional: You could add analytics tracking here
    // analytics.track('my_dashboard_navigation', { source: 'wallet_menu' });
  };

  // ✅ WALLET PROVIDER HANDLES ALL BALANCE LOADING - NO DIRECT API CALLS

  // ✅ NO USEEFFECT NEEDED - WALLET PROVIDER HANDLES ALL LOADING AND POLLING

  // Logout handler
  const handleLogout = async () => {
    try {
      // Create Supabase client
      const supabase = createClient();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        // Still redirect even if there's an error
      }

      // Clear any local storage or session data if needed
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      // Redirect to join page
      router.push('/join');

    } catch (error) {
      // Still redirect to join page even if logout fails
      router.push('/join');
    }
  };

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      w="full"
      px={{ base: 4, md: 6 }}
      py={3}
      bg={bgColor}
      color={textColor}
      borderBottomWidth="1px"
      borderColor={useColorModeValue('gray.700', 'gray.700')}
      h="60px" // Adjust height as needed, image suggests a slimmer bar
    >
      {/* Left Side: Hamburger and Logo */}
      <HStack spacing={{ base: 2, md: 4 }}>
        {onOpenSidebar && ( // Conditionally render if a toggle function is provided
          <IconButton
            size="md"
            icon={<Icon as={FaBars} />}
            aria-label="Open Menu"
            display={{ base: 'flex', md: 'none' }} // Often used to toggle a mobile drawer
            onClick={onOpenSidebar}
            bg={iconButtonBg}
            _hover={{ bg: iconButtonHoverBg }}
          />
        )}
         <NextLink href="/dashboard" passHref legacyBehavior>
          <ChakraLink display="flex" alignItems="center">
            {/* Replace with actual WinWinPay logo if available */}
            <Image src="/logo.png" alt="TIC GLOBAL Logo" h="30px" />
          </ChakraLink>
        </NextLink>
      </HStack>

      <Spacer />

      {/* Right Side: Actions */}
      <HStack spacing={{ base: 2, md: 3 }}>
        {/* Currency Display Dropdown */}
        <HStack spacing={1}>
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="ghost"
              colorScheme="whiteAlpha"
              leftIcon={<Icon as={FaWallet} color="cyan.400" />} // Changed to FaWallet
              rightIcon={<Icon as={FaChevronDown} boxSize={3} />} // Assuming FaChevronDown is still imported
              _hover={{ bg: iconButtonHoverBg }}
              display={{ base: 'none', md: 'flex' }}
              transition="all 0.3s ease"
              opacity={isLoadingBalance ? 0.7 : 1}
            >
              {isLoadingBalance ? (
                <HStack spacing={2}>
                  <Text fontSize="sm">Updating...</Text>
                  <Box
                    w="3px"
                    h="3px"
                    borderRadius="full"
                    bg="cyan.400"
                    animation="pulse 1.5s infinite"
                  />
                </HStack>
              ) : walletBalance ? (
                `$${getPortfolioValue(walletBalance).toFixed(2)}`
              ) : (
                '$0.00'
              )}
            </MenuButton>
          <MenuList bg={bgColor} borderColor={useColorModeValue('gray.700', 'gray.600')} minW="280px"> {/* Increased width for wallet balances */}

            {/* Wallet Balances Section */}
            <Box p={3} borderBottomWidth="1px" borderColor={useColorModeValue('gray.200', 'gray.600')}>
              <Text fontSize="xs" fontWeight="bold" color="white" mb={2}>WALLET BALANCES</Text>

              {/* Main Wallet Balance */}
              <VStack spacing={1} mb={3}>
                <HStack justify="space-between" w="full">
                  <HStack spacing={2}>
                    <Icon as={FaWallet} boxSize={4} color="green.500" />
                    <Text fontSize="sm" fontWeight="medium" color="white">Main Wallet</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="bold" color="white">
                    ${walletBalance?.total?.toFixed(2) || '0.00'}
                  </Text>
                </HStack>
                <HStack spacing={2} w="full" justify="flex-end">
                  <Button
                    as={NextLink}
                    href="/wallet/transfer/between-accounts?from=total"
                    size="xs"
                    colorScheme="blue"
                    variant="outline"
                    leftIcon={<Icon as={FaExchangeAlt} boxSize={3} />}
                  >
                    Transfer
                  </Button>
                  <Button
                    as={NextLink}
                    href="/wallet/withdrawal"
                    size="xs"
                    colorScheme="red"
                    variant="outline"
                    leftIcon={<Icon as={FaArrowCircleUp} boxSize={3} />}
                  >
                    Withdraw
                  </Button>
                </HStack>
              </VStack>

              {/* TIC Balance */}
              <VStack spacing={1} mb={3} key={`tic-${refreshKey}`}>
                <HStack justify="space-between" w="full">
                  <HStack spacing={2}>
                    <Image src="/img/TIC ICON copy.png" alt="TIC" boxSize={5} />
                    <Text fontSize="sm" fontWeight="medium" color="white">TIC</Text>
                  </HStack>
                  <VStack spacing={0} align="flex-end">
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      {(walletBalance?.tic?.toFixed(2) || '0.00')} TIC
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      ${((walletBalance?.tic || 0) * TOKEN_PRICES.TIC).toFixed(2)}
                    </Text>
                  </VStack>
                </HStack>
                <HStack spacing={2} w="full" justify="flex-end">
                  <Button
                    as={NextLink}
                    href="/wallet/transfer/between-accounts?from=tic"
                    size="xs"
                    colorScheme="blue"
                    variant="outline"
                    leftIcon={<Icon as={FaExchangeAlt} boxSize={3} />}
                    isDisabled={!walletBalance?.tic || walletBalance.tic <= 0}
                  >
                    Transfer
                  </Button>
                </HStack>
              </VStack>

              {/* GIC Balance */}
              <VStack spacing={1} mb={3}>
                <HStack justify="space-between" w="full">
                  <HStack spacing={2}>
                    <Image src="/img/GIC ICON copy.png" alt="GIC" boxSize={5} />
                    <Text fontSize="sm" fontWeight="medium" color="white">GIC</Text>
                  </HStack>
                  <VStack spacing={0} align="flex-end">
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      {walletBalance?.gic?.toFixed(2) || '0.00'} GIC
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      ${((walletBalance?.gic || 0) * TOKEN_PRICES.GIC).toFixed(2)}
                    </Text>
                  </VStack>
                </HStack>
                <HStack spacing={2} w="full" justify="flex-end">
                  <Button
                    as={NextLink}
                    href="/wallet/transfer/between-accounts?from=gic"
                    size="xs"
                    colorScheme="blue"
                    variant="outline"
                    leftIcon={<Icon as={FaExchangeAlt} boxSize={3} />}
                    isDisabled={!walletBalance?.gic || walletBalance.gic <= 0}
                  >
                    Transfer
                  </Button>
                </HStack>
              </VStack>

              {/* Partner Wallet Balance */}
              <VStack spacing={1}>
                <HStack justify="space-between" w="full">
                  <HStack spacing={2}>
                    <Icon as={FaHandshake} boxSize={4} color="blue.400" />
                    <Text fontSize="sm" fontWeight="medium" color="white">Partner Wallet</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="bold" color="white">
                    ${walletBalance?.partner_wallet?.toFixed(2) || '0.00'}
                  </Text>
                </HStack>
                <HStack spacing={2} w="full" justify="flex-end">
                  <Button
                    as={NextLink}
                    href="/wallet/transfer/between-accounts?from=partner_wallet"
                    size="xs"
                    colorScheme="blue"
                    variant="outline"
                    leftIcon={<Icon as={FaExchangeAlt} boxSize={3} />}
                    isDisabled={!walletBalance?.partner_wallet || walletBalance.partner_wallet <= 0}
                  >
                    Transfer
                  </Button>
                </HStack>
              </VStack>
            </Box>

            <MenuDivider borderColor={useColorModeValue('gray.700', 'gray.600')} />
            <Tooltip
              label="Navigate to My Dashboard page"
              placement="left"
              hasArrow
              bg="gray.800"
              color="white"
            >
              <MenuItem
                bg={bgColor}
                _hover={{
                  bg: iconButtonHoverBg,
                  transform: 'translateX(4px)'
                }}
                fontWeight="bold"
                onClick={handleGoToDashboard}
                cursor="pointer"
                transition="all 0.2s ease-in-out"
                _active={{ transform: 'scale(0.98)' }}
                borderRadius="md"
                mx={2}
                my={1}
              >
                <HStack spacing={3} w="full">
                  <Icon as={FaUser} color="blue.400" boxSize={4} />
                  <Text color="white" fontSize="sm">Go to Dashboard</Text>
                  <Spacer />
                  <Icon as={FaTachometerAlt} color="gray.400" boxSize={3} />
                </HStack>
              </MenuItem>
            </Tooltip>

            {/* Refresh Balance Button */}
            <Tooltip
              label="Refresh wallet balance"
              placement="left"
              hasArrow
              bg="gray.700"
              color="white"
            >
              <MenuItem
                bg={bgColor}
                _hover={{
                  bg: iconButtonHoverBg,
                  transform: 'translateX(4px)'
                }}
                onClick={async () => {
                  // Force reload balance using WalletProvider
                  await refreshWallet();
                  setRefreshKey(prev => prev + 1); // Force re-render
                }}
                cursor="pointer"
                transition="all 0.2s ease-in-out"
                _active={{ transform: 'scale(0.98)' }}
                borderRadius="md"
                mx={2}
                my={1}
                isDisabled={isLoadingBalance}
              >
                <HStack spacing={3} w="full">
                  <Icon as={FaSync} color="green.400" boxSize={4} />
                  <Text color="white" fontSize="sm">
                    {isLoadingBalance ? 'Refreshing...' : 'Refresh Balance'}
                  </Text>
                  <Spacer />
                  <Icon as={FaSync} color="gray.400" boxSize={3} />
                </HStack>
              </MenuItem>
            </Tooltip>
          </MenuList>
        </Menu>

        {/* Auto-refresh indicator (optional visual feedback) */}
        <Box
          display={{ base: 'none', md: 'flex' }}
          alignItems="center"
          justifyContent="center"
          w="8px"
          h="8px"
          borderRadius="full"
          bg={isLoadingBalance ? 'yellow.400' : 'green.400'}
          opacity={0.7}
          title={isLoadingBalance ? 'Updating balance...' : 'Balance up to date'}
        />

        </HStack>

        {/* Notification Icon */}
        <ErrorBoundary fallback={null}>
          <NotificationDropdown size="sm" />
        </ErrorBoundary>

        {/* Theme Toggle */}
        <ThemeToggle variant="icon" size="sm" />

        {/* Language/Globe Icon Dropdown */}
        <Menu>
          <MenuButton
            as={IconButton}
            size="sm"
            variant="ghost"
            aria-label="Language"
            icon={<Icon as={FaGlobe} boxSize={5} />}
            colorScheme="whiteAlpha"
            bg={iconButtonBg}
            _hover={{ bg: iconButtonHoverBg }}
          />
          <MenuList bg={bgColor} borderColor={useColorModeValue('gray.700', 'gray.600')} minW="200px">
            <MenuItem
              bg={bgColor}
              _hover={{bg: iconButtonHoverBg}}
              onClick={() => setLanguage('en')}
              fontWeight={language === 'en' ? 'bold' : 'normal'}
            >
              English {language === 'en' && '(Current)'}
            </MenuItem>
            <MenuItem
              bg={bgColor}
              _hover={{bg: iconButtonHoverBg}}
              onClick={() => setLanguage('vi')}
              fontWeight={language === 'vi' ? 'bold' : 'normal'}
            >
              Tiếng Việt (Vietnamese) {language === 'vi' && '(Current)'}
            </MenuItem>
            <MenuItem bg={bgColor} _hover={{bg: iconButtonHoverBg}} isDisabled={true} opacity={0.5}>
              中文 (Chinese) - Coming Soon
            </MenuItem>
            <MenuItem bg={bgColor} _hover={{bg: iconButtonHoverBg}} isDisabled={true} opacity={0.5}>
              日本語 (Japanese) - Coming Soon
            </MenuItem>
            <MenuItem bg={bgColor} _hover={{bg: iconButtonHoverBg}} isDisabled={true} opacity={0.5}>
              한국어 (Korean) - Coming Soon
            </MenuItem>
            <MenuItem bg={bgColor} _hover={{bg: iconButtonHoverBg}} isDisabled={true} opacity={0.5}>
              Bahasa Indonesia - Coming Soon
            </MenuItem>
            <MenuItem bg={bgColor} _hover={{bg: iconButtonHoverBg}} isDisabled={true} opacity={0.5}>
              ภาษาไทย (Thai) - Coming Soon
            </MenuItem>
          </MenuList>
        </Menu>

        {/* User Profile Icon */}
        <Menu>
          <MenuButton
            as={IconButton}
            size="sm"
            rounded="full"
            variant="ghost"
            cursor="pointer"
            aria-label="User Menu"
            icon={<Avatar size="sm" icon={<Icon as={FaUserCircle} boxSize={6} />} bg="blue.500" />}
            colorScheme="whiteAlpha"
            bg={iconButtonBg}
            _hover={{ bg: iconButtonHoverBg }}
          />
          <MenuList bg={bgColor} borderColor={useColorModeValue('gray.700', 'gray.600')}>
            <NextLink href="/profile" passHref legacyBehavior>
              <MenuItem as={ChakraLink} bg={bgColor} _hover={{bg: iconButtonHoverBg}}>{t('navbar.profile')}</MenuItem>
            </NextLink>
            <NextLink href="/settings" passHref legacyBehavior>
              <MenuItem as={ChakraLink} bg={bgColor} _hover={{bg: iconButtonHoverBg}}>{t('navbar.settings')}</MenuItem>
            </NextLink>
            <MenuDivider borderColor={useColorModeValue('gray.700', 'gray.600')} />
            <MenuItem onClick={handleLogout} bg={bgColor} _hover={{bg: iconButtonHoverBg}}>{t('navbar.logout')}</MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
}

// Note: FaChevronDown needs to be imported if used for the currency dropdown arrow.
// Example: import { FaChevronDown } from 'react-icons/fa';
// For simplicity, I've added it as a comment. You might need to add it to the import statement.
// Updated: Environment variables configured for admin panel deployment
// Redeployment triggered with correct SUPABASE_URL and updated service key