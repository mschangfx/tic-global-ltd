'use client';

import { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';

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

export default function BetweenAccountsTransferPage() {
  const router = useRouter();
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
      const balanceResponse = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.success) {
            const balance: WalletBalance = {
             total: balanceData.balance.total_balance,
             tic: balanceData.balance.tic_balance,
             gic: balanceData.balance.gic_balance,
             staking: balanceData.balance.staking_balance,
             partner_wallet: balanceData.balance.partner_wallet, //
             lastUpdated: new Date(balanceData.balance.last_updated),
             };

            setWalletBalance(balance);
            // Set default from account to main wallet
            setFromAccount('main-wallet');
          }
        }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  // Account options with USD conversion for tokens
  // Token to USD conversion rates - update these as needed
  const TIC_USD_RATE = 0.02; // $0.02 per TIC token (as per user preference)
  const GIC_USD_RATE = 0.01; // $0.01 per GIC token (placeholder - adjust as needed)

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
      displayBalance: Math.round((walletBalance?.tic || 0) * TIC_USD_RATE * 100) / 100, // Convert TIC to USD and round to 2 decimals
      tokenAmount: walletBalance?.tic || 0, // Keep original token amount for reference
      tokenSymbol: 'TIC'
    },
    {
      id: 'gic-wallet',
      name: 'GIC',
      number: '',
      balance: walletBalance?.gic || 0,
      currency: 'USD', // Show as USD instead of GIC
      displayBalance: Math.round((walletBalance?.gic || 0) * GIC_USD_RATE * 100) / 100, // Convert GIC to USD and round to 2 decimals
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
    }
  ];

  const selectedFromAccount = accounts.find(acc => acc.id === fromAccount);
  const availableToAccounts = accounts.filter(acc => acc.id !== fromAccount);

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
    // Clear to account if it's the same as from account
    if (toAccount === accountId) {
      setToAccount('');
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

    if (!walletBalance) {
      throw new Error('Wallet balance not loaded');
    }

    // Calculate the changes needed for each account type
    const updates: any = {};

    // Handle FROM account (subtract)
    switch (fromAccountId) {
      case 'main-wallet':
        updates.total = walletBalance.total - usdAmount;
        break;
      case 'tic-wallet':
        // Convert USD back to TIC tokens for deduction
        const ticToDeduct = usdAmount / TIC_USD_RATE;
        updates.tic_balance = walletBalance.tic - ticToDeduct;
        break;
      case 'gic-wallet':
        // Convert USD back to GIC tokens for deduction
        const gicToDeduct = usdAmount / GIC_USD_RATE;
        updates.gic_balance = walletBalance.gic - gicToDeduct;
        break;
      case 'staking-wallet':
        updates.staking = walletBalance.staking - usdAmount;
        break;
      default:
        throw new Error('Invalid from account');
    }

    // Handle TO account (add)
    switch (toAccountId) {
      case 'main-wallet':
        updates.total = (updates.total !== undefined ? updates.total : walletBalance.total) + usdAmount;
        break;
      case 'tic-wallet':
        // Convert USD to TIC tokens for addition
        const ticToAdd = usdAmount / TIC_USD_RATE;
        updates.tic_balance = (updates.tic_balance !== undefined ? updates.tic_balance : walletBalance.tic) + ticToAdd;
        break;
      case 'gic-wallet':
        // Convert USD to GIC tokens for addition
        const gicToAdd = usdAmount / GIC_USD_RATE;
        updates.gic_balance = (updates.gic_balance !== undefined ? updates.gic_balance : walletBalance.gic) + gicToAdd;
        break;
      case 'staking-wallet':
        updates.staking = (updates.staking !== undefined ? updates.staking : walletBalance.staking) + usdAmount;
        break;
      default:
        throw new Error('Invalid to account');
    }

    // Ensure no negative balances
    if (updates.total !== undefined && updates.total < 0) {
      throw new Error('Insufficient balance in main wallet');
    }
    if (updates.tic_balance !== undefined && updates.tic_balance < 0) {
      throw new Error('Insufficient TIC balance');
    }
    if (updates.gic_balance !== undefined && updates.gic_balance < 0) {
      throw new Error('Insufficient GIC balance');
    }
    if (updates.staking !== undefined && updates.staking < 0) {
      throw new Error('Insufficient staking balance');
    }

    // Update the database
    const response = await fetch('/api/wallet/update-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        updates: updates,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update wallet balance');
    }

    return await response.json();
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

      // Refresh wallet balance
      await loadWalletData();

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
                  <FormControl>
                    <FormLabel color={textColor} fontSize="sm" fontWeight="medium">
                      Payment method
                    </FormLabel>
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
                  </FormControl>

                  {/* From Account */}
                  <FormControl>
                    <FormLabel color={textColor} fontSize="sm" fontWeight="medium">
                      From account
                    </FormLabel>
                    <Select
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
                    <FormLabel color={textColor} fontSize="sm" fontWeight="medium">
                      To account
                    </FormLabel>
                    <Select
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
                  </FormControl>

                  {/* Amount */}
                  <FormControl isInvalid={!!amountError}>
                    <FormLabel color={textColor} fontSize="sm" fontWeight="medium">
                      Amount
                    </FormLabel>
                    <InputGroup>
                      <Input
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
