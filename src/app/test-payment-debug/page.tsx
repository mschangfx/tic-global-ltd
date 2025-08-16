'use client';

import {
  Box,
  Container,
  VStack,
  Heading,
  Button,
  Text,
  Card,
  CardBody,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Select,
  Alert,
  AlertIcon,
  Code,
  Divider
} from '@chakra-ui/react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestPaymentDebug() {
  const { data: session } = useSession();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('starter');

  const planOptions = [
    { id: 'starter', name: 'Starter Plan', price: 10.00 },
    { id: 'vip', name: 'VIP Plan', price: 138.00 }
  ];

  const testPaymentFlow = async () => {
    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a user email',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setTestResults(null);

    try {
      console.log('🧪 Testing payment flow...');
      
      const response = await fetch('/api/debug/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail,
          planId: selectedPlan
        })
      });

      const data = await response.json();
      
      console.log('🧪 Test results:', data);
      setTestResults(data);

      if (data.success) {
        toast({
          title: 'Test Successful',
          description: 'Payment flow test completed successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Payment flow test failed',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('❌ Test error:', error);
      toast({
        title: 'Test Error',
        description: 'Failed to run payment flow test',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRealPayment = async () => {
    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a user email',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('💳 Testing real payment API...');
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan
        })
      });

      const data = await response.json();
      
      console.log('💳 Real payment results:', data);
      setTestResults(data);

      if (data.success) {
        toast({
          title: 'Payment Successful',
          description: data.message || 'Payment completed successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Payment Failed',
          description: data.error || 'Payment failed',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to process payment',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Payment Flow Debug Tool
        </Heading>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>User Email:</FormLabel>
                <Input
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder={session?.user?.email || "Enter user email"}
                />
                {session?.user?.email && (
                  <Button
                    size="sm"
                    mt={2}
                    onClick={() => setUserEmail(session.user?.email || '')}
                  >
                    Use Current Session Email
                  </Button>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Plan:</FormLabel>
                <Select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                  {planOptions.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <VStack spacing={3}>
                <Button
                  colorScheme="blue"
                  onClick={testPaymentFlow}
                  isLoading={isLoading}
                  w="full"
                >
                  Test Payment Flow (Debug)
                </Button>

                <Button
                  colorScheme="green"
                  onClick={testRealPayment}
                  isLoading={isLoading}
                  w="full"
                >
                  Test Real Payment API
                </Button>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {testResults && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Results</Heading>
                
                {testResults.success ? (
                  <Alert status="success">
                    <AlertIcon />
                    {testResults.message}
                  </Alert>
                ) : (
                  <Alert status="error">
                    <AlertIcon />
                    {testResults.error}
                  </Alert>
                )}

                <Divider />

                <Box>
                  <Text fontWeight="bold" mb={2}>Raw Response:</Text>
                  <Code p={4} borderRadius="md" w="full" whiteSpace="pre-wrap">
                    {JSON.stringify(testResults, null, 2)}
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
