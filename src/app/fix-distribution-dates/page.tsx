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
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';

interface Distribution {
  id: string;
  distribution_date: string;
  plan_name: string;
  token_amount: number;
  status: string;
  created_at: string;
}

interface FixResult {
  date: string;
  plan: string;
  amount?: number;
  status: string;
  error?: string;
  id?: string;
}

const FixDistributionDatesPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const toast = useToast();

  const checkCurrentDistributions = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/debug/fix-distribution-dates', {
        method: 'GET'
      });

      const data = await response.json();

      if (data.success) {
        setDistributions(data.distributions);
        toast({
          title: 'Distributions Loaded',
          description: `Found ${data.count} distributions`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to load distributions');
      }
    } catch (error) {
      console.error('Error checking distributions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load current distributions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const fixDistributionDates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/fix-distribution-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setFixResults(data.results);
        toast({
          title: 'Distribution Dates Fixed!',
          description: `Created ${data.distributions_created} new distributions`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Refresh the distributions list
        setTimeout(() => {
          checkCurrentDistributions();
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to fix distributions');
      }
    } catch (error) {
      console.error('Error fixing distributions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix distribution dates',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Fix TIC Distribution Dates
        </Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Distribution Date Fix Tool</AlertTitle>
            <AlertDescription>
              This tool will delete existing distributions and create new ones with proper dates for the last 5 days.
              This will fix the issue where distributions show duplicate dates instead of unique daily distributions.
            </AlertDescription>
          </Box>
        </Alert>

        <HStack spacing={4} justify="center">
          <Button
            onClick={checkCurrentDistributions}
            isLoading={isChecking}
            loadingText="Checking..."
            colorScheme="blue"
            variant="outline"
          >
            Check Current Distributions
          </Button>
          <Button
            onClick={fixDistributionDates}
            isLoading={isLoading}
            loadingText="Fixing..."
            colorScheme="green"
          >
            Fix Distribution Dates
          </Button>
        </HStack>

        {/* Current Distributions */}
        {distributions.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Current Distributions ({distributions.length})</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Plan</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                      <Th>Created</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {distributions.map((dist) => (
                      <Tr key={dist.id}>
                        <Td>{new Date(dist.distribution_date).toLocaleDateString()}</Td>
                        <Td>
                          <Badge colorScheme="blue" variant="outline">
                            {dist.plan_name}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontWeight="medium" color="green.500">
                            +{parseFloat(dist.token_amount.toString()).toFixed(4)} TIC
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={dist.status === 'completed' ? 'green' : 'yellow'}
                            size="sm"
                          >
                            {dist.status}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="xs" color="gray.600">
                            {new Date(dist.created_at).toLocaleDateString()}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        )}

        {/* Fix Results */}
        {fixResults.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Fix Results ({fixResults.length})</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Plan</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                      <Th>Error</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {fixResults.map((result, index) => (
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
                        </Td>
                        <Td>
                          {result.error && (
                            <Text fontSize="xs" color="red.500">
                              {result.error}
                            </Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
};

export default FixDistributionDatesPage;
