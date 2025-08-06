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
  Icon,
  Flex,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Container
} from '@chakra-ui/react';
import { 
  FaArrowDown, 
  FaArrowUp, 
  FaUsers, 
  FaShieldAlt,
  FaSync,
  FaEye,
  FaCog,
  FaHome
} from 'react-icons/fa';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAccessPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('');
  const router = useRouter();
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  // Admin login function
  const handleAdminLogin = async () => {
    setIsLoading(true);
    setAuthStatus('Logging in...');
    try {
      console.log('Attempting admin login...');
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@ticgloballtd.com',
          password: 'admin1223!'
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok) {
        setAuthStatus('✅ Login successful!');
        toast({
          title: 'Login Successful',
          description: 'Admin access granted! You can now access admin features.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setAuthStatus(`❌ Login failed: ${data.error || 'Unknown error'}`);
        toast({
          title: 'Login Failed',
          description: data.error || 'Invalid admin credentials',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthStatus(`❌ Network error: ${error}`);
      toast({
        title: 'Error',
        description: 'Network error during login',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test authentication
  const testAuth = async () => {
    try {
      setAuthStatus('Testing authentication...');
      const response = await fetch('/api/admin/test-auth', {
        credentials: 'include'
      });
      const data = await response.json();
      console.log('Auth test result:', data);
      
      if (data.authenticated) {
        setAuthStatus('✅ Authentication working!');
        toast({
          title: 'Auth Test Success',
          description: `Authenticated as: ${data.admin?.email}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setAuthStatus(`❌ Not authenticated: ${data.error}`);
        toast({
          title: 'Auth Test Failed',
          description: data.error || 'Not authenticated',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Auth test error:', error);
      setAuthStatus(`❌ Auth test failed: ${error}`);
    }
  };

  // Test withdrawal API
  const testWithdrawals = async () => {
    try {
      setAuthStatus('Testing withdrawal API...');
      const response = await fetch('/api/admin/withdrawals?limit=1', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Withdrawal API test result:', data);
        setAuthStatus('✅ Withdrawal API working!');
        toast({
          title: 'API Test Success',
          description: `Found ${data.withdrawals?.length || 0} withdrawals`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorText = await response.text();
        setAuthStatus(`❌ Withdrawal API failed: ${response.status} - ${errorText}`);
        toast({
          title: 'API Test Failed',
          description: `Status: ${response.status}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Withdrawal API test error:', error);
      setAuthStatus(`❌ Withdrawal API error: ${error}`);
    }
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="6xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Card bg={cardBgColor} shadow="lg">
            <CardHeader>
              <Flex align="center">
                <VStack align="start" spacing={1}>
                  <Heading as="h1" size="xl" color={textColor}>
                    🛡️ Admin Access Portal
                  </Heading>
                  <Text color="gray.500" fontSize="lg">
                    Direct admin access - bypassing routing issues
                  </Text>
                </VStack>
              </Flex>
            </CardHeader>
          </Card>

          {/* Status Display */}
          {authStatus && (
            <Card bg={cardBgColor} shadow="sm">
              <CardBody>
                <Alert status={authStatus.includes('✅') ? 'success' : authStatus.includes('❌') ? 'error' : 'info'}>
                  <AlertIcon />
                  <AlertDescription fontSize="md">
                    {authStatus}
                  </AlertDescription>
                </Alert>
              </CardBody>
            </Card>
          )}

          {/* Authentication Section */}
          <Card bg={cardBgColor} shadow="sm" borderColor="red.200" borderWidth="2px">
            <CardHeader>
              <Heading as="h2" size="lg" color="red.600">
                🔐 Step 1: Authentication
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Text color="gray.600" textAlign="center">
                  First, authenticate as admin to access the system
                </Text>
                <HStack spacing={4}>
                  <Button
                    leftIcon={<FaShieldAlt />}
                    onClick={handleAdminLogin}
                    isLoading={isLoading}
                    colorScheme="red"
                    size="lg"
                  >
                    Login as Admin
                  </Button>
                  <Button
                    leftIcon={<FaEye />}
                    onClick={testAuth}
                    colorScheme="blue"
                    variant="outline"
                    size="lg"
                  >
                    Test Auth Status
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* API Testing Section */}
          <Card bg={cardBgColor} shadow="sm" borderColor="blue.200" borderWidth="2px">
            <CardHeader>
              <Heading as="h2" size="lg" color="blue.600">
                🧪 Step 2: Test APIs
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Text color="gray.600" textAlign="center">
                  Test if the admin APIs are working correctly
                </Text>
                <HStack spacing={4}>
                  <Button
                    leftIcon={<FaArrowUp />}
                    onClick={testWithdrawals}
                    colorScheme="orange"
                    variant="outline"
                    size="lg"
                  >
                    Test Withdrawals API
                  </Button>
                  <Button
                    leftIcon={<FaSync />}
                    onClick={() => {
                      console.log('Current cookies:', document.cookie);
                      console.log('Current URL:', window.location.href);
                      setAuthStatus('Check browser console for debug info');
                    }}
                    colorScheme="gray"
                    variant="outline"
                    size="lg"
                  >
                    Debug Info
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Direct Links Section */}
          <Card bg={cardBgColor} shadow="sm" borderColor="green.200" borderWidth="2px">
            <CardHeader>
              <Heading as="h2" size="lg" color="green.600">
                🚀 Step 3: Access Admin Features
              </Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                <Button
                  leftIcon={<FaArrowUp />}
                  onClick={() => window.open('/admin/withdrawals', '_blank')}
                  colorScheme="red"
                  size="lg"
                  height="60px"
                >
                  Withdrawal Management
                </Button>
                <Button
                  leftIcon={<FaArrowDown />}
                  onClick={() => window.open('/admin/deposits', '_blank')}
                  colorScheme="green"
                  size="lg"
                  height="60px"
                >
                  Deposit Management
                </Button>
                <Button
                  leftIcon={<FaUsers />}
                  onClick={() => window.open('/admin/users', '_blank')}
                  colorScheme="blue"
                  size="lg"
                  height="60px"
                >
                  User Management
                </Button>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Navigation */}
          <Card bg={cardBgColor} shadow="sm">
            <CardBody>
              <HStack spacing={4} justify="center">
                <Button
                  leftIcon={<FaHome />}
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                >
                  Back to Dashboard
                </Button>
                <Button
                  leftIcon={<FaCog />}
                  onClick={() => window.open('/admin', '_blank')}
                  variant="outline"
                >
                  Try Main Admin
                </Button>
              </HStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}
