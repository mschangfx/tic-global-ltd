'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Heading,
  useToast,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Badge,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Code,
  Textarea
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export default function TestRankBonusPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testMonth, setTestMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [testEmail, setTestEmail] = useState('');
  const [distributionResult, setDistributionResult] = useState<any>(null);
  const { data: session } = useSession();
  const toast = useToast();

  const distributeBonus = async (userEmail?: string) => {
    setIsLoading(true);
    try {
      const targetEmail = userEmail || testEmail || session?.user?.email;
      
      if (!targetEmail) {
        toast({
          title: 'No User Email',
          description: 'Please log in or enter an email address',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch('/api/rank-bonus/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          month: testMonth,
          userEmail: targetEmail
        })
      });

      const data = await response.json();
      setDistributionResult(data);

      if (data.success) {
        toast({
          title: 'Bonus Distributed!',
          description: `Successfully distributed rank bonus for ${targetEmail}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error || data.message || 'Failed to distribute bonus',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error distributing bonus:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const distributeAllUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rank-bonus/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: testMonth })
      });

      const data = await response.json();
      setDistributionResult(data);

      if (data.success) {
        toast({
          title: 'Bulk Distribution Complete!',
          description: `Processed ${data.data.processed} users`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Bulk Distribution Failed',
          description: data.error || 'Failed to distribute bonuses',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error in bulk distribution:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkDistributionStatus = async () => {
    try {
      const response = await fetch(`/api/rank-bonus/distribute?month=${testMonth}`);
      const data = await response.json();
      setDistributionResult(data);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Rank Bonus Distribution System</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page allows testing the rank bonus distribution system where 50% goes to TIC tokens and 50% goes to GIC tokens.
        </Alert>

        {/* Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Distribution Month (YYYY-MM)</FormLabel>
                <Input
                  type="month"
                  value={testMonth}
                  onChange={(e) => setTestMonth(e.target.value)}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Test User Email (optional - will use current user if empty)</FormLabel>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </FormControl>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                <Button
                  onClick={() => distributeBonus()}
                  isLoading={isLoading}
                  loadingText="Distributing..."
                  colorScheme="green"
                >
                  Distribute Single User
                </Button>
                
                <Button
                  onClick={distributeAllUsers}
                  isLoading={isLoading}
                  loadingText="Processing..."
                  colorScheme="blue"
                >
                  Distribute All Users
                </Button>
                
                <Button
                  onClick={checkDistributionStatus}
                  colorScheme="purple"
                  variant="outline"
                >
                  Check Status
                </Button>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Rank System Info */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <Heading size="md">Rank Bonus System</Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} w="full">
                <VStack>
                  <Badge colorScheme="orange" p={2}>BRONZE (11+ referrals)</Badge>
                  <Text>$690/month</Text>
                  <Text fontSize="sm" color="gray.600">345 TIC + 345 GIC</Text>
                </VStack>
                <VStack>
                  <Badge colorScheme="gray" p={2}>SILVER (12+ referrals)</Badge>
                  <Text>$2,484/month</Text>
                  <Text fontSize="sm" color="gray.600">1,242 TIC + 1,242 GIC</Text>
                </VStack>
                <VStack>
                  <Badge colorScheme="yellow" p={2}>GOLD (13+ referrals)</Badge>
                  <Text>$4,830/month</Text>
                  <Text fontSize="sm" color="gray.600">2,415 TIC + 2,415 GIC</Text>
                </VStack>
                <VStack>
                  <Badge colorScheme="purple" p={2}>PLATINUM (14+ referrals)</Badge>
                  <Text>$8,832/month</Text>
                  <Text fontSize="sm" color="gray.600">4,416 TIC + 4,416 GIC</Text>
                </VStack>
                <VStack>
                  <Badge colorScheme="blue" p={2}>DIAMOND (15+ referrals)</Badge>
                  <Text>$14,904/month</Text>
                  <Text fontSize="sm" color="gray.600">7,452 TIC + 7,452 GIC</Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Results */}
        {distributionResult && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Distribution Result</Heading>
                
                <Alert status={distributionResult.success ? 'success' : 'error'}>
                  <AlertIcon />
                  <Text>{distributionResult.message || distributionResult.error}</Text>
                </Alert>

                {distributionResult.success && distributionResult.data && (
                  <>
                    {/* Single User Result */}
                    {distributionResult.data.userEmail && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Stat>
                          <StatLabel>User</StatLabel>
                          <StatNumber fontSize="md">{distributionResult.data.userEmail}</StatNumber>
                          <StatHelpText>Rank: {distributionResult.data.rank}</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Bonus Amount</StatLabel>
                          <StatNumber>${distributionResult.data.bonusAmount?.toLocaleString()}</StatNumber>
                          <StatHelpText>{distributionResult.data.totalReferrals} referrals</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>TIC Tokens</StatLabel>
                          <StatNumber color="orange.500">{distributionResult.data.ticAmount?.toLocaleString()}</StatNumber>
                          <StatHelpText>50% of bonus</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>GIC Tokens</StatLabel>
                          <StatNumber color="purple.500">{distributionResult.data.gicAmount?.toLocaleString()}</StatNumber>
                          <StatHelpText>50% of bonus</StatHelpText>
                        </Stat>
                      </SimpleGrid>
                    )}

                    {/* Bulk Distribution Result */}
                    {distributionResult.data.processed && (
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                        <Stat>
                          <StatLabel>Processed</StatLabel>
                          <StatNumber>{distributionResult.data.processed}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Successful</StatLabel>
                          <StatNumber color="green.500">{distributionResult.data.successful}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Failed</StatLabel>
                          <StatNumber color="red.500">{distributionResult.data.failed}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Total Distributed</StatLabel>
                          <StatNumber>${distributionResult.data.totalBonusDistributed?.toLocaleString()}</StatNumber>
                        </Stat>
                      </SimpleGrid>
                    )}

                    {/* Summary Stats */}
                    {distributionResult.data.summary && (
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Stat>
                          <StatLabel>Total Distributions</StatLabel>
                          <StatNumber>{distributionResult.data.summary.total}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Total TIC Distributed</StatLabel>
                          <StatNumber color="orange.500">{distributionResult.data.summary.totalTicAmount?.toLocaleString()}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Total GIC Distributed</StatLabel>
                          <StatNumber color="purple.500">{distributionResult.data.summary.totalGicAmount?.toLocaleString()}</StatNumber>
                        </Stat>
                      </SimpleGrid>
                    )}
                  </>
                )}

                <Divider />
                
                <VStack align="stretch">
                  <Text fontWeight="bold">Raw Response:</Text>
                  <Textarea
                    value={JSON.stringify(distributionResult, null, 2)}
                    readOnly
                    rows={10}
                    fontSize="sm"
                    fontFamily="mono"
                  />
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading size="md">How to Test:</Heading>
              <Text>1. First, create test referrals using the <Code>/test-community</Code> page</Text>
              <Text>2. Set the distribution month (current month recommended)</Text>
              <Text>3. Click "Distribute Single User" to test with your account</Text>
              <Text>4. Check your wallet assets to see TIC and GIC tokens credited</Text>
              <Text>5. Use "Check Status" to view distribution history</Text>
              
              <Alert status="warning">
                <AlertIcon />
                <Text fontSize="sm">
                  Only users with Bronze rank or higher (11+ referrals) will receive bonuses.
                  Each user can only receive one bonus per month.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
