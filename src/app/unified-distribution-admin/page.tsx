'use client';

import React, { useState, useEffect } from 'react';
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
  Progress,
  Code,
} from '@chakra-ui/react';

interface DistributionStatus {
  success: boolean;
  date: string;
  timestamp: string;
  status: {
    active_subscriptions: number;
    unique_active_users: number;
    todays_distributions: number;
    unique_users_with_distributions: number;
    users_missing_distributions: number;
    distribution_coverage: number;
  };
  token_allocations: {
    vip_daily: number;
    starter_daily: number;
    vip_yearly: number;
    starter_yearly: number;
  };
  sample_distributions: any[];
}

interface DistributionResult {
  success: boolean;
  message: string;
  date: string;
  timestamp: string;
  summary: {
    total_active_subscriptions: number;
    unique_users: number;
    users_with_existing_distributions: number;
    distributions_created: number;
    distributions_skipped: number;
  };
  token_allocations: {
    vip_daily: number;
    starter_daily: number;
    vip_yearly: number;
    starter_yearly: number;
  };
  results: any[];
}

const UnifiedDistributionAdminPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [status, setStatus] = useState<DistributionStatus | null>(null);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const toast = useToast();

  const checkStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      console.log('🔍 Checking unified distribution status...');
      
      const res = await fetch('/api/unified-daily-distribution', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      
      console.log('📊 Status:', data);
      
      setStatus(data);

      if (data.success) {
        const coverage = data.status?.distribution_coverage || 0;
        toast({
          title: 'Status Check Complete',
          description: `Distribution coverage: ${coverage}% (${data.status?.unique_users_with_distributions || 0}/${data.status?.unique_active_users || 0} users)`,
          status: coverage >= 100 ? 'success' : 'warning',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Status Check Failed',
          description: data.error || 'Failed to check status',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
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

  const runUnifiedDistribution = async () => {
    setIsLoading(true);
    setDistributionResult(null);
    
    try {
      console.log('🚀 Running unified daily distribution...');
      
      const res = await fetch('/api/unified-daily-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const data = await res.json();
      console.log('📊 Distribution Result:', data);
      
      setDistributionResult(data);

      if (data.success) {
        toast({
          title: 'UNIFIED DISTRIBUTION COMPLETE! 🎉',
          description: `Created ${data.summary?.distributions_created || 0} distributions, skipped ${data.summary?.distributions_skipped || 0} existing`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh status after distribution
        setTimeout(() => {
          checkStatus();
        }, 3000);
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error || 'Failed to run distribution',
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
        message: 'Request failed',
        error: errorMessage
      } as any);
      
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

  // Auto-check on page load
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="blue.500">
          🚀 Unified Daily TIC Distribution System
        </Heading>

        <Alert status="info" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Official TIC Distribution Amounts</AlertTitle>
            <AlertDescription>
              <strong>VIP Plan:</strong> 18.90 TIC per day (6900 TIC per year)
              <br />
              <strong>Starter Plan:</strong> 1.37 TIC per day (500 TIC per year)
              <br />
              <strong>System:</strong> Runs automatically at midnight UTC daily
            </AlertDescription>
          </Box>
        </Alert>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            onClick={checkStatus}
            isLoading={isCheckingStatus}
            loadingText="Checking..."
            colorScheme="blue"
            size="lg"
          >
            📊 Check Status
          </Button>
          
          <Button
            onClick={runUnifiedDistribution}
            isLoading={isLoading}
            loadingText="Running distribution..."
            colorScheme="green"
            size="lg"
          >
            🚀 Run Distribution Now
          </Button>
        </HStack>

        {/* Status Display */}
        {status && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Distribution Status</Heading>
                <Badge
                  colorScheme={status.status?.distribution_coverage >= 100 ? 'green' : 'orange'}
                  size="lg"
                >
                  {status.status?.distribution_coverage || 0}% Coverage
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Active Subscriptions</StatLabel>
                  <StatNumber color="blue.500">{status.status?.active_subscriptions || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Unique Active Users</StatLabel>
                  <StatNumber color="blue.500">{status.status?.unique_active_users || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Today's Distributions</StatLabel>
                  <StatNumber color="green.500">{status.status?.todays_distributions || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Users Missing Distributions</StatLabel>
                  <StatNumber color={status.status?.users_missing_distributions > 0 ? 'red.500' : 'green.500'}>
                    {status.status?.users_missing_distributions || 0}
                  </StatNumber>
                </Stat>
              </SimpleGrid>

              <Box mt={4}>
                <Text mb={2} fontWeight="bold">Distribution Coverage</Text>
                <Progress 
                  value={status.status?.distribution_coverage || 0} 
                  colorScheme={status.status?.distribution_coverage >= 100 ? 'green' : 'orange'}
                  size="lg"
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {status.status?.unique_users_with_distributions || 0} of {status.status?.unique_active_users || 0} users have distributions
                </Text>
              </Box>

              <Alert status={status.status?.distribution_coverage >= 100 ? 'success' : 'warning'} mt={4}>
                <AlertIcon />
                <AlertDescription>
                  {status.status?.distribution_coverage >= 100 
                    ? '✅ All active users have received their daily TIC distributions!'
                    : `⚠️ ${status.status?.users_missing_distributions || 0} users are missing today's distributions`
                  }
                </AlertDescription>
              </Alert>

              <Box mt={4}>
                <Heading size="sm" mb={3}>Token Allocation Rates</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Box p={3} bg="purple.50" borderRadius="md">
                    <Text fontWeight="bold" color="purple.600">VIP Plan</Text>
                    <Text>Daily: <Code>{status.token_allocations?.vip_daily?.toFixed(4)} TIC</Code></Text>
                    <Text>Yearly: <Code>{status.token_allocations?.vip_yearly} TIC</Code></Text>
                  </Box>
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <Text fontWeight="bold" color="blue.600">Starter Plan</Text>
                    <Text>Daily: <Code>{status.token_allocations?.starter_daily?.toFixed(4)} TIC</Code></Text>
                    <Text>Yearly: <Code>{status.token_allocations?.starter_yearly} TIC</Code></Text>
                  </Box>
                </SimpleGrid>
              </Box>

              {status.sample_distributions && status.sample_distributions.length > 0 && (
                <>
                  <Heading size="sm" mt={4} mb={3}>Sample Today's Distributions</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>User</Th>
                          <Th>Plan</Th>
                          <Th>Amount</Th>
                          <Th>Status</Th>
                          <Th>Created</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {status.sample_distributions.map((dist, index) => (
                          <Tr key={index}>
                            <Td>{dist.user_email}</Td>
                            <Td>
                              <Badge colorScheme={dist.plan_id === 'vip' ? 'purple' : 'blue'} size="sm">
                                {dist.plan_id?.toUpperCase()}
                              </Badge>
                            </Td>
                            <Td>{dist.token_amount?.toFixed(4)} TIC</Td>
                            <Td>
                              <Badge colorScheme="green" size="sm">
                                {dist.status?.toUpperCase()}
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
                        <br />Date: {distributionResult.date}
                        <br />Time: {new Date(distributionResult.timestamp).toLocaleString()}
                      </AlertDescription>
                    </Alert>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Stat>
                        <StatLabel>Total Active Subscriptions</StatLabel>
                        <StatNumber>{distributionResult.summary?.total_active_subscriptions || 0}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Distributions Created</StatLabel>
                        <StatNumber color="green.500">{distributionResult.summary?.distributions_created || 0}</StatNumber>
                        <StatHelpText>New distributions</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Distributions Skipped</StatLabel>
                        <StatNumber color="blue.500">{distributionResult.summary?.distributions_skipped || 0}</StatNumber>
                        <StatHelpText>Already existed</StatHelpText>
                      </Stat>
                    </SimpleGrid>

                    {distributionResult.results && distributionResult.results.length > 0 && (
                      <>
                        <Heading size="sm">Recent Distribution Results</Heading>
                        <TableContainer>
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>User</Th>
                                <Th>Plans</Th>
                                <Th>Tokens</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {distributionResult.results.slice(0, 10).map((result, index) => (
                                <Tr key={index}>
                                  <Td>{result.user_email}</Td>
                                  <Td>{result.plans}</Td>
                                  <Td>
                                    {result.tokens_distributed ? (
                                      <Text color="green.500">+{result.tokens_distributed.toFixed(4)} TIC</Text>
                                    ) : (
                                      <Text color="red.500">Error</Text>
                                    )}
                                  </Td>
                                  <Td>
                                    <Badge
                                      colorScheme={result.status === 'success' ? 'green' : 'red'}
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
                      <AlertTitle>Distribution Failed</AlertTitle>
                      <AlertDescription>
                        {distributionResult.message}
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="success" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>System Information</AlertTitle>
            <AlertDescription>
              <strong>✅ Unified Distribution System Features:</strong>
              <br />• Runs automatically at midnight UTC daily
              <br />• Handles multiple plans per user correctly
              <br />• Prevents duplicate distributions
              <br />• Works for all existing and new users
              <br />• VIP: 18.90 TIC/day, Starter: 1.37 TIC/day
              <br />• Updates wallet balances automatically
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default UnifiedDistributionAdminPage;
