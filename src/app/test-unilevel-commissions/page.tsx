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
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export default function TestUnilevelCommissionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testEmail, setTestEmail] = useState('');
  const [result, setResult] = useState<any>(null);
  const [commissionHistory, setCommissionHistory] = useState<any>(null);
  const { data: session } = useSession();
  const toast = useToast();

  const distributeCommissions = async (userEmail?: string) => {
    setIsLoading(true);
    try {
      const targetEmail = userEmail || testEmail || session?.user?.email;
      
      const response = await fetch('/api/unilevel-commissions/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: testDate,
          userEmail: targetEmail || undefined
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Commissions Distributed!',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error distributing commissions:', error);
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

  const checkCommissionHistory = async () => {
    setIsLoading(true);
    try {
      const targetEmail = testEmail || session?.user?.email;
      const url = new URL('/api/unilevel-commissions/distribute', window.location.origin);
      url.searchParams.set('date', testDate);
      if (targetEmail) {
        url.searchParams.set('userEmail', targetEmail);
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      setCommissionHistory(data);

      if (!data.success) {
        toast({
          title: 'Failed to Load History',
          description: data.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching commission history:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to load commission history',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCommissionRate = (level: number) => {
    if (level === 1) return '10%';
    if (level >= 2 && level <= 6) return '5%';
    if (level >= 7 && level <= 10) return '2.5%';
    if (level >= 11 && level <= 15) return '1%';
    return '0%';
  };

  const getDailyBonus = (level: number) => {
    if (level === 1) return '$0.044';
    if (level >= 2 && level <= 6) return '$0.022';
    if (level >= 7 && level <= 10) return '$0.011';
    if (level >= 11 && level <= 15) return '$0.0044';
    return '$0.000';
  };

  return (
    <Box p={6} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Unilevel Commission System Test</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page tests the unilevel commission system based on VIP plan earnings: $138 × 10% = $13.8 monthly or $0.44 daily per account.
        </Alert>

        {/* Test Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <Heading size="md">Distribution Controls</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Distribution Date</FormLabel>
                  <Input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Test User Email (optional - for single user test)</FormLabel>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </FormControl>
              </SimpleGrid>
              
              <HStack spacing={4}>
                <Button
                  onClick={() => distributeCommissions()}
                  isLoading={isLoading}
                  loadingText="Distributing..."
                  colorScheme="green"
                >
                  Distribute Single User
                </Button>
                
                <Button
                  onClick={() => distributeCommissions(undefined)}
                  isLoading={isLoading}
                  loadingText="Processing..."
                  colorScheme="blue"
                >
                  Distribute All Users
                </Button>
                
                <Button
                  onClick={checkCommissionHistory}
                  colorScheme="purple"
                  variant="outline"
                >
                  Check History
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Commission Structure */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Unilevel Commission Structure</Heading>
              
              <Alert status="warning">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium">Base Calculation:</Text>
                  <Text fontSize="sm">• VIP Plan: $138 × 10% = $13.8 monthly = $0.44 daily per account</Text>
                  <Text fontSize="sm">• Commission = Level Rate × $0.44 × Number of VIP Accounts</Text>
                </VStack>
              </Alert>

              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Level</Th>
                      <Th>Commission Rate</Th>
                      <Th>Daily Bonus per VIP Account</Th>
                      <Th>Monthly Bonus per VIP Account</Th>
                      <Th>Access</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>Level 1</Td>
                      <Td><Badge colorScheme="green">10%</Badge></Td>
                      <Td fontWeight="bold">$0.044</Td>
                      <Td>$1.32</Td>
                      <Td><Badge colorScheme="blue">VIP & Starter</Badge></Td>
                    </Tr>
                    <Tr>
                      <Td>Levels 2-6</Td>
                      <Td><Badge colorScheme="blue">5%</Badge></Td>
                      <Td fontWeight="bold">$0.022</Td>
                      <Td>$0.66</Td>
                      <Td><Badge colorScheme="purple">VIP Only</Badge></Td>
                    </Tr>
                    <Tr>
                      <Td>Levels 7-10</Td>
                      <Td><Badge colorScheme="orange">2.5%</Badge></Td>
                      <Td fontWeight="bold">$0.011</Td>
                      <Td>$0.33</Td>
                      <Td><Badge colorScheme="purple">VIP Only</Badge></Td>
                    </Tr>
                    <Tr>
                      <Td>Levels 11-15</Td>
                      <Td><Badge colorScheme="red">1%</Badge></Td>
                      <Td fontWeight="bold">$0.0044</Td>
                      <Td>$0.132</Td>
                      <Td><Badge colorScheme="purple">VIP Only</Badge></Td>
                    </Tr>
                  </Tbody>
                </Table>
              </TableContainer>
            </VStack>
          </CardBody>
        </Card>

        {/* Distribution Result */}
        {result && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Distribution Result</Heading>
                
                <Alert status={result.success ? 'success' : 'error'}>
                  <AlertIcon />
                  <Text>{result.message || result.error}</Text>
                </Alert>

                {result.success && result.data && (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                    {result.data.distribution_type === 'single_user' ? (
                      <>
                        <Stat>
                          <StatLabel>User</StatLabel>
                          <StatNumber fontSize="md">{result.data.user_email}</StatNumber>
                          <StatHelpText>Plan: {result.data.plan_type}</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Max Level</StatLabel>
                          <StatNumber color="blue.500">{result.data.max_level}</StatNumber>
                          <StatHelpText>Commission levels</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Distributions</StatLabel>
                          <StatNumber color="green.500">{result.data.distributions}</StatNumber>
                          <StatHelpText>Commission payments</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Total Commission</StatLabel>
                          <StatNumber color="purple.500">${result.data.total_commission?.toFixed(4)}</StatNumber>
                          <StatHelpText>Daily earnings</StatHelpText>
                        </Stat>
                      </>
                    ) : (
                      <>
                        <Stat>
                          <StatLabel>Processed Users</StatLabel>
                          <StatNumber>{result.data.processed_users}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Successful</StatLabel>
                          <StatNumber color="green.500">{result.data.successful_distributions}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Failed</StatLabel>
                          <StatNumber color="red.500">{result.data.failed_distributions}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Total Distributed</StatLabel>
                          <StatNumber color="purple.500">${result.data.total_commissions_distributed?.toFixed(4)}</StatNumber>
                        </Stat>
                      </>
                    )}
                  </SimpleGrid>
                )}

                <Divider />
                
                <VStack align="stretch">
                  <Text fontWeight="bold">Raw Response:</Text>
                  <Textarea
                    value={JSON.stringify(result, null, 2)}
                    readOnly
                    rows={8}
                    fontSize="sm"
                    fontFamily="mono"
                  />
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Commission History */}
        {commissionHistory && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Commission History for {testDate}</Heading>
                
                {commissionHistory.success && commissionHistory.data.summary && (
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                    <Stat>
                      <StatLabel>Total Commissions</StatLabel>
                      <StatNumber>{commissionHistory.data.summary.total_commissions}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Total Amount</StatLabel>
                      <StatNumber color="green.500">${commissionHistory.data.summary.total_amount?.toFixed(4)}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Distributed</StatLabel>
                      <StatNumber color="blue.500">{commissionHistory.data.summary.by_status.distributed}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Pending</StatLabel>
                      <StatNumber color="yellow.500">{commissionHistory.data.summary.by_status.pending}</StatNumber>
                    </Stat>
                  </SimpleGrid>
                )}

                <Divider />
                
                <VStack align="stretch">
                  <Text fontWeight="bold">Raw History Data:</Text>
                  <Textarea
                    value={JSON.stringify(commissionHistory, null, 2)}
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
              <Text>1. <strong>Setup:</strong> Ensure you have referrals with VIP plans using <Code>/test-community</Code></Text>
              <Text>2. <strong>Single User Test:</strong> Enter your email and click "Distribute Single User"</Text>
              <Text>3. <strong>Bulk Distribution:</strong> Click "Distribute All Users" to process everyone</Text>
              <Text>4. <strong>Check Results:</strong> View partner wallet at <Code>/referrals</Code> → Partner Wallet tab</Text>
              <Text>5. <strong>Verify Calculations:</strong> Commission = Level Rate × $0.44 × VIP Account Count</Text>
              
              <Alert status="success" mt={4}>
                <AlertIcon />
                <Text>
                  <strong>Expected Result:</strong> Users with VIP plans in their referral network will receive daily 
                  commissions based on the unilevel structure, credited to their Partner Wallet.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
