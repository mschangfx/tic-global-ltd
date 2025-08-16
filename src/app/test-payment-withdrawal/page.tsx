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
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';

export default function TestPaymentWithdrawalPage() {
  // Payment test state
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  
  // Withdrawal test state
  const [withdrawalMethod, setWithdrawalMethod] = useState('usdt-trc20');
  const [withdrawalAddress, setWithdrawalAddress] = useState('TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF');
  const [withdrawalAmount, setWithdrawalAmount] = useState('50');
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);
  
  // Subscription test state
  const [subscriptionResult, setSubscriptionResult] = useState<any>(null);
  
  // Admin test state
  const [adminWithdrawalId, setAdminWithdrawalId] = useState('');
  const [adminAction, setAdminAction] = useState('approve');
  const [adminNotes, setAdminNotes] = useState('Test admin action');
  const [adminResult, setAdminResult] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const testPayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan
          // userEmail is now obtained from session server-side for security
        })
      });

      const data = await response.json();
      setPaymentResult(data);
      
      toast({
        title: data.success ? "Payment Test Success" : "Payment Test Failed",
        description: data.message || data.error,
        status: data.success ? "success" : "error",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to test payment",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testWithdrawal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: withdrawalMethod,
          destinationAddress: withdrawalAddress,
          amount: parseFloat(withdrawalAmount)
        })
      });

      const data = await response.json();
      setWithdrawalResult(data);
      
      toast({
        title: data.success ? "Withdrawal Test Success" : "Withdrawal Test Failed",
        description: data.message || data.error,
        status: data.success ? "success" : "error",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to test withdrawal",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGetSubscriptions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/subscriptions');
      const data = await response.json();
      setSubscriptionResult(data);
      
      toast({
        title: data.success ? "Subscriptions Loaded" : "Load Failed",
        description: data.success ? `Found ${data.active_subscriptions?.length || 0} active subscriptions` : data.error,
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAdminWithdrawal = async () => {
    if (!adminWithdrawalId) {
      toast({
        title: "Missing Data",
        description: "Please enter a withdrawal ID",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId: adminWithdrawalId,
          action: adminAction,
          adminEmail: 'admin@ticgloballtd.com',
          adminNotes: adminNotes,
          blockchainHash: adminAction === 'complete' ? '0x123456789abcdef' : undefined
        })
      });

      const data = await response.json();
      setAdminResult(data);
      
      toast({
        title: data.success ? "Admin Action Success" : "Admin Action Failed",
        description: data.message || data.error,
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to execute admin action",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Payment & Withdrawal System Test
        </Heading>
        
        <Alert status="info">
          <AlertIcon />
          Test the complete payment and withdrawal system with Supabase backend.
        </Alert>

        <Tabs variant="enclosed">
          <TabList>
            <Tab>💰 Payment Tests</Tab>
            <Tab>💸 Withdrawal Tests</Tab>
            <Tab>📋 Subscription Tests</Tab>
            <Tab>🔧 Admin Tests</Tab>
          </TabList>

          <TabPanels>
            {/* Payment Tests */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Heading as="h3" size="md">Test Plan Payment</Heading>
                      
                      <FormControl>
                        <FormLabel>Select Plan:</FormLabel>
                        <Select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                          <option value="basic">Basic Plan - $29.99</option>
                          <option value="premium">Premium Plan - $99.99</option>
                          <option value="enterprise">Enterprise Plan - $299.99</option>
                        </Select>
                      </FormControl>

                      <Button 
                        onClick={testPayment} 
                        isLoading={isLoading}
                        colorScheme="green"
                      >
                        Test Payment Processing
                      </Button>

                      {paymentResult && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Payment Result:</Text>
                          <Code fontSize="sm" p={4} borderRadius="md" display="block" whiteSpace="pre-wrap">
                            {JSON.stringify(paymentResult, null, 2)}
                          </Code>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Withdrawal Tests */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Heading as="h3" size="md">Test Withdrawal Request</Heading>
                      
                      <FormControl>
                        <FormLabel>Withdrawal Method:</FormLabel>
                        <Select value={withdrawalMethod} onChange={(e) => setWithdrawalMethod(e.target.value)}>
                          <option value="usdt-trc20">USDT TRC20</option>
                          <option value="usdt-bep20">USDT BEP20</option>
                          <option value="usdt-polygon">USDT Polygon</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Destination Address:</FormLabel>
                        <Input
                          value={withdrawalAddress}
                          onChange={(e) => setWithdrawalAddress(e.target.value)}
                          placeholder="Enter wallet address"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Amount:</FormLabel>
                        <Input
                          type="number"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </FormControl>

                      <Button 
                        onClick={testWithdrawal} 
                        isLoading={isLoading}
                        colorScheme="blue"
                      >
                        Test Withdrawal Request
                      </Button>

                      {withdrawalResult && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Withdrawal Result:</Text>
                          <Code fontSize="sm" p={4} borderRadius="md" display="block" whiteSpace="pre-wrap">
                            {JSON.stringify(withdrawalResult, null, 2)}
                          </Code>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Subscription Tests */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Heading as="h3" size="md">Test User Subscriptions</Heading>
                      
                      <Button 
                        onClick={testGetSubscriptions} 
                        isLoading={isLoading}
                        colorScheme="purple"
                      >
                        Get User Subscriptions
                      </Button>

                      {subscriptionResult && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Subscription Result:</Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                            <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                              <Text fontSize="sm" color="gray.600">Active Subscriptions</Text>
                              <Text fontSize="lg" fontWeight="bold">{subscriptionResult.active_subscriptions?.length || 0}</Text>
                            </Box>
                            <Box p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                              <Text fontSize="sm" color="gray.600">Total Spent</Text>
                              <Text fontSize="lg" fontWeight="bold">${subscriptionResult.statistics?.total_spent || 0}</Text>
                            </Box>
                          </SimpleGrid>
                          <Code fontSize="sm" p={4} borderRadius="md" display="block" whiteSpace="pre-wrap">
                            {JSON.stringify(subscriptionResult, null, 2)}
                          </Code>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Admin Tests */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Heading as="h3" size="md">Test Admin Withdrawal Management</Heading>
                      
                      <FormControl>
                        <FormLabel>Withdrawal ID:</FormLabel>
                        <Input
                          value={adminWithdrawalId}
                          onChange={(e) => setAdminWithdrawalId(e.target.value)}
                          placeholder="Enter withdrawal ID from withdrawal test"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Admin Action:</FormLabel>
                        <Select value={adminAction} onChange={(e) => setAdminAction(e.target.value)}>
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                          <option value="complete">Complete</option>
                          <option value="processing">Set Processing</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Admin Notes:</FormLabel>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Enter admin notes"
                          rows={3}
                        />
                      </FormControl>

                      <Button 
                        onClick={testAdminWithdrawal} 
                        isLoading={isLoading}
                        colorScheme="red"
                      >
                        Test Admin Action
                      </Button>

                      {adminResult && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Admin Action Result:</Text>
                          <Code fontSize="sm" p={4} borderRadius="md" display="block" whiteSpace="pre-wrap">
                            {JSON.stringify(adminResult, null, 2)}
                          </Code>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Divider />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" color="gray.600">
            <strong>How to test the complete system:</strong><br />
            1. <strong>Payment Test</strong>: Select a plan and test payment processing<br />
            2. <strong>Withdrawal Test</strong>: Create a withdrawal request and note the ID<br />
            3. <strong>Subscription Test</strong>: Check user subscriptions and payment history<br />
            4. <strong>Admin Test</strong>: Use the withdrawal ID to test admin approval/rejection<br />
            5. Check the console and database for detailed logs and transaction records<br />
            6. All operations use Supabase database with proper transaction handling
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
