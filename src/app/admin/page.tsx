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
  Divider
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
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

  const testWithdrawals = async () => {
    setStatus('Testing withdrawals...');
    try {
      const response = await fetch('/api/admin/withdrawals?limit=5', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(`✅ Found ${data.withdrawals?.length || 0} withdrawals`);
        console.log('Withdrawal data:', data);
      } else {
        setStatus(`❌ Withdrawals API failed: ${response.status}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
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
                  onClick={testWithdrawals}
                  w="full"
                >
                  Test Withdrawal System
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
        </VStack>
      </Container>
    </Box>
  );
}
