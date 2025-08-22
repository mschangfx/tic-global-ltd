'use client';

import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Flex,
  SimpleGrid,
  Input,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaCoins, FaDollarSign, FaExchangeAlt, FaSync, FaCalculator } from 'react-icons/fa';

interface GICPricing {
  buy_rate_pesos: number;
  sell_rate_pesos: number;
  peso_to_usd_rate: number;
  buy_rate_usd: number;
  sell_rate_usd: number;
}

interface ConversionResult {
  input: string;
  output: string;
  rate_used: string;
  calculation: string;
}

export default function TestGICPricing() {
  const { data: session } = useSession();
  const [pricingData, setPricingData] = useState<any>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [testAmount, setTestAmount] = useState<number>(100);
  const [conversionType, setConversionType] = useState<string>('usd_to_gic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchPricingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/gic-pricing');
      const data = await response.json();

      if (data.success) {
        setPricingData(data.data);
      } else {
        setError(data.error || 'Failed to fetch GIC pricing data');
      }
    } catch (err) {
      console.error('Error fetching pricing data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testConversion = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/gic-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversion_type: conversionType,
          amount: testAmount
        })
      });

      const data = await response.json();

      if (data.success) {
        setConversionResult(data.data.result);
        toast({
          title: 'Conversion Test Successful',
          description: `${data.data.result.input} → ${data.data.result.output}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Conversion Test Failed',
          description: data.error || 'Failed to test conversion',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing conversion:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test GIC conversion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test GIC pricing system
        </Alert>
      </Box>
    );
  }

  const pricing = pricingData?.current_pricing;

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            GIC Token Pricing Test
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchPricingData}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        <Text color="gray.600">
          Testing GIC token peso pricing with USD conversion - User: {session.user.email}
        </Text>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Current Pricing */}
        {pricing && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Current GIC Token Pricing</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Buy Rate (Pesos)</StatLabel>
                    <StatNumber color="green.500">₱{pricing.buy_rate_pesos}</StatNumber>
                    <Text fontSize="xs" color="gray.500">per GIC token</Text>
                  </Stat>
                  <Stat>
                    <StatLabel>Sell Rate (Pesos)</StatLabel>
                    <StatNumber color="red.500">₱{pricing.sell_rate_pesos}</StatNumber>
                    <Text fontSize="xs" color="gray.500">per GIC token</Text>
                  </Stat>
                  <Stat>
                    <StatLabel>Buy Rate (USD)</StatLabel>
                    <StatNumber color="green.500">${pricing.buy_rate_usd}</StatNumber>
                    <Text fontSize="xs" color="gray.500">per GIC token</Text>
                  </Stat>
                  <Stat>
                    <StatLabel>Sell Rate (USD)</StatLabel>
                    <StatNumber color="red.500">${pricing.sell_rate_usd}</StatNumber>
                    <Text fontSize="xs" color="gray.500">per GIC token</Text>
                  </Stat>
                </StatGroup>

                <Alert status="info">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">GIC Token Pricing Structure:</Text>
                    <Text fontSize="sm">
                      • <strong>Buy Rate:</strong> 63 pesos = ${pricing.buy_rate_usd} USD (used for rank bonuses)<br/>
                      • <strong>Sell Rate:</strong> 60 pesos = ${pricing.sell_rate_usd} USD (used for withdrawals)<br/>
                      • <strong>Spread:</strong> {pricing.buy_rate_pesos - pricing.sell_rate_pesos} pesos = ${(pricing.buy_rate_usd - pricing.sell_rate_usd).toFixed(4)} USD<br/>
                      • <strong>Peso-USD Rate:</strong> 1 peso = ${pricing.peso_to_usd_rate} USD
                    </Text>
                  </VStack>
                </Alert>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Conversion Test */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Test GIC Conversions</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl>
                  <FormLabel>Amount</FormLabel>
                  <NumberInput value={testAmount} onChange={(_, value) => setTestAmount(value || 0)}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Conversion Type</FormLabel>
                  <Select value={conversionType} onChange={(e) => setConversionType(e.target.value)}>
                    <option value="usd_to_gic">USD → GIC (Rank Bonus)</option>
                    <option value="gic_to_usd">GIC → USD (Withdrawal)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>&nbsp;</FormLabel>
                  <Button
                    leftIcon={<FaCalculator />}
                    colorScheme="blue"
                    onClick={testConversion}
                    isLoading={isLoading}
                    width="full"
                  >
                    Test Conversion
                  </Button>
                </FormControl>
              </SimpleGrid>

              {conversionResult && (
                <Card borderWidth={1} borderColor="blue.200">
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Heading size="sm">Conversion Result</Heading>
                      <HStack justify="space-between">
                        <Text>Input:</Text>
                        <Badge colorScheme="blue">{conversionResult.input}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Output:</Text>
                        <Badge colorScheme="green">{conversionResult.output}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Rate Used:</Text>
                        <Text fontSize="sm" color="gray.600">{conversionResult.rate_used}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" textAlign="center">
                        {conversionResult.calculation}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Conversion Examples */}
        {pricingData?.conversions && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Conversion Examples</Heading>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {/* GIC to USD Examples */}
                  <Card borderWidth={1} borderColor="red.200">
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <HStack>
                          <Icon as={FaCoins} color="red.500" />
                          <Heading size="sm">GIC → USD (Selling/Withdrawal)</Heading>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">Using sell rate: 60 pesos per GIC</Text>
                        
                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text>100 GIC:</Text>
                            <Text fontWeight="bold" color="red.500">
                              ${pricingData.conversions.gic_to_usd['100_gic']} USD
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>500 GIC:</Text>
                            <Text fontWeight="bold" color="red.500">
                              ${pricingData.conversions.gic_to_usd['500_gic']} USD
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>1,000 GIC:</Text>
                            <Text fontWeight="bold" color="red.500">
                              ${pricingData.conversions.gic_to_usd['1000_gic']} USD
                            </Text>
                          </HStack>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* USD to GIC Examples */}
                  <Card borderWidth={1} borderColor="green.200">
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <HStack>
                          <Icon as={FaDollarSign} color="green.500" />
                          <Heading size="sm">USD → GIC (Rank Bonuses)</Heading>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">Using buy rate: 63 pesos per GIC</Text>
                        
                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text>$100 USD:</Text>
                            <Text fontWeight="bold" color="green.500">
                              {pricingData.conversions.usd_to_gic['100_usd']} GIC
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>$500 USD:</Text>
                            <Text fontWeight="bold" color="green.500">
                              {pricingData.conversions.usd_to_gic['500_usd']} GIC
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>$1,000 USD:</Text>
                            <Text fontWeight="bold" color="green.500">
                              {pricingData.conversions.usd_to_gic['1000_usd']} GIC
                            </Text>
                          </HStack>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Rank Bonus Examples */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Rank Bonus GIC Conversion Examples</Heading>
              
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Rank</Th>
                      <Th textAlign="center">Total Bonus</Th>
                      <Th textAlign="center">GIC Portion (USD)</Th>
                      <Th textAlign="center">GIC Tokens Received</Th>
                      <Th textAlign="center">TIC Tokens Received</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[
                      { rank: 'Bronze', bonus: 690, gicUsd: 345 },
                      { rank: 'Silver', bonus: 2484, gicUsd: 1242 },
                      { rank: 'Gold', bonus: 4830, gicUsd: 2415 },
                      { rank: 'Platinum', bonus: 8832, gicUsd: 4416 },
                      { rank: 'Diamond', bonus: 14904, gicUsd: 7452 }
                    ].map((rank) => {
                      const gicTokens = pricing ? (rank.gicUsd / pricing.buy_rate_usd).toFixed(4) : '0';
                      const ticTokens = rank.gicUsd.toFixed(0); // 1:1 USD rate for TIC
                      
                      return (
                        <Tr key={rank.rank}>
                          <Td>
                            <Badge colorScheme="purple">{rank.rank}</Badge>
                          </Td>
                          <Td textAlign="center">
                            <Text fontWeight="bold" color="green.500">
                              ${rank.bonus.toLocaleString()}
                            </Text>
                          </Td>
                          <Td textAlign="center">
                            <Text fontWeight="bold">
                              ${rank.gicUsd.toLocaleString()}
                            </Text>
                          </Td>
                          <Td textAlign="center">
                            <Text fontWeight="bold" color="purple.500">
                              {gicTokens} GIC
                            </Text>
                          </Td>
                          <Td textAlign="center">
                            <Text fontWeight="bold" color="blue.500">
                              {ticTokens} TIC
                            </Text>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>

              <Alert status="success">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">GIC Token Integration:</Text>
                  <Text fontSize="sm">
                    • Rank bonuses automatically convert USD to GIC tokens using buy rate (63 pesos)<br/>
                    • Users receive more GIC tokens due to favorable conversion rate<br/>
                    • When selling/withdrawing, sell rate (60 pesos) applies<br/>
                    • 3-peso spread provides system sustainability
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
