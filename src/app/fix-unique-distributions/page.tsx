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
} from '@chakra-ui/react';

interface FixResult {
  date: string;
  plan: string;
  amount?: number;
  status: string;
  error?: string;
  id?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  userEmail?: string;
  subscriptions?: number;
  distributions_created?: number;
  duplicates_removed?: number;
  results?: FixResult[];
}

const FixUniqueDistributionsPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const toast = useToast();

  const fixDistributions = async () => {
    if (!userEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    
    try {
      console.log('🔧 Starting unique distribution fix for:', userEmail);
      
      const res = await fetch('/api/debug/fix-unique-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userEmail: userEmail.trim() })
      });

      const data = await res.json();
      console.log('📊 API Response:', data);
      
      setResponse(data);

      if (data.success) {
        toast({
          title: 'Success!',
          description: data.message || 'Unique distributions created successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fix distributions',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setResponse({
        success: false,
        error: 'Request failed',
        details: errorMessage
      });
      
      toast({
        title: 'Request Failed',
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
          Fix Duplicate TIC Distributions
        </Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Unique Distribution Fix</AlertTitle>
            <AlertDescription>
              This tool will remove duplicate distributions and create exactly ONE distribution per day 
              for the last 5 days. No more duplicate dates in your distribution history!
            </AlertDescription>
          </Box>
        </Alert>

        <Card>
          <CardHeader>
            <Heading size="md">Enter Your Email</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  placeholder="your-email@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </FormControl>
              
              <Button
                onClick={fixDistributions}
                isLoading={isLoading}
                loadingText="Fixing distributions..."
                colorScheme="green"
                size="lg"
                width="full"
              >
                Fix Duplicate Distributions
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Response Display */}
        {response && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Results</Heading>
                <Badge
                  colorScheme={response.success ? 'green' : 'red'}
                  size="lg"
                >
                  {response.success ? 'SUCCESS' : 'ERROR'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                {/* Success Message */}
                {response.success && response.message && (
                  <Alert status="success">
                    <AlertIcon />
                    <AlertDescription>{response.message}</AlertDescription>
                  </Alert>
                )}

                {/* Error Message */}
                {!response.success && (
                  <Alert status="error">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Error: {response.error}</AlertTitle>
                      {response.details && (
                        <AlertDescription mt={2}>
                          {response.details}
                        </AlertDescription>
                      )}
                    </Box>
                  </Alert>
                )}

                {/* Success Summary */}
                {response.success && (
                  <VStack align="stretch" spacing={2}>
                    <Text><strong>User:</strong> {response.userEmail}</Text>
                    <Text><strong>Active Subscriptions:</strong> {response.subscriptions}</Text>
                    <Text><strong>Unique Distributions Created:</strong> {response.distributions_created}</Text>
                    <Text><strong>Duplicate Distributions Removed:</strong> {response.duplicates_removed}</Text>
                  </VStack>
                )}

                {/* Results Table */}
                {response.results && response.results.length > 0 && (
                  <>
                    <Divider />
                    <Heading size="sm">Distribution Results</Heading>
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Plan</Th>
                            <Th>Amount</Th>
                            <Th>Status</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {response.results.map((result, index) => (
                            <Tr key={index}>
                              <Td>{new Date(result.date).toLocaleDateString()}</Td>
                              <Td>
                                <Badge colorScheme="blue" variant="outline">
                                  {result.plan}
                                </Badge>
                              </Td>
                              <Td>
                                {result.amount ? (
                                  <Text fontWeight="medium" color="green.500">
                                    +{result.amount.toFixed(4)} TIC
                                  </Text>
                                ) : (
                                  <Text color="gray.500">-</Text>
                                )}
                              </Td>
                              <Td>
                                <Badge
                                  colorScheme={result.status === 'created' ? 'green' : 'red'}
                                  size="sm"
                                >
                                  {result.status}
                                </Badge>
                                {result.error && (
                                  <Text fontSize="xs" color="red.500" mt={1}>
                                    {result.error}
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

        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            After fixing the distributions, go back to your dashboard to see the updated TIC Token Distribution 
            section with unique dates for each day.
          </AlertDescription>
        </Alert>
      </VStack>
    </Box>
  );
};

export default FixUniqueDistributionsPage;
