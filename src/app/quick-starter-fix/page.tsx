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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';

interface Distribution {
  date: string;
  amount?: number;
  status: string;
  error?: string;
  id?: string;
}

interface FixResult {
  success: boolean;
  message?: string;
  error?: string;
  user_email?: string;
  plan?: string;
  daily_amount?: number;
  distributions_created?: number;
  subscription_created?: boolean;
  distributions?: Distribution[];
}

const QuickStarterFixPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const toast = useToast();

  const checkUser = async () => {
    if (!userEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter a user email address',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsChecking(true);
    
    try {
      console.log('🔍 Checking user Starter status...');
      
      const res = await fetch(`/api/debug/quick-starter-fix?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      
      console.log('📊 Check Result:', data);
      
      setCheckResult(data);

      if (data.success) {
        toast({
          title: 'Check Complete',
          description: data.needs_fix ? 'User needs Starter distributions' : 'User has Starter distributions',
          status: data.needs_fix ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Check Failed',
          description: data.error || 'Failed to check user',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      toast({
        title: 'Check Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const quickFix = async () => {
    if (!userEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter a user email address',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setFixResult(null);
    
    try {
      console.log('🚀 Starting quick Starter fix...');
      
      const res = await fetch('/api/debug/quick-starter-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userEmail: userEmail.trim(),
          adminKey: adminKey.trim() || undefined
        })
      });

      const data = await res.json();
      console.log('📊 Fix Result:', data);
      
      setFixResult(data);

      if (data.success) {
        toast({
          title: 'Quick Fix Complete!',
          description: `Created ${data.distributions_created} Starter distributions for ${data.user_email}`,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });
        
        // Refresh check after fix
        setTimeout(() => {
          checkUser();
        }, 2000);
      } else {
        toast({
          title: 'Fix Failed',
          description: data.error || 'Failed to fix Starter distributions',
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
    <Box p={6} maxW="4xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Quick Starter Plan Fix
        </Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Fast Starter Distribution Fix</AlertTitle>
            <AlertDescription>
              This tool quickly creates Starter plan distributions for a specific user. 
              Starter plan should show 1.37 TIC per day (500 TIC per year ÷ 365 days).
            </AlertDescription>
          </Box>
        </Alert>

        {/* User Input */}
        <Card>
          <CardHeader>
            <Heading size="md">User Information</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>User Email</FormLabel>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Admin Key (optional - for creating test subscriptions)</FormLabel>
                <Input
                  type="password"
                  placeholder="Leave empty for existing users"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </FormControl>
              
              <HStack spacing={4} width="full">
                <Button
                  onClick={checkUser}
                  isLoading={isChecking}
                  loadingText="Checking..."
                  colorScheme="blue"
                  size="lg"
                  flex={1}
                >
                  Check User Status
                </Button>
                
                <Button
                  onClick={quickFix}
                  isLoading={isLoading}
                  loadingText="Fixing..."
                  colorScheme="green"
                  size="lg"
                  flex={1}
                >
                  Quick Fix Starter Distributions
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Check Results */}
        {checkResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">User Status</Heading>
                <Badge
                  colorScheme={checkResult.needs_fix ? 'red' : 'green'}
                  size="lg"
                >
                  {checkResult.needs_fix ? 'NEEDS FIX' : 'OK'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat>
                  <StatLabel>Has Starter Subscription</StatLabel>
                  <StatNumber color={checkResult.has_starter_subscription ? 'green.500' : 'red.500'}>
                    {checkResult.has_starter_subscription ? 'YES' : 'NO'}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Distributions Count</StatLabel>
                  <StatNumber color={checkResult.distributions_count > 0 ? 'green.500' : 'red.500'}>
                    {checkResult.distributions_count}
                  </StatNumber>
                  <StatHelpText>Expected: 5 (last 5 days)</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Divider my={4} />
              <Text><strong>Expected Daily Amount:</strong> {checkResult.expected_daily_amount?.toFixed(4)} TIC</Text>
              
              {checkResult.distributions && checkResult.distributions.length > 0 && (
                <>
                  <Divider my={4} />
                  <Heading size="sm" mb={3}>Current Distributions</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Amount</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {checkResult.distributions.map((dist: any, index: number) => (
                          <Tr key={index}>
                            <Td>{new Date(dist.distribution_date).toLocaleDateString()}</Td>
                            <Td>{dist.token_amount?.toFixed(4)} TIC</Td>
                            <Td>
                              <Badge colorScheme="green" size="sm">
                                {dist.status}
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

        {/* Fix Results */}
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
                {fixResult.success ? (
                  <Alert status="success">
                    <AlertIcon />
                    <AlertDescription>
                      {fixResult.message} - Created {fixResult.distributions_created} distributions 
                      at {fixResult.daily_amount?.toFixed(4)} TIC per day.
                      {fixResult.subscription_created && ' (Also created test subscription)'}
                    </AlertDescription>
                  </Alert>
                ) : (
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

                {fixResult.distributions && fixResult.distributions.length > 0 && (
                  <>
                    <Divider />
                    <Heading size="sm">Created Distributions</Heading>
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Amount</Th>
                            <Th>Status</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {fixResult.distributions.map((dist, index) => (
                            <Tr key={index}>
                              <Td>{new Date(dist.date).toLocaleDateString()}</Td>
                              <Td>
                                {dist.amount ? (
                                  <Text color="green.500">+{dist.amount.toFixed(4)} TIC</Text>
                                ) : (
                                  <Text color="gray.500">-</Text>
                                )}
                              </Td>
                              <Td>
                                <Badge
                                  colorScheme={dist.status === 'created' ? 'green' : 'red'}
                                  size="sm"
                                >
                                  {dist.status}
                                </Badge>
                                {dist.error && (
                                  <Text fontSize="xs" color="red.500" mt={1}>
                                    {dist.error}
                                  </Text>
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

        <Alert status="success">
          <AlertIcon />
          <AlertDescription>
            After fixing, the user will see their daily Starter TIC distributions: 1.37 TIC per day 
            in their dashboard's TIC Token Distribution section.
          </AlertDescription>
        </Alert>
      </VStack>
    </Box>
  );
};

export default QuickStarterFixPage;
