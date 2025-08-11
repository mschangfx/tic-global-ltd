'use client';

// Add global error handler to catch external script errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Suppress errors from external scripts (like MetaMask inpage.js)
    if (event.filename && (event.filename.includes('inpage.js') || event.filename.includes('extension'))) {
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Suppress promise rejections from external scripts
    if (event.reason && typeof event.reason === 'object' && event.reason.stack) {
      if (event.reason.stack.includes('inpage.js') || event.reason.stack.includes('extension')) {
        event.preventDefault();
        return false;
      }
    }
  });
}

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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Image,
  SimpleGrid,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  InputGroup,
  InputLeftAddon,
  useToast,
  Flex,
  Spacer,
  Badge,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { FaDollarSign, FaWallet, FaCopy, FaSync } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import WalletService, { WalletBalance } from '@/lib/services/walletService';
import TransactionService from '@/lib/services/transactionService';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';
import {
  formatCurrency,
  convertUsdToPhp,
  convertUsdToPhpWithdrawal,
  parseWithdrawalAmount,
  validateWithdrawalAmount,
  getWithdrawalConversionDisplay,
  getCompactWithdrawalLimits
} from '@/lib/utils/currency';

// Define NetworkFeeData interface locally since we're not importing the service
interface NetworkFeeData {
  network: string;
  gasPrice: string;
  estimatedFee: string;
  processingTime: string;
  feeInUSD: string;
  lastUpdated: Date;
}

interface WithdrawalMethod {
  id: string;
  name: string;
  symbol: string;
  network: string;
  processingTime: string;
  fee: string;
  limits: string;
  icon: string;
  tronNetwork?: string; // Add TRON network mapping
  tokenSymbol?: string; // Add token symbol for TRC20
}

export default function WithdrawalPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('black', 'white');
  const accentColor = 'green.400';
  const router = useRouter();
  const toast = useToast();

  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // Debug: Log wallet balance changes
  useEffect(() => {
    console.log('🎯 Withdrawal page: walletBalance state changed:', walletBalance);
  }, [walletBalance]);

  // Real-time fee states
  const [realTimeFees, setRealTimeFees] = useState<NetworkFeeData[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [withdrawalCalculation, setWithdrawalCalculation] = useState<any>(null);
  const [isCalculatingFees, setIsCalculatingFees] = useState(false);

  // Withdrawal methods state (to allow updates)
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [availableSoonMethods, setAvailableSoonMethods] = useState<any[]>([]);

  // Add debugging for balance
  console.log('🔍 Current wallet balance state:', walletBalance);
  console.log('🔍 Is loading balance:', isLoadingBalance);

  // Monitor walletBalance state changes
  useEffect(() => {
    if (walletBalance) {
      console.log('✅ Wallet balance loaded:', walletBalance.total);
    }
  }, [walletBalance]);



  const walletService = WalletService.getInstance();
  const transactionService = TransactionService.getInstance();
  const supabase = createClient();

  // Initialize withdrawal methods on component mount
  useEffect(() => {
    const initialMethods: WithdrawalMethod[] = [
      {
      id: 'usdt-trc20',
      name: 'USDT',
      symbol: 'USD', // USD is always the withdrawal amount
      network: 'TRC20',
      processingTime: '3-5 minutes',
      fee: '10% gas fee',
      limits: getCompactWithdrawalLimits('usdt-trc20').primary + '\n' + getCompactWithdrawalLimits('usdt-trc20').secondary,
      icon: '/img/USDT-TRC20.png',
      tronNetwork: 'tron',
      tokenSymbol: 'USDT'
    },
    {
      id: 'usdt-bep20',
      name: 'USDT',
      symbol: 'USD', // USD is always the withdrawal amount
      network: 'BEP20',
      processingTime: '3-5 minutes',
      fee: '10% gas fee',
      limits: getCompactWithdrawalLimits('usdt-bep20').primary + '\n' + getCompactWithdrawalLimits('usdt-bep20').secondary,
      icon: '/img/USDT-BEP20-1.png',
      tronNetwork: 'bsc',
      tokenSymbol: 'USDT'
    },
    {
      id: 'usdt-polygon',
      name: 'USDT',
      symbol: 'USD', // USD is always the withdrawal amount
      network: 'Polygon',
      processingTime: '2-3 minutes',
      fee: '10% gas fee',
      limits: getCompactWithdrawalLimits('usdt-polygon').primary + '\n' + getCompactWithdrawalLimits('usdt-polygon').secondary,
      icon: '/img/USDT-Polygon.png',
      tronNetwork: 'polygon',
      tokenSymbol: 'USDT'
    },
    {
      id: 'gcash',
      name: 'GCash',
      symbol: 'USD', // USD is always the withdrawal amount
      network: 'Digital Wallet',
      processingTime: '5-30 minutes',
      fee: '10% gas fee',
      limits: getCompactWithdrawalLimits('gcash').primary + '\n' + getCompactWithdrawalLimits('gcash').secondary,
      icon: '/img/gcash.png'
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      symbol: 'USD', // USD is always the withdrawal amount
      network: 'Digital Wallet',
      processingTime: '5-30 minutes',
      fee: '10% gas fee',
      limits: getCompactWithdrawalLimits('paymaya').primary + '\n' + getCompactWithdrawalLimits('paymaya').secondary,
      icon: '/img/paymaya.jpg'
    }
  ];

  // Available Soon withdrawal methods
  const availableSoonMethods = [
    {
      id: 'usdt-bep20',
      name: 'USDT',
      symbol: 'USDT',
      network: 'BEP20',
      processingTime: '3-5 minutes',
      fee: '0%',
      limits: '10 - 750,000 USD',
      icon: '/img/USDT-BEP20-1.png'
    },
    {
      id: 'usdt-erc20',
      name: 'USDT',
      symbol: 'USDT',
      network: 'ERC20',
      processingTime: '5-15 minutes',
      fee: '0%',
      limits: '10 - 500,000 USD',
      icon: '/img/usdt etherium.png'
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      network: 'BTC',
      processingTime: '10-60 minutes',
      fee: '0%',
      limits: '0.001 - 10 BTC',
      icon: '/img/Bitcoin.svg.png'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      network: 'ETH',
      processingTime: '5-15 minutes',
      fee: '0%',
      limits: '0.01 - 100 ETH',
      icon: '/img/Ethereum-Logo-PNG-Free-Image.png'
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      symbol: 'PHP',
      network: 'Digital Wallet',
      processingTime: 'Instant',
      fee: '0%',
      limits: '100 - 50,000 PHP',
      icon: '/img/paymaya.jpg'
    },
    {
      id: 'gcash',
      name: 'GCash',
      symbol: 'PHP',
      network: 'Digital Wallet',
      processingTime: 'Instant',
      fee: '0%',
      limits: '100 - 50,000 PHP',
      icon: '/img/gcash.png'
    }
    ];

    const initialAvailableSoonMethods = [
      {
        id: 'usdt-erc20',
        name: 'USDT',
        symbol: 'USDT',
        network: 'ERC20',
        processingTime: '5-15 minutes',
        fee: '0%',
        limits: '10 - 500,000 USD',
        icon: '/img/usdt etherium.png'
      },
      {
        id: 'btc',
        name: 'Bitcoin',
        symbol: 'BTC',
        network: 'Bitcoin',
        processingTime: '30-60 minutes',
        fee: '0%',
        limits: '0.001 - 10 BTC',
        icon: '/img/Bitcoin.svg.png' // Use existing Bitcoin icon
      },
      {
        id: 'eth',
        name: 'Ethereum',
        symbol: 'ETH',
        network: 'Ethereum',
        processingTime: '5-15 minutes',
        fee: '0%',
        limits: '0.01 - 100 ETH',
        icon: '/img/usdt etherium.png' // Use existing ethereum icon
      },
      {
        id: 'bnb',
        name: 'BNB',
        symbol: 'BNB',
        network: 'BSC',
        processingTime: '3-5 minutes',
        fee: '0%',
        limits: '0.1 - 1000 BNB',
        icon: '/img/USDT-BEP20-1.png' // This file exists
      },

    ];

    setWithdrawalMethods(initialMethods);
    setAvailableSoonMethods(initialAvailableSoonMethods);

    console.log('🚀 Withdrawal methods initialized:', initialMethods);

    // Load real-time fees after methods are initialized
    setTimeout(() => {
      loadRealTimeFees();
    }, 100); // Small delay to ensure state is updated
  }, []); // Empty dependency array - run once on mount

  // Load real-time fees for all networks
  const loadRealTimeFees = async () => {
    setIsLoadingFees(true);
    try {
      console.log('🔄 Loading real-time fees...');
      const response = await fetch('/api/blockchain/fees?action=all');
      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 API Response data:', data);

      if (data.success) {
        setRealTimeFees(data.fees);
        console.log('✅ Real-time fees loaded successfully:', data.fees);
        console.log('🔧 Withdrawal methods before update:', withdrawalMethods);

        // Update withdrawal methods with real-time data using state setter
        setWithdrawalMethods(currentMethods => {
          if (currentMethods.length === 0) {
            console.log('⚠️ No withdrawal methods to update yet');
            return currentMethods;
          }

          const updatedMethods = [...currentMethods]; // Create a new array

          data.fees.forEach((feeData: NetworkFeeData) => {
            if (!feeData || !feeData.network) return; // Skip invalid fee data

            console.log('🔧 Processing fee data for network:', feeData.network, feeData);

            // Map network names for matching
            const networkMapping: Record<string, string[]> = {
              'tron': ['trc20', 'tron'],
              'ethereum': ['erc20', 'ethereum', 'eth'],
              'bsc': ['bep20', 'bsc', 'bnb'],
              'polygon': ['polygon', 'matic', 'poly']
            };

            const methodIndex = updatedMethods.findIndex(method => {
              if (!method || !method.network) return false;

              const methodNetwork = method.network.toLowerCase();
              const apiNetwork = feeData.network.toLowerCase();

              // Direct match
              if (methodNetwork === apiNetwork) return true;

              // Check mapping
              for (const [key, aliases] of Object.entries(networkMapping)) {
                if (aliases.includes(apiNetwork) && aliases.includes(methodNetwork)) {
                  return true;
                }
              }

              return false;
            });

            if (methodIndex !== -1 && updatedMethods[methodIndex]) {
              console.log('✅ Found matching method for', feeData.network, 'at index', methodIndex);
              // Create new object to trigger React re-render
              updatedMethods[methodIndex] = {
                ...updatedMethods[methodIndex],
                processingTime: feeData.processingTime || updatedMethods[methodIndex].processingTime,
                fee: '10% gas fee' // Simplified fee display as requested
              };
              console.log('🔧 Updated method:', updatedMethods[methodIndex]);
            } else {
              console.log('❌ No matching method found for network:', feeData.network);
            }
          });

          console.log('🔧 Withdrawal methods after update:', updatedMethods);
          return updatedMethods;
        });
      } else {
        console.error('❌ API returned error:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading real-time fees:', error);
      toast({
        title: 'Fee Loading Error',
        description: 'Using fallback fees. Real-time fees unavailable.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingFees(false);
    }
  };

  // Calculate withdrawal fees with 10% gas fee
  const calculateWithdrawalFees = async (amount: string, network: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setWithdrawalCalculation(null);
      return;
    }

    setIsCalculatingFees(true);
    try {
      const withdrawalAmount = parseFloat(amount);

      // Check if this is a manual method (GCash/PayMaya)
      const isManualMethod = selectedMethod && (selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya');

      if (isManualMethod) {
        // Manual calculation for GCash/PayMaya - 10% gas fee only
        const gasFee = withdrawalAmount * 0.10;
        const networkFee = 0; // No network fee for manual methods
        const netAmount = withdrawalAmount - gasFee - networkFee;

        setWithdrawalCalculation({
          originalAmount: withdrawalAmount,
          gasFee: gasFee,
          networkFee: networkFee,
          netAmount: netAmount,
          breakdown: {
            processingTime: selectedMethod.processingTime,
            method: selectedMethod.name
          }
        });
      } else {
        // Blockchain calculation for crypto methods
        const response = await fetch('/api/blockchain/fees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'calculate-withdrawal',
            amount: withdrawalAmount,
            network: network.toLowerCase()
          })
        });

        const data = await response.json();
        if (data.success) {
          setWithdrawalCalculation(data.calculation);
        }
      }
    } catch (error) {
      console.error('Error calculating withdrawal fees:', error);
    } finally {
      setIsCalculatingFees(false);
    }
  };

  // Load current balance without syncing (same as wallet page)
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

  const loadCurrentBalance = async () => {
    try {
      setIsLoadingBalance(true);
      console.log('🔄 Withdrawal page: Loading current balance...');

      // First, try to get cached balance from WalletService
      const cachedBalance = walletService.getCachedBalance();
      if (cachedBalance) {
        console.log('⚡ Withdrawal page: Using cached balance:', cachedBalance);
        setWalletBalance(cachedBalance);
        setIsLoadingBalance(false);
        return;
      }

      // Use the exact same authentication pattern as the working wallet page
      const userEmail = await getAuthenticatedUserEmail();
      console.log('🔍 Withdrawal page: Authenticated user email:', userEmail);
      if (!userEmail) {
        console.error('❌ Withdrawal page: No authenticated user found');
        setIsLoadingBalance(false);
        return;
      }

      // Fetch wallet balance using the same POST API as other working pages
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Withdrawal page: Balance API response:', data);
        if (data.wallet) {
          const balance: WalletBalance = {
            total: parseFloat(data.wallet.total_balance) || 0,
            tic: parseFloat(data.wallet.tic_balance) || 0,
            gic: parseFloat(data.wallet.gic_balance) || 0,
            staking: parseFloat(data.wallet.staking_balance) || 0,
            partner_wallet: parseFloat(data.wallet.partner_wallet_balance) || 0,
            lastUpdated: new Date(data.wallet.last_updated || new Date())
          };
          console.log('✅ Withdrawal page: Balance loaded successfully:', balance);
          console.log('💰 Withdrawal page: Total balance:', balance.total);
          setWalletBalance(balance);
          setIsLoadingBalance(false);

          // Notify WalletService listeners to ensure synchronization
          walletService.notifyListeners(balance);
          return;
        } else {
          console.error('❌ Withdrawal page: No wallet data in API response:', data);
        }
      } else {
        console.error('❌ Withdrawal page: API request failed:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Withdrawal page: Error details:', errorData);
      }

      // Fallback: try to use WalletService if balance API doesn't exist
      console.log('⚠️ Withdrawal page: API failed, using WalletService fallback');
      const balance = await walletService.getBalance();
      console.log('🔄 Withdrawal page: WalletService balance:', balance);
      setWalletBalance(balance);
      setIsLoadingBalance(false);

      // Notify listeners for consistency
      walletService.notifyListeners(balance);
    } catch (error) {
      console.error('❌ Withdrawal page: Error loading current balance:', error);
      // Last resort: use WalletService
      try {
        console.log('🔄 Withdrawal page: Last resort - using WalletService');
        const balance = await walletService.getBalance();
        console.log('🔄 Withdrawal page: Last resort balance:', balance);
        setWalletBalance(balance);
        setIsLoadingBalance(false);

        // Notify listeners for consistency
        walletService.notifyListeners(balance);
      } catch (serviceError) {
        console.error('❌ Withdrawal page: Error with WalletService:', serviceError);
        setIsLoadingBalance(false);
      }
    }
  };

  // Load balance function - simplified to match working pages
  const loadBalance = async () => {
    setIsLoadingBalance(true);
    try {
      console.log('🔄 Withdrawal page: loadBalance called');

      // Test WalletService first
      console.log('🧪 Testing WalletService...');
      const serviceBalance = await walletService.getBalance();
      console.log('🧪 WalletService balance:', serviceBalance);

      // Then try our custom load
      await loadCurrentBalance();
    } catch (error) {
      console.error('❌ Withdrawal page: Error loading balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch wallet balance and real-time fees on component mount
  useEffect(() => {
    console.log('🎯 useEffect triggered - component mounted');

    const initializeData = async () => {
      try {
        console.log('🚀 Initializing withdrawal page data...');
        await Promise.all([
          loadBalance(),
          loadRealTimeFees()
        ]);
        console.log('✅ Withdrawal page data initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing withdrawal page:', error);
      }
    };

    console.log('🎯 About to call initializeData');
    initializeData();

    // Subscribe to balance updates
    const unsubscribe = walletService.subscribe((balance: WalletBalance) => {
      console.log('📊 Withdrawal page - Balance update received:', balance);
      setWalletBalance(balance);
      setIsLoadingBalance(false); // Ensure loading state is cleared when balance is received
    });

    return unsubscribe;
  }, []); // Remove walletService dependency to match working pages

  // Calculate fees when amount or method changes
  useEffect(() => {
    if (selectedMethod && selectedMethod.network && withdrawalAmount) {
      calculateWithdrawalFees(withdrawalAmount, selectedMethod.network);
    } else {
      setWithdrawalCalculation(null);
    }
  }, [withdrawalAmount, selectedMethod]);

  // Manual balance refresh function
  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      console.log('🔄 Withdrawal page: Manual refresh triggered');

      // Force refresh using WalletService to ensure fresh data
      const freshBalance = await walletService.forceRefreshBalance();
      console.log('✅ Withdrawal page: Fresh balance loaded:', freshBalance);

      setWalletBalance(freshBalance);

      toast({
        title: 'Balance Refreshed',
        description: `Your wallet balance has been updated: $${freshBalance.total.toFixed(2)}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Withdrawal page: Error refreshing balance:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh balance. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleMethodSelect = (method: WithdrawalMethod) => {
    try {
      // Validate method object
      if (!method || !method.id || !method.name) {
        console.error('Invalid withdrawal method:', method);
        toast({
          title: 'Invalid Method',
          description: 'Please select a valid withdrawal method.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Check if user has sufficient balance for minimum withdrawal
      const minWithdrawal = 10;
      if (!walletBalance || walletBalance.total < minWithdrawal) {
        toast({
          title: 'Insufficient Balance',
          description: `Minimum withdrawal is $${minWithdrawal} and you have $${walletBalance?.total.toFixed(2) || '0.00'}.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setSelectedMethod(method);
      setError('');
      setIsSuccess(false);
      console.log('✅ Method selected:', method.name);
    } catch (error) {
      console.error('Error selecting withdrawal method:', error);
      toast({
        title: 'Selection Error',
        description: 'Failed to select withdrawal method. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleWithdrawalSubmit = async () => {
    console.log('=== WITHDRAWAL FORM SUBMISSION STARTED ===');
    console.log('Selected method:', selectedMethod);
    console.log('Wallet address:', walletAddress);
    console.log('Withdrawal amount:', withdrawalAmount);
    console.log('Wallet balance:', walletBalance);

    if (!selectedMethod) {
      console.log('❌ No method selected');
      setError('Please select a withdrawal method first.');
      return;
    }

    // For manual methods (GCash/PayMaya), wallet address is the account number
    if (!walletAddress.trim()) {
      const addressLabel = selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
        ? 'account number'
        : 'wallet address';
      console.log('❌ No wallet address/account number provided');
      setError(`Please enter your ${addressLabel}.`);
      return;
    }

    setError('');
    setIsSuccess(false);
    const amount = parseFloat(withdrawalAmount);
    console.log('Parsed amount:', amount);

    if (isNaN(amount) || amount <= 0) {
      console.log('❌ Invalid amount');
      setError('Please enter a valid withdrawal amount.');
      return;
    }

    // Validate withdrawal amount using standard validation
    const validation = validateWithdrawalAmount(amount, selectedMethod.id);
    if (!validation.isValid) {
      console.log('❌ Amount validation failed:', validation.error);
      setError(validation.error || 'Invalid withdrawal amount.');
      return;
    }

    if (!walletBalance || amount > walletBalance.total) {
      console.log('❌ Insufficient balance. Amount:', amount, 'Balance:', walletBalance?.total);
      setError('Insufficient balance for this withdrawal amount.');
      return;
    }

    console.log('✅ All validations passed, starting submission...');
    setIsSubmitting(true);

    try {
      // Handle different withdrawal types
      const isManualMethod = selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                             selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon';
      const isTronPyMethod = selectedMethod.id === 'usdt-trc20';

      if (isTronPyMethod) {
        // Validate TronPy configuration for TRC20 withdrawals
        if (!selectedMethod || !selectedMethod.tronNetwork || !selectedMethod.tokenSymbol) {
          throw new Error('TronPy configuration missing for this withdrawal method');
        }
      }

      let withdrawalData;

      if (isManualMethod) {
        // Process manual withdrawal (GCash/PayMaya/BEP20/Polygon)
        const withdrawalResponse = await fetch('/api/withdrawals/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: selectedMethod.id,
            accountNumber: walletAddress,
            amount: amount,
            currency: selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ? 'USD' : 'USD', // All use USD
            network: selectedMethod.network
          })
        });

        withdrawalData = await withdrawalResponse.json();

        if (!withdrawalData.success) {
          throw new Error(withdrawalData.error || 'Failed to process manual withdrawal');
        }
      } else if (isTronPyMethod) {
        // Process TronPy withdrawal
        // First validate the address
        const validateResponse = await fetch(`/api/wallet/validate-address?address=${encodeURIComponent(walletAddress)}&network=${selectedMethod.tronNetwork}`);
        const validateData = await validateResponse.json();

        if (!validateData.success || !validateData.isValid) {
          throw new Error(`Invalid ${selectedMethod.network} address format`);
        }

        // Process TronPy withdrawal using the TRC20 API
        const withdrawalResponse = await fetch('/api/trc20/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            network: selectedMethod.tronNetwork,
            tokenSymbol: selectedMethod.tokenSymbol,
            amount: amount.toString(),
            toAddress: walletAddress
          })
        });

        withdrawalData = await withdrawalResponse.json();

        if (!withdrawalData.success) {
          throw new Error(withdrawalData.error || 'Failed to process withdrawal');
        }
      }

      // Set success state and message
      setIsSuccess(true);

      // Automatically refresh wallet balance after successful withdrawal
      try {
        const { syncAfterWithdrawal } = await import('@/lib/utils/balanceSync');
        await syncAfterWithdrawal(amount);

        // Update local state
        const newBalance = await walletService.getBalance();
        setWalletBalance(newBalance);
      } catch (refreshError) {
        console.error('❌ Failed to refresh balance after withdrawal:', refreshError);
        // Don't fail the withdrawal if balance refresh fails
      }

      if (isManualMethod) {
        const isPhpMethod = selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya';
        const addressLabel = isPhpMethod ? 'account' : 'wallet address';
        const methodDescription = isPhpMethod ? selectedMethod.name : `${selectedMethod.name} (${selectedMethod.network})`;

        setSuccessMessage(`Manual withdrawal request of $${amount} to ${methodDescription} ${addressLabel} ${walletAddress} has been submitted successfully! 10% gas fee applied. Your request is pending admin approval.`);

        // Show success toast for manual withdrawal
        toast({
          title: 'Withdrawal Request Submitted!',
          description: `Your ${methodDescription} withdrawal request has been submitted with 10% gas fee applied and is pending admin approval.`,
          status: 'success',
          duration: 7000,
          isClosable: true,
        });
      } else if (isTronPyMethod) {
        setSuccessMessage(`Web3 withdrawal of ${amount} ${selectedMethod.tokenSymbol || 'tokens'} on ${selectedMethod.network} has been processed successfully! Transaction Hash: ${withdrawalData.transactionHash?.slice(0, 10)}...`);

        // Show success toast for Web3 withdrawal
        toast({
          title: 'Withdrawal Processed!',
          description: `Your withdrawal has been broadcasted to the ${selectedMethod.network} blockchain. It will be confirmed shortly.`,
          status: 'success',
          duration: 7000,
          isClosable: true,
        });
      }

      // Clear form
      setWithdrawalAmount('');
      setWalletAddress('');

      // Redirect to withdrawal status page
      const statusUrl = new URL('/wallet/withdrawal/status', window.location.origin);
      statusUrl.searchParams.set('transactionId', withdrawalData.transactionId || withdrawalData.id || 'unknown');
      statusUrl.searchParams.set('transactionHash', withdrawalData.transactionHash || '');
      statusUrl.searchParams.set('amount', amount.toString());
      statusUrl.searchParams.set('currency', 'USD');
      statusUrl.searchParams.set('method', selectedMethod.name);
      statusUrl.searchParams.set('destinationAddress', walletAddress);
      statusUrl.searchParams.set('status', isManualMethod ? 'pending' : 'broadcasted');
      statusUrl.searchParams.set('processingTime', withdrawalData.estimatedConfirmationTime || selectedMethod.processingTime);
      statusUrl.searchParams.set('web3', isManualMethod ? 'false' : 'true');
      statusUrl.searchParams.set('network', selectedMethod.network);

      setTimeout(() => {
        router.push(statusUrl.pathname + statusUrl.search);
      }, 2000);

    } catch (e: any) {
      console.error("Error during withdrawal:", e);
      setError(e.message || "An error occurred during the withdrawal request.");
      setIsSuccess(false);

      toast({
        title: 'Withdrawal Request Failed',
        description: e.message || 'Failed to submit withdrawal request. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        <VStack spacing={4} textAlign="center">
          <Heading as="h1" size="xl" color={textColor}>
            Withdraw Funds
          </Heading>
          <Text fontSize="lg" color={subtleTextColor} maxW="600px">
            Transfer funds from your wallet to external accounts
          </Text>
        </VStack>

        {/* Quick Stats */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} maxW="800px" mx="auto">
          <Card bg={cardBgColor} borderRadius="xl" border="1px" borderColor="green.200">
            <CardBody p={4} textAlign="center">
              <VStack spacing={2}>
                <Box w={8} h={8} bg="green.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                  <Box w={4} h={4} bg="green.500" borderRadius="full" />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="green.600">Fast Crypto</Text>
                <Text fontSize="xs" color={subtleTextColor}>3-5 minutes</Text>
              </VStack>
            </CardBody>
          </Card>
          <Card bg={cardBgColor} borderRadius="xl" border="1px" borderColor="blue.200">
            <CardBody p={4} textAlign="center">
              <VStack spacing={2}>
                <Box w={8} h={8} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                  <Box w={4} h={4} bg="blue.500" borderRadius="full" />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="blue.600">Digital Wallets</Text>
                <Text fontSize="xs" color={subtleTextColor}>5-30 minutes</Text>
              </VStack>
            </CardBody>
          </Card>
          <Card bg={cardBgColor} borderRadius="xl" border="1px" borderColor="orange.200">
            <CardBody p={4} textAlign="center">
              <VStack spacing={2}>
                <Box w={8} h={8} bg="orange.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                  <Box w={4} h={4} bg="orange.500" borderRadius="full" />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="orange.600">Min $10</Text>
                <Text fontSize="xs" color={subtleTextColor}>Low minimum</Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>



        {/* Wallet Balance Display - Compact */}
        <Box
          bg={cardBgColor}
          p={4}
          borderRadius="lg"
          border="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          boxShadow="sm"
          maxW="500px"
          mx="auto"
        >
          <HStack justify="space-between" align="center" spacing={3}>
            <HStack spacing={3}>
              <Box
                bg={useColorModeValue('blue.50', 'blue.900')}
                p={2}
                borderRadius="lg"
                border="1px solid"
                borderColor={useColorModeValue('blue.100', 'blue.800')}
              >
                <Icon as={FaDollarSign} color="blue.500" boxSize={5} />
              </Box>
              <VStack spacing={0} align="start">
                <Text fontSize="md" fontWeight="bold" color={textColor}>
                  Available Balance
                </Text>
                <Text fontSize="xs" color={subtleTextColor} fontWeight="medium">
                  Minimum withdrawal: $10.00
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={2} align="center">
              <Text fontSize="xl" fontWeight="bold" color={textColor} letterSpacing="tight">
                {isLoadingBalance ? 'Loading...' : `$${walletBalance && typeof walletBalance.total === 'number' ? walletBalance.total.toFixed(2) : '0.00'}`}
              </Text>
              <IconButton
                aria-label="Refresh balance"
                icon={<Icon as={FaSync} />}
                size="sm"
                variant="ghost"
                onClick={handleRefreshBalance}
                isLoading={isRefreshingBalance}
                borderRadius="full"
                _hover={{
                  bg: useColorModeValue('gray.100', 'gray.700'),
                  transform: 'rotate(180deg)'
                }}
                transition="all 0.3s ease"
              />
            </HStack>
          </HStack>

          {walletBalance && walletBalance.total < 10 && (
            <Alert status="warning" mt={4} borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Insufficient Balance for Withdrawal</AlertTitle>
                <AlertDescription fontSize="xs">
                  You need at least $10.00 to make a withdrawal. Please deposit more funds to your wallet.
                </AlertDescription>
              </Box>
            </Alert>
          )}
        </Box>



        {/* Withdrawal Method Selection */}
        {!selectedMethod && (
          <VStack spacing={8} align="stretch">
            {/* Header Section */}
            <VStack spacing={4} textAlign="center">
              <Text fontSize="lg" color={subtleTextColor} maxW="600px">
                Choose your preferred withdrawal method to transfer funds from your wallet:
              </Text>
            </VStack>

            {/* Cryptocurrency Methods */}
            <VStack spacing={6} align="stretch">
              <VStack spacing={2}>
                <Heading as="h2" size="md" color={textColor} textAlign="center">
                  Cryptocurrency
                </Heading>
                <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                  Fast withdrawals to your crypto wallet
                </Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} maxW="1200px" mx="auto">
                {withdrawalMethods && withdrawalMethods.length > 0 ? (withdrawalMethods.filter(method => method && method.id && method.name && method.tronNetwork) as WithdrawalMethod[]).map((method) => {
                  const limits = getCompactWithdrawalLimits(method.id);
                  return (
                  <Card
                    key={method.id}
                    cursor="pointer"
                    onClick={() => handleMethodSelect(method)}
                    bg={cardBgColor}
                    border="2px solid"
                    borderColor={selectedMethod?.id === method.id ? 'green.400' : useColorModeValue('gray.200', 'gray.600')}
                    borderRadius="xl"
                    minH="340px"
                    _hover={{
                      borderColor: 'green.400',
                      transform: 'translateY(-4px)',
                      boxShadow: 'xl',
                    }}
                    transition="all 0.3s ease-in-out"
                    position="relative"
                    overflow="hidden"
                  >
                    <CardBody p={6} display="flex" flexDirection="column" justifyContent="space-between" h="full">
                      <VStack spacing={4} flex="1">
                        {/* Icon with background circle */}
                        <Box
                          bg={useColorModeValue('green.50', 'green.900')}
                          borderRadius="full"
                          p={3}
                          position="relative"
                        >
                          <Image
                            src={method.icon || '/img/default-crypto.png'}
                            alt={`${method.network || 'Unknown'} logo`}
                            boxSize="48px"
                            onError={(e) => {
                              console.warn('Failed to load image:', method.icon);
                              e.currentTarget.src = '/img/default-crypto.png';
                            }}
                            objectFit="contain"
                          />
                          {/* Network badge */}
                          <Box
                            position="absolute"
                            bottom="-2px"
                            right="-2px"
                            bg="green.500"
                            color="white"
                            borderRadius="full"
                            w="20px"
                            h="20px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="xs"
                            fontWeight="bold"
                          >
                            T
                          </Box>
                        </Box>

                        {/* Title and Network */}
                        <VStack spacing={1} textAlign="center">
                          <Text fontSize="xl" color={textColor} fontWeight="bold">
                            {method.name || 'Unknown Method'}
                          </Text>
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color="green.500"
                            bg={useColorModeValue('green.50', 'green.900')}
                            px={3}
                            py={1}
                            borderRadius="full"
                          >
                            {method.network || 'Unknown Network'}
                          </Text>
                        </VStack>

                        {/* Details */}
                        <VStack spacing={2} w="full" flex="1">
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor}>
                              Processing:
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="semibold">
                              {method.processingTime || 'Loading...'}
                            </Text>
                          </HStack>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor}>
                              Fee:
                            </Text>
                            <Text fontSize="sm" color="green.500" fontWeight="semibold">
                              {method.fee || 'Loading...'}
                            </Text>
                          </HStack>
                          <VStack spacing={1} w="full">
                            <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                              Limits:
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="semibold" textAlign="center" lineHeight="1.3">
                              {limits.primary}
                            </Text>
                            <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                              {limits.secondary}
                            </Text>
                          </VStack>
                        </VStack>
                      </VStack>

                      {/* Select Button */}
                      <Button
                        colorScheme="green"
                        size="md"
                        w="full"
                        borderRadius="lg"
                        fontWeight="semibold"
                        mt={4}
                        _hover={{
                          transform: 'translateY(-1px)',
                        }}
                        transition="all 0.2s"
                      >
                        Select {method.network}
                      </Button>
                    </CardBody>
                  </Card>
                  );
                }) : (
                  <Text color={subtleTextColor} textAlign="center">
                    No withdrawal methods available
                  </Text>
                )}
              </SimpleGrid>
            </VStack>

            {/* Manual Payment Methods */}
            <VStack spacing={6} align="stretch">
              <VStack spacing={2}>
                <Heading as="h2" size="md" color={textColor} textAlign="center">
                  Digital Wallets (Philippines)
                </Heading>
                <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                  Fast and secure digital wallet withdrawals
                </Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} maxW="1200px" mx="auto">
                {withdrawalMethods && withdrawalMethods.length > 0 ? (withdrawalMethods.filter(method => method && method.id && method.name && !method.tronNetwork) as WithdrawalMethod[]).map((method) => {
                  const limits = getCompactWithdrawalLimits(method.id);
                  return (
                  <Card
                    key={method.id}
                    cursor="pointer"
                    onClick={() => handleMethodSelect(method)}
                    bg={cardBgColor}
                    border="2px solid"
                    borderColor={selectedMethod?.id === method.id ? 'blue.400' : useColorModeValue('gray.200', 'gray.600')}
                    borderRadius="xl"
                    minH="340px"
                    _hover={{
                      borderColor: 'blue.400',
                      transform: 'translateY(-4px)',
                      boxShadow: 'xl',
                    }}
                    transition="all 0.3s ease-in-out"
                    position="relative"
                    overflow="hidden"
                  >
                    <CardBody p={6} display="flex" flexDirection="column" justifyContent="space-between" h="full">
                      <VStack spacing={4} flex="1">
                        {/* Icon with background circle */}
                        <Box
                          bg={useColorModeValue('blue.50', 'blue.900')}
                          borderRadius="full"
                          p={3}
                          position="relative"
                        >
                          <Image
                            src={method?.icon || '/img/default-wallet.png'}
                            alt={`${method?.network || 'Wallet'} logo`}
                            boxSize="48px"
                            objectFit="contain"
                          />
                        </Box>

                        {/* Title and Network */}
                        <VStack spacing={1} textAlign="center">
                          <Text fontSize="xl" color={textColor} fontWeight="bold">
                            {method?.name || 'Unknown'}
                          </Text>
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color="blue.500"
                            bg={useColorModeValue('blue.50', 'blue.900')}
                            px={3}
                            py={1}
                            borderRadius="full"
                          >
                            {method?.network || 'Unknown'}
                          </Text>
                        </VStack>

                        {/* Details */}
                        <VStack spacing={2} w="full" flex="1">
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor}>
                              Processing:
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="semibold">
                              {method?.processingTime || '5-30 minutes'}
                            </Text>
                          </HStack>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor}>
                              Fee:
                            </Text>
                            <Text fontSize="sm" color="blue.500" fontWeight="semibold">
                              {method?.fee || '10% gas fee'}
                            </Text>
                          </HStack>
                          <VStack spacing={1} w="full">
                            <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                              Limits:
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="semibold" textAlign="center" lineHeight="1.3">
                              {limits.primary}
                            </Text>
                            <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                              {limits.secondary}
                            </Text>
                          </VStack>
                        </VStack>
                      </VStack>

                      {/* Select Button */}
                      <Button
                        colorScheme="blue"
                        size="md"
                        w="full"
                        borderRadius="lg"
                        fontWeight="semibold"
                        mt={4}
                        _hover={{
                          transform: 'translateY(-1px)',
                        }}
                        transition="all 0.2s"
                      >
                        Select {method?.network || 'Method'}
                      </Button>
                    </CardBody>
                  </Card>
                  );
                }) : null}
              </SimpleGrid>
            </VStack>

            {/* Available Soon Section */}
              <VStack spacing={6} mt={12}>
                <Heading as="h3" size="lg" color={textColor} textAlign="center">
                  Available Soon
                </Heading>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} maxW="1000px" mx="auto">
                  {availableSoonMethods.map((method) => (
                    <Card
                      key={method.id}
                      bg={cardBgColor}
                      border="2px solid"
                      borderColor="gray.200"
                      borderRadius="xl"
                      opacity={0.6}
                      position="relative"
                      overflow="hidden"
                    >
                      <CardBody p={4} textAlign="center">
                        <VStack spacing={3}>
                          {/* Icon with background circle */}
                          <Box
                            bg="gray.50"
                            borderRadius="full"
                            p={3}
                            position="relative"
                          >
                            <Image
                              src={method.icon}
                              alt={`${method.network} logo`}
                              boxSize="48px"
                              objectFit="contain"
                              filter="grayscale(100%)"
                            />
                          </Box>

                          {/* Title and Network */}
                          <VStack spacing={1}>
                            <Text fontSize="md" color={textColor} fontWeight="bold">
                              {method.name}
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="bold"
                              color="gray.500"
                              bg="gray.50"
                              px={3}
                              py={1}
                              borderRadius="full"
                            >
                              {method.network}
                            </Text>
                          </VStack>

                          {/* Coming Soon Badge */}
                          <Text
                            fontSize="xs"
                            color="orange.500"
                            bg="orange.50"
                            px={2}
                            py={1}
                            borderRadius="md"
                            fontWeight="bold"
                          >
                            Coming Soon
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </VStack>

              {/* Additional Info */}
              <Box
                bg={useColorModeValue('orange.50', 'orange.900')}
                p={6}
                borderRadius="xl"
                maxW="800px"
                mx="auto"
                border="1px solid"
                borderColor={useColorModeValue('orange.200', 'orange.700')}
              >
                <VStack spacing={4} textAlign="center">
                  <HStack spacing={2} justify="center">
                    <Text fontSize="lg">⚠️</Text>
                    <Text fontSize="md" color={useColorModeValue('orange.700', 'orange.200')} fontWeight="semibold">
                      Withdrawals require user verification and have a 10% processing fee
                    </Text>
                  </HStack>
                  <HStack spacing={6} justify="center" flexWrap="wrap">
                    <Text fontSize="sm" color={useColorModeValue('orange.600', 'orange.300')}>
                      ✓ Secure blockchain transactions
                    </Text>
                    <Text fontSize="sm" color={useColorModeValue('orange.600', 'orange.300')}>
                      ✓ Fast processing times
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
        )}

        {/* Selected Method Details */}
        {selectedMethod && (
          <Box bg={cardBgColor} p={6} borderRadius="xl" boxShadow="lg">
            <VStack spacing={5}>
              <HStack justify="space-between" w="full">
                <HStack spacing={4} align="center">
                  <Image
                    src={selectedMethod.icon}
                    alt={`${selectedMethod.network} logo`}
                    boxSize="40px"
                    objectFit="contain"
                  />
                  <VStack align="start" spacing={0}>
                    <Heading as="h2" size="md" color={textColor}>
                      {selectedMethod.name} ({selectedMethod.network})
                    </Heading>
                    <Text fontSize="sm" color={subtleTextColor}>
                      Processing time: {selectedMethod.processingTime}
                    </Text>
                    <Text fontSize="sm" color={subtleTextColor}>
                      Fee: {selectedMethod.fee}
                    </Text>
                    <Text fontSize="sm" color={subtleTextColor}>
                      Limits: {selectedMethod.limits}
                    </Text>
                  </VStack>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedMethod(null)}
                >
                  Change Method
                </Button>
              </HStack>

              <Divider />

              <Text fontSize="md" color={textColor}>
                {selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
                  ? `Enter your ${selectedMethod.name} account number and withdrawal amount:`
                  : `Enter your ${selectedMethod.network} wallet address and withdrawal amount:`
                }
              </Text>

              {isSuccess && (
                <Alert status="success" borderRadius="md" mb={4}>
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Withdrawal Successful!</AlertTitle>
                    <AlertDescription display="block">
                      {successMessage} Redirecting to your wallet...
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>Important!</AlertTitle>
                  <AlertDescription display="block">
                    {selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
                      ? `Ensure you enter a valid ${selectedMethod.name} account number. Your withdrawal will be processed manually by our admin team.`
                      : `Ensure you enter a valid ${selectedMethod.network} wallet address. Sending to an incorrect address may result in permanent loss of funds.`
                    }
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl isInvalid={!!error} mt={4}>
                <FormLabel htmlFor="walletAddress" color={textColor}>
                  {selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
                    ? `${selectedMethod.name} Account Number *`
                    : `${selectedMethod.network} Wallet Address *`
                  }
                </FormLabel>
                <Input
                  id="walletAddress"
                  placeholder={selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
                    ? `Enter your ${selectedMethod.name} account number (e.g., 09675131248)`
                    : `Enter your ${selectedMethod.network} wallet address`
                  }
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </FormControl>

              <FormControl isInvalid={!!error} mt={4}>
                <FormLabel htmlFor="withdrawalAmount" color={textColor}>
                  Amount to Withdraw (USD) *
                  <Text fontSize="xs" color="gray.500" fontWeight="normal">
                    Enter amount in USD - all withdrawals are processed in USD
                  </Text>
                </FormLabel>
                <InputGroup>
                  <InputLeftAddon>$</InputLeftAddon>
                  <Input
                    id="withdrawalAmount"
                    type="number"
                    placeholder="e.g., 100"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    step="0.01"
                    min="10"
                    max="10000"
                  />
                </InputGroup>
                {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                  <FormHelperText color="blue.500">
                    {(() => {
                      const { usdAmount, phpAmount } = parseWithdrawalAmount(parseFloat(withdrawalAmount), selectedMethod.id);
                      if (selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya') {
                        return `Withdrawal: ${formatCurrency(usdAmount, 'USD')} → You receive: ${formatCurrency(phpAmount, 'PHP')} (Rate: $1 = ₱60)`;
                      } else {
                        return `Withdrawal: ${formatCurrency(usdAmount, 'USD')} → You receive: ${formatCurrency(usdAmount, 'USD')} USDT (≈₱${phpAmount.toFixed(0)} PHP)`;
                      }
                    })()}
                  </FormHelperText>
                )}
                {error && <FormHelperText color="red.500">{error}</FormHelperText>}
              </FormControl>

              {/* Fee Calculation Display */}
              {withdrawalCalculation && (
                <Box mt={4} p={4} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md" border="1px" borderColor={useColorModeValue('blue.200', 'blue.600')}>
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color={useColorModeValue('blue.700', 'blue.200')}>
                      Withdrawal Fee Breakdown
                    </Text>

                    <HStack justify="space-between">
                      <Text fontSize="sm" color={subtleTextColor}>Original Amount:</Text>
                      <Text fontSize="sm" fontWeight="bold" color={textColor}>${withdrawalCalculation.originalAmount}</Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontSize="sm" color={subtleTextColor}>Gas Fee (10%):</Text>
                      <Text fontSize="sm" fontWeight="bold" color="red.500">-${withdrawalCalculation.gasFee.toFixed(2)}</Text>
                    </HStack>

                    {withdrawalCalculation.networkFee > 0 && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color={subtleTextColor}>Network Fee:</Text>
                        <Text fontSize="sm" fontWeight="bold" color="red.500">-${withdrawalCalculation.networkFee.toFixed(2)}</Text>
                      </HStack>
                    )}

                    <Divider />

                    <HStack justify="space-between">
                      <Text fontSize="md" fontWeight="bold" color={textColor}>You'll Receive:</Text>
                      <Text fontSize="md" fontWeight="bold" color="green.500">${withdrawalCalculation.netAmount.toFixed(2)}</Text>
                    </HStack>

                    <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                      Processing Time: {withdrawalCalculation.breakdown?.processingTime || selectedMethod.processingTime}
                    </Text>
                  </VStack>
                </Box>
              )}

              {/* Loading Fee Calculation */}
              {isCalculatingFees && (
                <Box mt={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md" textAlign="center">
                  <HStack justify="center" spacing={2}>
                    <Spinner size="sm" />
                    <Text fontSize="sm" color={subtleTextColor}>Calculating fees...</Text>
                  </HStack>
                </Box>
              )}

              <Button
                colorScheme={isSuccess ? "green" : "blue"}
                onClick={handleWithdrawalSubmit}
                isLoading={isSubmitting}
                loadingText="Processing Withdrawal..."
                isDisabled={isSuccess}
                mt={6}
                w="full"
              >
                {isSuccess ? "Withdrawal Successful - Redirecting..." : `Confirm Withdrawal (${selectedMethod.network})`}
              </Button>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}