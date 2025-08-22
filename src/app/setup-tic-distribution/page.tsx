'use client';

import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge,
  Code,
  Textarea,
  useColorModeValue,
  useToast,
  Divider,
  List,
  ListItem,
  ListIcon,
  Progress
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';

export default function SetupTicDistributionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');

  const setupSteps = [
    'Creating database tables',
    'Setting up TIC distribution function',
    'Configuring subscription plans',
    'Setting up permissions',
    'Verifying setup'
  ];

  const runSetup = async () => {
    setIsLoading(true);
    setError(null);
    setSetupResult(null);
    setCurrentStep(0);

    try {
      // Step 1: Run the complete setup
      setCurrentStep(1);
      const response = await fetch('/api/admin/setup-tic-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setCurrentStep(2);
      
      // Step 2: Verify the setup
      setCurrentStep(3);
      const verifyResponse = await fetch('/api/test/distribution-status');
      const verifyData = await verifyResponse.json();

      setCurrentStep(4);
      
      // Step 3: Test the function
      setCurrentStep(5);
      const testResponse = await fetch('/api/test/wallet-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: 'test@example.com',
          amount: 1.37,
          planId: 'starter'
        })
      });

      const testData = await testResponse.json();

      setSetupResult({
        setup: data,
        verification: verifyData,
        test: testData
      });

      toast({
        title: 'Setup Completed',
        description: 'TIC distribution system has been set up successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Setup Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setCurrentStep(0);
    }
  };

  const checkCurrentStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test/distribution-status');
      const data = await response.json();
      setSetupResult({ verification: data });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh">
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        <Heading as="h1" size="xl" color={textColor} textAlign="center">
          TIC Distribution System Setup
        </Heading>

        <Text textAlign="center" color="gray.500">
          Set up the complete TIC distribution system including database tables, functions, and permissions
        </Text>

        {/* Setup Progress */}
        {isLoading && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4}>
                <Text fontWeight="semibold">Setting up TIC distribution system...</Text>
                <Progress value={(currentStep / setupSteps.length) * 100} colorScheme="blue" w="100%" />
                <Text fontSize="sm" color="gray.500">
                  {currentStep > 0 ? setupSteps[currentStep - 1] : 'Initializing...'}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Setup Instructions */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="md" color={textColor}>
                What this setup will do:
              </Heading>
              
              <List spacing={2}>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Create <Code>user_wallets</Code> table for storing user balances
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Create <Code>wallet_transactions</Code> table for transaction history
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Create <Code>tic_distribution_log</Code> table for tracking distributions
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Create <Code>subscription_plans</Code> table with TIC amounts
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Create <Code>user_subscriptions</Code> table for user plan tracking
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Create <Code>increment_tic_balance_daily_distribution</Code> function
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Set up Row Level Security (RLS) policies
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Insert default subscription plans (Starter, VIP)
                </ListItem>
              </List>

              <Divider />

              <HStack spacing={4}>
                <Button
                  colorScheme="blue"
                  onClick={runSetup}
                  isLoading={isLoading}
                  loadingText="Setting up..."
                  flex={1}
                >
                  Run Complete Setup
                </Button>
                <Button
                  colorScheme="gray"
                  variant="outline"
                  onClick={checkCurrentStatus}
                  isLoading={isLoading}
                  loadingText="Checking..."
                  flex={1}
                >
                  Check Current Status
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Setup Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {setupResult && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md" color={textColor}>
                  Setup Results
                </Heading>
                
                {/* Setup Status */}
                {setupResult.setup && (
                  <VStack spacing={2} align="stretch">
                    <Text fontWeight="semibold">Database Setup:</Text>
                    <Badge colorScheme={setupResult.setup.success ? 'green' : 'red'}>
                      {setupResult.setup.success ? 'SUCCESS' : 'FAILED'}
                    </Badge>
                    {setupResult.setup.message && (
                      <Text fontSize="sm">{setupResult.setup.message}</Text>
                    )}
                  </VStack>
                )}

                {/* Verification Status */}
                {setupResult.verification && (
                  <VStack spacing={2} align="stretch">
                    <Text fontWeight="semibold">System Verification:</Text>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Database Function:</Text>
                      <Badge colorScheme={setupResult.verification.database_function?.exists ? 'green' : 'red'}>
                        {setupResult.verification.database_function?.exists ? 'EXISTS' : 'MISSING'}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Active Subscriptions:</Text>
                      <Badge colorScheme="blue">
                        {setupResult.verification.active_subscriptions?.count || 0}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Distribution Ran Today:</Text>
                      <Badge colorScheme={setupResult.verification.today_distributions?.has_run_today ? 'green' : 'orange'}>
                        {setupResult.verification.today_distributions?.has_run_today ? 'YES' : 'NO'}
                      </Badge>
                    </HStack>
                  </VStack>
                )}

                {/* Test Results */}
                {setupResult.test && (
                  <VStack spacing={2} align="stretch">
                    <Text fontWeight="semibold">Function Test:</Text>
                    <Badge colorScheme={setupResult.test.success ? 'green' : 'red'}>
                      {setupResult.test.success ? 'PASSED' : 'FAILED'}
                    </Badge>
                    {setupResult.test.message && (
                      <Text fontSize="sm">{setupResult.test.message}</Text>
                    )}
                  </VStack>
                )}

                {/* Raw Data */}
                <Textarea
                  value={JSON.stringify(setupResult, null, 2)}
                  readOnly
                  rows={15}
                  fontFamily="mono"
                  fontSize="sm"
                />
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Manual Setup Instructions */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="md" color={textColor}>
                Manual Setup (if automatic setup fails)
              </Heading>
              
              <Alert status="info">
                <AlertIcon />
                <VStack align="stretch" spacing={2}>
                  <Text fontWeight="semibold">If the automatic setup fails:</Text>
                  <Text fontSize="sm">
                    1. Go to your Supabase dashboard → SQL Editor
                  </Text>
                  <Text fontSize="sm">
                    2. Copy and paste the contents of <Code>COMPLETE_TIC_DISTRIBUTION_SETUP.sql</Code>
                  </Text>
                  <Text fontSize="sm">
                    3. Execute the SQL script
                  </Text>
                  <Text fontSize="sm">
                    4. Return here and click "Check Current Status"
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
