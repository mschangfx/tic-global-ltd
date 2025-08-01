'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Code,
  Heading,
  useToast,
  Alert,
  AlertIcon,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Badge,
  HStack,
  Input,
  FormControl,
  FormLabel,
  Divider
} from '@chakra-ui/react';
import { createClient } from '@/lib/supabase/client';

export default function TestReferralRealDataPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const supabase = createClient();
  const toast = useToast();

  const getCurrentUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || '';
  };

  const testRealData = async (email?: string) => {
    setIsLoading(true);
    try {
      const testEmail = email || await getCurrentUserEmail();
      
      if (!testEmail) {
        toast({
          title: 'No User Email',
          description: 'Please log in or enter an email address',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch(`/api/referral/test-real-data?email=${encodeURIComponent(testEmail)}`);
      const data = await response.json();
      setTestResults(data);

      if (data.success) {
        toast({
          title: 'Real Data Test Complete',
          description: `Tested referral data for ${testEmail}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Failed to test real data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing real data:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to test API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createReferralCode = async () => {
    try {
      const email = userEmail || await getCurrentUserEmail();
      
      const response = await fetch('/api/referral/test-real-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: email,
          action: 'create-referral-code'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Referral Code Created',
          description: `Created referral code: ${data.data.referral_code}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        // Refresh test results
        testRealData(email);
      } else {
        toast({
          title: 'Creation Failed',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error creating referral code:', error);
    }
  };

  const simulateCommission = async () => {
    try {
      const email = userEmail || await getCurrentUserEmail();
      
      const response = await fetch('/api/referral/test-real-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: email,
          action: 'simulate-commission'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Test Commission Created',
          description: `Created commission: $${data.data.commission_amount}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        // Refresh test results
        testRealData(email);
      } else {
        toast({
          title: 'Simulation Failed',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error simulating commission:', error);
    }
  };

  return (
    <Box p={6} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Real Referral Transaction Test</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page tests the real referral transaction system that works for all users, not hardcoded data.
        </Alert>

        <Card>
          <CardHeader>
            <Heading size="md">Test Controls</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Test User Email (optional - will use current user if empty)</FormLabel>
                <Input
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </FormControl>
              
              <HStack spacing={4} w="full">
                <Button
                  onClick={() => testRealData(userEmail)}
                  isLoading={isLoading}
                  loadingText="Testing..."
                  colorScheme="blue"
                  flex={1}
                >
                  Test Real Data
                </Button>
                
                <Button
                  onClick={createReferralCode}
                  colorScheme="green"
                  flex={1}
                >
                  Create Referral Code
                </Button>
                
                <Button
                  onClick={simulateCommission}
                  colorScheme="purple"
                  flex={1}
                >
                  Simulate Commission
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {testResults && (
          <VStack spacing={4} align="stretch">
            <Heading size="md">Test Results for: {testResults.userEmail}</Heading>
            
            {testResults.success ? (
              <>
                {/* Real-time Stats */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Real-Time Statistics</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                      <Box textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                          {testResults.realTimeStats.totalReferrals}
                        </Text>
                        <Text fontSize="sm">Total Referrals</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" color="green.500">
                          {testResults.realTimeStats.directReferrals}
                        </Text>
                        <Text fontSize="sm">Direct Referrals</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                          ${testResults.realTimeStats.totalEarnings}
                        </Text>
                        <Text fontSize="sm">Total Earnings</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                          ${testResults.realTimeStats.monthlyEarnings}
                        </Text>
                        <Text fontSize="sm">Monthly Earnings</Text>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Database Status */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Database Connection Status</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                      {Object.entries(testResults.databaseStatus).map(([table, status]) => (
                        <Box key={table} textAlign="center">
                          <Badge colorScheme={status ? 'green' : 'red'} fontSize="sm" p={2}>
                            {status ? '✅' : '❌'} {table.replace('Table', '')}
                          </Badge>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Detailed Results */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Detailed Test Results</Heading>
                  </CardHeader>
                  <CardBody>
                    <Code p={4} borderRadius="md" display="block" whiteSpace="pre-wrap" fontSize="xs">
                      {JSON.stringify(testResults.testResults, null, 2)}
                    </Code>
                  </CardBody>
                </Card>
              </>
            ) : (
              <Alert status="error">
                <AlertIcon />
                {testResults.error}
              </Alert>
            )}
          </VStack>
        )}

        <Alert status="success">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">✅ Real Transaction Features Implemented:</Text>
            <Text>• Universal user support - works for any authenticated user</Text>
            <Text>• Real database queries - no hardcoded test data</Text>
            <Text>• Automatic commission calculation on VIP plan purchases</Text>
            <Text>• Real-time earnings tracking from actual transactions</Text>
            <Text>• Multi-level referral relationship tracking</Text>
            <Text>• Monthly and total earnings calculation</Text>
          </VStack>
        </Alert>
      </VStack>
    </Box>
  );
}
