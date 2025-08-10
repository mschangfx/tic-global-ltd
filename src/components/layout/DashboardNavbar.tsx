'use client';

import { useEffect, useState } from 'react'; // Added useEffect, useState
import { useRouter } from 'next/navigation'; // For logout redirect
import { createClient } from '@/lib/supabase/client'; // For fetching user data
import { useLanguage, getLanguageDisplayName, formatCurrency } from '@/contexts/LanguageContext'; // For language switching
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { useSession } from 'next-auth/react'; // For NextAuth session
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
import { FaBars, FaWallet, FaBell, FaDownload, FaGlobe, FaUserCircle, FaGem, FaChevronDown, FaArrowCircleDown, FaArrowCircleUp, FaExchangeAlt, FaSync } from 'react-icons/fa'; // Added action icons
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
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);
  const walletService = WalletService.getInstance();
  const { language, setLanguage, t } = useLanguage();
  const { data: nextAuthSession } = useSession(); // Get NextAuth session

  useEffect(() => {
    // Load balance using the same API as the wallet page for consistency
    const loadBalance = async () => {
      try {
        setIsLoadingBalance(true);
        let userEmail: string | null = null;

        // Method 1: Check NextAuth session (Google OAuth)
        if (nextAuthSession?.user?.email) {
          userEmail = nextAuthSession.user.email;
          console.log('🔍 Navbar: Using NextAuth user:', userEmail);
        } else {
          // Method 2: Check Supabase auth (manual login)
          try {
            const supabase = createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
              // Silently handle auth errors - this is normal when not logged in
            } else if (user?.email) {
              userEmail = user.email;
              console.log('🔍 Navbar: Using Supabase user:', userEmail);
            }
          } catch (supabaseError) {
            // Silently handle connection errors - this is normal during page load
          }
        }

        // Check if user is authenticated
        if (!userEmail) {
          console.log('⚠️ Navbar: No authenticated user found');
          console.log('🔍 Navbar: NextAuth session:', nextAuthSession);
          setWalletBalance(null);
          setIsLoadingBalance(false);
          return;
        }

        console.log('🔍 Navbar: Loading balance for:', userEmail);

        // Use the wallet balance API directly for consistency (POST request)
        const response = await fetch('/api/wallet/balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userEmail })
        });

        const data = await response.json();
        console.log('🔍 Navbar: API request details:', {
          url: '/api/wallet/balance',
          method: 'POST',
          userEmail: userEmail,
          responseStatus: response.status,
          responseOk: response.ok
        });
        console.log('🔍 Navbar: Raw API response:', data);

        if (data.wallet) {
          const w = data.wallet;
          console.log('🔍 Navbar: Wallet data from API:', w);
          const balance: WalletBalance = {
            total: Number(w.total_balance) || 0,
            tic: Number(w.tic_balance) || 0,
            gic: Number(w.gic_balance) || 0,
            staking: Number(w.staking_balance) || 0,
            partner_wallet: Number(w.partner_wallet_balance) || 0,
            lastUpdated: w.last_updated ? new Date(w.last_updated) : new Date()
          };
          console.log('✅ Navbar: Balance loaded successfully:', balance);
          console.log('💰 Navbar: Total balance will display as:', `$${balance.total.toFixed(2)}`);
          console.log('🔍 Navbar: Setting wallet balance state...');
          setWalletBalance(balance);
          setIsLoadingBalance(false);
          console.log('✅ Navbar: State updated');
        } else if (data.error) {
          console.error('❌ Navbar: API error:', data.error);
          // Fallback to WalletService if API fails
          try {
            const balance = await walletService.getBalance();
            setWalletBalance(balance);
            setIsLoadingBalance(false);
          } catch (fallbackError) {
            console.error('❌ Navbar: Fallback also failed:', fallbackError);
            setWalletBalance(null);
            setIsLoadingBalance(false);
          }
        } else {
          console.error('❌ Navbar: Unexpected API response:', data);
          // Fallback to WalletService
          try {
            const balance = await walletService.getBalance();
            setWalletBalance(balance);
            setIsLoadingBalance(false);
          } catch (fallbackError) {
            console.error('❌ Navbar: Fallback also failed:', fallbackError);
            setWalletBalance(null);
            setIsLoadingBalance(false);
          }
        }
      } catch (error) {
        console.error('❌ Navbar: Error loading balance:', error);
        // Fallback to WalletService
        try {
          const balance = await walletService.getBalance();
          console.log('🔄 Navbar: Fallback balance from WalletService:', balance);
          setWalletBalance(balance);
          setIsLoadingBalance(false);
        } catch (fallbackError) {
          console.error('❌ Navbar: Fallback also failed:', fallbackError);
          setWalletBalance(null);
          setIsLoadingBalance(false);
        }
      }
    };

    // Set up wallet service listener for real-time updates
    const handleBalanceUpdate = (newBalance: WalletBalance) => {
      console.log('🔔 Navbar: Received balance update from WalletService:', newBalance);
      console.log('💰 Navbar: Will update display to:', `$${newBalance.total.toFixed(2)}`);
      setWalletBalance(newBalance);
      setIsLoadingBalance(false);
    };

    // Subscribe to balance updates
    const unsubscribe = walletService.subscribe(handleBalanceUpdate);

    // Initial load
    loadBalance();

    // Set up periodic refresh every 30 seconds to keep navbar in sync
    const refreshInterval = setInterval(async () => {
      console.log('🔄 Navbar: Periodic balance refresh triggered');
      try {
        // Use the balance sync utility for consistency
        const { manualBalanceRefresh } = await import('@/lib/utils/balanceSync');
        await manualBalanceRefresh();
      } catch (error) {
        console.error('❌ Navbar: Periodic refresh failed:', error);
        // Fallback to WalletService
        try {
          const balance = await walletService.getBalance();
          setWalletBalance(balance);
        } catch (fallbackError) {
          console.error('❌ Navbar: Periodic fallback failed:', fallbackError);
        }
      }
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
            >
              {isLoadingBalance ? 'Loading...' : walletBalance ? `$${walletBalance.total.toFixed(2)}` : '$0.00'}
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

        {/* Refresh Balance Button */}
        <IconButton
          aria-label="Refresh balance"
          icon={<Icon as={FaSync} />}
          size="sm"
          variant="ghost"
          colorScheme="whiteAlpha"
          onClick={async () => {
            console.log('🔄 Manual balance refresh triggered from navbar');
            setIsLoadingBalance(true);
            try {
              const { manualBalanceRefresh } = await import('@/lib/utils/balanceSync');
              await manualBalanceRefresh();
              console.log('✅ Navbar: Manual refresh completed');
            } catch (error) {
              console.error('❌ Navbar: Manual refresh failed:', error);
              // Fallback to WalletService
              try {
                const balance = await walletService.getBalance();
                setWalletBalance(balance);
              } catch (fallbackError) {
                console.error('❌ Navbar: Fallback also failed:', fallbackError);
              }
            }
          }}
          _hover={{ bg: iconButtonHoverBg }}
          display={{ base: 'none', md: 'flex' }}
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