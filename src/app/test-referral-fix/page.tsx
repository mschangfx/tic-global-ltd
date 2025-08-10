'use client';

import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Badge,
  HStack,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Divider,
  Code,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaUser, FaLink } from 'react-icons/fa';

export default function TestReferralFixPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('testuser@example.com');
  const [referralCode, setReferralCode] = useState('');
  const toast = useToast();

  const runReferralTest = async () => {
    setIsLoading(true);
    setTestResults(null);

    try {
      // Step 1: Create a referral code for the current user
      const createCodeResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-referral-code',
          referralCode: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          referralLink: `https://ticgloballtd.com/join?ref=TEST123`
        })
      });

      const createResult = await createCodeResponse.json();
      
      if (!createResult.success) {
        throw new Error('Failed to create referral code');
      }

      // Step 2: Get the created referral code
      const getDataResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-referral-data' })
      });

      const referralData = await getDataResponse.json();
      
      if (!referralData.success) {
        throw new Error('Failed to get referral data');
      }

      const userReferralCode = referralData.data.referralCode;
      setReferralCode(userReferralCode);

      // Step 3: Test referral validation
      const validateResponse = await fetch(`/api/referrals/validate?code=${userReferralCode}`);
      const validateResult = await validateResponse.json();

      // Step 4: Test referral registration (simulate new user signup)
      const registerResponse = await fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: userReferralCode,
          newUserEmail: testEmail
        })
      });

      const registerResult = await registerResponse.json();

      setTestResults({
        createCode: createResult,
        referralData: referralData.data,
        validation: validateResult,
        registration: registerResult,
        referralCode: userReferralCode
      });

      toast({
        title: 'Referral Test Completed',
        description: 'Check the results below',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRegistrationFlow = async () => {
    if (!referralCode) {
      toast({
        title: 'No Referral Code',
        description: 'Please run the referral test first to get a referral code',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate the full registration flow
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!',
          country: 'Philippines',
          referralId: referralCode
        })
      });

      const result = await registerResponse.json();

      if (registerResponse.ok) {
        toast({
          title: 'Registration Test Successful',
          description: 'User registered and referral should be processed',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Registration Test Failed',
          description: result.error || 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error: any) {
      toast({
        title: 'Registration Test Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={8} maxW="4xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>🔗 Referral System Test</Heading>
          <Text color="gray.600">
            Test the referral link functionality and registration flow
          </Text>
        </Box>

        <Alert status="info">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">What This Test Does:</Text>
            <Text fontSize="sm">1. Creates a referral code for your account</Text>
            <Text fontSize="sm">2. Validates the referral code works</Text>
            <Text fontSize="sm">3. Tests referral registration process</Text>
            <Text fontSize="sm">4. Simulates full user registration with referral</Text>
          </VStack>
        </Alert>

        <Card>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Test User Email</FormLabel>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="testuser@example.com"
                />
              </FormControl>

              <HStack spacing={4} width="100%">
                <Button
                  colorScheme="blue"
                  onClick={runReferralTest}
                  isLoading={isLoading}
                  flex={1}
                >
                  Run Referral Test
                </Button>
                <Button
                  colorScheme="green"
                  onClick={testRegistrationFlow}
                  isLoading={isLoading}
                  isDisabled={!referralCode}
                  flex={1}
                >
                  Test Full Registration
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {testResults && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Test Results</Heading>

                <Box>
                  <Text fontWeight="bold" mb={2}>1. Referral Code Creation:</Text>
                  <Badge colorScheme={testResults.createCode.success ? 'green' : 'red'}>
                    {testResults.createCode.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                  {testResults.referralCode && (
                    <Text mt={2}>
                      <strong>Your Referral Code:</strong> <Code>{testResults.referralCode}</Code>
                    </Text>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Text fontWeight="bold" mb={2}>2. Referral Code Validation:</Text>
                  <Badge colorScheme={testResults.validation.isValid ? 'green' : 'red'}>
                    {testResults.validation.isValid ? 'VALID' : 'INVALID'}
                  </Badge>
                  <Text mt={2} fontSize="sm">
                    {testResults.validation.message}
                  </Text>
                </Box>

                <Divider />

                <Box>
                  <Text fontWeight="bold" mb={2}>3. Referral Registration:</Text>
                  <Badge colorScheme={testResults.registration.success ? 'green' : 'red'}>
                    {testResults.registration.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                  <Text mt={2} fontSize="sm">
                    {testResults.registration.message}
                  </Text>
                </Box>

                {testResults.referralData && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontWeight="bold" mb={2}>4. Your Referral Data:</Text>
                      <List spacing={1} fontSize="sm">
                        <ListItem>
                          <ListIcon as={FaUser} color="blue.500" />
                          Total Referrals: {testResults.referralData.totalReferrals || 0}
                        </ListItem>
                        <ListItem>
                          <ListIcon as={FaLink} color="green.500" />
                          Referral Link: <Code fontSize="xs">{testResults.referralData.referralLink}</Code>
                        </ListItem>
                      </List>
                    </Box>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Next Steps:</Text>
            <Text fontSize="sm">1. Share your referral link with friends</Text>
            <Text fontSize="sm">2. When they register using your link, they should appear in your community</Text>
            <Text fontSize="sm">3. Check the Referrals page → Community tab to see your referrals</Text>
          </VStack>
        </Alert>
      </VStack>
    </Box>
  );
}
