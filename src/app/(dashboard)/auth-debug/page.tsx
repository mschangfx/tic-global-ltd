'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Code,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { getSession, signIn, signOut } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';

interface AuthDebugInfo {
  nextAuth: {
    session: any;
    user: any;
    status: string;
  };
  supabase: {
    session: any;
    user: any;
    status: string;
  };
  apiTest: {
    status: string;
    response: any;
    error?: string;
  };
}

export default function AuthDebugPage() {
  const [authInfo, setAuthInfo] = useState<AuthDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAllAuth = async () => {
    setIsLoading(true);
    const info: AuthDebugInfo = {
      nextAuth: { session: null, user: null, status: 'unknown' },
      supabase: { session: null, user: null, status: 'unknown' },
      apiTest: { status: 'unknown', response: null }
    };

    try {
      // Check NextAuth
      console.log('🔍 Checking NextAuth session...');
      const nextAuthSession = await getSession();
      info.nextAuth.session = nextAuthSession;
      info.nextAuth.user = nextAuthSession?.user || null;
      info.nextAuth.status = nextAuthSession ? 'authenticated' : 'not authenticated';
      console.log('NextAuth result:', info.nextAuth);

      // Check Supabase
      console.log('🔍 Checking Supabase session...');
      const supabase = createClient();
      const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
      
      info.supabase.session = supabaseSession;
      info.supabase.user = supabaseUser;
      info.supabase.status = supabaseSession ? 'authenticated' : 'not authenticated';
      console.log('Supabase result:', info.supabase);
      console.log('Supabase errors:', { sessionError, userError });

      // Test API call
      console.log('🔍 Testing API call...');
      try {
        const apiResponse = await fetch('/api/wallet/balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        const apiData = await apiResponse.json();
        info.apiTest.status = apiResponse.ok ? 'success' : 'failed';
        info.apiTest.response = apiData;
        console.log('API test result:', info.apiTest);
      } catch (apiError) {
        info.apiTest.status = 'error';
        info.apiTest.error = apiError instanceof Error ? apiError.message : 'Unknown error';
        console.error('API test error:', apiError);
      }

    } catch (error) {
      console.error('Auth check error:', error);
    }

    setAuthInfo(info);
    setIsLoading(false);
  };

  useEffect(() => {
    checkAllAuth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authenticated':
      case 'success':
        return 'green';
      case 'not authenticated':
      case 'failed':
        return 'red';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="lg">Authentication Debug</Heading>
              <Button
                onClick={checkAllAuth}
                isLoading={isLoading}
                colorScheme="blue"
                size="sm"
              >
                Refresh Check
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            {!authInfo ? (
              <Text>Loading authentication status...</Text>
            ) : (
              <VStack spacing={6} align="stretch">
                
                {/* NextAuth Status */}
                <Card variant="outline">
                  <CardHeader>
                    <HStack justify="space-between">
                      <Heading size="md">NextAuth (Google OAuth)</Heading>
                      <Badge colorScheme={getStatusColor(authInfo.nextAuth.status)}>
                        {authInfo.nextAuth.status}
                      </Badge>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="bold">User:</Text>
                        <Code p={2} display="block" whiteSpace="pre-wrap">
                          {JSON.stringify(authInfo.nextAuth.user, null, 2)}
                        </Code>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">Session:</Text>
                        <Code p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                          {JSON.stringify(authInfo.nextAuth.session, null, 2)}
                        </Code>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Supabase Status */}
                <Card variant="outline">
                  <CardHeader>
                    <HStack justify="space-between">
                      <Heading size="md">Supabase (Email/Password)</Heading>
                      <Badge colorScheme={getStatusColor(authInfo.supabase.status)}>
                        {authInfo.supabase.status}
                      </Badge>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="bold">User:</Text>
                        <Code p={2} display="block" whiteSpace="pre-wrap">
                          {JSON.stringify(authInfo.supabase.user, null, 2)}
                        </Code>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">Session:</Text>
                        <Code p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                          {JSON.stringify(authInfo.supabase.session, null, 2)}
                        </Code>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                {/* API Test Status */}
                <Card variant="outline">
                  <CardHeader>
                    <HStack justify="space-between">
                      <Heading size="md">API Test (/api/wallet/balance)</Heading>
                      <Badge colorScheme={getStatusColor(authInfo.apiTest.status)}>
                        {authInfo.apiTest.status}
                      </Badge>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      {authInfo.apiTest.error && (
                        <Alert status="error">
                          <AlertIcon />
                          <AlertTitle>API Error:</AlertTitle>
                          <AlertDescription>{authInfo.apiTest.error}</AlertDescription>
                        </Alert>
                      )}
                      <Box>
                        <Text fontWeight="bold">Response:</Text>
                        <Code p={2} display="block" whiteSpace="pre-wrap" maxH="300px" overflowY="auto">
                          {JSON.stringify(authInfo.apiTest.response, null, 2)}
                        </Code>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                <Divider />

                {/* Quick Actions */}
                <Card variant="outline">
                  <CardHeader>
                    <Heading size="md">Quick Actions</Heading>
                  </CardHeader>
                  <CardBody>
                    <HStack spacing={4}>
                      <Button
                        onClick={() => signIn('google')}
                        colorScheme="blue"
                        size="sm"
                      >
                        Sign In with Google
                      </Button>
                      <Button
                        onClick={() => signOut()}
                        colorScheme="red"
                        size="sm"
                      >
                        Sign Out
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/join'}
                        colorScheme="green"
                        size="sm"
                      >
                        Go to Login Page
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Recommendations */}
                {authInfo.nextAuth.status === 'not authenticated' && authInfo.supabase.status === 'not authenticated' && (
                  <Alert status="warning">
                    <AlertIcon />
                    <AlertTitle>Not Authenticated!</AlertTitle>
                    <AlertDescription>
                      You are not logged in with either NextAuth or Supabase. Please log in to use the transfer functionality.
                    </AlertDescription>
                  </Alert>
                )}

                {authInfo.apiTest.status === 'failed' && (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertTitle>API Authentication Failed!</AlertTitle>
                    <AlertDescription>
                      The API call failed, which means the server cannot authenticate you. This will prevent transfers from working.
                    </AlertDescription>
                  </Alert>
                )}

                {(authInfo.nextAuth.status === 'authenticated' || authInfo.supabase.status === 'authenticated') && authInfo.apiTest.status === 'success' && (
                  <Alert status="success">
                    <AlertIcon />
                    <AlertTitle>Authentication Working!</AlertTitle>
                    <AlertDescription>
                      You are properly authenticated and the API is working. Transfer functionality should work correctly.
                    </AlertDescription>
                  </Alert>
                )}
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
