'use client'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function SimpleJoinPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔍 Simple form submitted!', { email, password })
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await response.json()
      console.log('API Response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      setSuccess('Login successful!')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    console.log('🔍 Google sign in clicked')
    try {
      const result = await signIn('google', { callbackUrl: '/dashboard' })
      console.log('Google sign in result:', result)
    } catch (error) {
      console.error('Google sign in error:', error)
    }
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <Heading>Simple Join Test</Heading>
        <Text>Testing basic authentication functionality</Text>
        
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert status="success">
            <AlertIcon />
            {success}
          </Alert>
        )}
        
        <Box w="full">
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </FormControl>
              
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isLoading}
                w="full"
              >
                Sign In
              </Button>
            </Stack>
          </form>
        </Box>
        
        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          w="full"
        >
          Sign in with Google
        </Button>
        
        <Text fontSize="sm" color="gray.500">
          This is a simplified test page to debug authentication issues.
        </Text>
      </VStack>
    </Container>
  )
}
