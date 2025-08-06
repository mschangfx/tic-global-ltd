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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Image, // Added for custom icon
  Input, // Added Input
  FormControl, // Added
  FormLabel, // Added
  FormHelperText, // Added
  InputGroup, // Added
  InputLeftAddon, // Added
  SimpleGrid,
  Card,
  CardBody,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Center,
  Spinner,
  Code
} from '@chakra-ui/react';
import { FaDollarSign, FaQrcode, FaCopy } from 'react-icons/fa'; // Placeholder icons
// import { SiTether } from 'react-icons/si'; // Ideal icon for Tether
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSession } from 'next-auth/react';
import WalletService from '@/lib/services/walletService';
import TransactionService from '@/lib/services/transactionService';
import TRC20QRCode from '@/components/TRC20QRCode';
// Removed web3DepositService - now using tronpy automation service
import { useSafeToast } from '@/hooks/useSafeToast';
import BlockchainFeeService, { NetworkFeeData } from '@/lib/services/blockchainFeeService';

interface DepositMethod {
  id: string;
  name: string;
  symbol: string;
  network: string;
  address: string;
  processingTime: string;
  fee: string;
  limits: string;
  icon: string;
  tronNetwork?: string; // Add TRON network mapping
  tokenSymbol?: string; // Add token symbol for TRC20
}

export default function DepositPage() {
  const router = useRouter();
  const supabase = createClient();
  const walletService = WalletService.getInstance();
  const transactionService = TransactionService.getInstance();
  const toast = useSafeToast();

  // Comprehensive error handler for browser extension errors and dev server issues
  useEffect(() => {
    // Intercept fetch requests to suppress 400 errors from Next.js dev server
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Suppress 400 errors from Next.js development server
        if (!response.ok && response.status === 400) {
          const url = args[0]?.toString() || '';
          if (url.includes('_nextjs_original-stack-frame') ||
              url.includes('stack-frame') ||
              url.includes('.map') ||
              url.includes('webpack')) {
            console.warn('🔇 Next.js dev server 400 error suppressed:', url);
            // Return a fake successful response to prevent error propagation
            return new Response('{}', { status: 200, statusText: 'OK' });
          }
        }

        return response;
      } catch (error) {
        // Suppress network errors for development resources
        const url = args[0]?.toString() || '';
        if (url.includes('_nextjs_original-stack-frame') ||
            url.includes('stack-frame') ||
            url.includes('.map')) {
          console.warn('🔇 Next.js dev server network error suppressed:', url);
          return new Response('{}', { status: 200, statusText: 'OK' });
        }
        throw error;
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      // Comprehensive filter for browser extension errors and dev server errors
      const isExtensionError =
        event.filename?.includes('inpage.js') ||
        event.filename?.includes('chrome-extension') ||
        event.filename?.includes('moz-extension') ||
        event.filename?.includes('safari-extension') ||
        event.message?.includes('Cannot read properties of null') ||
        event.message?.includes('Cannot read property') ||
        event.message?.includes('reading \'type\'') ||
        event.error?.stack?.includes('inpage.js') ||
        event.error?.stack?.includes('extension');

      const isDevServerError =
        event.filename?.includes('stack-frame') ||
        event.filename?.includes('_nextjs_original') ||
        event.message?.includes('400 (Bad Request)') ||
        event.message?.includes('Failed to load resource');

      if (isExtensionError || isDevServerError) {
        console.warn('🔇 Error suppressed:', event.message);
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Filter out browser extension promise rejections
      const isExtensionRejection =
        event.reason?.stack?.includes('inpage.js') ||
        event.reason?.stack?.includes('chrome-extension') ||
        event.reason?.stack?.includes('extension') ||
        event.reason?.message?.includes('Cannot read properties of null');

      if (isExtensionRejection) {
        console.warn('🔇 Browser extension promise rejection suppressed:', event.reason);
        event.preventDefault();
        return false;
      }
    };

    // Override console.error temporarily to filter extension errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('inpage.js') ||
          message.includes('chrome-extension') ||
          message.includes('Cannot read properties of null')) {
        console.warn('🔇 Console error suppressed (extension):', message);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      console.error = originalConsoleError; // Restore original console.error
      window.fetch = originalFetch; // Restore original fetch
    };
  }, []);

  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [manualQrCodeDataUrl, setManualQrCodeDataUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { isOpen: isQROpen, onOpen: onQROpen, onClose: onQRClose } = useDisclosure();
  const [isMounted, setIsMounted] = useState(false);

  // Real-time fee states
  const [realTimeFees, setRealTimeFees] = useState<NetworkFeeData[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('black', 'white');
  const accentColor = 'green.400';

  // Component mounting check
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Initialize deposit methods on component mount with error handling
  useEffect(() => {
    if (!isMounted) return;

    try {
      const initialMethods: DepositMethod[] = [
        {
          id: 'usdt-trc20',
          name: 'USDT (TRC20)',
          symbol: 'USDT',
          network: 'TRC20',
          address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
          processingTime: '5-30 minutes',
          fee: 'Free',
          limits: '10 - 200,000 USD',
          icon: '/img/USDT-TRC20.png'
        },
        {
          id: 'usdt-bep20',
          name: 'USDT (BEP20)',
          symbol: 'USDT',
          network: 'BEP20',
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          processingTime: '5-30 minutes',
          fee: 'Free',
          limits: '10 - 200,000 USD',
          icon: '/img/USDT-BEP20-1.png'
        },
        {
          id: 'usdt-polygon',
          name: 'USDT (Polygon)',
          symbol: 'USDT',
          network: 'Polygon',
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          processingTime: '5-30 minutes',
          fee: 'Free',
          limits: '10 - 200,000 USD',
          icon: '/img/USDT-Polygon.png'
        },
        {
          id: 'gcash',
          name: 'GCash',
          symbol: 'PHP',
          network: 'Digital Wallet',
          address: '09675131248',
          processingTime: '5-30 minutes',
          fee: 'Free',
          limits: '500 - 50,000 PHP',
          icon: '/img/gcash.png'
        },
        {
          id: 'paymaya',
          name: 'PayMaya',
          symbol: 'PHP',
          network: 'Digital Wallet',
          address: '09675131248',
          processingTime: '5-30 minutes',
          fee: 'Free',
          limits: '500 - 50,000 PHP',
          icon: '/img/paymaya.jpg'
        }
      ];

      setDepositMethods(initialMethods);
      console.log('🚀 Deposit methods initialized:', initialMethods);

      // Load real-time fees after methods are initialized with delay
      const timeoutId = setTimeout(() => {
        if (!isMounted) return;
        try {
          loadRealTimeFees();
        } catch (error) {
          console.error('Error loading real-time fees:', error);
        }
      }, 1000); // Increased delay to ensure component is fully mounted

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error initializing deposit methods:', error);
      // Set fallback methods if initialization fails
      if (isMounted) {
        setDepositMethods([
          {
            id: 'usdt-trc20',
            name: 'USDT (TRC20)',
            symbol: 'USDT',
            network: 'TRC20',
            address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
            processingTime: '5-30 minutes',
            fee: 'Free',
            limits: '10 - 200,000 USD',
            icon: '/img/USDT-TRC20.png'
          },
          {
            id: 'usdt-bep20',
            name: 'USDT (BEP20)',
            symbol: 'USDT',
            network: 'BEP20',
            address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            processingTime: '5-30 minutes',
            fee: 'Free',
            limits: '10 - 200,000 USD',
            icon: '/img/USDT-BEP20-1.png'
          },
          {
            id: 'usdt-polygon',
            name: 'USDT (Polygon)',
            symbol: 'USDT',
            network: 'Polygon',
            address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            processingTime: '5-30 minutes',
            fee: 'Free',
            limits: '10 - 200,000 USD',
            icon: '/img/USDT-Polygon.png'
          },
          {
            id: 'gcash',
            name: 'GCash',
            symbol: 'PHP',
            network: 'Digital Wallet',
            address: '09675131248',
            processingTime: '5-30 minutes',
            fee: 'Free',
            limits: '500 - 50,000 PHP',
            icon: '/img/gcash.png'
          },
          {
            id: 'paymaya',
            name: 'PayMaya',
            symbol: 'PHP',
            network: 'Digital Wallet',
            address: '09675131248',
            processingTime: '5-30 minutes',
            fee: 'Free',
            limits: '500 - 50,000 PHP',
            icon: '/img/paymaya.jpg'
          }
        ]);
      }
    }
  }, [isMounted]);

  // Available Soon payment methods
  const availableSoonMethods = [
    {
      id: 'usdt-bep20',
      name: 'USDT',
      symbol: 'USDT',
      network: 'BEP20',
      processingTime: '3-5 minutes',
      fee: '0%',
      limits: '10 - 150,000 USD',
      icon: '/img/USDT-BEP20-1.png'
    },
    {
      id: 'usdt-erc20',
      name: 'USDT',
      symbol: 'USDT',
      network: 'ERC20',
      processingTime: '5-15 minutes',
      fee: '0%',
      limits: '10 - 100,000 USD',
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

  ];

  // Simplified but robust authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);
        setError('');

        // Real-time fees are loaded in the initialization useEffect

        // Try to get authenticated user
        const { data: { user }, error } = await supabase.auth.getUser();

        if (user && !error) {
          // User is authenticated
          setUser(user);
          setError('');
          setDebugInfo('');
          console.log('✅ User authenticated:', user.email);
        } else {
          // Try session as fallback
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setError('');
            setDebugInfo('');
            console.log('✅ User authenticated via session:', session.user.email);
          } else {
            // Try NextAuth session as additional fallback
            const nextAuthSession = await getSession();
            if (nextAuthSession?.user?.email) {
              const sessionUser = {
                id: (nextAuthSession.user as any).id || 'session-user-' + Date.now(),
                email: nextAuthSession.user.email,
                email_confirmed_at: new Date().toISOString(),
                user_metadata: { provider: 'nextauth' }
              };
              setUser(sessionUser);
              setError('');
              setDebugInfo('');
              console.log('✅ User authenticated via NextAuth session:', nextAuthSession.user.email);
            } else {
              setError('Authentication required - please log in');
              setDebugInfo('No authenticated user found in any system');
              console.log('❌ No authenticated user found');
            }
          }
        }

      } catch (error) {
        console.error('Error checking authentication:', error);
        setError('Authentication error - please refresh the page');
        setDebugInfo('Error during authentication check');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setError('You have been logged out. Please log in again.');
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUser(session.user);
        setError('');
        setDebugInfo(`Auth updated: ${session.user.email}`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCopyAddress = async () => {
    if (!selectedMethod) {
      toast({
        title: 'Error',
        description: 'No deposit method selected',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedMethod.address);
      toast({
        title: 'Address Copied!',
        description: 'Wallet address has been copied to clipboard.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = selectedMethod.address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();

        toast({
          title: 'Address Copied!',
          description: 'Wallet address has been copied to clipboard.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } catch (fallbackErr) {
        toast({
          title: 'Failed to copy',
          description: 'Please copy the address manually',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Generate QR code for deposit address
  const generateDepositQR = async () => {
    if (!selectedMethod) {
      toast({
        title: 'Error',
        description: 'No deposit method selected',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoadingQR(true);

      // Use specific TRC20 endpoint for TRC20 deposits
      const endpoint = selectedMethod?.network === 'TRC20'
        ? '/api/deposits/trc20'
        : '/api/referrals/qr-code';

      const requestBody = selectedMethod?.network === 'TRC20'
        ? {
            address: selectedMethod?.address || '',
            size: 300,
            format: 'dataurl',
            includeAmount: false
          }
        : {
            text: selectedMethod.address,
            size: 300,
            format: 'dataurl'
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQrCodeDataUrl(data.qrCode);
          onQROpen();
        } else {
          throw new Error(data.error || 'Failed to generate QR code');
        }
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingQR(false);
    }
  };

  // Download QR code function
  const downloadDepositQR = () => {
    if (!qrCodeDataUrl || !selectedMethod) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `TIC-Global-Deposit-${selectedMethod?.network || 'Unknown'}-${selectedMethod?.address?.slice(0, 8) || 'NoAddr'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Downloaded!',
      description: 'QR code saved to your device',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleMethodSelect = (method: DepositMethod) => {
    setSelectedMethod(method);
    setError('');
    setIsSuccess(false);
  };

  const handleRetryAuth = async () => {
    setIsCheckingAuth(true);
    setError('');

    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (user && !error) {
        setUser(user);
        setError('');
        setDebugInfo('');
        toast({
          title: 'Authentication Successful',
          description: 'You can now proceed with your deposit.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        setError('Authentication required - please log in');
        toast({
          title: 'Authentication Required',
          description: 'Please log in to proceed with your deposit.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error: any) {
      console.error('Retry authentication failed:', error);
      setError('Authentication failed - please refresh the page');
      toast({
        title: 'Authentication Failed',
        description: 'Please refresh the page and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Load real-time fees for all networks with comprehensive error handling
  const loadRealTimeFees = async () => {
    if (isLoadingFees) return; // Prevent multiple simultaneous calls

    setIsLoadingFees(true);
    try {
      console.log('🔄 Loading real-time fees for deposits...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/blockchain/fees?action=all', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data?.success && Array.isArray(data.fees)) {
        setRealTimeFees(data.fees);
        console.log('📊 Real-time fees loaded for deposits:', data.fees);

        // Update deposit methods with real-time data using state setter
        setDepositMethods(currentMethods => {
          try {
            if (!currentMethods || currentMethods.length === 0) {
              console.log('⚠️ No deposit methods to update yet');
              return currentMethods || [];
            }

            const updatedMethods = [...currentMethods]; // Create a new array

          data.fees.forEach((feeData: NetworkFeeData) => {
            if (!feeData || !feeData.network) return;

            console.log('🔧 Processing deposit fee data for network:', feeData.network, feeData);

            // Map network names for matching
            const networkMapping: Record<string, string[]> = {
              'tron': ['trc20', 'tron'],
              'ethereum': ['erc20', 'ethereum', 'eth'],
              'bsc': ['bep20', 'bsc', 'bnb']
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

            if (methodIndex !== -1) {
              console.log('✅ Found matching deposit method for', feeData.network, 'at index', methodIndex);
              // Create new object to trigger React re-render
              updatedMethods[methodIndex] = {
                ...updatedMethods[methodIndex],
                processingTime: feeData?.processingTime || updatedMethods[methodIndex]?.processingTime || '1-3 minutes',
                fee: '0%' // Keep deposit fee simple - always 0%
              };
              console.log('🔄 Updated deposit method:', updatedMethods[methodIndex]);
            } else {
              console.log('⚠️ No matching deposit method found for network:', feeData.network);
            }
          });

            console.log('✅ All deposit methods updated with real-time data');
            return updatedMethods;
          } catch (error) {
            console.error('Error updating deposit methods:', error);
            return currentMethods || [];
          }
        });
      } else {
        console.warn('⚠️ Invalid response format from blockchain fees API:', data);
        throw new Error('Invalid response format from fees API');
      }
    } catch (error) {
      console.error('❌ Error loading real-time fees:', error);

      // More specific error handling
      let errorMessage = 'Using fallback fees. Real-time fees unavailable.';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout. Using fallback fees.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Using fallback fees.';
        }
      }

      toast({
        title: 'Fee Loading Error',
        description: errorMessage,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingFees(false);
    }
  };

  // Generate QR code for manual payment methods
  const generateManualQRCode = async (accountNumber: string, amount: string, methodName: string) => {
    try {
      const qrData = `${methodName}:${accountNumber}:₱${(parseFloat(amount) * 55.5).toLocaleString()}`;
      const QRCode = (await import('qrcode')).default;
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setManualQrCodeDataUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating manual QR code:', error);
    }
  };

  const handleDepositSubmit = async () => {
    if (!selectedMethod) {
      setError('Please select a deposit method first.');
      return;
    }

    setError('');
    setIsSuccess(false);
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check authentication - user should already be authenticated at this point
      if (!user?.email) {
        throw new Error('User not authenticated - please refresh the page');
      }

      // Check if selectedMethod exists
      if (!selectedMethod) {
        throw new Error('No deposit method selected');
      }

      // Check if this is a manual method (GCash/PayMaya/USDT variants)
      const isManualMethod = selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                             selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' ||
                             selectedMethod.id === 'usdt-polygon';

      if (isManualMethod) {
        // For manual methods, show payment instructions and generate QR code
        setShowPaymentInstructions(true);

        if (selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') {
          const networkName = selectedMethod.network;
          setSuccessMessage(`Please send $${amount} USDT (${networkName}) to the address: ${selectedMethod.address}. After payment, upload your transaction screenshot for verification.`);
          // Generate QR code for USDT address
          await generateDepositQR();
        } else {
          setSuccessMessage(`Please send ₱${(amount * 55.5).toLocaleString()} to ${selectedMethod.name} account: ${selectedMethod.address}. After payment, upload your receipt for verification.`);
          // Generate QR code for the payment details
          await generateManualQRCode(selectedMethod.address, depositAmount, selectedMethod.name);
        }

        toast({
          title: 'Payment Instructions Generated',
          description: (selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
            ? `Send USDT to the address and upload transaction screenshot for verification.`
            : `Send payment to ${selectedMethod.name} account and upload receipt for verification.`,
          status: 'info',
          duration: 8000,
          isClosable: true,
        });

        return;
      }

      // For non-manual methods (if any exist in the future)
      throw new Error('This deposit method is not supported yet.');

    } catch (e: any) {
      console.error("Error during deposit:", e);

      let errorMessage = "An error occurred during the deposit request.";
      let toastTitle = 'Deposit Request Failed';

      // Handle specific error types
      if (e.message === 'User not authenticated') {
        errorMessage = "Your session has expired. Please log in again.";
        toastTitle = 'Authentication Error';
        // Refresh authentication state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (e.message.includes('Validation failed')) {
        errorMessage = e.message;
        toastTitle = 'Validation Error';
      } else if (e.message.includes('Failed to create deposit request')) {
        errorMessage = "Unable to process your deposit request. Please try again.";
        toastTitle = 'Processing Error';
      } else {
        errorMessage = e.message || errorMessage;
      }

      setError(errorMessage);
      setIsSuccess(false);

      toast({
        title: toastTitle,
        description: errorMessage,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Spinner size="xl" color={accentColor} />
          <Text color={textColor}>Verifying authentication...</Text>
        </VStack>
      </Box>
    );
  }

  // Show error if user is not authenticated
  if (!user && !isCheckingAuth) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Alert status="error" maxW="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                {error || 'Please log in to access the deposit page.'}
              </AlertDescription>
            </Box>
          </Alert>
          <VStack spacing={3}>
            <HStack spacing={3}>
              <Button
                colorScheme="blue"
                onClick={() => router.push('/join')}
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={handleRetryAuth}
                isLoading={isCheckingAuth}
                loadingText="Retrying..."
              >
                Retry Authentication
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </Box>
    );
  }

  // Don't render until component is mounted to prevent hydration issues
  if (!isMounted) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <VStack spacing={6} align="center" justify="center" minH="400px">
          <Text color={textColor}>Loading deposit methods...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        <VStack spacing={4} textAlign="center">
          <Heading as="h1" size="xl" color={textColor}>
            Deposit Funds
          </Heading>
          <Text fontSize="lg" color={subtleTextColor} maxW="600px">
            Add funds to your wallet using cryptocurrency or digital wallets
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
                <Text fontSize="sm" fontWeight="bold" color="green.600">Instant Crypto</Text>
                <Text fontSize="xs" color={subtleTextColor}>1-3 minutes</Text>
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
          <Card bg={cardBgColor} borderRadius="xl" border="1px" borderColor="purple.200">
            <CardBody p={4} textAlign="center">
              <VStack spacing={2}>
                <Box w={8} h={8} bg="purple.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                  <Box w={4} h={4} bg="purple.500" borderRadius="full" />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="purple.600">Secure</Text>
                <Text fontSize="xs" color={subtleTextColor}>Protected</Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Debug info for development - only show errors */}
        {process.env.NODE_ENV === 'development' && debugInfo && debugInfo.includes('CRITICAL') && (
          <Alert status="error" size="sm">
            <AlertIcon />
            <Text fontSize="xs">{debugInfo}</Text>
          </Alert>
        )}

        {/* Deposit Method Selection */}
        {!selectedMethod && (
          <VStack spacing={8} align="stretch">
            {/* Header Section */}
            <VStack spacing={4} textAlign="center">
              <Text fontSize="lg" color={subtleTextColor} maxW="600px">
                Choose your preferred deposit method to add funds to your wallet:
              </Text>
            </VStack>




            {/* Manual Payment Methods */}
            <VStack spacing={6} align="stretch">
              <VStack spacing={2}>
                <Heading as="h2" size="md" color={textColor} textAlign="center">
                  Manual Deposit Methods
                </Heading>
                <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                  Upload receipt for verification after payment
                </Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} maxW="1000px" mx="auto">
                {depositMethods.map((method) => (
                  <Card
                    key={method.id}
                    cursor="pointer"
                    onClick={() => handleMethodSelect(method)}
                    bg={cardBgColor}
                    border="2px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    _hover={{
                      borderColor: "blue.400",
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    }}
                    transition="all 0.3s ease-in-out"
                    position="relative"
                    overflow="hidden"
                  >
                    <CardBody p={6} textAlign="center">
                      <VStack spacing={6}>
                        {/* Icon with background circle */}
                        <Box
                          bg="blue.50"
                          borderRadius="full"
                          p={4}
                          position="relative"
                        >
                          <Image
                            src={method?.icon || '/img/default-wallet.png'}
                            alt={`${method?.network || 'Wallet'} logo`}
                            boxSize="64px"
                            objectFit="contain"
                          />
                        </Box>

                        {/* Title and Network */}
                        <VStack spacing={2}>
                          <Text fontSize="xl" color={textColor} fontWeight="bold">
                            {method?.name || 'Unknown'}
                          </Text>
                          <Text
                            fontSize="xl"
                            fontWeight="bold"
                            color="blue.500"
                            bg="blue.50"
                            px={4}
                            py={2}
                            borderRadius="full"
                          >
                            {method?.network || 'Unknown'}
                          </Text>
                        </VStack>

                        {/* Details */}
                        <VStack spacing={3} w="full">
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                              Processing:
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="bold">
                              {method?.processingTime || '5-30 minutes'}
                            </Text>
                          </HStack>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                              Fee:
                            </Text>
                            <Text fontSize="sm" color="blue.500" fontWeight="bold">
                              {method?.fee || 'Free'}
                            </Text>
                          </HStack>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                              Limits:
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="bold">
                              {method?.limits || '500 - 50,000 PHP'}
                            </Text>
                          </HStack>
                        </VStack>

                        {/* Select Button */}
                        <Button
                          colorScheme="blue"
                          size="lg"
                          w="full"
                          borderRadius="xl"
                          fontWeight="bold"
                          _hover={{
                            transform: 'translateY(-2px)',
                          }}
                          transition="all 0.2s"
                        >
                          Select {method?.network || 'Method'}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
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
                bg={useColorModeValue('blue.50', 'blue.900')}
                p={6}
                borderRadius="xl"
                maxW="800px"
                mx="auto"
                border="1px solid"
                borderColor={useColorModeValue('blue.200', 'blue.700')}
              >
                <VStack spacing={4} textAlign="center">
                  <HStack spacing={2} justify="center">
                    <Box w={6} h={6} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                      <Box w={3} h={3} bg="blue.500" borderRadius="full" />
                    </Box>
                    <Text fontSize="md" color={useColorModeValue('blue.700', 'blue.200')} fontWeight="semibold">
                      All deposits are processed automatically and credited to your wallet balance
                    </Text>
                  </HStack>
                  <HStack spacing={6} justify="center" flexWrap="wrap">
                    <Text fontSize="sm" color={useColorModeValue('blue.600', 'blue.300')}>
                      ✓ Deposits do not require user verification
                    </Text>
                    <Text fontSize="sm" color={useColorModeValue('blue.600', 'blue.300')}>
                      ✓ Secure blockchain transactions
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
                    src={selectedMethod?.icon || '/img/default-crypto.png'}
                    alt={`${selectedMethod?.network || 'Crypto'} logo`}
                    boxSize="40px"
                    objectFit="contain"
                  />
                  <VStack align="start" spacing={0}>
                    <Heading as="h2" size="md" color={textColor}>
                      {selectedMethod?.name || 'Unknown'} ({selectedMethod?.network || 'Unknown'})
                    </Heading>
                    <Text fontSize="sm" color={subtleTextColor}>
                      Processing time: {selectedMethod?.processingTime || '1-3 minutes'}
                    </Text>
                    <Text fontSize="sm" color={subtleTextColor}>
                      Fee: {selectedMethod?.fee || '0%'}
                    </Text>
                    <Text fontSize="sm" color={subtleTextColor}>
                      Limits: {selectedMethod?.limits || '10 - 200,000 USD'}
                    </Text>
                  </VStack>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedMethod(null);
                    setShowPaymentInstructions(false);
                    setManualQrCodeDataUrl('');
                  }}
                >
                  Change Method
                </Button>
              </HStack>

              {showPaymentInstructions && (selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') && (
                <VStack spacing={4} align="stretch">
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box flex="1">
                      <AlertTitle>Payment Instructions</AlertTitle>
                      <AlertDescription display="block">
                        {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
                          ? `Send $${depositAmount} USDT (${selectedMethod.network}) to the address below.`
                          : `Send ₱${(parseFloat(depositAmount) * 55.5).toLocaleString()} to the ${selectedMethod.name} account below.`
                        }
                      </AlertDescription>
                    </Box>
                  </Alert>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                    {/* Payment Details */}
                    <Card>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <Heading size="md" color="blue.600">
                            Payment Details
                          </Heading>

                          <VStack spacing={3} align="stretch">
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb={1}>
                                {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
                                  ? `USDT Address (${selectedMethod.network})`
                                  : 'Account Number'
                                }
                              </Text>
                              <HStack spacing={2}>
                                <Box
                                  p={3}
                                  bg="gray.50"
                                  borderRadius="md"
                                  border="1px"
                                  borderColor="gray.200"
                                  flex="1"
                                >
                                  <Text
                                    fontFamily="mono"
                                    fontSize="sm"
                                    fontWeight="bold"
                                    wordBreak="break-all"
                                  >
                                    {selectedMethod.address}
                                  </Text>
                                </Box>
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedMethod.address);
                                    toast({
                                      title: 'Copied!',
                                      description: 'Address copied to clipboard',
                                      status: 'success',
                                      duration: 2000,
                                      isClosable: true,
                                    });
                                  }}
                                >
                                  Copy Address
                                </Button>
                              </HStack>
                            </Box>

                            {!(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') && (
                              <Box>
                                <Text fontSize="sm" color="gray.600" mb={1}>Account Name</Text>
                                <Text fontWeight="bold" fontSize="lg">Patricia Marie Joble</Text>
                              </Box>
                            )}

                            <Box>
                              <Text fontSize="sm" color="gray.600" mb={1}>Amount to Send</Text>
                              <Box
                                p={3}
                                bg="green.50"
                                borderRadius="md"
                                border="1px"
                                borderColor="green.200"
                              >
                                <Text fontWeight="bold" fontSize="xl" color="green.600" textAlign="center">
                                  {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
                                    ? `$${depositAmount} USDT`
                                    : `₱${(parseFloat(depositAmount) * 55.5).toLocaleString()}`
                                  }
                                </Text>
                              </Box>
                            </Box>
                          </VStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* QR Code */}
                    <Card>
                      <CardBody>
                        <VStack spacing={4} align="center">
                          <Heading size="md" color="gray.700">
                            Scan QR Code
                          </Heading>

                          {(manualQrCodeDataUrl || ((selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') && qrCodeDataUrl)) ? (
                            <Box
                              bg="white"
                              p={4}
                              borderRadius="lg"
                              border="2px"
                              borderColor="gray.200"
                              shadow="sm"
                            >
                              <Image
                                src={(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') ? qrCodeDataUrl : manualQrCodeDataUrl}
                                alt={`${selectedMethod.name} QR Code`}
                                boxSize="200px"
                                objectFit="contain"
                              />
                            </Box>
                          ) : (
                            <Box
                              bg="gray.50"
                              p={4}
                              borderRadius="lg"
                              border="2px"
                              borderColor="gray.200"
                              boxSize="200px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <VStack spacing={2}>
                                <Spinner size="lg" color="blue.500" />
                                <Text fontSize="sm" color="gray.500" textAlign="center">
                                  Generating QR Code...
                                </Text>
                              </VStack>
                            </Box>
                          )}

                          <Text fontSize="sm" color="gray.600" textAlign="center" maxW="200px">
                            Scan with your {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
                              ? `USDT (${selectedMethod.network})`
                              : selectedMethod.name
                            } app
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  <Card bg="blue.50" borderColor="blue.200" borderWidth="1px">
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <HStack>
                          <Icon as={FaQrcode} color="blue.500" />
                          <Heading size="md" color="blue.700">
                            Instructions:
                          </Heading>
                        </HStack>

                        <VStack spacing={3} align="stretch">
                          {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') ? (
                            <>
                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  1
                                </Box>
                                <Text>
                                  Send exactly <Text as="span" fontWeight="bold" color="green.600">${depositAmount} USDT ({selectedMethod.network})</Text> to the address below
                                </Text>
                              </HStack>

                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  2
                                </Box>
                                <Text>Take a screenshot of your transaction confirmation</Text>
                              </HStack>

                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  3
                                </Box>
                                <Text>Upload the screenshot below for verification</Text>
                              </HStack>

                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  4
                                </Box>
                                <Text>Wait for admin approval (usually within 5-30 minutes)</Text>
                              </HStack>
                            </>
                          ) : (
                            <>
                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  1
                                </Box>
                                <Text>
                                  Send exactly <Text as="span" fontWeight="bold" color="green.600">₱{(parseFloat(depositAmount) * 55.5).toLocaleString()}</Text> using the account details or scan the QR code
                                </Text>
                              </HStack>

                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  2
                                </Box>
                                <Text>Take a screenshot of your payment receipt</Text>
                              </HStack>

                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  3
                                </Box>
                                <Text>Upload the receipt below for verification</Text>
                              </HStack>

                              <HStack align="flex-start">
                                <Box
                                  bg="blue.500"
                                  color="white"
                                  borderRadius="full"
                                  w="24px"
                                  h="24px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  flexShrink={0}
                                >
                                  4
                                </Box>
                                <Text>Wait for admin approval (usually within 5-30 minutes)</Text>
                              </HStack>
                            </>
                          )}
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Button
                    colorScheme="green"
                    isLoading={isSubmitting}
                    loadingText="Processing..."
                    onClick={async () => {
                      console.log('Confirm Deposit button clicked');
                      console.log('User:', user);
                      console.log('Selected Method:', selectedMethod);
                      console.log('Deposit Amount:', depositAmount);

                      if (!user?.email) {
                        toast({
                          title: 'Authentication Error',
                          description: 'Please refresh the page and try again.',
                          status: 'error',
                          duration: 5000,
                          isClosable: true,
                        });
                        return;
                      }

                      if (!selectedMethod?.name) {
                        toast({
                          title: 'Method Error',
                          description: 'Please select a payment method.',
                          status: 'error',
                          duration: 5000,
                          isClosable: true,
                        });
                        return;
                      }

                      if (!depositAmount || parseFloat(depositAmount) <= 0) {
                        toast({
                          title: 'Amount Error',
                          description: 'Please enter a valid deposit amount.',
                          status: 'error',
                          duration: 5000,
                          isClosable: true,
                        });
                        return;
                      }

                      setIsSubmitting(true);

                      try {
                        console.log('Creating deposit record...');

                        // Create deposit record in database
                        const response = await fetch('/api/deposits/create-new', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            amount: parseFloat(depositAmount),
                            method: selectedMethod.name,
                            status: 'pending'
                          }),
                        });

                        console.log('API Response status:', response.status);
                        const data = await response.json();
                        console.log('API Response data:', data);

                        if (data.success) {
                          console.log('Redirecting to upload page...');
                          // Redirect to upload page for manual methods
                          const uploadUrl = new URL('/wallet/deposit/upload', window.location.origin);
                          uploadUrl.searchParams.set('amount', depositAmount);
                          uploadUrl.searchParams.set('method', selectedMethod.name);
                          uploadUrl.searchParams.set('address', selectedMethod.address);
                          uploadUrl.searchParams.set('methodId', selectedMethod.id);

                          router.push(uploadUrl.pathname + uploadUrl.search);
                        } else {
                          throw new Error(data.error || 'Failed to create deposit');
                        }
                      } catch (error) {
                        console.error('Error creating deposit:', error);
                        toast({
                          title: 'Error',
                          description: 'Failed to submit deposit request. Please try again.',
                          status: 'error',
                          duration: 5000,
                          isClosable: true,
                        });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    mt={4}
                    w="full"
                  >
                    Confirm Deposit
                  </Button>
                </VStack>
              )}

              {isSuccess && !(selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') && (
                <Alert status="success" borderRadius="md" mb={4}>
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle>Deposit Address Generated!</AlertTitle>
                    <AlertDescription display="block">
                      {successMessage} Redirecting to your wallet...
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {/* Step 1: Amount Input (for manual methods) or Direct Form (for crypto methods) */}
              {(!showPaymentInstructions || !(selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')) && (
                <>
                  <FormControl isInvalid={!!error} mt={4}>
                    <FormLabel htmlFor="depositAmount" color={textColor}>
                      Amount to Deposit ({selectedMethod.name})
                      {(selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya') && (
                        <Text fontSize="xs" color="gray.500" fontWeight="normal">
                          Enter amount in USD (will be converted to PHP for payment)
                        </Text>
                      )}
                      {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') && (
                        <Text fontSize="xs" color="gray.500" fontWeight="normal">
                          Enter amount in USD (you will send USDT equivalent)
                        </Text>
                      )}
                    </FormLabel>
                    <InputGroup>
                      <InputLeftAddon>$</InputLeftAddon>
                      <Input
                        id="depositAmount"
                        type="number"
                        placeholder={
                          selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
                            ? "e.g., 10 (≈₱555)"
                            : (selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
                            ? "e.g., 100 (≈100 USDT)"
                            : "e.g., 100"
                        }
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                    </InputGroup>
                    {(selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya') && depositAmount && (
                      <FormHelperText color="blue.500">
                        You will pay: ₱{(parseFloat(depositAmount) * 55.5).toLocaleString()} to {selectedMethod.name}
                      </FormHelperText>
                    )}
                    {(selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') && depositAmount && (
                      <FormHelperText color="green.500">
                        You will send: ${depositAmount} USDT ({selectedMethod.network}) to the address
                      </FormHelperText>
                    )}
                    {error && <FormHelperText color="red.500">{error}</FormHelperText>}
                  </FormControl>

                  <Text fontSize="sm" color={subtleTextColor} mt={2}>
                    {selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya'
                      ? 'After payment confirmation, funds will be credited to your wallet balance in USD.'
                      : (selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon')
                      ? 'After transaction confirmation, funds will be credited to your wallet balance in USD.'
                      : 'Funds will be credited to your wallet balance.'
                    }
                  </Text>

                  <Button
                    colorScheme={isSuccess ? "green" : (selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                      selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') ? "blue" : "blue"}
                    onClick={handleDepositSubmit}
                    isLoading={isSubmitting}
                    loadingText="Processing..."
                    isDisabled={isSuccess}
                    mt={6}
                    w="full"
                  >
                    {isSuccess ? "Deposit Successful - Redirecting..." :
                     (selectedMethod.id === 'gcash' || selectedMethod.id === 'paymaya' ||
                      selectedMethod.id === 'usdt-trc20' || selectedMethod.id === 'usdt-bep20' || selectedMethod.id === 'usdt-polygon') ?
                     "Continue" :
                     `Confirm Deposit (${selectedMethod?.network || 'Method'})`}
                  </Button>
                </>
              )}
            </VStack>
          </Box>
        )}
      </VStack>

      {/* QR Code Modal */}
      <Modal isOpen={isQROpen} onClose={onQRClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack spacing={2} align="center">
              <Icon as={FaQrcode} boxSize={6} color="green.500" />
              <Text>Deposit Address QR Code</Text>
              {selectedMethod && (
                <Text fontSize="sm" color="gray.600">
                  {selectedMethod?.name || 'Unknown'} ({selectedMethod?.network || 'Unknown'})
                </Text>
              )}
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="center">
              {qrCodeDataUrl ? (
                <>
                  <Center>
                    <Image
                      src={qrCodeDataUrl}
                      alt="Deposit Address QR Code"
                      maxW="300px"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={4}
                      bg="white"
                    />
                  </Center>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Scan this QR code to get the deposit address
                  </Text>
                  {selectedMethod && (
                    <Code fontSize="xs" p={2} borderRadius="md" wordBreak="break-all" textAlign="center">
                      {selectedMethod.address}
                    </Code>
                  )}
                </>
              ) : (
                <VStack spacing={4}>
                  <Spinner size="lg" color="green.500" />
                  <Text>Generating QR code...</Text>
                </VStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3} w="full" justify="center">
              <Button
                variant="outline"
                leftIcon={<Icon as={FaCopy} />}
                onClick={handleCopyAddress}
                isDisabled={!selectedMethod}
              >
                Copy Address
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<Icon as={FaQrcode} />}
                onClick={downloadDepositQR}
                isDisabled={!qrCodeDataUrl}
              >
                Download QR
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}