'use client'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Link as ChakraLink,
  Flex,
  Image,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const formBgColor = useColorModeValue('white', 'gray.800')
  const placeholderImageUrl = "https://via.placeholder.com/800x1000.png?text=TIC+GLOBAL+Platform"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Validate email
    if (!email) {
      setError('Email address is required')
      setIsLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setIsSubmitted(true)
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

    } catch (err: any) {
      setError(err.message)
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Flex minH="100vh" bg={bgColor}>
        <Container maxW="container.xl" display="flex" alignItems="center" justifyContent="center" py={{ base: '12', md: '24' }}>
          <Box
            w="full"
            maxW="md"
            bg={formBgColor}
            boxShadow={{ base: 'none', sm: 'xl' }}
            borderRadius={{ base: 'none', sm: 'xl' }}
            p={{ base: '4', sm: '10' }}
          >
            <Stack spacing={6} align="center" textAlign="center">
              <Link href="/" passHref>
                <ChakraLink>
                  <Image src="/logo.png" alt="TIC GLOBAL Logo" htmlWidth="40px" objectFit="contain" />
                </ChakraLink>
              </Link>

              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Email Sent!</AlertTitle>
                  <AlertDescription>
                    We've sent password reset instructions to <strong>{email}</strong>
                  </AlertDescription>
                </Box>
              </Alert>

              <Stack spacing={4} w="full">
                <Text fontSize="sm" color="gray.600">
                  Check your email and click the reset link to create a new password. 
                  The link will expire in 24 hours.
                </Text>

                <Text fontSize="sm" color="gray.600">
                  Didn't receive the email? Check your spam folder or try again.
                </Text>

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false)
                    setEmail('')
                  }}
                  w="full"
                >
                  Try Different Email
                </Button>

                <Link href="/join" passHref>
                  <ChakraLink>
                    <Button
                      bg="cyan.400"
                      color="white"
                      _hover={{ bg: 'cyan.500' }}
                      size="lg"
                      w="full"
                      fontFamily="var(--font-titles)"
                      fontWeight="bold"
                    >
                      Back to Sign In
                    </Button>
                  </ChakraLink>
                </Link>
              </Stack>
            </Stack>
          </Box>
        </Container>
      </Flex>
    )
  }

  return (
    <Flex minH="100vh" bg={bgColor}>
      <Container maxW="container.xl" display="flex" alignItems="center" justifyContent="center" py={{ base: '12', md: '24' }}>
        <Box
          w="full"
          bg={formBgColor}
          boxShadow={{ base: 'none', sm: 'xl' }}
          borderRadius={{ base: 'none', sm: 'xl' }}
          overflow="hidden"
        >
          <Stack direction={{ base: 'column', md: 'row' }} spacing={0}>
            {/* Left Column: Form */}
            <Flex
              p={{ base: '4', sm: '10' }}
              flex="1"
              align="center"
              justify="center"
            >
              <Stack spacing={6} w="full" maxW="md">
                <HStack justify="space-between" align="center">
                  <Link href="/" passHref>
                    <ChakraLink>
                      <Image src="/logo.png" alt="TIC GLOBAL Logo" htmlWidth="40px" objectFit="contain" />
                    </ChakraLink>
                  </Link>
                </HStack>

                <Stack spacing={2}>
                  <Heading fontSize={{ base: '2xl', md: '3xl' }} fontFamily="var(--font-titles)">
                    Forgot Password?
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>
                </Stack>

                <HStack spacing={1} fontSize="sm">
                  <Text>Remember your password?</Text>
                  <Link href="/login" passHref>
                    <ChakraLink color="blue.500" fontWeight="medium">
                      Back to Login
                    </ChakraLink>
                  </Link>
                </HStack>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                  <Stack spacing={5}>
                    <FormControl id="email" isRequired isInvalid={!!error}>
                      <FormLabel>Email Address</FormLabel>
                      <Input 
                        type="email" 
                        placeholder="your.email@example.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </FormControl>

                    {error && <Text color="red.500" fontSize="sm">{error}</Text>}

                    <Button
                      type="submit"
                      bg="cyan.400"
                      color="white"
                      _hover={{ bg: 'cyan.500' }}
                      size="lg"
                      fontSize="md"
                      w="full"
                      fontFamily="var(--font-titles)"
                      fontWeight="bold"
                      isLoading={isLoading}
                      loadingText="Sending..."
                      disabled={isLoading}
                    >
                      Send Reset Link
                    </Button>
                  </Stack>
                </form>
              </Stack>
            </Flex>

            {/* Right Column: Image */}
            <Flex
              flex="1"
              display={{ base: 'none', md: 'block' }}
              bgImage={`url(${placeholderImageUrl})`}
              bgSize="cover"
              bgPosition="center"
            />
          </Stack>
        </Box>
      </Container>
    </Flex>
  )
}
