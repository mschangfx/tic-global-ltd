'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Code,
  Heading,
  useToast
} from '@chakra-ui/react';

export default function TestTransactionsPage() {
  const [userEmail, setUserEmail] = useState('mschangfx@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const toast = useToast();

  const seedTransactions = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/transactions/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Success!',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to seed transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error seeding transactions:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAPI = async () => {
    try {
      const response = await fetch(`/api/transactions/history?userEmail=${encodeURIComponent(userEmail)}&type=all&limit=10`);
      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'API Test Success!',
          description: `Found ${data.transactions?.length || 0} transactions`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing API:', error);
      toast({
        title: 'API Test Error',
        description: 'Failed to test API',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={6} maxW="800px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Transaction History Test Page</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page is for testing the transaction history system.
        </Alert>

        <FormControl>
          <FormLabel>User Email</FormLabel>
          <Input
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Enter user email"
          />
        </FormControl>

        <VStack spacing={3}>
          <Button
            onClick={seedTransactions}
            isLoading={isLoading}
            loadingText="Seeding..."
            colorScheme="blue"
            size="lg"
            width="full"
          >
            Seed Sample Transactions
          </Button>

          <Button
            onClick={testAPI}
            colorScheme="green"
            variant="outline"
            size="lg"
            width="full"
          >
            Test Transaction History API
          </Button>

          <Button
            as="a"
            href="/wallet/history"
            colorScheme="purple"
            variant="outline"
            size="lg"
            width="full"
          >
            View Transaction History Page
          </Button>
        </VStack>

        {result && (
          <Box>
            <Text fontWeight="bold" mb={2}>Result:</Text>
            <Code p={4} borderRadius="md" display="block" whiteSpace="pre-wrap" fontSize="sm">
              {JSON.stringify(result, null, 2)}
            </Code>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
