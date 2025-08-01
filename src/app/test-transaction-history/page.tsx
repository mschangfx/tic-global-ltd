'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
  Code,
  Textarea,
  FormControl,
  FormLabel,
  Input
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export default function TestTransactionHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const { data: session } = useSession();

  const fetchTransactionHistory = async (userEmail?: string) => {
    setIsLoading(true);
    try {
      const targetEmail = userEmail || testEmail || session?.user?.email;
      
      if (!targetEmail) {
        alert('Please log in or enter an email address');
        return;
      }

      const apiUrl = new URL('/api/transactions/history', window.location.origin);
      apiUrl.searchParams.set('userEmail', targetEmail);
      apiUrl.searchParams.set('type', 'all');
      apiUrl.searchParams.set('limit', '50');

      console.log('Fetching from:', apiUrl.toString());

      const response = await fetch(apiUrl.toString());
      const data = await response.json();
      
      setRawResponse(JSON.stringify(data, null, 2));
      
      if (data.success) {
        setTransactions(data.transactions || []);
      } else {
        console.error('API Error:', data);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchTransactionHistory();
    }
  }, [session]);

  const bonusTransactions = transactions.filter(tx => 
    tx.type.includes('Rank Bonus') || tx.details?.bonus_type === 'rank_bonus'
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box p={6} maxW="1400px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Transaction History Test - Rank Bonus Tracking</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page tests the transaction history API to verify that rank bonus distributions appear correctly in the transaction history.
        </Alert>

        {/* Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Test User Email (optional - will use current user if empty)</FormLabel>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </FormControl>
              
              <HStack spacing={4}>
                <Button
                  onClick={() => fetchTransactionHistory()}
                  isLoading={isLoading}
                  loadingText="Loading..."
                  colorScheme="blue"
                >
                  Fetch Transaction History
                </Button>
                
                <Button
                  onClick={() => window.open('/test-rank-bonus', '_blank')}
                  colorScheme="green"
                  variant="outline"
                >
                  Go to Rank Bonus Test
                </Button>
                
                <Button
                  onClick={() => window.open('/wallet/history', '_blank')}
                  colorScheme="purple"
                  variant="outline"
                >
                  View Full History Page
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Rank Bonus Transactions Summary */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Rank Bonus Transactions ({bonusTransactions.length})</Heading>
              
              {bonusTransactions.length > 0 ? (
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Amount</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                      <Th>Status</Th>
                      <Th>Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {bonusTransactions.map((tx) => (
                      <Tr key={tx.id}>
                        <Td>{tx.date} {tx.time}</Td>
                        <Td>
                          <Badge colorScheme="purple">{tx.type}</Badge>
                        </Td>
                        <Td fontWeight="bold" color="green.500">{tx.amount}</Td>
                        <Td>{tx.fromSystem}</Td>
                        <Td>{tx.toSystem}</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">{tx.details?.description}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Alert status="warning">
                  <AlertIcon />
                  <VStack align="start">
                    <Text>No rank bonus transactions found.</Text>
                    <Text fontSize="sm">
                      To test: Go to /test-community → Create 11+ referrals → Go to /test-rank-bonus → Distribute bonus → Refresh this page
                    </Text>
                  </VStack>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* All Transactions */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">All Transactions ({transactions.length})</Heading>
              
              {isLoading ? (
                <HStack justify="center" py={8}>
                  <Spinner />
                  <Text>Loading transactions...</Text>
                </HStack>
              ) : transactions.length > 0 ? (
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Amount</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.slice(0, 20).map((tx) => (
                      <Tr key={tx.id}>
                        <Td>{tx.date} {tx.time}</Td>
                        <Td>
                          <Badge 
                            colorScheme={
                              tx.type.includes('Rank Bonus') ? 'purple' :
                              tx.type.includes('Deposit') ? 'green' :
                              tx.type.includes('Withdrawal') ? 'red' :
                              'blue'
                            }
                          >
                            {tx.type}
                          </Badge>
                        </Td>
                        <Td 
                          fontWeight="bold" 
                          color={tx.amount.startsWith('+') ? 'green.500' : 'red.500'}
                        >
                          {tx.amount}
                        </Td>
                        <Td fontSize="sm">{tx.fromSystem}</Td>
                        <Td fontSize="sm">{tx.toSystem}</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Alert status="info">
                  <AlertIcon />
                  No transactions found. Click "Fetch Transaction History" to load data.
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Raw API Response */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Raw API Response</Heading>
              <Textarea
                value={rawResponse}
                readOnly
                rows={15}
                fontSize="sm"
                fontFamily="mono"
                placeholder="API response will appear here..."
              />
            </VStack>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Card>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading size="md">Testing Instructions:</Heading>
              <Text>1. <strong>Create Test Referrals:</strong> Go to <Code>/test-community</Code> and create 11+ referrals to achieve Bronze rank</Text>
              <Text>2. <strong>Distribute Bonus:</strong> Go to <Code>/test-rank-bonus</Code> and click "Distribute Single User"</Text>
              <Text>3. <strong>Check History:</strong> Return here and click "Fetch Transaction History"</Text>
              <Text>4. <strong>Verify Results:</strong> You should see two transactions:</Text>
              <Text ml={4}>• "Rank Bonus (TIC)" - 50% of bonus as TIC tokens</Text>
              <Text ml={4}>• "Rank Bonus (GIC)" - 50% of bonus as GIC tokens</Text>
              <Text>5. <strong>Check Wallet:</strong> Go to <Code>/wallet</Code> to see updated TIC and GIC balances</Text>
              
              <Alert status="success" mt={4}>
                <AlertIcon />
                <Text>
                  <strong>Expected Result:</strong> Rank bonus transactions will show as "Rank Bonus (TIC)" and "Rank Bonus (GIC)" 
                  with "From: Rank Bonus System" and "To: My Wallet (TIC/GIC)" in the transaction history.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
