'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Heading,
  useToast,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Badge,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Code,
  Textarea
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import PartnerWalletCard from '@/components/PartnerWalletCard';

export default function TestPartnerWalletPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testAmount, setTestAmount] = useState('25.50');
  const [testEmail, setTestEmail] = useState('test-user@example.com');
  const [testType, setTestType] = useState('purchase');
  const [result, setResult] = useState<any>(null);
  const { data: session } = useSession();
  const toast = useToast();

  const addTestCommission = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test/add-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referred_email: testEmail,
          commission_type: testType,
          commission_amount: parseFloat(testAmount),
          commission_rate: 0.10
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Commission Added!',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Failed to Add Commission',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error adding test commission:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addBulkTestCommissions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test/add-commission');
      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Bulk Commissions Added!',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Failed to Add Bulk Commissions',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error adding bulk commissions:', error);
      toast({
        title: 'Network Error',
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
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Partner Wallet System Test</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page tests the Partner Wallet system where users can view commission earnings from referrals and transfer them to their main wallet.
        </Alert>

        {/* Test Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <Heading size="md">Add Test Commission</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Commission Amount ($)</FormLabel>
                  <Input
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="25.50"
                    type="number"
                    step="0.01"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Referred User Email</FormLabel>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test-user@example.com"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Commission Type</FormLabel>
                  <Input
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    placeholder="purchase"
                  />
                </FormControl>
              </SimpleGrid>
              
              <HStack spacing={4}>
                <Button
                  onClick={addTestCommission}
                  isLoading={isLoading}
                  loadingText="Adding..."
                  colorScheme="green"
                >
                  Add Single Commission
                </Button>
                
                <Button
                  onClick={addBulkTestCommissions}
                  isLoading={isLoading}
                  loadingText="Adding..."
                  colorScheme="blue"
                >
                  Add 5 Test Commissions
                </Button>
                
                <Button
                  onClick={() => window.open('/referrals', '_blank')}
                  colorScheme="purple"
                  variant="outline"
                >
                  View Referrals Page
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Partner Wallet Component */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Partner Wallet Component</Heading>
              <PartnerWalletCard />
            </VStack>
          </CardBody>
        </Card>

        {/* Commission Types Info */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Commission Types</Heading>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <VStack>
                  <Badge colorScheme="green" p={2}>SIGNUP</Badge>
                  <Text fontSize="sm" textAlign="center">
                    Commission earned when referred user signs up
                  </Text>
                  <Text fontSize="xs" color="gray.600">Rate: 5%</Text>
                </VStack>
                <VStack>
                  <Badge colorScheme="blue" p={2}>PURCHASE</Badge>
                  <Text fontSize="sm" textAlign="center">
                    Commission earned when referred user makes purchases
                  </Text>
                  <Text fontSize="xs" color="gray.600">Rate: 10%</Text>
                </VStack>
                <VStack>
                  <Badge colorScheme="purple" p={2}>ACTIVITY</Badge>
                  <Text fontSize="sm" textAlign="center">
                    Commission earned from referred user's trading activity
                  </Text>
                  <Text fontSize="xs" color="gray.600">Rate: 8%</Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* API Result */}
        {result && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">API Response</Heading>
                
                <Alert status={result.success ? 'success' : 'error'}>
                  <AlertIcon />
                  <Text>{result.message || result.error}</Text>
                </Alert>

                {result.success && result.data && (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {result.data.total_added && (
                      <Stat>
                        <StatLabel>Total Added</StatLabel>
                        <StatNumber color="green.500">${result.data.total_added.toFixed(2)}</StatNumber>
                        <StatHelpText>To partner wallet</StatHelpText>
                      </Stat>
                    )}
                    {result.data.commission_amount && (
                      <Stat>
                        <StatLabel>Commission Amount</StatLabel>
                        <StatNumber color="green.500">${result.data.commission_amount.toFixed(2)}</StatNumber>
                        <StatHelpText>From {result.data.commission_type}</StatHelpText>
                      </Stat>
                    )}
                  </SimpleGrid>
                )}

                <Divider />
                
                <VStack align="stretch">
                  <Text fontWeight="bold">Raw Response:</Text>
                  <Textarea
                    value={JSON.stringify(result, null, 2)}
                    readOnly
                    rows={10}
                    fontSize="sm"
                    fontFamily="mono"
                  />
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading size="md">Testing Instructions:</Heading>
              <Text>1. <strong>Add Test Commissions:</strong> Click "Add 5 Test Commissions" to populate your partner wallet</Text>
              <Text>2. <strong>View Partner Wallet:</strong> Check the Partner Wallet component above to see your commission balance</Text>
              <Text>3. <strong>Test Transfer:</strong> Use the transfer function to move funds from partner wallet to main wallet</Text>
              <Text>4. <strong>Check History:</strong> Click "View History" to see commission earnings and transfer records</Text>
              <Text>5. <strong>Verify in Referrals:</strong> Go to Referrals page → Partner Wallet tab to see the full interface</Text>
              <Text>6. <strong>Check Main Wallet:</strong> Go to <Code>/wallet</Code> to verify transferred funds appear in main balance</Text>
              
              <Alert status="success" mt={4}>
                <AlertIcon />
                <Text>
                  <strong>Expected Result:</strong> Commission earnings appear in Partner Wallet, can be transferred to main wallet, 
                  and show up in transaction history with proper categorization.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
