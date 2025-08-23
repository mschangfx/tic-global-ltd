'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  Card,
  CardBody,
  useToast,
  Code,
  Divider,
  Badge,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';

export default function DebugReferralPage() {
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleDebugUser = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/debug-referral?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setDebugResult(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to debug user',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugCode = async () => {
    if (!referralCode) {
      toast({
        title: 'Error',
        description: 'Please enter a referral code',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/debug-referral?code=${encodeURIComponent(referralCode)}`);
      const data = await response.json();
      setDebugResult(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to debug referral code',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestReferralFlow = async () => {
    if (!email || !referralCode) {
      toast({
        title: 'Error',
        description: 'Please enter both email and referral code',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-referral-flow',
          email,
          referralCode
        })
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test referral flow',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={4}>
            Referral System Debug Tool
          </Heading>
          <Text color="gray.600">
            Debug and test the referral system functionality
          </Text>
        </Box>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="md">
                Debug User Referral Data
              </Heading>
              <HStack>
                <Input
                  placeholder="Enter user email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  colorScheme="blue"
                  onClick={handleDebugUser}
                  isLoading={isLoading}
                >
                  Debug User
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="md">
                Debug Referral Code
              </Heading>
              <HStack>
                <Input
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
                <Button
                  colorScheme="green"
                  onClick={handleDebugCode}
                  isLoading={isLoading}
                >
                  Debug Code
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="md">
                Test Complete Referral Flow
              </Heading>
              <Text fontSize="sm" color="gray.600">
                This will test the complete flow: validate code → process referral registration
              </Text>
              <Button
                colorScheme="purple"
                onClick={handleTestReferralFlow}
                isLoading={isLoading}
                isDisabled={!email || !referralCode}
              >
                Test Referral Flow
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {testResult && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h2" size="md">
                  Test Results
                </Heading>
                {testResult.steps?.map((step: any, index: number) => (
                  <Box key={index}>
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="bold">
                        Step {step.step}: {step.name}
                      </Text>
                      <Badge
                        colorScheme={
                          step.status === 'success' ? 'green' :
                          step.status === 'failed' ? 'red' : 'yellow'
                        }
                      >
                        {step.status}
                      </Badge>
                    </HStack>
                    {step.result && (
                      <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap">
                        {JSON.stringify(step.result, null, 2)}
                      </Code>
                    )}
                    {index < testResult.steps.length - 1 && <Divider mt={4} />}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {debugResult && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h2" size="md">
                  Debug Results
                </Heading>
                
                {debugResult.statistics && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Statistics:</Text>
                    <VStack align="start" spacing={1}>
                      <Text>Total Users: {debugResult.statistics.totalUsers}</Text>
                      <Text>Users with Referral Codes: {debugResult.statistics.usersWithReferralCodes}</Text>
                      <Text>Total Referral Relationships: {debugResult.statistics.totalReferralRelationships}</Text>
                      <Text>User Referral Code Entries: {debugResult.statistics.userReferralCodeEntries}</Text>
                    </VStack>
                  </Box>
                )}

                {debugResult.codeValidation && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Code Validation:</Text>
                    <Alert status={debugResult.codeValidation.isValid ? 'success' : 'error'} mb={2}>
                      <AlertIcon />
                      Code is {debugResult.codeValidation.isValid ? 'VALID' : 'INVALID'}
                      {debugResult.codeValidation.validatedBy?.length > 0 && (
                        <Text ml={2}>
                          (Found in: {debugResult.codeValidation.validatedBy.join(', ')})
                        </Text>
                      )}
                    </Alert>
                  </Box>
                )}

                <Divider />
                
                <Box>
                  <Text fontWeight="bold" mb={2}>Raw Debug Data:</Text>
                  <Code p={4} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" maxH="400px" overflowY="auto">
                    {JSON.stringify(debugResult, null, 2)}
                  </Code>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}
