'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Icon,
  useToast,
  Divider,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import { FaCoins, FaArrowLeft, FaCalculator, FaExchangeAlt } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';

interface TradeCalculation {
  gicAmount: number;
  usdAmount: number;
  pricePerToken: number;
  isValid: boolean;
  errorMessage?: string;
}

function GICTradePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [gicAmount, setGicAmount] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [calculation, setCalculation] = useState<TradeCalculation | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [gicBalance, setGicBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);
  const toast = useToast();
  const supabase = createClient();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const BUY_PRICE = 1.15;
  const SELL_PRICE = 1.10;

  useEffect(() => {
    const type = searchParams?.get('type');
    if (type === 'buy' || type === 'sell') {
      setTradeType(type);
    }
    loadBalances();
  }, [searchParams]);

  useEffect(() => {
    calculateTrade();
  }, [gicAmount, usdAmount, tradeType]);

  const loadBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Load wallet balance
      const walletResponse = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      const walletData = await walletResponse.json();
      if (walletData.success) {
        setWalletBalance(walletData.balance.total_balance || 0);
      }

      // Load GIC summary
      const summaryResponse = await fetch('/api/trader/gic-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setGicBalance(summaryData.summary.gic_balance || 0);
      }

    } catch (error) {
      console.error('Error loading balances:', error);
      toast({
        title: 'Error',
        description: 'Failed to load balances',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrade = () => {
    const gicNum = parseFloat(gicAmount) || 0;
    const usdNum = parseFloat(usdAmount) || 0;
    const price = tradeType === 'buy' ? BUY_PRICE : SELL_PRICE;

    let calculatedGic = gicNum;
    let calculatedUsd = usdNum;
    let isValid = true;
    let errorMessage = '';

    // If GIC amount is provided, calculate USD amount
    if (gicAmount && !usdAmount) {
      calculatedUsd = gicNum * price;
    }
    // If USD amount is provided, calculate GIC amount
    else if (usdAmount && !gicAmount) {
      calculatedGic = usdNum / price;
    }
    // If both are provided, use GIC amount as primary
    else if (gicAmount && usdAmount) {
      calculatedUsd = gicNum * price;
    }

    // Validation
    if (calculatedGic <= 0 || calculatedUsd <= 0) {
      isValid = false;
      errorMessage = 'Please enter a valid amount';
    } else if (tradeType === 'buy' && calculatedUsd > walletBalance) {
      isValid = false;
      errorMessage = `Insufficient peso balance. You have ₱${walletBalance.toFixed(2)}`;
    } else if (tradeType === 'sell' && calculatedGic > gicBalance) {
      isValid = false;
      errorMessage = `Insufficient GIC balance. You have ${gicBalance.toFixed(8)} GIC`;
    }

    setCalculation({
      gicAmount: calculatedGic,
      usdAmount: calculatedUsd,
      pricePerToken: price,
      isValid,
      errorMessage
    });
  };

  const handleGicAmountChange = (value: string) => {
    setGicAmount(value);
    setUsdAmount(''); // Clear USD amount to trigger recalculation
  };

  const handleUsdAmountChange = (value: string) => {
    setUsdAmount(value);
    setGicAmount(''); // Clear GIC amount to trigger recalculation
  };

  const executeTrade = async () => {
    if (!calculation || !calculation.isValid) {
      return;
    }

    setIsTrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/trader/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          tradeType,
          gicAmount: calculation.gicAmount,
          usdAmount: calculation.usdAmount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Trade Successful!',
          description: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${calculation.gicAmount.toFixed(8)} GIC tokens for $${calculation.usdAmount.toFixed(2)}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Reset form and reload balances
        setGicAmount('');
        setUsdAmount('');
        await loadBalances();
      } else {
        throw new Error(data.message);
      }

    } catch (error) {
      console.error('Error executing trade:', error);
      toast({
        title: 'Trade Failed',
        description: error instanceof Error ? error.message : 'Failed to execute trade',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsTrading(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="4xl" py={8}>
        <VStack spacing={8}>
          <Heading>Loading trading interface...</Heading>
        </VStack>
      </Container>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="4xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack>
            <Button
              leftIcon={<FaArrowLeft />}
              variant="ghost"
              onClick={() => router.push('/trader-dashboard')}
            >
              Back to Trader Dashboard
            </Button>
          </HStack>

          <VStack spacing={4} textAlign="center">
            <HStack>
              <Icon as={FaCoins} boxSize={8} color="gold" />
              <Heading size="xl" color={textColor}>
                {tradeType === 'buy' ? 'Buy' : 'Sell'} GIC Tokens
              </Heading>
            </HStack>
            <Text fontSize="lg" color={subtleTextColor}>
              {tradeType === 'buy'
                ? `Purchase GIC tokens at $${BUY_PRICE} per token`
                : `Sell GIC tokens at $${SELL_PRICE} per token`
              }
            </Text>
          </VStack>

          {/* Trade Type Selector */}
          <Card bg={cardBg}>
            <CardBody>
              <HStack spacing={4} justify="center">
                <Button
                  colorScheme={tradeType === 'buy' ? 'red' : 'gray'}
                  variant={tradeType === 'buy' ? 'solid' : 'outline'}
                  onClick={() => setTradeType('buy')}
                  leftIcon={<FaCoins />}
                >
                  Buy GIC (${BUY_PRICE})
                </Button>
                <Button
                  colorScheme={tradeType === 'sell' ? 'green' : 'gray'}
                  variant={tradeType === 'sell' ? 'solid' : 'outline'}
                  onClick={() => setTradeType('sell')}
                  leftIcon={<FaExchangeAlt />}
                >
                  Sell GIC (${SELL_PRICE})
                </Button>
              </HStack>
            </CardBody>
          </Card>

          {/* Current Balances */}
          <Card bg={cardBg}>
            <CardHeader>
              <Heading size="md" color={textColor}>Current Balances</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Stat>
                  <StatLabel>USD Balance</StatLabel>
                  <StatNumber>${walletBalance.toFixed(2)}</StatNumber>
                  <StatHelpText>Available for buying</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>GIC Balance</StatLabel>
                  <StatNumber>{gicBalance.toFixed(8)}</StatNumber>
                  <StatHelpText>Available for selling</StatHelpText>
                </Stat>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Trading Form */}
          <Card bg={cardBg}>
            <CardHeader>
              <Heading size="md" color={textColor}>
                <HStack>
                  <Icon as={FaCalculator} />
                  <Text>{tradeType === 'buy' ? 'Buy' : 'Sell'} GIC Tokens</Text>
                </HStack>
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={6}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
                  <FormControl>
                    <FormLabel>GIC Amount</FormLabel>
                    <NumberInput
                      value={gicAmount}
                      onChange={handleGicAmountChange}
                      precision={8}
                      min={0}
                    >
                      <NumberInputField placeholder="0.00000000" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormHelperText>
                      {tradeType === 'sell' ? `Available: ${gicBalance.toFixed(8)} GIC` : 'Enter GIC token amount'}
                    </FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel>USD Amount</FormLabel>
                    <NumberInput
                      value={usdAmount}
                      onChange={handleUsdAmountChange}
                      precision={2}
                      min={0}
                    >
                      <NumberInputField placeholder="0.00" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormHelperText>
                      {tradeType === 'buy' ? `Available: ₱${walletBalance.toFixed(2)}` : 'Enter peso amount'}
                    </FormHelperText>
                  </FormControl>
                </SimpleGrid>

                {/* Trade Calculation */}
                {calculation && (
                  <Card variant="outline" w="full">
                    <CardHeader>
                      <Heading size="sm" color={textColor}>Trade Summary</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                          <Stat textAlign="center">
                            <StatLabel>GIC Amount</StatLabel>
                            <StatNumber>{calculation.gicAmount.toFixed(8)}</StatNumber>
                            <StatHelpText>tokens</StatHelpText>
                          </Stat>
                          
                          <Stat textAlign="center">
                            <StatLabel>USD Amount</StatLabel>
                            <StatNumber>${calculation.usdAmount.toFixed(2)}</StatNumber>
                            <StatHelpText>total</StatHelpText>
                          </Stat>
                          
                          <Stat textAlign="center">
                            <StatLabel>Price per Token</StatLabel>
                            <StatNumber>₱{calculation.pricePerToken}</StatNumber>
                            <StatHelpText>rate</StatHelpText>
                          </Stat>
                        </SimpleGrid>

                        {!calculation.isValid && calculation.errorMessage && (
                          <Alert status="error" borderRadius="md">
                            <AlertIcon />
                            <AlertDescription>{calculation.errorMessage}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          colorScheme={tradeType === 'buy' ? 'red' : 'green'}
                          size="lg"
                          w="full"
                          isLoading={isTrading}
                          isDisabled={!calculation.isValid}
                          onClick={executeTrade}
                        >
                          {tradeType === 'buy' ? 'Buy' : 'Sell'} {calculation.gicAmount.toFixed(8)} GIC for ${calculation.usdAmount.toFixed(2)}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Quick Amount Buttons */}
                <Card variant="outline" w="full">
                  <CardHeader>
                    <Heading size="sm" color={textColor}>Quick Amounts</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                      {tradeType === 'buy' ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleUsdAmountChange('11.50')}
                            size="sm"
                          >
                            $11.50
                            <br />
                            <Text fontSize="xs">(10 GIC)</Text>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleUsdAmountChange('23.00')}
                            size="sm"
                          >
                            $23.00
                            <br />
                            <Text fontSize="xs">(20 GIC)</Text>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleUsdAmountChange('57.50')}
                            size="sm"
                          >
                            $57.50
                            <br />
                            <Text fontSize="xs">(50 GIC)</Text>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleUsdAmountChange('115.00')}
                            size="sm"
                          >
                            $115.00
                            <br />
                            <Text fontSize="xs">(100 GIC)</Text>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleGicAmountChange('10')}
                            size="sm"
                            isDisabled={gicBalance < 10}
                          >
                            10 GIC
                            <br />
                            <Text fontSize="xs">($11.00)</Text>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleGicAmountChange('25')}
                            size="sm"
                            isDisabled={gicBalance < 25}
                          >
                            25 GIC
                            <br />
                            <Text fontSize="xs">($27.50)</Text>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleGicAmountChange('50')}
                            size="sm"
                            isDisabled={gicBalance < 50}
                          >
                            50 GIC
                            <br />
                            <Text fontSize="xs">($55.00)</Text>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleGicAmountChange(gicBalance.toString())}
                            size="sm"
                            isDisabled={gicBalance <= 0}
                          >
                            All GIC
                            <br />
                            <Text fontSize="xs">(${(gicBalance * SELL_PRICE).toFixed(2)})</Text>
                          </Button>
                        </>
                      )}
                    </SimpleGrid>
                  </CardBody>
                </Card>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}

export default function GICTradePage() {
  return (
    <Suspense fallback={<Box p={8}><Text>Loading...</Text></Box>}>
      <GICTradePageContent />
    </Suspense>
  );
}
