'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  useToast,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Code,
  Divider
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TestResult {
  endpoint: string;
  status: 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  responseTime?: number;
}

export default function AdminTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { data: session } = useSession();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const adminEndpoints = [
    { name: 'Admin Deposits', url: '/api/admin/deposits?limit=5' },
    { name: 'Admin Withdrawals', url: '/api/admin/withdrawals?limit=5' },
    { name: 'Admin Users', url: '/api/admin/users?limit=5' },
    { name: 'Debug Admin Auth', url: '/api/debug/admin-auth' }
  ];

  const testEndpoint = async (endpoint: { name: string; url: string }): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint.url);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          endpoint: endpoint.name,
          status: 'success',
          data,
          responseTime
        };
      } else {
        const errorData = await response.text();
        return {
          endpoint: endpoint.name,
          status: 'error',
          error: `${response.status}: ${errorData}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint: endpoint.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Initialize with loading states
    const initialResults: TestResult[] = adminEndpoints.map(endpoint => ({
      endpoint: endpoint.name,
      status: 'loading'
    }));
    setTestResults(initialResults);

    // Run tests sequentially
    const results: TestResult[] = [];
    for (const endpoint of adminEndpoints) {
      const result = await testEndpoint(endpoint);
      results.push(result);
      
      // Update results incrementally
      setTestResults([...results, ...initialResults.slice(results.length)]);
    }

    setIsRunning(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    toast({
      title: 'Tests Completed',
      description: `${successCount} passed, ${errorCount} failed`,
      status: successCount === results.length ? 'success' : 'warning',
      duration: 3000,
      isClosable: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'loading': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'loading': return '⏳';
      default: return '❓';
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <VStack align="start" spacing={2}>
              <Heading as="h1" size="lg" color={textColor}>
                🧪 Admin System Test
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Test all admin endpoints to verify functionality
              </Text>
              {session?.user?.email && (
                <Badge colorScheme="blue" variant="subtle">
                  Logged in as: {session.user.email}
                </Badge>
              )}
            </VStack>
          </CardHeader>
        </Card>

        {/* Test Controls */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            <VStack spacing={4}>
              <Button
                colorScheme="blue"
                size="lg"
                onClick={runAllTests}
                isLoading={isRunning}
                loadingText="Running Tests..."
                width="full"
              >
                🚀 Run All Admin Tests
              </Button>
              
              {testResults.length > 0 && (
                <Alert status="info">
                  <AlertIcon />
                  <AlertTitle>Testing Progress:</AlertTitle>
                  <AlertDescription>
                    {testResults.filter(r => r.status !== 'loading').length} / {testResults.length} completed
                  </AlertDescription>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card bg={cardBgColor} shadow="sm">
            <CardHeader>
              <Heading as="h2" size="md" color={textColor}>
                📊 Test Results
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {testResults.map((result, index) => (
                  <Box key={index}>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontSize="lg">
                            {getStatusIcon(result.status)}
                          </Text>
                          <Text fontWeight="bold">
                            {result.endpoint}
                          </Text>
                          <Badge colorScheme={getStatusColor(result.status)}>
                            {result.status.toUpperCase()}
                          </Badge>
                          {result.responseTime && (
                            <Badge variant="outline">
                              {result.responseTime}ms
                            </Badge>
                          )}
                        </HStack>
                        
                        {result.status === 'loading' && (
                          <HStack>
                            <Spinner size="sm" />
                            <Text fontSize="sm" color="gray.500">
                              Testing...
                            </Text>
                          </HStack>
                        )}
                        
                        {result.error && (
                          <Alert status="error" size="sm">
                            <AlertIcon />
                            <Text fontSize="sm">{result.error}</Text>
                          </Alert>
                        )}
                        
                        {result.data && result.status === 'success' && (
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={2}>
                              Response Preview:
                            </Text>
                            <Code fontSize="xs" p={2} borderRadius="md" maxH="100px" overflowY="auto">
                              {JSON.stringify(result.data, null, 2).substring(0, 200)}
                              {JSON.stringify(result.data, null, 2).length > 200 && '...'}
                            </Code>
                          </Box>
                        )}
                      </VStack>
                    </HStack>
                    
                    {index < testResults.length - 1 && <Divider mt={4} />}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Instructions */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading as="h3" size="sm" color={textColor}>
              📝 Instructions
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm">
                • Click "Run All Admin Tests" to test all admin endpoints
              </Text>
              <Text fontSize="sm">
                • Green ✅ means the endpoint is working correctly
              </Text>
              <Text fontSize="sm">
                • Red ❌ means there's an issue that needs to be fixed
              </Text>
              <Text fontSize="sm">
                • Check the response times to monitor performance
              </Text>
              <Text fontSize="sm">
                • If you see authentication errors, make sure you're logged in as an admin
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
