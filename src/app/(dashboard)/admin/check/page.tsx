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
  useColorModeValue,
  useToast,
  Badge,
  Code,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStatus {
  isLoggedIn: boolean;
  hasToken: boolean;
  tokenValid: boolean;
  adminEmail?: string;
  error?: string;
}

export default function AdminCheck() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const checkAdminStatus = async () => {
    setIsLoading(true);
    try {
      // Check if we have admin token in cookies
      const cookies = document.cookie;
      const hasToken = cookies.includes('admin-token');
      
      // Try to call admin status API
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      
      setStatus({
        isLoggedIn: data.success && data.isAdmin,
        hasToken,
        tokenValid: data.success,
        adminEmail: data.admin?.email,
        error: data.message
      });
      
    } catch (error) {
      console.error('Status check error:', error);
      setStatus({
        isLoggedIn: false,
        hasToken: document.cookie.includes('admin-token'),
        tokenValid: false,
        error: 'Failed to check admin status'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@ticgloballtd.com',
          password: 'admin1223!'
        }),
      });

      if (response.ok) {
        toast({
          title: 'Login Successful',
          description: 'Admin login completed!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh status
        setTimeout(() => {
          checkAdminStatus();
        }, 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Login Failed',
          description: errorData.error || 'Login failed',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Network error during login',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const goToAdminDashboard = () => {
    window.location.href = '/admin/simple';
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="2xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <VStack align="start" spacing={2}>
              <Heading as="h1" size="lg" color={textColor}>
                🔍 Admin Status Check
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Debug admin authentication and login status
              </Text>
            </VStack>
          </CardHeader>
        </Card>

        {/* Status Display */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading as="h2" size="md" color={textColor}>
              📊 Current Status
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {status ? (
                <>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Admin Logged In:</Text>
                    <Badge colorScheme={status.isLoggedIn ? 'green' : 'red'}>
                      {status.isLoggedIn ? 'YES' : 'NO'}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Has Admin Token:</Text>
                    <Badge colorScheme={status.hasToken ? 'green' : 'red'}>
                      {status.hasToken ? 'YES' : 'NO'}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Token Valid:</Text>
                    <Badge colorScheme={status.tokenValid ? 'green' : 'red'}>
                      {status.tokenValid ? 'YES' : 'NO'}
                    </Badge>
                  </HStack>
                  
                  {status.adminEmail && (
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Admin Email:</Text>
                      <Code fontSize="sm">{status.adminEmail}</Code>
                    </HStack>
                  )}
                  
                  {status.error && (
                    <Alert status="info">
                      <AlertIcon />
                      <AlertTitle>Status Message:</AlertTitle>
                      <AlertDescription>{status.error}</AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Text color="gray.500">Loading status...</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Actions */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading as="h3" size="md" color={textColor}>
              🚀 Actions
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Button
                colorScheme="blue"
                onClick={checkAdminStatus}
                isLoading={isLoading}
                loadingText="Checking..."
                width="full"
              >
                🔄 Refresh Status
              </Button>
              
              <Button
                colorScheme="red"
                onClick={loginAsAdmin}
                width="full"
              >
                🔐 Login as Admin
              </Button>
              
              {status?.isLoggedIn && (
                <Button
                  colorScheme="green"
                  onClick={goToAdminDashboard}
                  width="full"
                >
                  🛡️ Go to Admin Dashboard
                </Button>
              )}
              
              <Divider />
              
              <Button
                variant="outline"
                onClick={() => router.push('/admin/login')}
                width="full"
              >
                📝 Go to Login Page
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading as="h4" size="sm" color={textColor}>
              📝 Instructions
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm">
                • Use "Refresh Status" to check current admin authentication
              </Text>
              <Text fontSize="sm">
                • Use "Login as Admin" to automatically login with admin credentials
              </Text>
              <Text fontSize="sm">
                • If logged in, use "Go to Admin Dashboard" to access the admin panel
              </Text>
              <Text fontSize="sm">
                • This page helps debug authentication issues
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
