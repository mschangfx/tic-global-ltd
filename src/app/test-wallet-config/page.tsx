'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Code,
  Heading,
  useToast,
  Alert,
  AlertIcon,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Badge
} from '@chakra-ui/react';

export default function TestWalletConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const testWalletConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/web3/test-config');
      const data = await response.json();
      setConfig(data);

      if (data.success) {
        toast({
          title: 'Wallet Configuration Loaded',
          description: 'All wallet addresses have been retrieved successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Configuration Error',
          description: data.error || 'Failed to load wallet configuration',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing wallet config:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to wallet configuration API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Wallet Configuration Test</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page tests your wallet address configuration for deposits and withdrawals.
        </Alert>

        <Button
          onClick={testWalletConfig}
          isLoading={isLoading}
          loadingText="Testing..."
          colorScheme="blue"
          size="lg"
        >
          Test Wallet Configuration
        </Button>

        {config && (
          <VStack spacing={4} align="stretch">
            <Heading size="md">Configuration Results</Heading>
            
            {config.success ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {config.wallets && Object.entries(config.wallets).map(([network, address]: [string, any]) => (
                  <Card key={network}>
                    <CardHeader>
                      <Text fontWeight="bold" textTransform="capitalize">
                        {network} Network
                        <Badge ml={2} colorScheme={address ? 'green' : 'red'}>
                          {address ? 'Configured' : 'Missing'}
                        </Badge>
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <Code p={2} borderRadius="md" fontSize="sm" wordBreak="break-all">
                        {address || 'Not configured'}
                      </Code>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Alert status="error">
                <AlertIcon />
                {config.error}
              </Alert>
            )}

            <Box>
              <Text fontWeight="bold" mb={2}>Full Configuration:</Text>
              <Code p={4} borderRadius="md" display="block" whiteSpace="pre-wrap" fontSize="sm">
                {JSON.stringify(config, null, 2)}
              </Code>
            </Box>
          </VStack>
        )}

        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">Expected Wallet Addresses:</Text>
            <Text>• Ethereum: 0x61b263d67663acfbf20b4157386405b12a49c920</Text>
            <Text>• BSC: 0x61b263d67663acfbf20b4157386405b12a49c920</Text>
            <Text>• Tron: TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ</Text>
          </VStack>
        </Alert>
      </VStack>
    </Box>
  );
}
