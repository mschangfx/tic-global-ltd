'use client';

import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Badge,
  HStack,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Divider,
  Code,
  List,
  ListItem,
  ListIcon,
  SimpleGrid
} from '@chakra-ui/react';
import { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaUser, FaCoins, FaClock } from 'react-icons/fa';

export default function TestAdminFixPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testDepositId, setTestDepositId] = useState('');
  const [adminEmail] = useState('admin@ticgloballtd.com');
  const toast = useToast();

  const createTestDeposit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deposits/create-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          method: 'GCash',
          status: 'pending'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setTestDepositId(result.deposit.id);
        toast({
          title: 'Test Deposit Created',
          description: `Deposit ID: ${result.deposit.id.substring(0, 8)}...`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to create test deposit');
      }
    } catch (error: any) {
      toast({
        title: 'Create Test Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDepositApproval = async (action: 'approve' | 'reject') => {
    if (!testDepositId) {
      toast({
        title: 'No Test Deposit',
        description: 'Please create a test deposit first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/deposits/${testDepositId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'completed' : 'rejected',
          adminEmail: adminEmail,
          adminNotes: `Test ${action} via admin fix test page`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: `Deposit ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          description: 'Admin action completed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Get updated deposit details
        await getDepositDetails();
      } else {
        throw new Error(result.error || `Failed to ${action} deposit`);
      }
    } catch (error: any) {
      toast({
        title: `${action === 'approve' ? 'Approval' : 'Rejection'} Failed`,
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDepositDetails = async () => {
    if (!testDepositId) return;

    try {
      const response = await fetch(`/api/admin/deposits?depositId=${testDepositId}`);
      const result = await response.json();
      
      if (result.success && result.deposits.length > 0) {
        setTestResults(result.deposits[0]);
      }
    } catch (error) {
      console.error('Error getting deposit details:', error);
    }
  };

  const testBulkApproval = async () => {
    if (!testDepositId) {
      toast({
        title: 'No Test Deposit',
        description: 'Please create a test deposit first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositIds: [testDepositId],
          action: 'approve',
          adminEmail: adminEmail,
          adminNotes: 'Test bulk approval'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Bulk Approval Success',
          description: `Processed ${result.results?.length || 0} deposits`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        await getDepositDetails();
      } else {
        throw new Error(result.error || 'Bulk approval failed');
      }
    } catch (error: any) {
      toast({
        title: 'Bulk Approval Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkWalletBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'test@example.com' })
      });

      const result = await response.json();
      
      if (result.wallet) {
        toast({
          title: 'Wallet Balance',
          description: `Total: $${result.wallet.total_balance}`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Wallet Check Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={8} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>🔧 Admin Deposit System Test</Heading>
          <Text color="gray.600">
            Test the admin deposit approval system and wallet crediting
          </Text>
        </Box>

        <Alert status="info">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">What This Test Does:</Text>
            <Text fontSize="sm">1. Creates a test deposit request</Text>
            <Text fontSize="sm">2. Tests individual deposit approval/rejection</Text>
            <Text fontSize="sm">3. Tests bulk deposit operations</Text>
            <Text fontSize="sm">4. Verifies wallet crediting works correctly</Text>
          </VStack>
        </Alert>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Test Controls */}
          <Card>
            <CardBody>
              <VStack spacing={4}>
                <Heading size="md">Test Controls</Heading>
                
                <FormControl>
                  <FormLabel htmlFor="test-deposit-id">Test Deposit ID</FormLabel>
                  <Input
                    id="test-deposit-id"
                    name="testDepositId"
                    value={testDepositId}
                    onChange={(e) => setTestDepositId(e.target.value)}
                    placeholder="Will be auto-filled when you create a test deposit"
                    size="sm"
                  />
                </FormControl>

                <Divider />

                <VStack spacing={2} width="100%">
                  <Button
                    colorScheme="blue"
                    onClick={createTestDeposit}
                    isLoading={isLoading}
                    width="100%"
                  >
                    Create Test Deposit
                  </Button>
                  
                  <HStack spacing={2} width="100%">
                    <Button
                      colorScheme="green"
                      onClick={() => testDepositApproval('approve')}
                      isLoading={isLoading}
                      isDisabled={!testDepositId}
                      flex={1}
                    >
                      Approve
                    </Button>
                    <Button
                      colorScheme="red"
                      onClick={() => testDepositApproval('reject')}
                      isLoading={isLoading}
                      isDisabled={!testDepositId}
                      flex={1}
                    >
                      Reject
                    </Button>
                  </HStack>

                  <Button
                    colorScheme="purple"
                    onClick={testBulkApproval}
                    isLoading={isLoading}
                    isDisabled={!testDepositId}
                    width="100%"
                  >
                    Test Bulk Approval
                  </Button>

                  <Button
                    colorScheme="teal"
                    onClick={checkWalletBalance}
                    isLoading={isLoading}
                    width="100%"
                  >
                    Check Wallet Balance
                  </Button>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Test Results */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Test Results</Heading>
                
                {testResults ? (
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Status:</Text>
                      <Badge 
                        colorScheme={
                          testResults.status === 'completed' ? 'green' : 
                          testResults.status === 'rejected' ? 'red' : 'yellow'
                        }
                      >
                        {testResults.status}
                      </Badge>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Amount:</Text>
                      <Text>${testResults.amount}</Text>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Method:</Text>
                      <Text>{testResults.method_name}</Text>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <Text fontWeight="bold">User:</Text>
                      <Text fontSize="sm">{testResults.user_email}</Text>
                    </HStack>
                    
                    {testResults.admin_notes && (
                      <Box>
                        <Text fontWeight="bold" mb={1}>Admin Notes:</Text>
                        <Text fontSize="sm" color="gray.600">{testResults.admin_notes}</Text>
                      </Box>
                    )}
                    
                    <Box>
                      <Text fontWeight="bold" mb={1}>Timestamps:</Text>
                      <List spacing={1} fontSize="sm">
                        <ListItem>
                          <ListIcon as={FaClock} color="blue.500" />
                          Created: {new Date(testResults.created_at).toLocaleString()}
                        </ListItem>
                        {testResults.approved_at && (
                          <ListItem>
                            <ListIcon as={FaCheckCircle} color="green.500" />
                            Approved: {new Date(testResults.approved_at).toLocaleString()}
                          </ListItem>
                        )}
                        {testResults.rejected_at && (
                          <ListItem>
                            <ListIcon as={FaTimesCircle} color="red.500" />
                            Rejected: {new Date(testResults.rejected_at).toLocaleString()}
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  </VStack>
                ) : (
                  <Text color="gray.500" textAlign="center">
                    No test results yet. Create and process a test deposit to see results.
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Expected Behavior:</Text>
            <Text fontSize="sm">1. Create test deposit → Status should be "pending"</Text>
            <Text fontSize="sm">2. Approve deposit → Status should change to "completed" and wallet should be credited</Text>
            <Text fontSize="sm">3. Check wallet balance → Should show the credited amount</Text>
            <Text fontSize="sm">4. No duplicate deposits should be created for the same request</Text>
          </VStack>
        </Alert>
      </VStack>
    </Box>
  );
}
