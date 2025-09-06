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
  Code,
} from '@chakra-ui/react';

const FixDistributionAmountsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const toast = useToast();

  const checkDiagnostic = async () => {
    setIsCheckingStatus(true);
    
    try {
      console.log('🔍 Running diagnostic...');
      
      const res = await fetch('/api/debug/distribution-amounts', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      
      console.log('📊 Diagnostic data:', data);
      
      setDiagnosticData(data);

      if (data.success) {
        const problemCount = data.summary?.users_with_excessive_amounts || 0;
        toast({
          title: 'Diagnostic Complete',
          description: problemCount > 0 
            ? `Found ${problemCount} users with incorrect distribution amounts`
            : 'All distribution amounts look correct',
          status: problemCount > 0 ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Diagnostic Failed',
          description: data.error || 'Failed to run diagnostic',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      toast({
        title: 'Diagnostic Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const runCleanupFix = async () => {
    setIsLoading(true);
    setFixResult(null);
    
    try {
      console.log('🧹 Running cleanup fix...');
      
      const res = await fetch('/api/fix/clean-duplicate-distributions', {
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
          title: 'CLEANUP COMPLETE! 🎉',
          description: `Fixed distributions for ${data.summary?.correct_distributions_created || 0} users`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh diagnostic after fix
        setTimeout(() => {
          checkDiagnostic();
        }, 3000);
      } else {
        toast({
          title: 'Cleanup Failed',
          description: data.error || 'Failed to run cleanup',
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
        title: 'Cleanup Failed',
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
    checkDiagnostic();
  }, []);

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="red.500">
          🧹 FIX: TIC Distribution Amounts (810 TIC → 18.90 TIC)
        </Heading>

        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>PROBLEM: Users Getting Wrong TIC Amounts</AlertTitle>
            <AlertDescription>
              Users are receiving <strong>810 TIC</strong> instead of the correct <strong>18.90 TIC</strong> for VIP plans.
              This is caused by multiple distribution systems running simultaneously, creating duplicate distributions.
              <br /><br />
              <strong>This fix will:</strong>
              <br />• Delete ALL duplicate distributions for today
              <br />• Reset user wallet balances to correct amounts
              <br />• Create single correct distribution per user
              <br />• VIP users: 18.90 TIC, Starter users: 1.37 TIC
            </AlertDescription>
          </Box>
        </Alert>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            onClick={checkDiagnostic}
            isLoading={isCheckingStatus}
            loadingText="Checking..."
            colorScheme="blue"
            size="lg"
          >
            🔍 Run Diagnostic
          </Button>
          
          <Button
            onClick={runCleanupFix}
            isLoading={isLoading}
            loadingText="Cleaning up duplicates..."
            colorScheme="red"
            size="lg"
          >
            🧹 FIX DUPLICATE DISTRIBUTIONS
          </Button>
        </HStack>

        {/* Diagnostic Results */}
        {diagnosticData && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Diagnostic Results</Heading>
                <Badge
                  colorScheme={diagnosticData.summary?.users_with_excessive_amounts > 0 ? 'red' : 'green'}
                  size="lg"
                >
                  {diagnosticData.summary?.users_with_excessive_amounts > 0 ? 'PROBLEMS FOUND' : 'OK'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Distributions</StatLabel>
                  <StatNumber color="blue.500">{diagnosticData.summary?.total_distributions || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Unique Users</StatLabel>
                  <StatNumber color="blue.500">{diagnosticData.summary?.unique_users || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Users with Multiple Distributions</StatLabel>
                  <StatNumber color="orange.500">{diagnosticData.summary?.users_with_multiple_distributions || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Users with Excessive Amounts</StatLabel>
                  <StatNumber color="red.500">{diagnosticData.summary?.users_with_excessive_amounts || 0}</StatNumber>
                  <StatHelpText>Getting more than 25 TIC</StatHelpText>
                </Stat>
              </SimpleGrid>

              {diagnosticData.problem_users && diagnosticData.problem_users.length > 0 && (
                <>
                  <Alert status="error" mt={4}>
                    <AlertIcon />
                    <AlertDescription>
                      <strong>Found {diagnosticData.problem_users.length} users with incorrect amounts!</strong>
                    </AlertDescription>
                  </Alert>

                  <Heading size="sm" mt={4} mb={3}>Problem Users (Getting Too Much TIC)</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>User</Th>
                          <Th>Distributions</Th>
                          <Th>Total Amount</Th>
                          <Th>Should Be</Th>
                          <Th>Excess</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {diagnosticData.problem_users.slice(0, 10).map((user: any, index: number) => (
                          <Tr key={index}>
                            <Td>{user.user_email}</Td>
                            <Td>
                              <Badge colorScheme="red" size="sm">
                                {user.distribution_count} distributions
                              </Badge>
                            </Td>
                            <Td>
                              <Text color="red.500" fontWeight="bold">
                                {user.total_distribution_amount.toFixed(4)} TIC
                              </Text>
                            </Td>
                            <Td>
                              <Text color="green.500">
                                18.90 TIC (VIP) or 1.37 TIC (Starter)
                              </Text>
                            </Td>
                            <Td>
                              <Text color="red.500">
                                +{(user.total_distribution_amount - 18.90).toFixed(4)} TIC
                              </Text>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {diagnosticData.summary?.users_with_excessive_amounts === 0 && (
                <Alert status="success" mt={4}>
                  <AlertIcon />
                  <AlertDescription>
                    ✅ All distribution amounts are correct! No cleanup needed.
                  </AlertDescription>
                </Alert>
              )}
            </CardBody>
          </Card>
        )}

        {/* Fix Results */}
        {fixResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Cleanup Results</Heading>
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
                      </AlertDescription>
                    </Alert>

                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                      <Stat>
                        <StatLabel>Distributions Deleted</StatLabel>
                        <StatNumber color="red.500">{fixResult.summary?.original_distributions_deleted || 0}</StatNumber>
                        <StatHelpText>Duplicates removed</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Transactions Deleted</StatLabel>
                        <StatNumber color="red.500">{fixResult.summary?.original_transactions_deleted || 0}</StatNumber>
                        <StatHelpText>Wallet transactions removed</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Balances Reset</StatLabel>
                        <StatNumber color="orange.500">{fixResult.summary?.balance_resets || 0}</StatNumber>
                        <StatHelpText>User wallets corrected</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Correct Distributions Created</StatLabel>
                        <StatNumber color="green.500">{fixResult.summary?.correct_distributions_created || 0}</StatNumber>
                        <StatHelpText>Single distribution per user</StatHelpText>
                      </Stat>
                    </SimpleGrid>

                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Expected Daily Amounts</AlertTitle>
                        <AlertDescription>
                          <Code>VIP Plan: {fixResult.expected_amounts?.vip_daily?.toFixed(4)} TIC per day</Code>
                          <br />
                          <Code>Starter Plan: {fixResult.expected_amounts?.starter_daily?.toFixed(4)} TIC per day</Code>
                        </AlertDescription>
                      </Box>
                    </Alert>

                    {fixResult.correct_distributions && fixResult.correct_distributions.length > 0 && (
                      <>
                        <Heading size="sm">Corrected Distributions (Sample)</Heading>
                        <TableContainer>
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>User</Th>
                                <Th>Plans</Th>
                                <Th>Correct Amount</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {fixResult.correct_distributions.slice(0, 10).map((dist: any, index: number) => (
                                <Tr key={index}>
                                  <Td>{dist.user_email}</Td>
                                  <Td>{dist.plans}</Td>
                                  <Td>
                                    <Text color="green.500" fontWeight="bold">
                                      {dist.correct_amount.toFixed(4)} TIC
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Badge colorScheme="green" size="sm">
                                      FIXED
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
                      <AlertTitle>Cleanup Failed</AlertTitle>
                      <AlertDescription>
                        {fixResult.message || fixResult.error}
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
            <AlertTitle>After Running Cleanup</AlertTitle>
            <AlertDescription>
              <strong>✅ All users will have correct TIC amounts:</strong>
              <br />• VIP users: Exactly 18.90 TIC per day
              <br />• Starter users: Exactly 1.37 TIC per day
              <br />• No more duplicate distributions
              <br />• Wallet balances corrected
              <br />• Dashboard will show proper amounts
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default FixDistributionAmountsPage;
