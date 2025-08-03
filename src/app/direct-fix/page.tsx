'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  Code,
  useToast,
  Spinner,
  Badge
} from '@chakra-ui/react';

export default function DirectFixPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { data: session } = useSession();
  const toast = useToast();

  const directFix = async () => {
    if (!session?.user?.email) {
      toast({
        title: 'Error',
        description: 'You must be logged in to fix your referral link',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/direct-fix-referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
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
          description: data.error || 'Failed to fix referral link',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <Container maxW="4xl" py={8}>
        <Alert status="warning">
          <AlertIcon />
          <Text>You must be logged in to use this tool.</Text>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={4}>Direct Fix Referral Link</Heading>
          <Text color="gray.600">
            This will directly update your referral link in the database
          </Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            Logged in as: <Badge>{session.user?.email}</Badge>
          </Text>
        </Box>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">What this does:</Text>
            <Text>Tries multiple approaches to update your referral link to use ticgloballtd.com</Text>
          </Box>
        </Alert>

        <Box textAlign="center">
          <Button
            colorScheme="blue"
            size="lg"
            onClick={directFix}
            isLoading={isLoading}
            loadingText="Fixing your referral link..."
          >
            Direct Fix My Referral Link
          </Button>
        </Box>

        {isLoading && (
          <Box textAlign="center">
            <Spinner size="lg" />
            <Text mt={2}>Updating your referral link...</Text>
          </Box>
        )}

        {result && (
          <Box>
            <Heading size="md" mb={4}>Results</Heading>
            
            {result.success ? (
              <Alert status="success" mb={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Success!</Text>
                  <Text>{result.message}</Text>
                </Box>
              </Alert>
            ) : (
              <Alert status="error" mb={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Error:</Text>
                  <Text>{result.error}</Text>
                </Box>
              </Alert>
            )}

            <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
              <Text fontWeight="bold" mb={2}>Detailed Results:</Text>
              <Code fontSize="sm" p={4} bg="gray.50" display="block" whiteSpace="pre-wrap">
                {JSON.stringify(result, null, 2)}
              </Code>
            </Box>

            {result.success && (
              <Alert status="success" mt={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Next Steps:</Text>
                  <Text>Go to your referrals page and click "Refresh" to see the updated link!</Text>
                </Box>
              </Alert>
            )}
          </Box>
        )}
      </VStack>
    </Container>
  );
}
