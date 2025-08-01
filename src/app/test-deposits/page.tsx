'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Select
} from '@chakra-ui/react';

export default function TestDepositsPage() {
  const [testAddress, setTestAddress] = useState('TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ');
  const [testNetwork, setTestNetwork] = useState('TRC20');
  const [testAmount, setTestAmount] = useState('100');
  const [testMethodId, setTestMethodId] = useState('usdt-trc20');
  const [testUserEmail, setTestUserEmail] = useState('test@example.com');
  
  const [validationResult, setValidationResult] = useState<any>(null);
  const [depositMethods, setDepositMethods] = useState<any>(null);
  const [depositResult, setDepositResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const toast = useToast();

  const testGetMethods = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deposits');
      const data = await response.json();
      setDepositMethods(data);
      toast({
        title: "Success",
        description: "Deposit methods loaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load deposit methods",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testValidateAddress = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/deposits/validate?address=${encodeURIComponent(testAddress)}&network=${encodeURIComponent(testNetwork)}`);
      const data = await response.json();
      setValidationResult(data);
      toast({
        title: data.valid ? "Valid Address" : "Invalid Address",
        description: data.message,
        status: data.valid ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to validate address",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testValidateDeposit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deposits/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testAddress,
          network: testNetwork,
          amount: testAmount,
          methodId: testMethodId
        })
      });
      const data = await response.json();
      setValidationResult(data);
      toast({
        title: data.canProceed ? "Validation Passed" : "Validation Failed",
        description: data.validation?.overall?.message || "Validation completed",
        status: data.canProceed ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to validate deposit",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateDeposit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: testMethodId,
          amount: parseFloat(testAmount),
          userEmail: testUserEmail
        })
      });
      const data = await response.json();
      setDepositResult(data);
      toast({
        title: data.success ? "Deposit Created" : "Deposit Failed",
        description: data.message || (data.success ? "Deposit request created successfully" : "Failed to create deposit"),
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to create deposit",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Deposit System Test
        </Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page is for testing the deposit system functionality with the new USDT TRC20 wallet address.
        </Alert>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Test Configuration */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Configuration</Heading>
                
                <Box>
                  <Text mb={2} fontWeight="bold">Wallet Address:</Text>
                  <Input
                    value={testAddress}
                    onChange={(e) => setTestAddress(e.target.value)}
                    placeholder="Enter wallet address"
                    fontFamily="monospace"
                    fontSize="sm"
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="bold">Network:</Text>
                  <Select value={testNetwork} onChange={(e) => setTestNetwork(e.target.value)}>
                    <option value="TRC20">TRC20</option>
                    <option value="BEP20">BEP20</option>
                  </Select>
                </Box>

                <Box>
                  <Text mb={2} fontWeight="bold">Amount (USD):</Text>
                  <Input
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="Enter amount"
                    type="number"
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="bold">Method ID:</Text>
                  <Select value={testMethodId} onChange={(e) => setTestMethodId(e.target.value)}>
                    <option value="usdt-trc20">USDT TRC20</option>
                    <option value="usdt-bep20">USDT BEP20</option>
                    <option value="usdt-polygon">USDT Polygon</option>
                  </Select>
                </Box>

                <Box>
                  <Text mb={2} fontWeight="bold">User Email:</Text>
                  <Input
                    value={testUserEmail}
                    onChange={(e) => setTestUserEmail(e.target.value)}
                    placeholder="Enter user email"
                    type="email"
                  />
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Test Actions */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Actions</Heading>
                
                <Button 
                  onClick={testGetMethods} 
                  isLoading={isLoading}
                  colorScheme="blue"
                  size="sm"
                >
                  Get Deposit Methods
                </Button>
                
                <Button 
                  onClick={testValidateAddress} 
                  isLoading={isLoading}
                  colorScheme="green"
                  size="sm"
                >
                  Validate Address Format
                </Button>
                
                <Button 
                  onClick={testValidateDeposit} 
                  isLoading={isLoading}
                  colorScheme="orange"
                  size="sm"
                >
                  Validate Full Deposit
                </Button>
                
                <Button 
                  onClick={testCreateDeposit} 
                  isLoading={isLoading}
                  colorScheme="purple"
                  size="sm"
                >
                  Create Deposit Request
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Results Display */}
        {depositMethods && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Available Deposit Methods</Heading>
                <Text><strong>Count:</strong> {depositMethods.count}</Text>
                <Text><strong>Success:</strong> {depositMethods.success ? 'Yes' : 'No'}</Text>
                {depositMethods.methods && depositMethods.methods.map((method: any, index: number) => (
                  <Box key={index} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">{method.name} ({method.network})</Text>
                        <Code fontSize="xs">{method.address}</Code>
                        <Text fontSize="sm">Fee: {method.fee} | Limits: ${method.limits.min} - ${method.limits.max}</Text>
                      </VStack>
                      <Badge colorScheme={method.isActive ? "green" : "red"}>
                        {method.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {validationResult && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Validation Result</Heading>
                {validationResult.valid !== undefined ? (
                  // Address validation result
                  <>
                    <Text><strong>Valid:</strong> {validationResult.valid ? 'Yes' : 'No'}</Text>
                    <Text><strong>Message:</strong> {validationResult.message}</Text>
                    <Text><strong>Network:</strong> {validationResult.networkName}</Text>
                    <Code fontSize="sm">{validationResult.address}</Code>
                  </>
                ) : (
                  // Full deposit validation result
                  <>
                    <Text><strong>Can Proceed:</strong> {validationResult.canProceed ? 'Yes' : 'No'}</Text>
                    {validationResult.validation && Object.entries(validationResult.validation).map(([key, value]: [string, any]) => (
                      <Box key={key} p={2} border="1px solid" borderColor={value.valid ? "green.200" : "red.200"} borderRadius="md">
                        <Text fontWeight="bold">{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
                        <Text color={value.valid ? "green.600" : "red.600"}>{value.message}</Text>
                      </Box>
                    ))}
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {depositResult && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Deposit Result</Heading>
                <Text><strong>Success:</strong> {depositResult.success ? 'Yes' : 'No'}</Text>
                <Text><strong>Message:</strong> {depositResult.message}</Text>
                {depositResult.transaction && (
                  <Box p={3} border="1px solid" borderColor="green.200" borderRadius="md" bg="green.50">
                    <Text fontWeight="bold">Transaction Details:</Text>
                    <Text>ID: {depositResult.transaction.id}</Text>
                    <Text>Amount: ${depositResult.transaction.amount}</Text>
                    <Text>Network: {depositResult.transaction.network}</Text>
                    <Text>Status: {depositResult.transaction.status}</Text>
                    <Code fontSize="xs">{depositResult.transaction.address}</Code>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Divider />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" color="gray.600">
            <strong>How to test:</strong><br />
            1. Configure test parameters above<br />
            2. Click "Get Deposit Methods" to see available methods<br />
            3. Click "Validate Address Format" to check address format<br />
            4. Click "Validate Full Deposit" to check all parameters<br />
            5. Click "Create Deposit Request" to test the full flow<br />
            6. Check the console for detailed logs
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
