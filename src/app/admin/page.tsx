'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  Container,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setStatus('Logging in...');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@ticgloballtd.com',
          password: 'admin1223!'
        }),
      });

      if (response.ok) {
        setStatus('✅ Login successful!');
        toast({
          title: 'Success',
          description: 'Admin login successful',
          status: 'success',
          duration: 3000,
        });
      } else {
        const data = await response.json();
        setStatus(`❌ Login failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    setStatus('Loading withdrawals...');
    try {
      const response = await fetch('/api/simple-admin?action=pending&limit=20', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
        setStatus(`✅ Loaded ${data.withdrawals?.length || 0} pending withdrawals`);
      } else {
        setStatus(`❌ Failed to load withdrawals: ${response.status}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleWithdrawalAction = async (action: 'approve' | 'reject') => {
    if (!selectedWithdrawal) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/simple-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          withdrawalId: selectedWithdrawal.id,
          adminNotes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(`✅ Withdrawal ${action}d successfully`);
        toast({
          title: 'Success',
          description: data.message,
          status: 'success',
          duration: 3000,
        });
        onClose();
        loadWithdrawals(); // Reload the list
      } else {
        const errorData = await response.json();
        setStatus(`❌ Failed to ${action}: ${errorData.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={6}>
          {/* Header */}
          <Card bg={cardBgColor} w="full">
            <CardHeader textAlign="center">
              <Heading size="xl" color="blue.600">
                🛡️ TIC Global Admin
              </Heading>
              <Text color="gray.500" mt={2}>
                Simple Admin Interface
              </Text>
            </CardHeader>
          </Card>

          {/* Status */}
          {status && (
            <Alert status={status.includes('✅') ? 'success' : 'error'}>
              <AlertIcon />
              {status}
            </Alert>
          )}

          {/* Login Section */}
          <Card bg={cardBgColor} w="full">
            <CardHeader>
              <Heading size="md">Step 1: Login</Heading>
            </CardHeader>
            <CardBody>
              <Button
                colorScheme="red"
                size="lg"
                onClick={handleAdminLogin}
                isLoading={isLoading}
                w="full"
              >
                Login as Admin
              </Button>
            </CardBody>
          </Card>

          {/* Test Section */}
          <Card bg={cardBgColor} w="full">
            <CardHeader>
              <Heading size="md">Step 2: Test System</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3}>
                <Button
                  colorScheme="blue"
                  onClick={loadWithdrawals}
                  w="full"
                >
                  Load Pending Withdrawals
                </Button>
                <Button
                  colorScheme="green"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/deposits?limit=5', {
                        credentials: 'include'
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setStatus(`✅ Found ${data.deposits?.length || 0} deposits`);
                      } else {
                        setStatus(`❌ Deposits API failed: ${response.status}`);
                      }
                    } catch (error) {
                      setStatus(`❌ Error: ${error}`);
                    }
                  }}
                  w="full"
                >
                  Test Deposit System
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Direct Database Access */}
          <Card bg={cardBgColor} w="full">
            <CardHeader>
              <Heading size="md">Step 3: Direct Database Actions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3}>
                <Button
                  colorScheme="orange"
                  onClick={async () => {
                    try {
                      setStatus('Checking database...');
                      // Direct database query using Supabase
                      const response = await fetch('/api/admin/withdrawals', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ action: 'list', limit: 10 })
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setStatus(`✅ Database connected. Found ${data.withdrawals?.length || 0} records`);
                      } else {
                        setStatus(`❌ Database error: ${response.status}`);
                      }
                    } catch (error) {
                      setStatus(`❌ Database error: ${error}`);
                    }
                  }}
                  w="full"
                >
                  Check Database Connection
                </Button>
                
                <Divider />
                
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  If the above tests work, you can manually manage withdrawals using the database
                </Text>
                
                <Button
                  colorScheme="purple"
                  variant="outline"
                  onClick={() => {
                    console.log('=== ADMIN DEBUG INFO ===');
                    console.log('Current URL:', window.location.href);
                    console.log('Cookies:', document.cookie);
                    console.log('Local Storage:', localStorage);
                    setStatus('Check browser console for debug info');
                  }}
                  w="full"
                >
                  Show Debug Info
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Manual Withdrawal Management */}
          <Card bg={cardBgColor} w="full" borderColor="red.200" borderWidth="2px">
            <CardHeader>
              <Heading size="md" color="red.600">Emergency: Manual Withdrawal Management</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  If the web interface doesn't work, I can help you manage withdrawals directly through the database.
                  Tell me what withdrawal actions you need to perform.
                </Text>
                
                <SimpleGrid columns={2} spacing={3} w="full">
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => setStatus('Ready to approve withdrawals via database')}
                  >
                    Approve Withdrawals
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => setStatus('Ready to reject withdrawals via database')}
                  >
                    Reject Withdrawals
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => setStatus('Ready to list pending withdrawals')}
                  >
                    List Pending
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="gray"
                    onClick={() => setStatus('Ready to check withdrawal status')}
                  >
                    Check Status
                  </Button>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>

          {/* Withdrawal Management Table */}
          {withdrawals.length > 0 && (
            <Card bg={cardBgColor} w="full">
              <CardHeader>
                <Heading size="md">Pending Withdrawals ({withdrawals.length})</Heading>
              </CardHeader>
              <CardBody>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>User</Th>
                        <Th>Amount</Th>
                        <Th>Currency</Th>
                        <Th>Method</Th>
                        <Th>Date</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {withdrawals.map((withdrawal) => (
                        <Tr key={withdrawal.id}>
                          <Td>{withdrawal.user_email}</Td>
                          <Td>${withdrawal.amount}</Td>
                          <Td>{withdrawal.currency}</Td>
                          <Td>{withdrawal.method_id}</Td>
                          <Td>{new Date(withdrawal.created_at).toLocaleDateString()}</Td>
                          <Td>
                            <Badge colorScheme={withdrawal.status === 'pending' ? 'yellow' : 'gray'}>
                              {withdrawal.status}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Button
                                size="xs"
                                colorScheme="green"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setAdminNotes('');
                                  onOpen();
                                }}
                              >
                                Review
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          )}

          {/* Withdrawal Action Modal */}
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Review Withdrawal</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                {selectedWithdrawal && (
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontWeight="bold">User:</Text>
                      <Text>{selectedWithdrawal.user_email}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Amount:</Text>
                      <Text>${selectedWithdrawal.amount} {selectedWithdrawal.currency}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Destination:</Text>
                      <Text fontSize="sm">{selectedWithdrawal.destination_address}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Admin Notes:</Text>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes for this action..."
                      />
                    </Box>
                  </VStack>
                )}
              </ModalBody>
              <ModalFooter>
                <HStack spacing={3}>
                  <Button
                    colorScheme="green"
                    onClick={() => handleWithdrawalAction('approve')}
                    isLoading={isLoading}
                  >
                    Approve
                  </Button>
                  <Button
                    colorScheme="red"
                    onClick={() => handleWithdrawalAction('reject')}
                    isLoading={isLoading}
                  >
                    Reject
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </Container>
    </Box>
  );
}
