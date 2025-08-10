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
  Input,
  FormControl,
  FormLabel,
  useToast,
  Link,
  Badge,
  InputGroup,
  InputRightElement,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import {
  FaArrowLeft,
  FaUserFriends,
  FaChevronDown,
  FaCopy
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';

export default function ToUserTransferPage() {
  const router = useRouter();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string>('');
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    recipientEmail?: string;
    error?: string;
  } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [amountError, setAmountError] = useState<string>('');

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
        
      // Get user's wallet address
      const addressResponse = await fetch('/api/wallet/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      if (addressResponse.ok) {
        const addressData = await addressResponse.json();
        if (addressData.success) {
          setUserWalletAddress(addressData.walletAddress);
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
          if (balanceData.wallet) {
            const balance: WalletBalance = {
              total: balanceData.wallet.total_balance,
              tic: balanceData.wallet.tic_balance,
              gic: balanceData.wallet.gic_balance,
              staking: balanceData.wallet.staking_balance,
              partner_wallet: balanceData.wallet.partner_wallet_balance || 0,
              lastUpdated: new Date(balanceData.wallet.last_updated || new Date())
            };
            setWalletBalance(balance);
          }
        }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  // Transaction fee configuration
  const TRANSACTION_FEE_RATE = 0.02; // 2% fee

  // Calculate transaction fee and total amount
  const calculateTransactionDetails = (transferAmount: number) => {
    const fee = transferAmount * TRANSACTION_FEE_RATE;
    const totalDeducted = transferAmount + fee;
    const recipientReceives = transferAmount;

    return {
      transferAmount,
      fee,
      totalDeducted,
      recipientReceives
    };
  };

  // Validate amount in real-time
  const validateAmount = (amountValue: string) => {
    setAmountError('');

    if (!amountValue || !walletBalance) return;

    const transferAmount = parseFloat(amountValue);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      return;
    }

    const { totalDeducted } = calculateTransactionDetails(transferAmount);

    if (totalDeducted > walletBalance.total) {
      setAmountError(`Insufficient balance. Total needed: $${totalDeducted.toFixed(2)} (including 2% fee). Available: $${walletBalance.total.toFixed(2)}`);
      return;
    }
  };

  // Handle amount change with validation
  const handleAmountChange = (value: string) => {
    setAmount(value);
    validateAmount(value);
  };

  // Perform the actual user-to-user transfer
  const performUserTransfer = async (
    transferAmount: number,
    recipientWalletAddress: string,
    recipientEmail: string,
    fee: number,
    transferNote: string
  ) => {
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    if (!walletBalance) {
      throw new Error('Wallet balance not loaded');
    }

    const response = await fetch('/api/wallet/transfer-to-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderEmail: user.email,
        recipientEmail: recipientEmail,
        recipientWalletAddress: recipientWalletAddress,
        transferAmount: transferAmount,
        fee: fee,
        note: transferNote || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process transfer');
    }

    return await response.json();
  };

  // Validate recipient address
  const validateRecipientAddress = async (address: string) => {
    if (!address || address.length < 10) {
      setAddressValidation(null);
      return;
    }

    setIsValidatingAddress(true);
    try {
      const response = await fetch('/api/wallet/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      const data = await response.json();

      if (data.success && data.valid) {
        setAddressValidation({
          isValid: true,
          recipientEmail: data.userEmail
        });
      } else {
        setAddressValidation({
          isValid: false,
          error: data.error || 'Invalid wallet address'
        });
      }
    } catch (error) {
      console.error('Error validating address:', error);
      setAddressValidation({
        isValid: false,
        error: 'Failed to validate address'
      });
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Handle recipient address change with debounced validation
  const handleRecipientAddressChange = (value: string) => {
    setRecipientAddress(value);

    // Clear previous validation
    setAddressValidation(null);

    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateRecipientAddress(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(userWalletAddress);
    toast({
      title: 'Address Copied',
      description: 'Your wallet address has been copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleContinue = async () => {
    if (!recipientAddress || !amount) {
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

    if (!walletBalance) {
      toast({
        title: 'Wallet Not Loaded',
        description: 'Please wait for wallet balance to load.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const { totalDeducted, fee, recipientReceives } = calculateTransactionDetails(transferAmount);

    if (totalDeducted > walletBalance.total) {
      toast({
        title: 'Insufficient Balance',
        description: `You need $${totalDeducted.toFixed(2)} total (including $${fee.toFixed(2)} fee). Available: $${walletBalance.total.toFixed(2)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (recipientAddress === userWalletAddress) {
      toast({
        title: 'Invalid Recipient',
        description: 'You cannot transfer to your own wallet address.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!addressValidation?.isValid) {
      toast({
        title: 'Invalid Recipient Address',
        description: 'Please enter a valid wallet address.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (amountError) {
      toast({
        title: 'Amount Error',
        description: amountError,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      await performUserTransfer(transferAmount, recipientAddress, addressValidation.recipientEmail!, fee, note);

      toast({
        title: 'Transfer Successful',
        description: `Successfully sent $${transferAmount.toFixed(2)} to ${addressValidation.recipientEmail}. Fee: $${fee.toFixed(2)}`,
        status: 'success',
        duration: 8000,
        isClosable: true,
      });

      // Reset form
      setAmount('');
      setRecipientAddress('');
      setNote('');
      setAmountError('');
      setAddressValidation(null);

      // Refresh wallet balance and notify all components
      try {
        const { syncAfterTransfer } = await import('@/lib/utils/balanceSync');
        await syncAfterTransfer(transferAmount);

        // Update local state
        const walletService = WalletService.getInstance();
        const newBalance = await walletService.getBalance();
        setWalletBalance(newBalance);
      } catch (refreshError) {
        console.error('❌ Failed to refresh balance after transfer:', refreshError);
        // Fallback to original method
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



            {/* Your Wallet Address */}
            <Card bg={cardBg} shadow="sm" border="1px" borderColor={borderColor}>
              <CardBody p={6}>
                <VStack spacing={4} align="stretch">
                  <Heading as="h3" size="md" color={textColor}>
                    Your Wallet Address
                  </Heading>
                  
                  <HStack spacing={3}>
                    <Input
                      value={userWalletAddress}
                      isReadOnly
                      bg={useColorModeValue('gray.50', 'gray.600')}
                      fontSize="sm"
                      fontFamily="mono"
                    />
                    <Button
                      leftIcon={<Icon as={FaCopy} />}
                      size="sm"
                      onClick={handleCopyAddress}
                      colorScheme="blue"
                      variant="outline"
                    >
                      Copy
                    </Button>
                  </HStack>
                  
                  <Text fontSize="sm" color={subtleTextColor}>
                    Share this address with others so they can send you funds.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

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
                          bg="orange.500"
                          borderRadius="full"
                          p={2}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={FaUserFriends} color="white" boxSize={3} />
                        </Box>
                        <Text color={textColor} fontWeight="medium">
                          To another user
                        </Text>
                        <Icon as={FaChevronDown} color={subtleTextColor} ml="auto" />
                      </HStack>
                    </Box>
                  </FormControl>

                  {/* Recipient Address */}
                  <FormControl>
                    <FormLabel color={textColor} fontSize="sm" fontWeight="medium">
                      Recipient wallet address
                    </FormLabel>
                    <Input
                      value={recipientAddress}
                      onChange={(e) => handleRecipientAddressChange(e.target.value)}
                      placeholder="Enter recipient's wallet address (e.g., WLT1234567890)"
                      bg={cardBg}
                      border="1px"
                      borderColor={
                        addressValidation?.isValid === true ? 'green.300' :
                        addressValidation?.isValid === false ? 'red.300' :
                        borderColor
                      }
                      fontFamily="mono"
                      fontSize="sm"
                      isDisabled={isValidatingAddress}
                    />

                    {/* Address Validation Feedback */}
                    {isValidatingAddress && (
                      <Text fontSize="xs" color="blue.500" mt={1}>
                        Validating address...
                      </Text>
                    )}

                    {addressValidation?.isValid === true && (
                      <Text fontSize="xs" color="green.600" mt={1}>
                        ✅ Valid address - Recipient: {addressValidation.recipientEmail}
                      </Text>
                    )}

                    {addressValidation?.isValid === false && (
                      <Text fontSize="xs" color="red.600" mt={1}>
                        ❌ {addressValidation.error}
                      </Text>
                    )}

                    {!addressValidation && (
                      <Text fontSize="xs" color={subtleTextColor} mt={1}>
                        Make sure the address is correct. Transfers cannot be reversed.
                      </Text>
                    )}
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
                          USD
                        </Text>
                      </InputRightElement>
                    </InputGroup>

                    {/* Amount validation feedback */}
                    {amountError && (
                      <Text fontSize="sm" color="red.500" mt={2}>
                        ❌ {amountError}
                      </Text>
                    )}

                    {/* Balance and fee information */}
                    {walletBalance && !amountError && (
                      <VStack spacing={1} align="stretch" mt={2}>
                        <Text fontSize="sm" color={subtleTextColor}>
                          Available balance: ${walletBalance.total.toFixed(2)}
                        </Text>

                        {amount && parseFloat(amount) > 0 && !isNaN(parseFloat(amount)) && (
                          <Box p={3} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md" border="1px" borderColor="blue.200">
                            <VStack spacing={1} align="stretch">
                              <HStack justify="space-between">
                                <Text fontSize="sm" color={textColor}>Transfer amount:</Text>
                                <Text fontSize="sm" fontWeight="medium" color={textColor}>${parseFloat(amount).toFixed(2)}</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm" color={textColor}>Transaction fee (2%):</Text>
                                <Text fontSize="sm" fontWeight="medium" color={textColor}>${(parseFloat(amount) * TRANSACTION_FEE_RATE).toFixed(2)}</Text>
                              </HStack>
                              <HStack justify="space-between" pt={1} borderTop="1px" borderColor="blue.200">
                                <Text fontSize="sm" fontWeight="bold" color={textColor}>Total deducted:</Text>
                                <Text fontSize="sm" fontWeight="bold" color={textColor}>${(parseFloat(amount) * (1 + TRANSACTION_FEE_RATE)).toFixed(2)}</Text>
                              </HStack>
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    )}
                  </FormControl>

                  {/* Note (Optional) */}
                  <FormControl>
                    <FormLabel color={textColor} fontSize="sm" fontWeight="medium">
                      Note (Optional)
                    </FormLabel>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note for this transfer"
                      bg={cardBg}
                      border="1px"
                      borderColor={borderColor}
                      maxLength={100}
                    />
                    <Text fontSize="xs" color={subtleTextColor} mt={1}>
                      Optional message for the recipient (max 100 characters).
                    </Text>
                  </FormControl>

                  {/* Continue Button */}
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={handleContinue}
                    isLoading={isLoading}
                    loadingText="Processing..."
                    isDisabled={
                      !recipientAddress ||
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      !addressValidation?.isValid ||
                      isValidatingAddress ||
                      !!amountError
                    }
                  >
                    Continue
                  </Button>

                  <Alert status="info">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">User-to-User Transfer</AlertTitle>
                      <AlertDescription fontSize="xs">
                        Send funds instantly to another user using their unique wallet address.
                      </AlertDescription>
                    </Box>
                  </Alert>
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
