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
  useColorModeValue,
  useToast,
  Code,
  List,
  ListItem,
  ListIcon,
  Divider
} from '@chakra-ui/react';
import { FaCheckCircle, FaTimesCircle, FaDatabase, FaTools, FaExclamationTriangle } from 'react-icons/fa';

export default function AdminSetupDatabasePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');

  const checkDatabaseStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/setup-database-functions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setStatusResult(data);
      toast({
        title: 'Status Check Complete',
        description: data.function_exists ? 'Database function is working' : 'Database function needs setup',
        status: data.function_exists ? 'success' : 'warning',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Status Check Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupDatabaseFunctions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/setup-database-functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setSetupResult(data);
      toast({
        title: data.success ? 'Setup Complete' : 'Setup Required',
        description: data.message,
        status: data.success ? 'success' : 'warning',
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
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh">
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        <Heading as="h1" size="xl" color={textColor} textAlign="center">
          Database Setup for TIC Distribution
        </Heading>

        <Text textAlign="center" color="gray.500">
          Check and setup database functions required for TIC daily token distribution
        </Text>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            leftIcon={<FaDatabase />}
            colorScheme="blue"
            onClick={checkDatabaseStatus}
            isLoading={isLoading}
            loadingText="Checking..."
            size="lg"
          >
            Check Database Status
          </Button>
          <Button
            leftIcon={<FaTools />}
            colorScheme="green"
            onClick={setupDatabaseFunctions}
            isLoading={isLoading}
            loadingText="Setting up..."
            size="lg"
          >
            Setup Database Functions
          </Button>
        </HStack>

        {/* Error Display */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Result */}
        {statusResult && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h3" size="md" color={textColor}>
                    Database Function Status
                  </Heading>
                  <Badge 
                    colorScheme={statusResult.function_exists ? 'green' : 'red'}
                    size="lg"
                    px={3}
                    py={1}
                  >
                    {statusResult.function_exists ? 'EXISTS' : 'MISSING'}
                  </Badge>
                </HStack>

                <HStack spacing={3}>
                  <FaCheckCircle 
                    color={statusResult.function_exists ? 'green' : 'red'} 
                    size={20} 
                  />
                  <Text color={textColor}>
                    increment_tic_balance_daily_distribution function
                  </Text>
                </HStack>

                {statusResult.function_error && (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription>
                      Function Error: {statusResult.function_error}
                    </AlertDescription>
                  </Alert>
                )}

                <Text fontSize="sm" color="gray.500">
                  Checked by: {statusResult.checked_by} at {new Date(statusResult.timestamp).toLocaleString()}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Setup Result */}
        {setupResult && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h3" size="md" color={textColor}>
                    Setup Result
                  </Heading>
                  <Badge 
                    colorScheme={setupResult.success ? 'green' : 'orange'}
                    size="lg"
                    px={3}
                    py={1}
                  >
                    {setupResult.success ? 'SUCCESS' : 'MANUAL SETUP REQUIRED'}
                  </Badge>
                </HStack>

                <Alert status={setupResult.success ? 'success' : 'warning'}>
                  <AlertIcon />
                  <AlertDescription>
                    {setupResult.message}
                  </AlertDescription>
                </Alert>

                {setupResult.instructions && (
                  <VStack spacing={3} align="stretch">
                    <Text fontWeight="semibold" color={textColor}>
                      Manual Setup Instructions:
                    </Text>
                    <List spacing={2}>
                      {setupResult.instructions.map((instruction: string, index: number) => (
                        <ListItem key={index}>
                          <ListIcon as={FaExclamationTriangle} color="orange.500" />
                          {instruction}
                        </ListItem>
                      ))}
                    </List>
                  </VStack>
                )}

                {setupResult.sql_file && (
                  <VStack spacing={2} align="stretch">
                    <Text fontWeight="semibold" color={textColor}>
                      SQL File to Execute:
                    </Text>
                    <Code p={3} borderRadius="md">
                      {setupResult.sql_file}
                    </Code>
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Information Card */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h4" size="sm" color={textColor}>
                About Database Functions
              </Heading>
              <Text fontSize="sm" color="gray.600">
                The TIC distribution system requires specific database functions to work properly:
              </Text>
              <List spacing={2} fontSize="sm" color="gray.600">
                <ListItem>
                  <ListIcon as={FaCheckCircle} color="green.500" />
                  <strong>increment_tic_balance_daily_distribution:</strong> Updates user TIC balances and creates transaction history
                </ListItem>
                <ListItem>
                  <ListIcon as={FaCheckCircle} color="green.500" />
                  <strong>Automatic wallet creation:</strong> Creates user wallets if they don't exist
                </ListItem>
                <ListItem>
                  <ListIcon as={FaCheckCircle} color="green.500" />
                  <strong>Transaction logging:</strong> Records all TIC distribution transactions
                </ListItem>
              </List>
              
              <Divider />
              
              <Text fontSize="sm" color="gray.600">
                If manual setup is required, you'll need to execute the SQL functions in your Supabase dashboard.
                The functions are defined in the <Code>CREATE_TIC_DISTRIBUTION_FUNCTION.sql</Code> file.
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
