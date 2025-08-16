'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  Select,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Link,
  Divider,
  Badge,
  InputGroup,
  InputRightElement
} from '@chakra-ui/react';
import {
  FaArrowLeft,
  FaExchangeAlt,
  FaChevronDown
} from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';
import { TOKEN_PRICES } from '@/lib/constants/tokens';

// Generate unique wallet address for user (fallback - should use API)
const generateWalletAddress = (userEmail: string): string => {
  // Create a hash-like address based on user email
  const hash = userEmail.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  // Generate a wallet address with "WLT" prefix (Wallet) to avoid confusion with TIC asset
  const baseAddress = `WLT${hash}${Date.now().toString().slice(-6)}`;
  return baseAddress.toUpperCase();
};

// Component that handles URL parameters
function TransferPageWithParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

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

      return null;
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
  };

  // Load wallet balance and address
  const loadWalletData = async () => {
    try {
      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        console.error('No authenticated user found');
        return;
      }

      // Set user for transfer operations
      setUser({ email: userEmail });

      // Get or create unique wallet address for this user
      const addressResponse = await fetch('/api/wallet/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          if (addressData.success) {
            setUserWalletAddress(addressData.walletAddress);
            console.log('📍 User wallet address:', addressData.walletAddress);
          }
        }

      // Load wallet balance
      console.log('🔄 Between-accounts: Fetching balance for user:', userEmail);
      const balanceResponse = await fetch(`/api/wallet/balance?email=${encodeURIComponent(userEmail)}`);

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          console.log('🔍 Between-accounts: Balance API response:', balanceData);

          if (balanceData.wallet) {
            const balance: WalletBalance = {
             total: parseFloat(balanceData.wallet.total_balance || '0'),
             tic: parseFloat(balanceData.wallet.tic_balance || '0'),
             gic: parseFloat(balanceData.wallet.gic_balance || '0'),
             staking: parseFloat(balanceData.wallet.staking_balance || '0'),
             partner_wallet: parseFloat(balanceData.wallet.partner_wallet_balance || '0'),
             portfolio_value: balanceData.wallet.portfolio_value ? parseFloat(balanceData.wallet.portfolio_value) : undefined,
             lastUpdated: new Date(balanceData.wallet.last_updated || new Date()),
             };

            console.log('✅ Between-accounts: Parsed balance:', balance);
            setWalletBalance(balance);
            // Set default from account to main wallet
            setFromAccount('main-wallet');
          } else {
            console.error('❌ Between-accounts: Invalid balance response structure:', balanceData);
          }
        } else {
          console.error('❌ Between-accounts: Balance API failed:', balanceResponse.status);
        }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  useEffect(() => {
    loadWalletData();

    // Handle URL parameter for pre-selecting "from" account
    if (searchParams) {
      const fromParam = searchParams.get('from');
      if (fromParam) {
        // Map URL parameter values to account IDs
        const accountMapping: { [key: string]: string } = {
          'total': 'main-wallet',
          'tic': 'tic-wallet',
          'gic': 'gic-wallet',
          'partner_wallet': 'partner-wallet',
          'staking': 'staking-wallet'
        };

        const accountId = accountMapping[fromParam];
        if (accountId) {
          setFromAccount(accountId);
          console.log('🎯 Pre-selected from account:', accountId, 'based on URL param:', fromParam);

          // Auto-select Main Wallet for sub-wallets
          const subWalletAccounts = ['tic-wallet', 'gic-wallet', 'partner-wallet', 'staking-wallet'];
          if (subWalletAccounts.includes(accountId)) {
            setToAccount('main-wallet');
            console.log('🔒 Sub-wallet pre-selected → Auto-selecting Main Wallet as destination');
          }
        }
      }
    }
  }, [searchParams]);

  // Account options with USD conversion for tokens
  // Use centralized token prices for consistency
  const TIC_USD_RATE = TOKEN_PRICES.TIC; // $0.02 per TIC token
  const GIC_USD_RATE = TOKEN_PRICES.GIC; // $63.00 per GIC token

  const accounts = [
    {
      id: 'main-wallet',
      name: 'Main Wallet',
      number: userWalletAddress,
      balance: walletBalance?.total || 0,
      currency: 'USD',
      displayBalance: walletBalance?.total || 0
    },
    {
      id: 'tic-wallet',
      name: 'TIC',
      number: '',
      balance: walletBalance?.tic || 0,
      currency: 'USD', // Show as USD instead of TIC
      displayBalance: (walletBalance?.tic || 0) * TIC_USD_RATE, // Convert TIC to USD with exact value
      tokenAmount: walletBalance?.tic || 0, // Keep original token amount for reference
      tokenSymbol: 'TIC'
    },
    {
      id: 'gic-wallet',
      name: 'GIC',
      number: '',
      balance: walletBalance?.gic || 0,
      currency: 'USD', // Show as USD instead of GIC
      displayBalance: (walletBalance?.gic || 0) * GIC_USD_RATE, // Convert GIC to USD
      tokenAmount: walletBalance?.gic || 0, // Keep original token amount for reference
      tokenSymbol: 'GIC'
    },
    {
      id: 'staking-wallet',
      name: 'Staking',
      number: '',
      balance: walletBalance?.staking || 0,
      currency: 'USD',
      displayBalance: walletBalance?.staking || 0
    },
    {
      id: 'partner-wallet',
      name: 'Partner Wallet',
      number: '',
      balance: walletBalance?.partner_wallet || 0,
      currency: 'USD',
      displayBalance: walletBalance?.partner_wallet || 0
    }
  ];

  const selectedFromAccount = accounts.find(acc => acc.id === fromAccount);

  // TRANSFER RESTRICTIONS:
  // 1. TIC, GIC, Partner Wallet can ONLY transfer TO Main Wallet
  // 2. Only Main Wallet can transfer TO other sub-wallets
  // 3. Sub-wallets cannot transfer to each other

  const restrictedFromAccounts = ['tic-wallet', 'gic-wallet', 'partner-wallet'];
  const subWalletAccounts = ['tic-wallet', 'gic-wallet', 'partner-wallet', 'staking-wallet'];

  const availableToAccounts = (() => {
    if (restrictedFromAccounts.includes(fromAccount)) {
      // Rule 1: Sub-wallets can only transfer TO Main Wallet
      return accounts.filter(acc => acc.id === 'main-wallet');
    } else if (fromAccount === 'main-wallet') {
      // Main Wallet can transfer to any other wallet
      return accounts.filter(acc => acc.id !== fromAccount);
    } else if (subWalletAccounts.includes(fromAccount)) {
      // Other sub-wallets (like Staking) can only transfer to Main Wallet
      return accounts.filter(acc => acc.id === 'main-wallet');
    } else {
      // Default: all accounts except self
      return accounts.filter(acc => acc.id !== fromAccount);
    }
  })();

  const selectedToAccount = accounts.find(acc => acc.id === toAccount);

  // Validate amount in real-time
  const validateAmount = (amountValue: string) => {
    setAmountError('');

    if (!amountValue || !selectedFromAccount) return;

    const transferAmount = parseFloat(amountValue);



    if (isNaN(transferAmount) || transferAmount <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      return;
    }

    if (transferAmount > selectedFromAccount.displayBalance) {
      const errorMsg = `Insufficient balance. Available: $${selectedFromAccount.displayBalance.toFixed(2)} USD`;
      setAmountError(errorMsg);
      return;
    }
  };

  // Handle amount change with validation
  const handleAmountChange = (value: string) => {
    setAmount(value);
    validateAmount(value);
  };

  // Handle from account change and re-validate amount
  const handleFromAccountChange = (accountId: string) => {
    setFromAccount(accountId);

    // RESTRICTION: Auto-select Main Wallet for sub-wallets
    const subWalletAccounts = ['tic-wallet', 'gic-wallet', 'partner-wallet', 'staking-wallet'];
    if (subWalletAccounts.includes(accountId)) {
      setToAccount('main-wallet'); // Auto-select Main Wallet
      console.log(`🔒 Sub-wallet selected: ${accountId} → Auto-selecting Main Wallet`);
    } else if (accountId === 'main-wallet') {
      // Main Wallet selected - clear destination to let user choose
      setToAccount('');
      console.log(`🏦 Main Wallet selected → User can choose any destination`);
    } else {
      // Clear to account if it's the same as from account
      if (toAccount === accountId) {
        setToAccount('');
      }
    }

    // Re-validate current amount with new account
    if (amount) {
      setTimeout(() => validateAmount(amount), 100); // Small delay to ensure state is updated
    }
  };

  // Perform the actual transfer between accounts
  const performTransfer = async (fromAccountId: string, toAccountId: string, usdAmount: number) => {
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    console.log(`🔄 Performing transfer: ${usdAmount} from ${fromAccountId} to ${toAccountId}`);

    const selectedFromAccount = accounts.find(acc => acc.id === fromAccountId);
    const selectedToAccount = accounts.find(acc => acc.id === toAccountId);

    if (!selectedFromAccount) {
      throw new Error('Invalid source account');
    }

    if (!selectedToAccount) {
      throw new Error('Invalid destination account');
    }

    // Map frontend account IDs to API account IDs
    const mapAccountId = (accountId: string): string => {
      switch (accountId) {
        case 'main-wallet': return 'total';
        case 'tic-wallet': return 'tic';
        case 'gic-wallet': return 'gic';
        case 'staking-wallet': return 'staking';
        case 'partner-wallet': return 'partner_wallet';
        default: return accountId;
      }
    };

    const apiFromAccount = mapAccountId(fromAccountId);
    const apiToAccount = mapAccountId(toAccountId);

    // Process the actual transfer using the new between-accounts transfer API
    try {
      console.log('🔄 Transfer Request Details:', {
        fromAccount: apiFromAccount,
        toAccount: apiToAccount,
        usdAmount: usdAmount,
        fromAccountBalance: selectedFromAccount?.displayBalance,
        fromTokenAmount: selectedFromAccount?.tokenAmount,
        tokenSymbol: selectedFromAccount?.tokenSymbol,
        transferType: apiFromAccount === 'partner_wallet' ? 'Partner Wallet → Main Wallet' :
                     apiFromAccount === 'tic' ? 'TIC → Main Wallet' :
                     apiFromAccount === 'gic' ? 'GIC → Main Wallet' :
                     `${apiFromAccount} → ${apiToAccount}`
      });

      const transferResponse = await fetch('/api/wallet/transfer-between-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_account: apiFromAccount,
          to_account: apiToAccount,
          amount: usdAmount,
          description: `Transfer from ${selectedFromAccount?.name || fromAccountId} to ${selectedToAccount?.name || toAccountId}`,
          metadata: {
            from_account_name: selectedFromAccount?.name || fromAccountId,
            to_account_name: selectedToAccount?.name || toAccountId,
            transfer_type: 'between_accounts',
            token_symbol: selectedFromAccount?.tokenSymbol || null,
            token_amount: selectedFromAccount?.tokenAmount || null
          }
        })
      });

      const transferResult = await transferResponse.json();

      if (!transferResponse.ok || !transferResult.success) {
        throw new Error(transferResult.message || 'Transfer failed');
      }

      console.log('✅ Transfer completed and recorded successfully');
      return transferResult;
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      throw error;
    }
  };

  const handleContinue = async () => {
    if (!fromAccount || !toAccount || !amount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Double-check restrictions on frontend
    const subWalletAccounts = ['tic-wallet', 'gic-wallet', 'partner-wallet', 'staking-wallet'];
    const accountNames: Record<string, string> = {
      'tic-wallet': 'TIC Wallet',
      'gic-wallet': 'GIC Wallet',
      'partner-wallet': 'Partner Wallet',
      'staking-wallet': 'Staking Wallet'
    };

    // Rule 1: Sub-wallets can only transfer TO Main Wallet
    if (subWalletAccounts.includes(fromAccount) && toAccount !== 'main-wallet') {
      toast({
        title: 'Transfer Restricted',
        description: `${accountNames[fromAccount]} can only transfer to Main Wallet.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Rule 2: Only Main Wallet can transfer TO sub-wallets
    if (subWalletAccounts.includes(toAccount) && fromAccount !== 'main-wallet') {
      toast({
        title: 'Transfer Restricted',
        description: `Only Main Wallet can transfer to ${accountNames[toAccount]}. Sub-wallets cannot transfer to each other.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid transfer amount.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (selectedFromAccount && transferAmount > selectedFromAccount.displayBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You don't have enough balance in the selected account. Available: $${selectedFromAccount.displayBalance.toFixed(2)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      await performTransfer(fromAccount, toAccount, transferAmount);

      toast({
        title: 'Transfer Successful',
        description: `Successfully transferred $${transferAmount.toFixed(2)} from ${selectedFromAccount?.name} to ${availableToAccounts.find(acc => acc.id === toAccount)?.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setAmount('');
      setFromAccount('');
      setToAccount('');
      setAmountError('');

      // Refresh wallet balance and notify all components
      try {
        console.log('🔄 Starting balance refresh after transfer...');

        // Add a longer delay to ensure database transaction is fully committed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { syncAfterTransfer } = await import('@/lib/utils/balanceSync');
        await syncAfterTransfer(transferAmount);

        // Force a complete balance refresh with additional delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update local state with fresh data
        const walletService = WalletService.getInstance();
        const newBalance = await walletService.forceRefreshBalance();
        setWalletBalance(newBalance);

        console.log('✅ Balance refresh completed after transfer:', newBalance);
      } catch (refreshError) {
        console.error('❌ Failed to refresh balance after transfer:', refreshError);
        // Fallback to original method with delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        await loadWalletData();
      }

    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: 'Transfer Failed',
        description: error instanceof Error ? error.message : 'An error occurred during the transfer. Please try again.',
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg={bgColor} minH="calc(100vh - 60px)">
      <Container maxW="6xl" py={8}>
        <HStack spacing={8} align="start">
          {/* Left Column - Transfer Form */}
          <VStack spacing={6} align="stretch" flex="2">
            {/* Header */}
            <HStack spacing={4}>
              <Button
                leftIcon={<Icon as={FaArrowLeft} />}
                variant="ghost"
                onClick={() => router.push('/wallet')}
              >
                Back
              </Button>
              <Heading as="h1" size="xl" color={textColor}>
                Transfer
              </Heading>
            </HStack>



            {/* Transfer Form */}
            <Card bg={cardBg} shadow="sm" border="1px" borderColor={borderColor}>
              <CardBody p={6}>
                <VStack spacing={6} align="stretch">
                  {/* Payment Method */}
                  <VStack spacing={2} align="stretch">
                    <Text color={textColor} fontSize="sm" fontWeight="medium">
                      Payment method
                    </Text>
                    <Box
                      p={3}
                      border="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      bg={cardBg}
                    >
                      <HStack spacing={3}>
                        <Box
                          bg="black"
                          borderRadius="full"
                          p={2}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={FaExchangeAlt} color="white" boxSize={3} />
                        </Box>
                        <Text color={textColor} fontWeight="medium">
                          Between your accounts
                        </Text>
                        <Icon as={FaChevronDown} color={subtleTextColor} ml="auto" />
                      </HStack>
                    </Box>
                  </VStack>

                  {/* From Account */}
                  <FormControl>
                    <FormLabel htmlFor="from-account" color={textColor} fontSize="sm" fontWeight="medium">
                      From account
                    </FormLabel>
                    <Select
                      id="from-account"
                      name="fromAccount"
                      value={fromAccount}
                      onChange={(e) => handleFromAccountChange(e.target.value)}
                      placeholder="Select account"
                      bg={cardBg}
                      border="1px"
                      borderColor={borderColor}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}{account.number ? ` - ${account.number}` : ''} ({account.displayBalance.toFixed(2)} {account.currency})
                        </option>
                      ))}
                    </Select>
                    {selectedFromAccount && (
                      <HStack justify="space-between" mt={2} fontSize="sm">
                        <Text color={subtleTextColor}>
                          {selectedFromAccount.number ? selectedFromAccount.number : selectedFromAccount.name}
                          {selectedFromAccount.tokenAmount && (
                            <Text as="span" color={subtleTextColor} ml={2}>
                              ({selectedFromAccount.tokenAmount.toFixed(2)} {selectedFromAccount.tokenSymbol})
                            </Text>
                          )}
                        </Text>
                        <Text color={textColor} fontWeight="medium">
                          {selectedFromAccount.displayBalance.toFixed(2)} {selectedFromAccount.currency}
                        </Text>
                      </HStack>
                    )}
                  </FormControl>

                  {/* To Account */}
                  <FormControl>
                    <FormLabel htmlFor="to-account" color={textColor} fontSize="sm" fontWeight="medium">
                      To account
                    </FormLabel>
                    <Select
                      id="to-account"
                      name="toAccount"
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      placeholder="Select destination account"
                      bg={cardBg}
                      border="1px"
                      borderColor={borderColor}
                      isDisabled={!fromAccount}
                    >
                      {availableToAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}{account.number ? ` - ${account.number}` : ''} ({account.displayBalance.toFixed(2)} {account.currency})
                        </option>
                      ))}
                    </Select>

                    {/* Restriction Message for Sub-Wallets */}
                    {(subWalletAccounts.includes(fromAccount) || fromAccount === 'main-wallet') && (
                      <Box
                        mt={2}
                        p={3}
                        bg={fromAccount === 'main-wallet' ? "green.50" : "blue.50"}
                        border="1px"
                        borderColor={fromAccount === 'main-wallet' ? "green.200" : "blue.200"}
                        borderRadius="md"
                        _dark={{
                          bg: fromAccount === 'main-wallet' ? "green.900" : "blue.900",
                          borderColor: fromAccount === 'main-wallet' ? "green.700" : "blue.700"
                        }}
                      >
                        <HStack spacing={2}>
                          <Icon
                            as={FaExchangeAlt}
                            color={fromAccount === 'main-wallet' ? "green.500" : "blue.500"}
                            boxSize={4}
                          />
                          <VStack align="start" spacing={1}>
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color={fromAccount === 'main-wallet' ? "green.700" : "blue.700"}
                              _dark={{ color: fromAccount === 'main-wallet' ? "green.300" : "blue.300" }}
                            >
                              {fromAccount === 'main-wallet' ? 'Transfer Freedom' : 'Transfer Restriction'}
                            </Text>
                            <Text
                              fontSize="xs"
                              color={fromAccount === 'main-wallet' ? "green.600" : "blue.600"}
                              _dark={{ color: fromAccount === 'main-wallet' ? "green.400" : "blue.400" }}
                            >
                              {fromAccount === 'main-wallet' && 'Main Wallet can transfer to any wallet or other users'}
                              {fromAccount === 'tic-wallet' && 'TIC Wallet can only transfer to Main Wallet'}
                              {fromAccount === 'gic-wallet' && 'GIC Wallet can only transfer to Main Wallet'}
                              {fromAccount === 'partner-wallet' && 'Partner Wallet can only transfer to Main Wallet'}
                              {fromAccount === 'staking-wallet' && 'Staking Wallet can only transfer to Main Wallet'}
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
                    )}
                  </FormControl>

                  {/* Amount */}
                  <FormControl isInvalid={!!amountError}>
                    <FormLabel htmlFor="transfer-amount" color={textColor} fontSize="sm" fontWeight="medium">
                      Amount
                    </FormLabel>
                    <InputGroup>
                      <Input
                        id="transfer-amount"
                        name="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="0.00"
                        fontSize="2xl"
                        fontWeight="bold"
                        color={textColor}
                        bg={cardBg}
                        border="1px"
                        borderColor={amountError ? 'red.300' : borderColor}
                        step="0.01"
                        min="0"
                      />
                      <InputRightElement width="4rem">
                        <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                          {selectedFromAccount?.currency || 'USD'}
                        </Text>
                      </InputRightElement>
                    </InputGroup>

                    {/* Amount validation feedback */}
                    {amountError && (
                      <Text fontSize="sm" color="red.500" mt={2}>
                        ❌ {amountError}
                      </Text>
                    )}

                    {selectedFromAccount && !amountError && (
                      <Text fontSize="sm" color={subtleTextColor} mt={2}>
                        Available balance: ${selectedFromAccount.displayBalance.toFixed(2)} USD
                        {selectedFromAccount.tokenAmount && (
                          <Text as="span" color={subtleTextColor}>
                            {' '}({selectedFromAccount.tokenAmount.toFixed(2)} {selectedFromAccount.tokenSymbol})
                          </Text>
                        )}
                      </Text>
                    )}
                  </FormControl>

                  {/* Continue Button */}
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={handleContinue}
                    isLoading={isLoading}
                    loadingText="Processing..."
                    isDisabled={
                      !fromAccount ||
                      !toAccount ||
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      !!amountError
                    }
                  >
                    Continue
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </VStack>

          {/* Right Column - Terms & FAQ */}
          <VStack spacing={6} align="stretch" flex="1">
            {/* Terms */}
            <Card bg={cardBg} shadow="sm" border="1px" borderColor={borderColor}>
              <CardBody p={6}>
                <VStack spacing={4} align="stretch">
                  <Heading as="h3" size="md" color={textColor}>
                    Terms
                  </Heading>
                  
                  <VStack spacing={2} align="stretch" fontSize="sm">
                    <HStack justify="space-between">
                      <Text color={subtleTextColor}>Average payment time</Text>
                      <Text color={textColor} fontWeight="medium">Instant</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color={subtleTextColor}>Fee</Text>
                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                        0%
                      </Badge>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>


          </VStack>
        </HStack>
      </Container>
    </Box>
  );
}

// Main export component with Suspense boundary
export default function BetweenAccountsTransferPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransferPageWithParams />
    </Suspense>
  );
}
