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
  Input,
  FormControl,
  FormLabel,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';

interface SystemStatus {
  success: boolean;
  total_users: number;
  total_distributions: number;
  duplicate_distributions: number;
  users_with_duplicates: number;
  needs_fix: boolean;
  duplicate_examples?: Array<{
    user_email: string;
    date: string;
    duplicate_count: number;
  }>;
}

interface FixResult {
  success: boolean;
  message?: string;
  error?: string;
  total_users?: number;
  users_processed?: number;
  distributions_created?: number;
  summary?: {
    successful_users: number;
    failed_users: number;
    total_distributions: number;
  };
  results?: Array<{
    user_email: string;
    status: string;
    subscriptions?: number;
    distributions_created?: number;
    plans?: string;
    error?: string;
  }>;
}

const AdminFixAllDistributionsPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const toast = useToast();

  const checkSystemStatus = async () => {
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

    setIsCheckingStatus(true);
    
    try {
      console.log('🔍 Checking system-wide distribution status...');
      
      const res = await fetch(`/api/admin/fix-all-duplicate-distributions?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      
      console.log('📊 System Status Response:', data);
      
      setSystemStatus(data);

      if (data.success) {
        toast({
          title: 'Status Check Complete',
          description: `Found ${data.duplicate_distributions} duplicate distributions across ${data.users_with_duplicates} users`,
          status: data.needs_fix ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Status Check Failed',
          description: data.error || 'Failed to check system status',
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

  const fixAllDistributions = async () => {
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
    setFixResult(null);
    
    try {
      console.log('🔧 Starting system-wide distribution fix...');
      
      const res = await fetch('/api/admin/fix-all-duplicate-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminKey: adminKey.trim() })
      });

      const data = await res.json();
      console.log('📊 Fix Result:', data);
      
      setFixResult(data);

      if (data.success) {
        toast({
          title: 'System-Wide Fix Complete!',
          description: `Processed ${data.users_processed} users and created ${data.distributions_created} unique distributions`,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });
        
        // Refresh system status after fix
        setTimeout(() => {
          checkSystemStatus();
        }, 2000);
      } else {
        toast({
          title: 'Fix Failed',
          description: data.error || 'Failed to fix distributions',
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
        error: 'Request failed',
        message: errorMessage
      });
      
      toast({
        title: 'Fix Failed',
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
          Admin: Fix All Duplicate Distributions
        </Heading>

        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>System-Wide Distribution Fix</AlertTitle>
            <AlertDescription>
              This tool will fix duplicate distributions for ALL users and ALL plan types. 
              It will create exactly one distribution per day for the last 5 days for every active subscription.
            </AlertDescription>
          </Box>
        </Alert>

        {/* Admin Key Input */}
        <Card>
          <CardHeader>
            <Heading size="md">Admin Authentication</Heading>
          </CardHeader>
          <CardBody>
            <FormControl>
              <FormLabel>Admin Key</FormLabel>
              <Input
                type="password"
                placeholder="Enter admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
              />
            </FormControl>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            onClick={checkSystemStatus}
            isLoading={isCheckingStatus}
            loadingText="Checking status..."
            colorScheme="blue"
            size="lg"
          >
            Check System Status
          </Button>
          
          <Button
            onClick={fixAllDistributions}
            isLoading={isLoading}
            loadingText="Fixing all distributions..."
            colorScheme="red"
            size="lg"
            isDisabled={!systemStatus?.needs_fix}
          >
            Fix All Distributions
          </Button>
        </HStack>

        {/* System Status Display */}
        {systemStatus && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">System Status</Heading>
                <Badge
                  colorScheme={systemStatus.needs_fix ? 'red' : 'green'}
                  size="lg"
                >
                  {systemStatus.needs_fix ? 'NEEDS FIX' : 'HEALTHY'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Users</StatLabel>
                  <StatNumber>{systemStatus.total_users}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Distributions</StatLabel>
                  <StatNumber>{systemStatus.total_distributions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Duplicate Distributions</StatLabel>
                  <StatNumber color="red.500">{systemStatus.duplicate_distributions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Users with Duplicates</StatLabel>
                  <StatNumber color="orange.500">{systemStatus.users_with_duplicates}</StatNumber>
                </Stat>
              </SimpleGrid>

              {systemStatus.duplicate_examples && systemStatus.duplicate_examples.length > 0 && (
                <>
                  <Divider my={4} />
                  <Heading size="sm" mb={3}>Duplicate Examples</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>User Email</Th>
                          <Th>Date</Th>
                          <Th>Duplicate Count</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {systemStatus.duplicate_examples.map((example, index) => (
                          <Tr key={index}>
                            <Td>{example.user_email}</Td>
                            <Td>{new Date(example.date).toLocaleDateString()}</Td>
                            <Td>
                              <Badge colorScheme="red">
                                {example.duplicate_count} duplicates
                              </Badge>
                            </Td>
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

        {/* Fix Results Display */}
        {fixResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Fix Results</Heading>
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
                {/* Success Message */}
                {fixResult.success && fixResult.message && (
                  <Alert status="success">
                    <AlertIcon />
                    <AlertDescription>{fixResult.message}</AlertDescription>
                  </Alert>
                )}

                {/* Error Message */}
                {!fixResult.success && (
                  <Alert status="error">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Error: {fixResult.error}</AlertTitle>
                      {fixResult.message && (
                        <AlertDescription mt={2}>
                          {fixResult.message}
                        </AlertDescription>
                      )}
                    </Box>
                  </Alert>
                )}

                {/* Success Summary */}
                {fixResult.success && fixResult.summary && (
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Stat>
                      <StatLabel>Users Processed</StatLabel>
                      <StatNumber color="green.500">{fixResult.users_processed}</StatNumber>
                      <StatHelpText>out of {fixResult.total_users} total</StatHelpText>
                    </Stat>
                    <Stat>
                      <StatLabel>Distributions Created</StatLabel>
                      <StatNumber color="blue.500">{fixResult.distributions_created}</StatNumber>
                      <StatHelpText>unique daily distributions</StatHelpText>
                    </Stat>
                    <Stat>
                      <StatLabel>Success Rate</StatLabel>
                      <StatNumber color="green.500">
                        {fixResult.summary.successful_users}/{fixResult.summary.successful_users + fixResult.summary.failed_users}
                      </StatNumber>
                      <StatHelpText>
                        {fixResult.summary.failed_users > 0 && (
                          <Text color="red.500">{fixResult.summary.failed_users} failed</Text>
                        )}
                      </StatHelpText>
                    </Stat>
                  </SimpleGrid>
                )}

                {/* Sample Results */}
                {fixResult.results && fixResult.results.length > 0 && (
                  <>
                    <Divider />
                    <Heading size="sm">Sample Results (First 10 Users)</Heading>
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>User Email</Th>
                            <Th>Status</Th>
                            <Th>Plans</Th>
                            <Th>Distributions Created</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {fixResult.results.map((result, index) => (
                            <Tr key={index}>
                              <Td>{result.user_email}</Td>
                              <Td>
                                <Badge
                                  colorScheme={result.status === 'success' ? 'green' : 'red'}
                                  size="sm"
                                >
                                  {result.status}
                                </Badge>
                              </Td>
                              <Td>
                                <Text fontSize="xs">{result.plans || 'N/A'}</Text>
                              </Td>
                              <Td>
                                {result.status === 'success' ? (
                                  <Text color="green.500">{result.distributions_created}</Text>
                                ) : (
                                  <Text fontSize="xs" color="red.500">{result.error}</Text>
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            After running the fix, all users will see proper daily distribution history with unique dates 
            instead of duplicate entries for the same day.
          </AlertDescription>
        </Alert>
      </VStack>
    </Box>
  );
};

export default AdminFixAllDistributionsPage;
