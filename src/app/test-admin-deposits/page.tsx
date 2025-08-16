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
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea
} from '@chakra-ui/react';

export default function TestAdminDepositsPage() {
  const [testStatus, setTestStatus] = useState('all');
  const [testNetwork, setTestNetwork] = useState('all');
  const [testUserEmail, setTestUserEmail] = useState('');
  const [testTransactionId, setTestTransactionId] = useState('');
  const [testAdminEmail, setTestAdminEmail] = useState('admin@ticgloballtd.com');
  const [testAdminNotes, setTestAdminNotes] = useState('Test admin action');
  
  const [depositsResult, setDepositsResult] = useState<any>(null);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const toast = useToast();

  const testGetDeposits = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: testStatus,
        network: testNetwork,
        ...(testUserEmail && { userEmail: testUserEmail })
      });

      const response = await fetch(`/api/admin/deposits?${params}`);
      const data = await response.json();
      setDepositsResult(data);
      
      toast({
        title: data.success ? "Deposits Loaded" : "Load Failed",
        description: data.success ? `Found ${data.deposits?.length || 0} deposits` : data.error,
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load deposits",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateDeposit = async (status: string) => {
    if (!testTransactionId) {
      toast({
        title: "Missing Data",
        description: "Please enter a transaction ID",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: testTransactionId,
          status: status,
          adminEmail: testAdminEmail,
          adminNotes: testAdminNotes
        })
      });

      const data = await response.json();
      setUpdateResult(data);
      
      toast({
        title: data.success ? "Update Success" : "Update Failed",
        description: data.message || data.error,
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to update deposit",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testBulkAction = async (action: string) => {
    if (!testTransactionId) {
      toast({
        title: "Missing Data",
        description: "Please enter transaction ID(s) separated by commas",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const transactionIds = testTransactionId.split(',').map(id => id.trim());
      
      const response = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: transactionIds,
          action: action,
          adminEmail: testAdminEmail,
          adminNotes: testAdminNotes
        })
      });

      const data = await response.json();
      setBulkResult(data);
      
      toast({
        title: data.success ? "Bulk Action Success" : "Bulk Action Failed",
        description: data.message || data.error,
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to execute bulk action",
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
          Admin Deposit Monitoring Test
        </Heading>
        
        <Alert status="info">
          <AlertIcon />
          Test the admin deposit monitoring system APIs and functionality.
        </Alert>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Test Configuration */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Configuration</Heading>
                
                <FormControl>
                  <FormLabel>Status Filter:</FormLabel>
                  <Select value={testStatus} onChange={(e) => setTestStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Network Filter:</FormLabel>
                  <Select value={testNetwork} onChange={(e) => setTestNetwork(e.target.value)}>
                    <option value="all">All Networks</option>
                    <option value="TRC20">TRC20</option>
                    <option value="BEP20">BEP20</option>
                    <option value="Polygon">Polygon</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>User Email Filter:</FormLabel>
                  <Input
                    value={testUserEmail}
                    onChange={(e) => setTestUserEmail(e.target.value)}
                    placeholder="Filter by user email"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Transaction ID(s):</FormLabel>
                  <Input
                    value={testTransactionId}
                    onChange={(e) => setTestTransactionId(e.target.value)}
                    placeholder="Enter transaction ID (or comma-separated for bulk)"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel htmlFor="admin-email">Admin Email:</FormLabel>
                  <Input
                    id="admin-email"
                    name="adminEmail"
                    type="email"
                    value={testAdminEmail}
                    onChange={(e) => setTestAdminEmail(e.target.value)}
                    placeholder="Admin email"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel htmlFor="admin-notes">Admin Notes:</FormLabel>
                  <Textarea
                    id="admin-notes"
                    name="adminNotes"
                    value={testAdminNotes}
                    onChange={(e) => setTestAdminNotes(e.target.value)}
                    placeholder="Admin notes for actions"
                    rows={3}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Test Actions */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Actions</Heading>
                
                <Button 
                  onClick={testGetDeposits} 
                  isLoading={isLoading}
                  colorScheme="blue"
                  size="sm"
                >
                  Get Deposits (with filters)
                </Button>
                
                <Divider />
                
                <Text fontSize="sm" fontWeight="bold">Individual Actions:</Text>
                <HStack spacing={2}>
                  <Button 
                    onClick={() => testUpdateDeposit('approved')} 
                    isLoading={isLoading}
                    colorScheme="green"
                    size="sm"
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => testUpdateDeposit('rejected')} 
                    isLoading={isLoading}
                    colorScheme="red"
                    size="sm"
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={() => testUpdateDeposit('completed')} 
                    isLoading={isLoading}
                    colorScheme="blue"
                    size="sm"
                  >
                    Complete
                  </Button>
                </HStack>
                
                <Divider />
                
                <Text fontSize="sm" fontWeight="bold">Bulk Actions:</Text>
                <HStack spacing={2}>
                  <Button 
                    onClick={() => testBulkAction('approve')} 
                    isLoading={isLoading}
                    colorScheme="green"
                    size="sm"
                  >
                    Bulk Approve
                  </Button>
                  <Button 
                    onClick={() => testBulkAction('reject')} 
                    isLoading={isLoading}
                    colorScheme="red"
                    size="sm"
                  >
                    Bulk Reject
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Results Display */}
        {depositsResult && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Deposits Query Result</Heading>
                <HStack>
                  <Text fontWeight="bold">Success:</Text>
                  <Badge colorScheme={depositsResult.success ? "green" : "red"}>
                    {depositsResult.success ? 'Yes' : 'No'}
                  </Badge>
                </HStack>
                
                {depositsResult.success && (
                  <>
                    <Text><strong>Deposits Found:</strong> {depositsResult.deposits?.length || 0}</Text>
                    
                    {depositsResult.stats && (
                      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                          <Text fontSize="sm" color="gray.600">Total Deposits</Text>
                          <Text fontSize="lg" fontWeight="bold">{depositsResult.stats.total_deposits}</Text>
                        </Box>
                        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                          <Text fontSize="sm" color="gray.600">Pending</Text>
                          <Text fontSize="lg" fontWeight="bold" color="yellow.600">{depositsResult.stats.pending_deposits}</Text>
                        </Box>
                        <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                          <Text fontSize="sm" color="gray.600">Total Amount</Text>
                          <Text fontSize="lg" fontWeight="bold" color="green.600">${depositsResult.stats.total_amount}</Text>
                        </Box>
                      </SimpleGrid>
                    )}

                    {depositsResult.deposits && depositsResult.deposits.length > 0 && (
                      <Box>
                        <Text fontWeight="bold" mb={2}>Sample Deposits:</Text>
                        {depositsResult.deposits.slice(0, 3).map((deposit: any, index: number) => (
                          <Box key={index} p={3} border="1px solid" borderColor="gray.200" borderRadius="md" mb={2}>
                            <HStack justify="space-between">
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm"><strong>User:</strong> {deposit.user_email}</Text>
                                <Text fontSize="sm"><strong>Amount:</strong> ${deposit.amount}</Text>
                                <Text fontSize="sm"><strong>Network:</strong> {deposit.network}</Text>
                              </VStack>
                              <Badge colorScheme={deposit.status === 'pending' ? 'yellow' : deposit.status === 'approved' ? 'green' : 'red'}>
                                {deposit.status}
                              </Badge>
                            </HStack>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )}

                {!depositsResult.success && (
                  <Alert status="error">
                    <AlertIcon />
                    <Text>{depositsResult.error}</Text>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {updateResult && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Update Result</Heading>
                <HStack>
                  <Text fontWeight="bold">Success:</Text>
                  <Badge colorScheme={updateResult.success ? "green" : "red"}>
                    {updateResult.success ? 'Yes' : 'No'}
                  </Badge>
                </HStack>
                <Text><strong>Message:</strong> {updateResult.message || updateResult.error}</Text>
                {updateResult.transaction && (
                  <Code fontSize="sm" p={2} borderRadius="md">
                    Transaction ID: {updateResult.transaction.id}
                  </Code>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {bulkResult && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Bulk Action Result</Heading>
                <HStack>
                  <Text fontWeight="bold">Success:</Text>
                  <Badge colorScheme={bulkResult.success ? "green" : "red"}>
                    {bulkResult.success ? 'Yes' : 'No'}
                  </Badge>
                </HStack>
                <Text><strong>Message:</strong> {bulkResult.message || bulkResult.error}</Text>
                {bulkResult.updatedCount && (
                  <Text><strong>Updated Count:</strong> {bulkResult.updatedCount}</Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Divider />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" color="gray.600">
            <strong>How to test:</strong><br />
            1. Configure filters and parameters above<br />
            2. Click "Get Deposits" to test the query API<br />
            3. Enter a transaction ID to test individual actions<br />
            4. Use comma-separated IDs for bulk actions<br />
            5. Check the results and console for detailed logs<br />
            6. Visit `/admin/deposits` for the full admin interface
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
