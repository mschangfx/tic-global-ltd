'use client';

import { useState } from 'react';
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

export default function FixDomainsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const toast = useToast();

  const fixDomains = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/fix-referral-domains', {
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
          description: `Updated ${data.referral_codes_updated} referral codes and ${data.profiles_updated} profiles`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fix domains',
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

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={4}>Fix Referral Domains</Heading>
          <Text color="gray.600">
            This tool will update all existing referral links from ticglobal.com to ticgloballtd.com
          </Text>
        </Box>

        <Alert status="warning">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Important:</Text>
            <Text>This will update all referral links in the database. Make sure you want to proceed.</Text>
          </Box>
        </Alert>

        <Box textAlign="center">
          <Button
            colorScheme="blue"
            size="lg"
            onClick={fixDomains}
            isLoading={isLoading}
            loadingText="Fixing domains..."
          >
            Fix All Referral Domains
          </Button>
        </Box>

        {isLoading && (
          <Box textAlign="center">
            <Spinner size="lg" />
            <Text mt={2}>Processing database updates...</Text>
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

            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="bold">Summary:</Text>
                <Text>Referral codes updated: <Badge colorScheme="green">{result.referral_codes_updated || 0}</Badge></Text>
                <Text>User profiles updated: <Badge colorScheme="blue">{result.profiles_updated || 0}</Badge></Text>
                <Text>Total found: <Badge>{result.total_found || 0}</Badge></Text>
              </Box>

              {result.updates && result.updates.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Referral Code Updates:</Text>
                  <VStack spacing={2} align="stretch">
                    {result.updates.slice(0, 10).map((update: any, index: number) => (
                      <Box key={index} p={3} border="1px" borderColor="gray.200" borderRadius="md">
                        <Text fontSize="sm">
                          <strong>User:</strong> {update.user_email}
                        </Text>
                        {update.success ? (
                          <VStack spacing={1} align="start">
                            <Text fontSize="xs" color="red.500">
                              <strong>Old:</strong> <Code fontSize="xs">{update.old_link}</Code>
                            </Text>
                            <Text fontSize="xs" color="green.500">
                              <strong>New:</strong> <Code fontSize="xs">{update.new_link}</Code>
                            </Text>
                          </VStack>
                        ) : (
                          <Text fontSize="xs" color="red.500">
                            <strong>Error:</strong> {update.error}
                          </Text>
                        )}
                      </Box>
                    ))}
                    {result.updates.length > 10 && (
                      <Text fontSize="sm" color="gray.500">
                        ... and {result.updates.length - 10} more updates
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
