'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Link as ChakraLink,
  InputGroup,
  InputRightAddon,
  Alert,
  AlertIcon,
  IconButton,
  Wrap,
  WrapItem,
  FormHelperText, // Added FormHelperText
} from '@chakra-ui/react';
import { FaArrowLeft, FaInfoCircle, FaQuestionCircle, FaDollarSign } from 'react-icons/fa';
// import { SiTether } from 'react-icons/si'; // Ideal icon
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import { convertUsdToPhpWithdrawal, formatCurrency, getWithdrawalConversionDisplay } from '@/lib/utils/currency';

export default function UsdtTrc20WithdrawalPage() {
  const router = useRouter();
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const subtleTextColor = useColorModeValue('gray.500', 'gray.400');
  const inputBgColor = useColorModeValue('white', 'gray.700');

  const [externalWallet, setExternalWallet] = useState('');
  const [fromAccount, setFromAccount] = useState('usdt_trc20_wallet_1');
  const [selectedWithdrawalAmount, setSelectedWithdrawalAmount] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const walletService = WalletService.getInstance();
  const predefinedAmounts = [10, 100, 500, 1000, 2000, 5000];

  // Mock data for the selected payment method
  const paymentMethod = {
    icon: FaDollarSign, // Replace with SiTether
    name: 'Tether (USDT TRC20)',
  };

  const minWithdrawal = 10;
  const maxWithdrawal = 10000;

  // Fetch wallet balance on component mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        setIsLoadingBalance(true);
        const balance = await walletService.getBalance();
        setWalletBalance(balance);
        setIsLoadingBalance(false);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setIsLoadingBalance(false);
      }
    };

    loadBalance();

    // Subscribe to balance updates
    const unsubscribe = walletService.subscribe((balance: WalletBalance) => {
      setWalletBalance(balance);
    });

    return unsubscribe;
  }, [walletService]);

  const handleContinue = async () => {
    if (selectedWithdrawalAmount === null) {
      alert("Please select a withdrawal amount.");
      return;
    }

    if (!externalWallet.trim()) {
      alert("Please enter a valid wallet address.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await walletService.processWithdrawal(
        selectedWithdrawalAmount,
        externalWallet,
        paymentMethod.name
      );

      if (result.success) {
        // Redirect to withdrawal status page with details
        const statusUrl = new URL('/wallet/withdrawal/status', window.location.origin);
        statusUrl.searchParams.set('transactionId', result.withdrawal?.id || 'unknown');
        statusUrl.searchParams.set('amount', selectedWithdrawalAmount.toFixed(2));
        statusUrl.searchParams.set('currency', 'USD');
        statusUrl.searchParams.set('method', paymentMethod.name);
        statusUrl.searchParams.set('destinationAddress', externalWallet);
        statusUrl.searchParams.set('status', 'pending');
        statusUrl.searchParams.set('processingTime', 'Instant - 24 hours');

        router.push(statusUrl.pathname + statusUrl.search);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Withdrawal failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="5xl" mx="auto"> {/* Wider container */}
        <HStack spacing={3} cursor="pointer" onClick={() => router.back()} _hover={{ color: 'blue.500' }} mb={2}>
          <Icon as={FaArrowLeft} />
          <Heading as="h1" size="lg" color={textColor}>
            Withdrawal
          </Heading>
        </HStack>
        {/* Removed "See all payment methods" link */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mt={4}> {/* Added mt for spacing after heading adjustment */}
          {/* Main Withdrawal Form Area */}
          <VStack spacing={5} gridColumn={{ base: '1 / -1', md: 'span 2' }} align="stretch">
            <FormControl id="payment-method">
              <FormLabel color={subtleTextColor} fontSize="sm">Payment method</FormLabel>
              <Select 
                value="usdt_trc20" 
                isDisabled // Pre-selected for this page
                bg={inputBgColor}
                icon={paymentMethod.icon ? <Icon as={paymentMethod.icon} color="green.400" /> : undefined}
              >
                <option value="usdt_trc20">{paymentMethod.name}</option>
              </Select>
            </FormControl>

            <FormControl id="external-wallet" isRequired>
              <FormLabel color={subtleTextColor} fontSize="sm">To External Wallet</FormLabel>
              <Input 
                placeholder="Enter USDT TRC20 wallet address" 
                value={externalWallet} 
                onChange={(e) => setExternalWallet(e.target.value)}
                bg={inputBgColor}
              />
              <FormHelperText color="red.500" fontSize="xs">
                Please enter your external crypto address
              </FormHelperText>
            </FormControl>

            <FormControl id="from-account">
              <FormLabel color={subtleTextColor} fontSize="sm">From account</FormLabel>
              <Select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} bg={inputBgColor}>
                {/* In a real app, these would be dynamically populated with actual wallet balances */}
                <option value="main_wallet_usd">
                  TIC Wallet - ${isLoadingBalance ? '...' : walletBalance?.total.toFixed(2) || '0.00'} USD
                </option>
                {/* Add other wallet sources if applicable */}
              </Select>
            </FormControl>

            <FormControl id="amount-selection">
              <FormLabel color={subtleTextColor} fontSize="sm">Select Amount to Withdraw</FormLabel>
              <Wrap spacing={3} mt={1}>
                {predefinedAmounts.map((val) => (
                  <WrapItem key={val}>
                    <Button
                      variant={selectedWithdrawalAmount === val ? "solid" : "outline"}
                      colorScheme={selectedWithdrawalAmount === val ? "blue" : "gray"}
                      onClick={() => setSelectedWithdrawalAmount(val)}
                      px={6}
                    >
                      ${val.toLocaleString()}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
              <VStack align="start" mt={2} spacing={0}>
                <Text fontSize="xs" color={subtleTextColor}>
                  Minimum withdrawal=${minWithdrawal}
                </Text>
                <Text fontSize="xs" color={subtleTextColor}>
                  Maximum withdrawal=${maxWithdrawal.toLocaleString()}
                </Text>
              </VStack>
            </FormControl>
            
            {/* Alert moved to sidebar */}
            <HStack justifyContent="space-between" p={4} bg={useColorModeValue('gray.100', 'gray.750')} borderRadius="md">
              <Text fontWeight="medium" color={textColor}>To be withdrawn</Text>
              <Text fontWeight="bold" fontSize="lg" color={textColor}>
                ${selectedWithdrawalAmount !== null ? selectedWithdrawalAmount.toFixed(2) : '0.00'} USD
              </Text>
            </HStack>

            <Button
              colorScheme="yellow"
              bg="yellow.400"
              color="black"
              _hover={{bg: "yellow.500"}}
              size="lg"
              onClick={handleContinue}
              isLoading={isProcessing}
              loadingText="Processing Withdrawal..."
              isDisabled={
                !externalWallet ||
                selectedWithdrawalAmount === null ||
                selectedWithdrawalAmount < minWithdrawal ||
                selectedWithdrawalAmount > maxWithdrawal ||
                (walletBalance && selectedWithdrawalAmount > walletBalance.total) ||
                isLoadingBalance
              }
            >
              {walletBalance && selectedWithdrawalAmount && selectedWithdrawalAmount > walletBalance.total
                ? 'Insufficient Balance'
                : 'Continue'
              }
            </Button>
          </VStack>

          {/* Sidebar Area */}
          <VStack spacing={6} align="stretch" p={6} bg={cardBgColor} borderRadius="lg" boxShadow="md">
            {/* Wallet Balance Display */}
            <Box>
              <Heading as="h3" size="sm" color={textColor} mb={3}>Available Balance</Heading>
              <HStack justify="space-between" p={3} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md">
                <Text fontSize="sm" color={textColor}>TIC Wallet:</Text>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  ${isLoadingBalance ? 'Loading...' : walletBalance?.total.toFixed(2) || '0.00'}
                </Text>
              </HStack>
              {walletBalance && selectedWithdrawalAmount && selectedWithdrawalAmount > walletBalance.total && (
                <Text fontSize="xs" color="red.500" mt={2}>
                  Insufficient balance for withdrawal of ${selectedWithdrawalAmount.toFixed(2)}
                </Text>
              )}
            </Box>

            <Box>
              <Heading as="h3" size="sm" color={textColor} mb={2}>Terms</Heading>
              <Text fontSize="xs" color={subtleTextColor}>Average payment time: <strong>Instant</strong></Text>
              <Text fontSize="xs" color={subtleTextColor}>Gas fee: <strong>10%</strong></Text>
            </Box>
            {/* <Divider /> // No longer needed as Alert is below */}
            <Alert status="info" borderRadius="md" bg={useColorModeValue('blue.50', 'blue.800')} borderColor={useColorModeValue('blue.200', 'blue.600')} borderWidth="1px" mt={4}>
              <AlertIcon color="blue.400" />
              <Text fontSize="xs" color={useColorModeValue('blue.700', 'blue.200')}>
                A 10% gas fee applies to all withdrawals. Portions of the deducted amount are used for stake and cashback rewards after minor fees.
              </Text>
            </Alert>
            {/* FAQ Section Removed */}
          </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}