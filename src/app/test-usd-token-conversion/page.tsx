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
import { FaDollarSign, FaCoins, FaExchangeAlt, FaSync, FaCrown } from 'react-icons/fa';

interface TokenRate {
  token_symbol: string;
  usd_rate: number;
  created_at: string;
  updated_at: string;
}

interface ConversionResult {
  input: {
    usd_amount: number;
    token_symbol: string;
  };
  conversion: {
    token_amount: number;
    exchange_rate: number;
    calculation: string;
  };
  rank_bonus_examples: {
    [key: string]: {
      total_usd: number;
      split_usd: number;
      tokens: number;
    };
  };
}

export default function TestUSDTokenConversion() {
  const { data: session } = useSession();
  const [tokenRates, setTokenRates] = useState<TokenRate[]>([]);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [testAmount, setTestAmount] = useState<number>(345);
  const [selectedToken, setSelectedToken] = useState<string>('TIC');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchTokenRates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/token-rates');
      const data = await response.json();

      if (data.success) {
        setTokenRates(data.data.rates || []);
      } else {
        setError(data.error || 'Failed to fetch token rates');
      }
    } catch (err) {
      console.error('Error fetching token rates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testConversion = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/token-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usd_amount: testAmount,
          token_symbol: selectedToken
        })
      });

      const data = await response.json();

      if (data.success) {
        setConversionResult(data.data);
        toast({
          title: 'Conversion Test Successful',
          description: `$${testAmount} converts to ${data.data.conversion.token_amount.toFixed(4)} ${selectedToken}`,
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
        description: 'Failed to test USD-to-token conversion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRankBonusDistribution = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rank-bonus/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: new Date().toISOString().substring(0, 7) // Current month
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Rank Bonus Test Successful',
          description: `Distributed rank bonus with USD-to-token conversion`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Rank Bonus Test Failed',
          description: data.error || 'Failed to test rank bonus distribution',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing rank bonus:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test rank bonus distribution',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenRates();
  }, []);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test USD-to-token conversion
        </Alert>
      </Box>
    );
  }

  const getRankBonuses = () => [
    { rank: 'Bronze', referrals: 5, bonus_usd: 690, split_usd: 345 },
    { rank: 'Silver', referrals: 10, bonus_usd: 2484, split_usd: 1242 },
    { rank: 'Gold', referrals: 15, bonus_usd: 4830, split_usd: 2415 },
    { rank: 'Platinum', referrals: 20, bonus_usd: 8832, split_usd: 4416 },
    { rank: 'Diamond', referrals: 25, bonus_usd: 14904, split_usd: 7452 }
  ];

  const ticRate = tokenRates.find(r => r.token_symbol === 'TIC')?.usd_rate || 1.00;
  const gicRate = tokenRates.find(r => r.token_symbol === 'GIC')?.usd_rate || 1.00;

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            USD-to-Token Conversion Test
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchTokenRates}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh Rates
            </Button>
          </HStack>
        </Flex>

        <Text color="gray.600">
          Testing USD-to-token conversion for rank bonuses - User: {session.user.email}
        </Text>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Current Token Rates */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Current Token Exchange Rates</Heading>
              <StatGroup>
                <Stat>
                  <StatLabel>TIC Rate</StatLabel>
                  <StatNumber color="blue.500">${ticRate.toFixed(4)} USD = 1 TIC</StatNumber>
                  <Text fontSize="xs" color="gray.500">1 TIC = ${ticRate} USD</Text>
                </Stat>
                <Stat>
                  <StatLabel>GIC Rate</StatLabel>
                  <StatNumber color="purple.500">${gicRate.toFixed(4)} USD = 1 GIC</StatNumber>
                  <Text fontSize="xs" color="gray.500">1 GIC = ${gicRate} USD</Text>
                </Stat>
              </StatGroup>

              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Rank Bonus Distribution Process:</Text>
                  <Text fontSize="sm">
                    1. User earns rank bonus in USD (e.g., Bronze = $690)<br/>
                    2. USD amount is split 50/50 ($345 TIC + $345 GIC)<br/>
                    3. Each USD amount is converted to tokens using current rates<br/>
                    4. Tokens are credited to TIC and GIC wallets
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>

        {/* Conversion Test */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Test USD-to-Token Conversion</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl>
                  <FormLabel>USD Amount</FormLabel>
                  <NumberInput value={testAmount} onChange={(_, value) => setTestAmount(value || 0)}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Token Type</FormLabel>
                  <Select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
                    <option value="TIC">TIC</option>
                    <option value="GIC">GIC</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>&nbsp;</FormLabel>
                  <Button
                    leftIcon={<FaExchangeAlt />}
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
                        <Badge colorScheme="green">${conversionResult.input.usd_amount} USD</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Output:</Text>
                        <Badge colorScheme="blue">
                          {conversionResult.conversion.token_amount.toFixed(4)} {conversionResult.input.token_symbol}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Rate:</Text>
                        <Text fontSize="sm">${conversionResult.conversion.exchange_rate}/token</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" textAlign="center">
                        {conversionResult.conversion.calculation}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Rank Bonus Examples */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Rank Bonus USD-to-Token Examples</Heading>
              
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Rank</Th>
                      <Th textAlign="center">Referrals</Th>
                      <Th textAlign="center">Total USD</Th>
                      <Th textAlign="center">USD Split</Th>
                      <Th textAlign="center">TIC Tokens</Th>
                      <Th textAlign="center">GIC Tokens</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {getRankBonuses().map((rank) => (
                      <Tr key={rank.rank}>
                        <Td>
                          <Badge 
                            colorScheme={
                              rank.rank === 'Diamond' ? 'blue' :
                              rank.rank === 'Platinum' ? 'purple' :
                              rank.rank === 'Gold' ? 'yellow' :
                              rank.rank === 'Silver' ? 'gray' : 'orange'
                            }
                          >
                            {rank.rank}
                          </Badge>
                        </Td>
                        <Td textAlign="center">{rank.referrals}</Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="green.500">
                            ${rank.bonus_usd.toLocaleString()}
                          </Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontSize="sm">
                            ${rank.split_usd} each
                          </Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="blue.500">
                            {(rank.split_usd / ticRate).toFixed(4)} TIC
                          </Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="purple.500">
                            {(rank.split_usd / gicRate).toFixed(4)} GIC
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>

              <Alert status="success">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Example: Bronze Rank Bonus</Text>
                  <Text fontSize="sm">
                    User earns $690 USD → Split: $345 TIC + $345 GIC → 
                    Tokens: {(345 / ticRate).toFixed(4)} TIC + {(345 / gicRate).toFixed(4)} GIC
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Actions */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Test Rank Bonus Distribution</Heading>
              
              <Button
                leftIcon={<FaCrown />}
                colorScheme="purple"
                onClick={testRankBonusDistribution}
                isLoading={isLoading}
                size="lg"
              >
                Test Rank Bonus with USD Conversion
              </Button>

              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  This will test the rank bonus distribution system with USD-to-token conversion.
                  The system will calculate your rank, determine USD bonus amount, split 50/50,
                  and convert each half to TIC and GIC tokens using current exchange rates.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
