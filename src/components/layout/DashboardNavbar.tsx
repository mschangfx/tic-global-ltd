'use client';

import { useEffect, useState } from 'react'; // Added useEffect, useState
import { useRouter } from 'next/navigation'; // For logout redirect
import { createClient } from '@/lib/supabase/client'; // For fetching user data
import { useLanguage, getLanguageDisplayName, formatCurrency } from '@/contexts/LanguageContext'; // For language switching
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import {
  Box,
  Flex,
  HStack,
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
  Image
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaBars, FaWallet, FaBell, FaDownload, FaGlobe, FaUserCircle, FaGem, FaChevronDown, FaArrowCircleDown, FaArrowCircleUp, FaExchangeAlt } from 'react-icons/fa'; // Added action icons
import ThemeToggle from '@/components/ThemeToggle';
import NotificationDropdown from '@/components/NotificationDropdown';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Placeholder for a function to toggle the sidebar in the main dashboard layout
// This would typically be passed as a prop or managed via context
interface DashboardNavbarProps {
  onOpenSidebar?: () => void; // Optional: if sidebar toggle is handled by this navbar
}

export default function DashboardNavbar({ onOpenSidebar }: DashboardNavbarProps) {
  const router = useRouter();
  const bgColor = useColorModeValue('gray.800', 'gray.900'); // Darker theme for dashboard navbar
  const textColor = useColorModeValue('white', 'gray.200');
  const iconButtonBg = useColorModeValue('whiteAlpha.200', 'whiteAlpha.100');
  const iconButtonHoverBg = useColorModeValue('whiteAlpha.300', 'whiteAlpha.200');
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const walletService = WalletService.getInstance();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    // Load balance using the same API as the wallet page for consistency
    const loadBalance = async () => {
      try {
        // Get authenticated user email
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Use authenticated user email or fallback to default for testing
        const userEmail = user?.email || 'mschangfx@gmail.com';
        console.log('🔍 Navbar: Loading balance for:', userEmail);

        // Use the wallet balance API directly for consistency
        const response = await fetch(`/api/wallet/balance?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();

        if (data.success) {
          const balance: WalletBalance = {
            total: parseFloat(data.balance.total_balance) || 0,
            tic: parseFloat(data.balance.tic_balance) || 0,
            gic: parseFloat(data.balance.gic_balance) || 0,
            staking: parseFloat(data.balance.staking_balance) || 0,
            partner_wallet: parseFloat(data.balance.partner_wallet_balance) || 0,
            lastUpdated: new Date(data.balance.last_updated)
          };
          console.log('✅ Navbar: Balance loaded:', balance);
          setWalletBalance(balance);
        } else {
          console.error('❌ Navbar: API failed:', data);
          // Fallback to WalletService if API fails
          const balance = await walletService.getBalance();
          setWalletBalance(balance);
        }
      } catch (error) {
        console.error('❌ Navbar: Error loading balance:', error);
        // Fallback to WalletService
        const balance = await walletService.getBalance();
        console.log('🔄 Navbar: Fallback balance from WalletService:', balance);
        setWalletBalance(balance);
      }
    };

    // Set up wallet service listener for real-time updates
    const handleBalanceUpdate = (newBalance: WalletBalance) => {
      setWalletBalance(newBalance);
    };

    // Subscribe to balance updates
    const unsubscribe = walletService.subscribe(handleBalanceUpdate);

    // Initial load
    loadBalance();

    // Set up periodic refresh every 30 seconds to keep navbar in sync
    const refreshInterval = setInterval(() => {
      loadBalance();
    }, 30000);

    // Cleanup listener and interval on unmount
    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [walletService]);

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
          >
            {walletBalance !== null ? `$${walletBalance.total.toFixed(2)}` : 'Loading...'}
          </MenuButton>
          <MenuList bg={bgColor} borderColor={useColorModeValue('gray.700', 'gray.600')} minW="180px"> {/* Adjusted minW */}
            <MenuItem as={NextLink} href="/wallet/deposit" icon={<Icon as={FaArrowCircleDown} />} bg={bgColor} _hover={{bg: iconButtonHoverBg}}>
              {t('navbar.deposit')}
            </MenuItem>
            <MenuItem as={NextLink} href="/wallet/withdrawal" icon={<Icon as={FaArrowCircleUp} />} bg={bgColor} _hover={{bg: iconButtonHoverBg}}>
              {t('navbar.withdrawal')}
            </MenuItem>
            <MenuItem as={NextLink} href="/wallet?action=showTransfer" icon={<Icon as={FaExchangeAlt} />} bg={bgColor} _hover={{bg: iconButtonHoverBg}}>
              Transfer
            </MenuItem>
            <MenuDivider borderColor={useColorModeValue('gray.700', 'gray.600')} />
            <NextLink href="/wallet" passHref legacyBehavior>
              <MenuItem as={ChakraLink} bg={bgColor} _hover={{bg: iconButtonHoverBg}} fontWeight="bold">
                Go to My Wallet
              </MenuItem>
            </NextLink>
          </MenuList>
        </Menu>

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