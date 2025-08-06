'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Spacer,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import {
  FaEye,
  FaArrowCircleDown,
  FaArrowCircleUp,
  FaExchangeAlt,
  FaHistory,
  FaBitcoin,
  FaEthereum,
  FaPiggyBank,
  FaSearchDollar, // Icon for "No data available"
  FaDollarSign, // Added FaDollarSign
  FaSync, // Added sync icon
  FaRedo, // Added refresh page icon
  // Assuming SiTether might be used later, for now we'll use FaDollarSign or a generic one
  // import { SiTether } from 'react-icons/si';
} from 'react-icons/fa';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';

// DepositAssetInfo interface removed
interface AssetRowProps {
  icon: React.ElementType;
  name: string;
  amount: string;
  usdValue: string;
  pnl: string;
  iconColor?: string;
}

const AssetRow: React.FC<AssetRowProps> = ({ icon, name, amount, usdValue, pnl, iconColor }) => {
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Flex
      justify="space-between"
      align="center"
      py={3}
      borderBottomWidth="1px"
      borderColor={borderColor}
      _last={{ borderBottomWidth: 0 }}
    >
      <HStack spacing={3}>
        <Icon as={icon} boxSize={6} color={iconColor || 'gray.500'} />
        <Text fontWeight="medium">{name}</Text>
      </HStack>
      <VStack align="flex-end" spacing={0}>
        <Text fontWeight="medium">{amount}</Text>
        <Text fontSize="xs" color={textColor}>${usdValue}</Text>
      </VStack>
      <Text color={pnl.startsWith('-') ? 'red.500' : 'green.500'}>{pnl}</Text>
    </Flex>
  );
};

const ActionButton: React.FC<{ icon: React.ElementType; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <VStack spacing={1}>
    <IconButton
      aria-label={label}
      icon={<Icon as={icon} boxSize={6} />}
      onClick={onClick} // Ensure onClick is passed through
      size="lg"
      isRound
      variant="ghost"
      color={useColorModeValue('blue.500', 'blue.300')}
      _hover={{ bg: useColorModeValue('blue.50', 'blue.900')}}
    />
    <Text fontSize="xs" fontWeight="medium">{label}</Text>
  </VStack>
);

export default function MyWalletPage() {
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.700');
  const totalBalanceBg = useColorModeValue('white', 'gray.700');
  const totalBalanceTextColor = useColorModeValue('gray.800', 'white');
  const sectionTitleColor = useColorModeValue('gray.700', 'gray.200');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Token prices
  const TIC_PRICE = 0.02; // $0.02 per TIC

  // State for wallet balance
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const walletService = WalletService.getInstance();
  const supabase = createClient();
  const toast = useToast();

  // Helper method to get authenticated user email from both auth methods
  const getAuthenticatedUserEmail = async (): Promise<string | null> => {
    try {
      // Method 1: Try NextAuth session (Google OAuth)
      const nextAuthSession = await getSession();
      if (nextAuthSession?.user?.email) {
        return nextAuthSession.user.email;
      }

      // Method 2: Try Supabase auth (manual login)
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }

      console.log('❌ Wallet page: No authenticated user found');
      return null;
    } catch (error) {
      console.error('❌ Wallet page: Error getting authenticated user:', error);
      return null;
    }
  };

  // Load wallet data
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const loadWalletData = async () => {
      try {
        if (!isMounted) return;
        setIsLoading(true);

        // Try to load current balance without syncing
        await loadCurrentBalance();

        // Try to get recent transactions
        try {
          // Get user email for API call
          const userEmail = await getAuthenticatedUserEmail();
          if (!userEmail) {
            if (isMounted) setTransactions([]);
            return;
          }

          // Call the transactions API
          const response = await fetch(`/api/wallet/transactions?email=${encodeURIComponent(userEmail)}&limit=10`);
          const data = await response.json();

          if (!response.ok || !data.success) {
            console.warn('Could not load transactions:', data.message);
            if (isMounted) setTransactions([]);
            return;
          }

          if (!isMounted) return; // Check again before setting state

          // Deduplicate transactions by transaction_id to prevent duplicates
          const uniqueTransactions = data.transactions.filter((transaction: any, index: number, self: any[]) =>
            index === self.findIndex(t => t.transaction_id === transaction.transaction_id)
          );

          setTransactions(uniqueTransactions);
        } catch (transactionError) {
          console.warn('Could not load transactions:', transactionError);
          if (isMounted) setTransactions([]);
        }

      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadWalletData();

    // Set up wallet service listener for real-time updates
    const handleBalanceUpdate = (newBalance: WalletBalance) => {
      if (!isMounted) return; // Don't update if component unmounted

      console.log('📊 Wallet page: Balance updated:', newBalance);

      // Preserve existing TIC balance if the new balance has 0 TIC but we had TIC before
      if (walletBalance && walletBalance.tic > 0 && newBalance.tic === 0) {
        console.log('⚠️ Preserving existing TIC balance:', walletBalance.tic);
        newBalance.tic = walletBalance.tic;
      }

      setWalletBalance(newBalance);
    };

    // Subscribe to balance updates
    const unsubscribe = walletService.subscribe(handleBalanceUpdate);

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Manual sync function for users who want to update their balance
  const manualSyncBalance = async () => {
    try {
      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to sync your balance.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setIsLoading(true);

      // Call the sync API
      const response = await fetch('/api/wallet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Reload the balance after sync
          await loadCurrentBalance();
          toast({
            title: 'Balance Synced',
            description: `Balance updated to $${data.balance.total_balance}`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          throw new Error(data.error || 'Sync failed');
        }
      } else {
        throw new Error('Sync request failed');
      }
    } catch (error) {
      console.error('Error syncing balance:', error);
      toast({
        title: 'Sync Failed',
        description: 'Unable to sync balance. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load balance without syncing (just fetch current state)
  const loadCurrentBalance = async () => {
    try {
      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        // Silently return if user not authenticated
        return;
      }

      // Use the same API endpoint as the navbar for consistency
      const response = await fetch(`/api/wallet/balance?email=${encodeURIComponent(userEmail)}`);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Balance API response:', data);
        if (data.success) {
          const balance: WalletBalance = {
            total: parseFloat(data.balance.total_balance) || 0,
            tic: parseFloat(data.balance.tic_balance) || 0,
            gic: parseFloat(data.balance.gic_balance) || 0,
            staking: parseFloat(data.balance.staking_balance) || 0,
            partner_wallet: parseFloat(data.balance.partner_wallet_balance) || 0,
            lastUpdated: new Date(data.balance.last_updated)
          };
          console.log('✅ Wallet page: Balance loaded:', balance);
          setWalletBalance(balance);
          return;
        }
      }

      // Fallback: try to use WalletService if balance API doesn't exist
      console.log('⚠️ Balance API not available, using WalletService');
      const balance = await walletService.getBalance();
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error loading current balance:', error);
      // Last resort: use dev sync but warn about it
      console.log('⚠️ Using dev sync as last resort - this may reset TIC balance');
      await loadBalanceWithDevSync();
    }
  };

  // Load balance using dev sync (works without authentication) - only for manual sync
  const loadBalanceWithDevSync = async () => {
    try {
      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        // Silently return if user not authenticated
        return;
      }

      const response = await fetch('/api/dev/sync-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();
      console.log('📊 Dev sync API response:', data);

      if (data.success) {
        const balance: WalletBalance = {
          total: data.wallet.total_balance,
          tic: data.wallet.tic_balance,
          gic: data.wallet.gic_balance,
          staking: data.wallet.staking_balance,
          partner_wallet: data.wallet.partner_wallet_balance || 0,
          lastUpdated: new Date(data.wallet.last_updated)
        };
        console.log('📊 Setting wallet balance from dev sync:', balance);
        setWalletBalance(balance);
      }
    } catch (error) {
      console.error('Error loading balance with dev sync:', error);
    }
  };

  // Force sync wallet balance using dev sync (works without authentication)
  const handleSyncWallet = async () => {
    try {
      setIsSyncing(true);
      console.log('🔄 Syncing wallet...');

      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        // Silently return if user not authenticated
        setIsSyncing(false);
        return;
      }

      const response = await fetch('/api/dev/sync-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Wallet synced:', data);

        // Update wallet balance with synced data
        const newBalance: WalletBalance = {
          total: data.wallet.total_balance,
          tic: data.wallet.tic_balance,
          gic: data.wallet.gic_balance,
          staking: data.wallet.staking_balance,
          partner_wallet: data.wallet.partner_wallet_balance || 0,
          lastUpdated: new Date(data.wallet.last_updated)
        };

        setWalletBalance(newBalance);

        // Show success message
        const ticValue = (data.wallet.tic_balance * TIC_PRICE).toFixed(2);
        alert(`Wallet synced successfully! USD Balance: $${data.wallet.total_balance.toFixed(2)} | TIC: ${data.wallet.tic_balance} ($${ticValue})`);
      } else {
        console.error('Sync failed:', data.error);
        alert('Failed to sync wallet. Please try again.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync wallet. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Test wallet balance API directly and force refresh
  const handleTestBalanceAPI = async () => {
    try {
      setIsTestingAPI(true);
      console.log('🧪 Testing wallet balance API...');

      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        alert('No authenticated user found');
        return;
      }

      // Test the balance API directly
      const response = await fetch(`/api/wallet/balance?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      console.log('🧪 Balance API response:', data);

      if (data.success) {
        // Update the displayed balance immediately
        const newBalance: WalletBalance = {
          total: parseFloat(data.balance.total_balance) || 0,
          tic: parseFloat(data.balance.tic_balance) || 0,
          gic: parseFloat(data.balance.gic_balance) || 0,
          staking: parseFloat(data.balance.staking_balance) || 0,
          partner_wallet: parseFloat(data.balance.partner_wallet_balance) || 0,
          lastUpdated: new Date(data.balance.last_updated)
        };
        setWalletBalance(newBalance);

        alert(`Balance Updated!\nCurrent Balance: $${newBalance.total.toFixed(2)}\nLast Updated: ${data.balance.last_updated}`);

        // Force refresh the entire page to update all components
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(`API Test Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      alert('API test failed. Check console for details.');
    } finally {
      setIsTestingAPI(false);
    }
  };

  // Wallet action handlers
  const handleDeposit = () => {
    router.push('/wallet/deposit');
  };

  const handleWithdraw = () => {
    router.push('/wallet/withdrawal');
  };

  const handleTransfer = () => {
    router.push('/wallet/transfer');
  };

  const handleHistory = () => {
    router.push('/wallet/history');
  };



  // Create assets array with real data
  const assets = [
    {
      icon: FaBitcoin,
      name: 'TIC',
      amount: walletBalance?.tic.toFixed(2) || '0.00',
      usdValue: ((walletBalance?.tic || 0) * TIC_PRICE).toFixed(2), // TIC value at $0.02 per TIC
      pnl: '0.00%',
      iconColor: 'orange.400'
    },
    {
      icon: FaEthereum,
      name: 'GIC',
      amount: walletBalance?.gic.toFixed(2) || '0.00',
      usdValue: walletBalance?.gic.toFixed(2) || '0.00',
      pnl: '0.00%',
      iconColor: 'purple.400'
    },
    {
      icon: FaDollarSign,
      name: 'Partner Wallet',
      amount: walletBalance?.partner_wallet.toFixed(2) || '0.00',
      usdValue: walletBalance?.partner_wallet.toFixed(2) || '0.00',
      pnl: '0.00%',
      iconColor: 'blue.400'
    },
  ];

  return (
    <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="calc(100vh - 60px)"> {/* 60px for DashboardNavbar */}
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={{ base: 4, md: 6 }}>
        {/* Left Column / Main Content */}
        <VStack spacing={6} align="stretch" gridColumn={{ base: '1 / -1', lg: 'span 2' }}>
          {/* Total Balance Card */}
          <Box
            bg={totalBalanceBg}
            color={totalBalanceTextColor}
            p={6}
            borderRadius="xl"
            boxShadow="lg"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium">My Wallet</Text>
              <HStack spacing={2}>
                <IconButton
                  aria-label="Test Balance API"
                  icon={<Icon as={FaEye} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleTestBalanceAPI}
                  isLoading={isTestingAPI}
                  _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                />
                <IconButton
                  aria-label="Sync wallet"
                  icon={<Icon as={FaSync} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleSyncWallet}
                  isLoading={isSyncing}
                  _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                />
                <IconButton
                  aria-label="Force refresh page"
                  icon={<Icon as={FaRedo} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => window.location.reload()}
                  _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                />
              </HStack>
            </HStack>
            <Heading as="h2" size="2xl" fontWeight="bold">
              {isLoading ? <Spinner size="md" /> : `$${walletBalance?.total.toFixed(2) || '0.00'}`}
            </Heading>
            <SimpleGrid columns={5} spacing={4} mt={6} textAlign="center">
              <ActionButton icon={FaArrowCircleDown} label="Deposit" onClick={handleDeposit} />
              <ActionButton icon={FaArrowCircleUp} label="Withdraw" onClick={handleWithdraw} />
              <ActionButton icon={FaExchangeAlt} label="Transfer" onClick={handleTransfer} />
              <ActionButton icon={FaHistory} label="History" onClick={handleHistory} />
              <ActionButton icon={FaSync} label="Sync" onClick={manualSyncBalance} />
            </SimpleGrid>
          </Box>

          {/* My Assets Card */}
          <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
            <Heading as="h3" size="md" mb={4} color={sectionTitleColor}>
              My Assets
            </Heading>
            {/* Removing Tabs structure */}
            {/* <Tabs variant="soft-rounded" colorScheme="blue" size="sm"> */}
              {/* <TabList mb={4}>
                <Tab>Coin View</Tab>
                <Tab>Account View</Tab>
              </TabList> */}
              {/* <TabPanels> */}
                {/* <TabPanel p={0}> */}
                  <HStack justify="space-between" py={2} borderBottomWidth="1px" borderColor={useColorModeValue('gray.200', 'gray.600')} mb={2}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500">Name</Text>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500">Amount</Text>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500">Today's PNL</Text>
                  </HStack>
                  {assets.map((asset) => (
                    <AssetRow key={asset.name} {...asset} />
                  ))}
                {/* </TabPanel> */}
                {/* <TabPanel>
                  <Text>Account View content goes here.</Text>
                </TabPanel> */}
              {/* </TabPanels> */}
            {/* </Tabs> */}
          </Box>



          {/* All Action Blocks (Deposit, Withdraw, Transfer) and related conditional rendering removed */}
        </VStack>

        {/* Right Column / Recent Activity */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" display={{ base: 'none', lg: 'block' }}>
          <Heading as="h3" size="md" mb={6} color={sectionTitleColor}>
            Recent Deposits & Withdrawals
          </Heading>
          {isLoading ? (
            <VStack spacing={4} align="center" justify="center" h="calc(100% - 40px)">
              <Spinner size="lg" />
              <Text color="gray.500">Loading transactions...</Text>
            </VStack>
          ) : transactions.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {transactions.slice(0, 5).map((transaction) => (
                <Box key={transaction.transaction_id || transaction.id || Math.random()} p={3} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.600')}>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium" textTransform="capitalize">
                        {transaction.transaction_type}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </VStack>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={transaction.amount > 0 ? 'green.500' : 'red.500'}
                    >
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          ) : (
            <VStack spacing={4} align="center" justify="center" h="calc(100% - 40px)">
              <Icon as={FaSearchDollar} boxSize={16} color="gray.400" />
              <Text color="gray.500">No transactions yet</Text>
            </VStack>
          )}
        </Box>
      </SimpleGrid>
    </Box>
  );
}