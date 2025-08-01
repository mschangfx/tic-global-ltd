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
  InputGroup,
  InputRightElement,
  Icon,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const toast = useToast()
  
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const formBgColor = useColorModeValue('white', 'gray.800')
  const placeholderImageUrl = "https://via.placeholder.com/800x1000.png?text=TIC+GLOBAL+Platform"

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('Invalid or missing reset token')
        setIsValidatingToken(false)
        return
      }

      try {
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok) {
          setTokenError(data.error || 'Invalid or expired reset token')
        }
      } catch (err) {
        setTokenError('Failed to validate reset token')
      } finally {
        setIsValidatingToken(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!password || !confirmPassword) {
      setError('Both password fields are required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setIsSuccess(true)
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been updated. You can now log in with your new password.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      // Redirect to join page after 3 seconds
      setTimeout(() => {
        router.push('/join')
      }, 3000)

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

  if (isValidatingToken) {
    return (
      <Flex minH="100vh" bg={bgColor} align="center" justify="center">
        <Text>Validating reset token...</Text>
      </Flex>
    )
  }

  if (tokenError) {
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

              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Invalid Reset Link</AlertTitle>
                  <AlertDescription>
                    {tokenError}
                  </AlertDescription>
                </Box>
              </Alert>

              <Stack spacing={4} w="full">
                <Text fontSize="sm" color="gray.600">
                  The password reset link may have expired or is invalid. 
                  Please request a new password reset.
                </Text>

                <Link href="/forgot-password" passHref>
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
                      Request New Reset Link
                    </Button>
                  </ChakraLink>
                </Link>

                <Link href="/join" passHref>
                  <ChakraLink>
                    <Button variant="outline" w="full">
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

  if (isSuccess) {
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
                  <AlertTitle>Password Reset Successful!</AlertTitle>
                  <AlertDescription>
                    Your password has been updated successfully.
                  </AlertDescription>
                </Box>
              </Alert>

              <Stack spacing={4} w="full">
                <Text fontSize="sm" color="gray.600">
                  You can now log in with your new password.
                  You will be redirected to the sign in page automatically.
                </Text>

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
                      Go to Login
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
                    Reset Password
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Enter your new password below.
                  </Text>
                </Stack>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                  <Stack spacing={5}>
                    <FormControl id="password" isRequired isInvalid={!!error}>
                      <FormLabel>New Password</FormLabel>
                      <InputGroup>
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Enter your new password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                        />
                        <InputRightElement h="full">
                          <Button
                            variant="ghost"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <Icon as={FaEyeSlash} /> : <Icon as={FaEye} />}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl id="confirmPassword" isRequired isInvalid={!!error}>
                      <FormLabel>Confirm New Password</FormLabel>
                      <InputGroup>
                        <Input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          placeholder="Confirm your new password" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isLoading}
                        />
                        <InputRightElement h="full">
                          <Button
                            variant="ghost"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <Icon as={FaEyeSlash} /> : <Icon as={FaEye} />}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    {error && <Text color="red.500" fontSize="sm">{error}</Text>}

                    <Text fontSize="xs" color="gray.500">
                      Password must be at least 8 characters long.
                    </Text>

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
                      loadingText="Updating..."
                      disabled={isLoading}
                    >
                      Update Password
                    </Button>
                  </Stack>
                </form>

                <HStack spacing={1} fontSize="sm" justify="center">
                  <Text>Remember your password?</Text>
                  <Link href="/join" passHref>
                    <ChakraLink color="blue.500" fontWeight="medium">
                      Back to Sign In
                    </ChakraLink>
                  </Link>
                </HStack>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
