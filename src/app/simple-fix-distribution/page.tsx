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
  Code,
  Divider,
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
  results?: FixResult[];
}

const SimpleFixDistributionPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const toast = useToast();

  const fixDistributions = async () => {
    setIsLoading(true);
    setResponse(null);
    
    try {
      console.log('🔧 Starting distribution fix...');
      
      const res = await fetch('/api/debug/simple-fix-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      console.log('📊 API Response:', data);
      
      setResponse(data);

      if (data.success) {
        toast({
          title: 'Success!',
          description: data.message || 'Distribution dates fixed successfully',
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
          Simple TIC Distribution Fix
        </Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Distribution Fix Tool</AlertTitle>
            <AlertDescription>
              This tool will create proper TIC distributions for the last 5 days with unique dates.
              It includes better error handling and debugging information.
            </AlertDescription>
          </Box>
        </Alert>

        <Button
          onClick={fixDistributions}
          isLoading={isLoading}
          loadingText="Fixing distributions..."
          colorScheme="green"
          size="lg"
        >
          Fix TIC Distribution Dates
        </Button>

        {/* Response Display */}
        {response && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">API Response</Heading>
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
                          <Code colorScheme="red" p={2} borderRadius="md" display="block">
                            {response.details}
                          </Code>
                        </AlertDescription>
                      )}
                    </Box>
                  </Alert>
                )}

                {/* Success Details */}
                {response.success && (
                  <VStack align="stretch" spacing={2}>
                    <Text><strong>User:</strong> {response.userEmail}</Text>
                    <Text><strong>Subscriptions:</strong> {response.subscriptions}</Text>
                    <Text><strong>Distributions Created:</strong> {response.distributions_created}</Text>
                  </VStack>
                )}

                {/* Results */}
                {response.results && response.results.length > 0 && (
                  <>
                    <Divider />
                    <Heading size="sm">Distribution Results</Heading>
                    <VStack align="stretch" spacing={2}>
                      {response.results.map((result, index) => (
                        <HStack key={index} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">{result.date}</Text>
                            <Text fontSize="sm" color="gray.600">{result.plan}</Text>
                          </VStack>
                          <VStack align="end" spacing={1}>
                            {result.amount && (
                              <Text fontWeight="medium" color="green.500">
                                +{result.amount.toFixed(4)} TIC
                              </Text>
                            )}
                            <Badge
                              colorScheme={result.status === 'created' ? 'green' : 'red'}
                              size="sm"
                            >
                              {result.status}
                            </Badge>
                            {result.error && (
                              <Text fontSize="xs" color="red.500">
                                {result.error}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                      ))}
                    </VStack>
                  </>
                )}

                {/* Raw Response for Debugging */}
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Raw API Response (for debugging)
                  </summary>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    p={4}
                    mt={2}
                    bg="gray.100"
                    borderRadius="md"
                    fontSize="sm"
                  >
                    {JSON.stringify(response, null, 2)}
                  </Code>
                </details>
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            After fixing the distributions, go back to your dashboard to see the updated TIC Token Distribution section.
          </AlertDescription>
        </Alert>
      </VStack>
    </Box>
  );
};

export default SimpleFixDistributionPage;
