'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  SimpleGrid,
  useColorModeValue,
  Icon,
  Spinner,
  Alert,
  AlertIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Flex,
  Spacer
} from '@chakra-ui/react';
import { 
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaDatabase,
  FaNetworkWired,
  FaWallet,
  FaCode,
  FaSync
} from 'react-icons/fa';

interface Web3Status {
  timestamp: string;
  environment: any;
  tests: any;
  summary: {
    totalTests: number;
    successfulTests: number;
    overallSuccess: boolean;
    message: string;
  };
}

export default function Web3StatusDashboard() {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const [status, setStatus] = useState<Web3Status | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/web3/test-integration');

      // Check if response is ok first
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from Web3 status:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      setStatus(data);
    } catch (error) {
      console.error('Error fetching Web3 status:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ?
      <Icon as={FaCheckCircle} color="green.500" /> :
      <Icon as={FaTimesCircle} color="red.500" />;
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge colorScheme={success ? 'green' : 'red'} variant="subtle">
        {success ? 'Working' : 'Failed'}
      </Badge>
    );
  };

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  if (isLoading) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text>Checking Web3 integration status...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
        <Button onClick={fetchStatus} colorScheme="blue" size="sm">
          Retry
        </Button>
      </Box>
    );
  }

  if (!status) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Text>No status data available</Text>
        <Button onClick={fetchStatus} colorScheme="blue" size="sm" mt={2}>
          Load Status
        </Button>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      <Flex mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">Web3 Integration Status</Heading>
          <Text color="gray.500">Real-time blockchain integration monitoring</Text>
        </VStack>
        <Spacer />
        <Button onClick={fetchStatus} size="sm" variant="outline" leftIcon={<Icon as={FaSync} />}>
          Refresh
        </Button>
      </Flex>

      {/* Overall Status */}
      <Alert status={status.summary.overallSuccess ? 'success' : 'warning'} mb={6}>
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold">{status.summary.message}</Text>
          <Text fontSize="sm">Last checked: {new Date(status.timestamp).toLocaleString()}</Text>
        </VStack>
      </Alert>

      {/* Status Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        {/* Database Status */}
        {status.tests.database && (
          <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
            <VStack>
              <Icon as={FaDatabase} color="blue.500" boxSize={6} />
              <Text fontWeight="bold" color="blue.700">Database</Text>
              {getStatusBadge(status.tests.database.success)}
            </VStack>
          </Box>
        )}

        {/* Providers Status */}
        {status.tests.providers && (
          <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
            <VStack>
              <Icon as={FaNetworkWired} color="green.500" boxSize={6} />
              <Text fontWeight="bold" color="green.700">Providers</Text>
              {getStatusBadge(Object.values(status.tests.providers).some((p: any) => p.success))}
            </VStack>
          </Box>
        )}

        {/* Addresses Status */}
        {status.tests.addresses && (
          <Box p={4} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
            <VStack>
              <Icon as={FaWallet} color="purple.500" boxSize={6} />
              <Text fontWeight="bold" color="purple.700">Addresses</Text>
              {getStatusBadge(Object.values(status.tests.addresses).some((a: any) => a.success))}
            </VStack>
          </Box>
        )}

        {/* APIs Status */}
        {status.tests.apis && (
          <Box p={4} bg="orange.50" borderRadius="md" border="1px" borderColor="orange.200">
            <VStack>
              <Icon as={FaCode} color="orange.500" boxSize={6} />
              <Text fontWeight="bold" color="orange.700">APIs</Text>
              {getStatusBadge(Object.values(status.tests.apis).some((a: any) => a.success))}
            </VStack>
          </Box>
        )}
      </SimpleGrid>

      {/* Detailed Status */}
      <Accordion allowMultiple>
        {/* Environment Info */}
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <HStack>
                <Icon as={FaCode} />
                <Text fontWeight="medium">Environment Configuration</Text>
              </HStack>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {Object.entries(status.environment).map(([key, value]) => (
                <HStack key={key} justify="space-between">
                  <Text fontSize="sm">{key}:</Text>
                  <Badge colorScheme={value ? 'green' : 'red'}>
                    {value ? 'Yes' : 'No'}
                  </Badge>
                </HStack>
              ))}
            </SimpleGrid>
          </AccordionPanel>
        </AccordionItem>

        {/* Provider Details */}
        {status.tests.providers && (
          <AccordionItem>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <HStack>
                  <Icon as={FaNetworkWired} />
                  <Text fontWeight="medium">Blockchain Providers</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {Object.entries(status.tests.providers).map(([network, test]: [string, any]) => (
                  <HStack key={network} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{network.toUpperCase()}</Text>
                      <Text fontSize="sm" color="gray.600">{test.message}</Text>
                    </VStack>
                    {getStatusIcon(test.success)}
                  </HStack>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* Address Generation */}
        {status.tests.addresses && (
          <AccordionItem>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <HStack>
                  <Icon as={FaWallet} />
                  <Text fontWeight="medium">Address Generation</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {Object.entries(status.tests.addresses).map(([network, test]: [string, any]) => (
                  <HStack key={network} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{network.toUpperCase()}</Text>
                      <Text fontSize="sm" color="gray.600">{test.message}</Text>
                      {test.address && (
                        <Code fontSize="xs">{test.address.slice(0, 20)}...</Code>
                      )}
                    </VStack>
                    {getStatusIcon(test.success)}
                  </HStack>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* API Endpoints */}
        {status.tests.apis && (
          <AccordionItem>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <HStack>
                  <Icon as={FaCode} />
                  <Text fontWeight="medium">API Endpoints</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {Object.entries(status.tests.apis).map(([api, test]: [string, any]) => (
                  <HStack key={api} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{api.toUpperCase()} API</Text>
                      <Text fontSize="sm" color="gray.600">{test.message}</Text>
                    </VStack>
                    {getStatusIcon(test.success)}
                  </HStack>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}
      </Accordion>
    </Box>
  );
}
