'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Box, Button, Container, Heading, Text, VStack, Alert, AlertIcon } from '@chakra-ui/react'

export default function TestOAuth() {
  const { data: session, status } = useSession()

  const handleGoogleSignIn = async () => {
    console.log('🔍 Testing Google OAuth...')
    console.log('Environment check:', {
      GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set'
    })
    
    try {
      const result = await signIn('google', { 
        callbackUrl: '/test-oauth',
        redirect: false 
      })
      console.log('SignIn result:', result)
    } catch (error) {
      console.error('SignIn error:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/test-oauth' })
    } catch (error) {
      console.error('SignOut error:', error)
    }
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={6}>
        <Heading>OAuth Test Page</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page is for testing Google OAuth functionality
        </Alert>

        <Box p={6} borderWidth={1} borderRadius="md" w="full">
          <VStack spacing={4}>
            <Text fontWeight="bold">Session Status: {status}</Text>
            
            {session ? (
              <VStack spacing={3}>
                <Text>✅ Signed in as: {session.user?.email}</Text>
                <Text>Name: {session.user?.name}</Text>
                <Button colorScheme="red" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </VStack>
            ) : (
              <VStack spacing={3}>
                <Text>❌ Not signed in</Text>
                <Button colorScheme="blue" onClick={handleGoogleSignIn}>
                  Test Google Sign In
                </Button>
              </VStack>
            )}
          </VStack>
        </Box>

        <Box p={4} bg="gray.50" borderRadius="md" w="full">
          <Text fontSize="sm" fontWeight="bold" mb={2}>Debug Info:</Text>
          <Text fontSize="xs">Status: {status}</Text>
          <Text fontSize="xs">Session: {session ? 'Active' : 'None'}</Text>
          <Text fontSize="xs">User: {session?.user?.email || 'None'}</Text>
        </Box>
      </VStack>
    </Container>
  )
}
