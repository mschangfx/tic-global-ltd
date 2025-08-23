'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  useToast,
  Spinner,
  Badge,
  SimpleGrid,
  Input,
  FormControl,
  FormLabel,
  Textarea,
  Divider,
  Alert,
  AlertIcon,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { getSession } from 'next-auth/react';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message: string;
  data?: any;
  error?: string;
}

export default function TestReferralRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [testReferralCode, setTestReferralCode] = useState<string>('');
  const [testNewUserEmail, setTestNewUserEmail] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    const getUserEmail = async () => {
      const session = await getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getUserEmail();
  }, []);

  const addTestResult = (step: string, status: TestResult['status'], message: string, data?: any, error?: string) => {
    setTestResults(prev => {
      const newResults = [...prev];
      const existingIndex = newResults.findIndex(r => r.step === step);
      
      if (existingIndex >= 0) {
        newResults[existingIndex] = { step, status, message, data, error };
      } else {
        newResults.push({ step, status, message, data, error });
      }
      
      return newResults;
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testReferralCodeValidation = async () => {
    if (!testReferralCode) {
      toast({
        title: 'Error',
        description: 'Please enter a referral code to test',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    addTestResult('validation', 'running', 'Testing referral code validation...');

    try {
      const response = await fetch(`/api/referrals/validate?code=${encodeURIComponent(testReferralCode)}`);
      const data = await response.json();

      if (data.isValid) {
        addTestResult('validation', 'success', `Valid referral code from ${data.referrer.email}`, data);
      } else {
        addTestResult('validation', 'failed', data.message || 'Invalid referral code', data);
      }
    } catch (error) {
      addTestResult('validation', 'failed', 'Error validating referral code', null, String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const testReferralRegistration = async () => {
    if (!testReferralCode || !testNewUserEmail) {
      toast({
        title: 'Error',
        description: 'Please enter both referral code and new user email',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    addTestResult('registration', 'running', 'Testing referral registration process...');

    try {
      const response = await fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: testReferralCode,
          newUserEmail: testNewUserEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        addTestResult('registration', 'success', `Referral registration successful for ${testNewUserEmail}`, data);
      } else {
        addTestResult('registration', 'failed', data.message || 'Registration failed', data);
      }
    } catch (error) {
      addTestResult('registration', 'failed', 'Error processing referral registration', null, String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const testCompleteFlow = async () => {
    if (!testReferralCode || !testNewUserEmail) {
      toast({
        title: 'Error',
        description: 'Please enter both referral code and new user email',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    clearResults();

    // Step 1: Validate referral code
    addTestResult('step1', 'running', 'Step 1: Validating referral code...');
    
    try {
      const validateResponse = await fetch(`/api/referrals/validate?code=${encodeURIComponent(testReferralCode)}`);
      const validateData = await validateResponse.json();

      if (!validateData.isValid) {
        addTestResult('step1', 'failed', 'Invalid referral code', validateData);
        setIsLoading(false);
        return;
      }

      addTestResult('step1', 'success', `Valid referral code from ${validateData.referrer.email}`, validateData);

      // Step 2: Process referral registration
      addTestResult('step2', 'running', 'Step 2: Processing referral registration...');

      const registerResponse = await fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: testReferralCode,
          newUserEmail: testNewUserEmail
        })
      });

      const registerData = await registerResponse.json();

      if (!registerData.success) {
        addTestResult('step2', 'failed', registerData.message || 'Registration failed', registerData);
        setIsLoading(false);
        return;
      }

      addTestResult('step2', 'success', 'Referral registration successful', registerData);

      // Step 3: Verify relationship was created
      addTestResult('step3', 'running', 'Step 3: Verifying referral relationship...');

      const verifyResponse = await fetch(`/api/debug-referral?action=check_relationship&referrerEmail=${validateData.referrer.email}&referredEmail=${testNewUserEmail}`);
      const verifyData = await verifyResponse.json();

      if (verifyData.relationshipExists) {
        addTestResult('step3', 'success', 'Referral relationship verified in database', verifyData);
      } else {
        addTestResult('step3', 'failed', 'Referral relationship not found in database', verifyData);
      }

    } catch (error) {
      addTestResult('error', 'failed', 'Error during complete flow test', null, String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const generateTestReferralCode = async () => {
    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'User email not available',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    addTestResult('generate', 'running', 'Generating test referral code...');

    try {
      const response = await fetch(`/api/referrals/user-data?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      if (data.referralCode) {
        setTestReferralCode(data.referralCode);
        addTestResult('generate', 'success', `Generated referral code: ${data.referralCode}`, data);
      } else {
        addTestResult('generate', 'failed', 'Failed to generate referral code', data);
      }
    } catch (error) {
      addTestResult('generate', 'failed', 'Error generating referral code', null, String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'green';
      case 'failed': return 'red';
      case 'running': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="lg">🧪 Referral Registration Test</Heading>
              <Text color="gray.600">
                Test the complete referral registration flow to identify issues
              </Text>
              
              {userEmail && (
                <Badge colorScheme="blue" alignSelf="flex-start">
                  Testing as: {userEmail}
                </Badge>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Test Configuration */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Test Configuration</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Referral Code to Test</FormLabel>
                  <HStack>
                    <Input
                      value={testReferralCode}
                      onChange={(e) => setTestReferralCode(e.target.value)}
                      placeholder="Enter referral code"
                    />
                    <Button
                      onClick={generateTestReferralCode}
                      isLoading={isLoading}
                      size="sm"
                      colorScheme="blue"
                    >
                      Use Mine
                    </Button>
                  </HStack>
                </FormControl>

                <FormControl>
                  <FormLabel>New User Email (for testing)</FormLabel>
                  <Input
                    value={testNewUserEmail}
                    onChange={(e) => setTestNewUserEmail(e.target.value)}
                    placeholder="test@example.com"
                    type="email"
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <Heading size="md">Test Controls</Heading>
              <HStack spacing={4} wrap="wrap">
                <Button
                  onClick={testReferralCodeValidation}
                  isLoading={isLoading}
                  colorScheme="blue"
                  isDisabled={!testReferralCode}
                >
                  Test Code Validation
                </Button>
                <Button
                  onClick={testReferralRegistration}
                  isLoading={isLoading}
                  colorScheme="green"
                  isDisabled={!testReferralCode || !testNewUserEmail}
                >
                  Test Registration
                </Button>
                <Button
                  onClick={testCompleteFlow}
                  isLoading={isLoading}
                  colorScheme="purple"
                  isDisabled={!testReferralCode || !testNewUserEmail}
                >
                  Test Complete Flow
                </Button>
                <Button
                  onClick={clearResults}
                  variant="outline"
                  colorScheme="gray"
                >
                  Clear Results
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Results */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Test Results</Heading>
            {testResults.length === 0 ? (
              <Text color="gray.500">No test results yet. Run a test to see results.</Text>
            ) : (
              <VStack align="stretch" spacing={4}>
                {testResults.map((result, index) => (
                  <Alert key={index} status={result.status === 'success' ? 'success' : result.status === 'failed' ? 'error' : 'info'}>
                    <AlertIcon />
                    <Box flex="1">
                      <HStack justify="space-between" align="flex-start">
                        <VStack align="flex-start" spacing={1}>
                          <HStack>
                            <Text fontWeight="bold">
                              {getStatusIcon(result.status)} {result.step}
                            </Text>
                            <Badge colorScheme={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                          </HStack>
                          <Text>{result.message}</Text>
                          {result.error && (
                            <Text color="red.500" fontSize="sm">
                              Error: {result.error}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                      
                      {result.data && (
                        <Accordion allowToggle mt={2}>
                          <AccordionItem>
                            <AccordionButton>
                              <Box flex="1" textAlign="left">
                                View Data
                              </Box>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel pb={4}>
                              <Code display="block" whiteSpace="pre-wrap" p={2} bg="gray.50">
                                {JSON.stringify(result.data, null, 2)}
                              </Code>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </Box>
                  </Alert>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
