'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  Badge,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';

export default function TestWalletPage() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [testAmount, setTestAmount] = useState<string>('5000');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('black', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const addTestFunds = async () => {
    if (!userEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter a user email address.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const amount = parseFloat(testAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount greater than 0.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsAdding(true);
    try {
      console.log('Sending request with:', { userEmail: userEmail.trim(), amount });
      
      const response = await fetch('/api/dev/add-test-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail.trim(),
          amount: amount
        })
      });

      const data = await response.json();
      console.log('API response:', data);
      
      if (data.success) {
        toast({
          title: 'Test Funds Added!',
          description: `Successfully added $${amount.toFixed(2)} to ${userEmail.trim()}'s wallet.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || data.message || 'Failed to add test funds');
      }
    } catch (error) {
      console.error('Error adding test funds:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add test funds',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const quickAddFunds = (amount: number) => {
    setTestAmount(amount.toString());
  };

  const syncWallet = async () => {
    if (!userEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter a user email address to sync.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/dev/sync-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail.trim()
        })
      });

      const data = await response.json();
      console.log('Sync response:', data);

      if (data.success) {
        toast({
          title: 'Wallet Synced!',
          description: `Successfully synced wallet for ${userEmail.trim()}. New balance: $${data.wallet.total_balance.toFixed(2)}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to sync wallet');
      }
    } catch (error) {
      console.error('Error syncing wallet:', error);
      toast({
        title: 'Sync Error',
        description: error instanceof Error ? error.message : 'Failed to sync wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="100vh">
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={2} align="center">
            <Badge colorScheme="red" fontSize="md" px={3} py={1}>
              DEVELOPMENT TESTING
            </Badge>
            <Heading size="lg" color={textColor}>
              Test Wallet Funds
            </Heading>
            <Text color={subtleTextColor} textAlign="center">
              Add test funds to any user wallet for development and testing purposes
            </Text>
          </VStack>

          {/* Add Test Funds */}
          <Card bg={cardBgColor}>
            <CardHeader>
              <Heading size="md" color={textColor}>Add Test Funds</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={6}>
                <FormControl>
                  <FormLabel color={textColor}>User Email</FormLabel>
                  <Input
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter user email address"
                    type="email"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color={textColor}>Amount to Add (USD)</FormLabel>
                  <NumberInput
                    value={testAmount}
                    onChange={setTestAmount}
                    precision={2}
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                {/* Quick Amount Buttons */}
                <VStack spacing={3} w="full">
                  <Text color={textColor} fontWeight="bold">Quick Amounts:</Text>
                  <HStack spacing={3} wrap="wrap" justify="center">
                    <Button size="sm" variant="outline" onClick={() => quickAddFunds(100)}>
                      $100
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => quickAddFunds(500)}>
                      $500
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => quickAddFunds(1000)}>
                      $1,000
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => quickAddFunds(3450)}>
                      $3,450 (Trader Cost)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => quickAddFunds(5000)}>
                      $5,000
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => quickAddFunds(10000)}>
                      $10,000
                    </Button>
                  </HStack>
                </VStack>

                <VStack spacing={3} w="full">
                  <Button
                    colorScheme="blue"
                    size="lg"
                    w="full"
                    isLoading={isAdding}
                    loadingText="Adding Funds..."
                    onClick={addTestFunds}
                    isDisabled={!userEmail.trim()}
                  >
                    Add ${parseFloat(testAmount || '0').toFixed(2)} Test Funds
                  </Button>

                  <Button
                    colorScheme="green"
                    variant="outline"
                    size="lg"
                    w="full"
                    isLoading={isSyncing}
                    loadingText="Syncing Wallet..."
                    onClick={syncWallet}
                    isDisabled={!userEmail.trim()}
                  >
                    Sync Wallet Balance
                  </Button>
                </VStack>

                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Development Only</Text>
                    <Text fontSize="sm">
                      This tool is only available in development mode and will add test funds to the specified user's wallet for testing purposes.
                    </Text>
                  </Box>
                </Alert>

                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Instructions</Text>
                    <Text fontSize="sm">
                      1. Enter the email address of the user you want to add funds to<br/>
                      2. Select or enter the amount to add<br/>
                      3. Click "Add Test Funds" to credit their wallet<br/>
                      4. Click "Sync Wallet Balance" to update the wallet display
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}
