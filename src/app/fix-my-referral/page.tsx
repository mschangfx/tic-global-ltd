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
  Badge,
  HStack
} from '@chakra-ui/react';

export default function FixMyReferralPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { data: session } = useSession();
  const toast = useToast();

  const fixMyReferral = async () => {
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
      const response = await fetch('/api/fix-my-referral', {
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
          <Heading size="lg" mb={4}>Fix My Referral Link</Heading>
          <Text color="gray.600">
            This will update your referral link from ticglobal.com to ticgloballtd.com
          </Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            Logged in as: <Badge>{session.user?.email}</Badge>
          </Text>
        </Box>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">What this does:</Text>
            <Text>Updates your personal referral link in the database to use the correct domain.</Text>
          </Box>
        </Alert>

        <Box textAlign="center">
          <Button
            colorScheme="blue"
            size="lg"
            onClick={fixMyReferral}
            isLoading={isLoading}
            loadingText="Fixing your referral link..."
          >
            Fix My Referral Link
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

            {result.success && result.old_link && result.new_link && (
              <VStack spacing={4} align="stretch">
                <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>Changes Made:</Text>
                  <VStack spacing={2} align="start">
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="red.500">Old Link:</Text>
                      <Code fontSize="sm" p={2} bg="red.50" color="red.700">
                        {result.old_link}
                      </Code>
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="green.500">New Link:</Text>
                      <Code fontSize="sm" p={2} bg="green.50" color="green.700">
                        {result.new_link}
                      </Code>
                    </Box>
                  </VStack>
                </Box>

                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Next Steps:</Text>
                    <Text>Go to your referrals page and click "Refresh" to see the updated link!</Text>
                  </Box>
                </Alert>

                <HStack justify="center">
                  <Button
                    as="a"
                    href="/referrals"
                    colorScheme="green"
                    size="lg"
                  >
                    Go to Referrals Page
                  </Button>
                </HStack>
              </VStack>
            )}
          </Box>
        )}
      </VStack>
    </Container>
  );
}
