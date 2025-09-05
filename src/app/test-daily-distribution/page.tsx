'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Input,
  FormControl,
  FormLabel,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';

interface DistributionResult {
  success: boolean;
  message?: string;
  error?: string;
  date?: string;
  total_subscriptions?: number;
  distributed?: number;
  skipped?: number;
  errors?: number;
  results?: any[];
}

interface DistributionStatus {
  date: string;
  total_active_subscriptions: number;
  total_distributed: number;
  pending: number;
  distributions: any[];
}

const TestDailyDistributionPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus | null>(null);
  const toast = useToast();

  const checkDistributionStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      console.log('🔍 Checking daily distribution status...');
      
      const res = await fetch('/api/cron/daily-tic-distribution');
      const data = await res.json();
      
      console.log('📊 Distribution Status:', data);
      
      setDistributionStatus(data);

      toast({
        title: 'Status Check Complete',
        description: `${data.total_distributed} distributions found for today`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Status check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      toast({
        title: 'Status Check Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const runDailyDistribution = async () => {
    if (!adminKey.trim()) {
      toast({
        title: 'Admin Key Required',
        description: 'Please enter the admin key first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setDistributionResult(null);
    
    try {
      console.log('🚀 Running daily TIC distribution...');
      
      const res = await fetch('/api/cron/daily-tic-distribution', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      console.log('📊 Distribution Result:', data);
      
      setDistributionResult(data);

      if (data.success) {
        toast({
          title: 'Daily Distribution Complete! 🎉',
          description: `Distributed to ${data.distributed} users, skipped ${data.skipped}, errors ${data.errors}`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh status after distribution
        setTimeout(() => {
          checkDistributionStatus();
        }, 2000);
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error || 'Failed to run daily distribution',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Distribution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setDistributionResult({
        success: false,
        error: 'Request failed',
        message: errorMessage
      });
      
      toast({
        title: 'Distribution Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          🔄 Test Daily TIC Distribution
        </Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Daily Distribution System Test</AlertTitle>
            <AlertDescription>
              This tool manually triggers the daily TIC distribution system that should run automatically every day at midnight UTC.
              <br /><br />
              <strong>Expected Results:</strong>
              <br />• VIP users: 18.90 TIC per day (6900 ÷ 365)
              <br />• Starter users: 1.37 TIC per day (500 ÷ 365)
            </AlertDescription>
          </Box>
        </Alert>

        {/* Admin Controls */}
        <Card>
          <CardHeader>
            <Heading size="md">Manual Distribution Control</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Cron Secret Key</FormLabel>
                <Input
                  type="password"
                  placeholder="Enter cron secret key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Use the CRON_SECRET environment variable value
                </Text>
              </FormControl>
              
              <HStack spacing={4} width="full">
                <Button
                  onClick={checkDistributionStatus}
                  isLoading={isCheckingStatus}
                  loadingText="Checking..."
                  colorScheme="blue"
                  size="lg"
                  flex={1}
                >
                  Check Today's Status
                </Button>
                
                <Button
                  onClick={runDailyDistribution}
                  isLoading={isLoading}
                  loadingText="Running distribution..."
                  colorScheme="green"
                  size="lg"
                  flex={1}
                >
                  🚀 Run Daily Distribution
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Distribution Status */}
        {distributionStatus && (
          <Card>
            <CardHeader>
              <Heading size="md">Today's Distribution Status</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Date</StatLabel>
                  <StatNumber fontSize="lg">{distributionStatus.date}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Active Subscriptions</StatLabel>
                  <StatNumber color="blue.500">{distributionStatus.total_active_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Distributed</StatLabel>
                  <StatNumber color="green.500">{distributionStatus.total_distributed}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Pending</StatLabel>
                  <StatNumber color={distributionStatus.pending > 0 ? 'red.500' : 'green.500'}>
                    {distributionStatus.pending}
                  </StatNumber>
                  <StatHelpText>
                    {distributionStatus.pending > 0 ? 'Need distribution' : 'All complete'}
                  </StatHelpText>
                </Stat>
              </SimpleGrid>

              {distributionStatus.distributions && distributionStatus.distributions.length > 0 && (
                <>
                  <Divider my={4} />
                  <Heading size="sm" mb={3}>Recent Distributions (Last 10)</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>User</Th>
                          <Th>Plan</Th>
                          <Th>Amount</Th>
                          <Th>Status</Th>
                          <Th>Time</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {distributionStatus.distributions.slice(0, 10).map((dist, index) => (
                          <Tr key={index}>
                            <Td>{dist.user_email}</Td>
                            <Td>
                              <Badge colorScheme={dist.plan_id === 'vip' ? 'purple' : 'blue'} size="sm">
                                {dist.plan_id?.toUpperCase()}
                              </Badge>
                            </Td>
                            <Td>{dist.token_amount?.toFixed(4)} TIC</Td>
                            <Td>
                              <Badge 
                                colorScheme={dist.status === 'completed' ? 'green' : dist.status === 'pending' ? 'yellow' : 'red'} 
                                size="sm"
                              >
                                {dist.status}
                              </Badge>
                            </Td>
                            <Td>{new Date(dist.created_at).toLocaleTimeString()}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </CardBody>
          </Card>
        )}

        {/* Distribution Results */}
        {distributionResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Distribution Results</Heading>
                <Badge
                  colorScheme={distributionResult.success ? 'green' : 'red'}
                  size="lg"
                >
                  {distributionResult.success ? 'SUCCESS' : 'ERROR'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                {distributionResult.success ? (
                  <>
                    <Alert status="success">
                      <AlertIcon />
                      <AlertDescription>
                        <strong>{distributionResult.message}</strong>
                      </AlertDescription>
                    </Alert>

                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                      <Stat>
                        <StatLabel>Total Subscriptions</StatLabel>
                        <StatNumber>{distributionResult.total_subscriptions}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Distributed</StatLabel>
                        <StatNumber color="green.500">{distributionResult.distributed}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Skipped</StatLabel>
                        <StatNumber color="yellow.500">{distributionResult.skipped}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Errors</StatLabel>
                        <StatNumber color="red.500">{distributionResult.errors}</StatNumber>
                      </Stat>
                    </SimpleGrid>

                    {distributionResult.results && distributionResult.results.length > 0 && (
                      <>
                        <Divider />
                        <Heading size="sm">Distribution Details (First 10)</Heading>
                        <TableContainer>
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>User</Th>
                                <Th>Plan</Th>
                                <Th>Tokens</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {distributionResult.results.slice(0, 10).map((result, index) => (
                                <Tr key={index}>
                                  <Td>{result.user_email}</Td>
                                  <Td>
                                    <Badge colorScheme={result.plan_id === 'vip' ? 'purple' : 'blue'} size="sm">
                                      {result.plan_id?.toUpperCase()}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {result.tokens_distributed ? (
                                      <Text color="green.500">+{result.tokens_distributed} TIC</Text>
                                    ) : (
                                      <Text color="gray.500">-</Text>
                                    )}
                                  </Td>
                                  <Td>
                                    <Badge
                                      colorScheme={result.status === 'success' ? 'green' : result.status === 'skipped' ? 'yellow' : 'red'}
                                      size="sm"
                                    >
                                      {result.status}
                                    </Badge>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </>
                ) : (
                  <Alert status="error">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Error: {distributionResult.error}</AlertTitle>
                      {distributionResult.message && (
                        <AlertDescription mt={2}>
                          {distributionResult.message}
                        </AlertDescription>
                      )}
                    </Box>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="info" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Automated Schedule</AlertTitle>
            <AlertDescription>
              <strong>This distribution runs automatically every day at midnight UTC via Vercel cron jobs.</strong>
              <br />• Daily TIC Distribution: 00:00 UTC
              <br />• Expired Subscriptions: 01:00 UTC  
              <br />• Rank Maintenance: 02:00 UTC
              <br />• Unilevel Commissions: 03:00 UTC
              <br />• Monthly Rank Bonuses: 1st of each month
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default TestDailyDistributionPage;
