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
} from '@chakra-ui/react';

interface ImmediateFixStatus {
  success: boolean;
  current_time: string;
  date: string;
  active_subscriptions: number;
  todays_distributions: number;
  needs_immediate_fix: boolean;
  sample_distributions: any[];
  recommendation: string;
}

interface ImmediateFixResult {
  success: boolean;
  message: string;
  date: string;
  current_time: string;
  total_active_subscriptions: number;
  unique_users: number;
  distributions_created: number;
  results: any[];
}

const ImmediateFixPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [status, setStatus] = useState<ImmediateFixStatus | null>(null);
  const [fixResult, setFixResult] = useState<ImmediateFixResult | null>(null);
  const toast = useToast();

  const checkStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      console.log('🔍 Checking immediate fix status...');
      
      const res = await fetch('/api/immediate-fix/create-todays-distributions', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      
      console.log('📊 Status:', data);
      
      setStatus(data);

      if (data.success) {
        toast({
          title: 'Status Check Complete',
          description: data.needs_immediate_fix 
            ? 'Immediate fix needed - no distributions for today'
            : `Found ${data.todays_distributions} distributions for today`,
          status: data.needs_immediate_fix ? 'warning' : 'success',
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

  const runImmediateFix = async () => {
    setIsLoading(true);
    setFixResult(null);
    
    try {
      console.log('🚀 Running immediate fix...');
      
      const res = await fetch('/api/immediate-fix/create-todays-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const data = await res.json();
      console.log('📊 Fix Result:', data);
      
      setFixResult(data);

      if (data.success) {
        toast({
          title: 'IMMEDIATE FIX COMPLETE! 🎉',
          description: `Created ${data.distributions_created} distributions for TODAY`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh status after fix
        setTimeout(() => {
          checkStatus();
        }, 3000);
      } else {
        toast({
          title: 'Immediate Fix Failed',
          description: data.error || 'Failed to run immediate fix',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Fix failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setFixResult({
        success: false,
        message: 'Request failed',
        error: errorMessage
      } as any);
      
      toast({
        title: 'Immediate Fix Failed',
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
        <Heading as="h1" size="xl" textAlign="center" color="red.500">
          🚀 IMMEDIATE FIX: Create Today's TIC Distributions
        </Heading>

        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>URGENT: Distribution System Fix</AlertTitle>
            <AlertDescription>
              The TIC distributions are showing old dates instead of today's date. 
              This immediate fix will create TODAY'S distributions for ALL users right now.
              <br /><br />
              <strong>What this does:</strong>
              <br />• Deletes old/incorrect distributions for today
              <br />• Creates fresh distributions with TODAY'S date
              <br />• Updates all user wallet balances
              <br />• VIP users get 18.90 TIC, Starter users get 1.37 TIC
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
            Check Current Status
          </Button>
          
          <Button
            onClick={runImmediateFix}
            isLoading={isLoading}
            loadingText="Creating today's distributions..."
            colorScheme="red"
            size="lg"
          >
            🚀 RUN IMMEDIATE FIX
          </Button>
        </HStack>

        {/* Status Display */}
        {status && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Current Status</Heading>
                <Badge
                  colorScheme={status.needs_immediate_fix ? 'red' : 'green'}
                  size="lg"
                >
                  {status.needs_immediate_fix ? 'NEEDS FIX' : 'OK'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Current Date</StatLabel>
                  <StatNumber fontSize="lg">{status.date}</StatNumber>
                  <StatHelpText>{new Date(status.current_time).toLocaleString()}</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Active Subscriptions</StatLabel>
                  <StatNumber color="blue.500">{status.active_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Today's Distributions</StatLabel>
                  <StatNumber color={status.todays_distributions > 0 ? 'green.500' : 'red.500'}>
                    {status.todays_distributions}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Status</StatLabel>
                  <StatNumber color={status.needs_immediate_fix ? 'red.500' : 'green.500'}>
                    {status.needs_immediate_fix ? 'BROKEN' : 'WORKING'}
                  </StatNumber>
                </Stat>
              </SimpleGrid>

              <Alert status={status.needs_immediate_fix ? 'error' : 'success'} mt={4}>
                <AlertIcon />
                <AlertDescription>
                  <strong>Recommendation:</strong> {status.recommendation}
                </AlertDescription>
              </Alert>

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
                          <Th>Date</Th>
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
                            <Td>{dist.distribution_date}</Td>
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

        {/* Fix Results */}
        {fixResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Immediate Fix Results</Heading>
                <Badge
                  colorScheme={fixResult.success ? 'green' : 'red'}
                  size="lg"
                >
                  {fixResult.success ? 'SUCCESS' : 'ERROR'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                {fixResult.success ? (
                  <>
                    <Alert status="success">
                      <AlertIcon />
                      <AlertDescription>
                        <strong>{fixResult.message}</strong>
                        <br />Date: {fixResult.date}
                        <br />Time: {new Date(fixResult.current_time).toLocaleString()}
                      </AlertDescription>
                    </Alert>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Stat>
                        <StatLabel>Active Subscriptions</StatLabel>
                        <StatNumber>{fixResult.total_active_subscriptions}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Unique Users</StatLabel>
                        <StatNumber>{fixResult.unique_users}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Distributions Created</StatLabel>
                        <StatNumber color="green.500">{fixResult.distributions_created}</StatNumber>
                        <StatHelpText>For TODAY: {fixResult.date}</StatHelpText>
                      </Stat>
                    </SimpleGrid>

                    {fixResult.results && fixResult.results.length > 0 && (
                      <>
                        <Heading size="sm">Sample Results (First 10)</Heading>
                        <TableContainer>
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>User</Th>
                                <Th>Plans</Th>
                                <Th>Tokens</Th>
                                <Th>Date</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {fixResult.results.slice(0, 10).map((result, index) => (
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
                                  <Td>{result.distribution_date}</Td>
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
                      <AlertTitle>Fix Failed</AlertTitle>
                      <AlertDescription>
                        {fixResult.message}
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
            <AlertTitle>After Running Immediate Fix</AlertTitle>
            <AlertDescription>
              <strong>✅ All users will see TODAY'S date in their distributions:</strong>
              <br />• VIP users: 18.90 TIC for {new Date().toLocaleDateString()}
              <br />• Starter users: 1.37 TIC for {new Date().toLocaleDateString()}
              <br />• Wallet balances updated immediately
              <br />• Dashboard will show current distributions
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default ImmediateFixPage;
