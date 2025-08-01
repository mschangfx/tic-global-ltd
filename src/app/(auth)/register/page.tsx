'use client'

import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  VStack, // Added VStack import
  Text,
  useColorModeValue,
  Link as ChakraLink,
  Flex,
  Image,
  Icon,
  InputRightElement,
  InputGroup,
  FormErrorMessage, // For showing errors like "Email already registered"
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation' // Import useRouter
import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

export default function RegisterPage() {
  const router = useRouter(); // Initialize router
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const formBgColor = useColorModeValue('white', 'gray.800')
  const placeholderImageUrl = "https://via.placeholder.com/800x1000.png?text=TIC+GLOBAL+Platform" // Placeholder

  // Example state for form fields - add more as needed
  // State for form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralId, setReferralId] = useState(''); // Optional
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // State for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(''); // General form error
  const [emailError, setEmailError] = useState(''); // Specific email error from API

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setEmailError('');

    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }
    if (!agreeTerms) {
      setFormError('You must agree to the Terms & Conditions.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, referralId }), // Add other fields if your API expects them
      });
      const data = await response.json();

      if (!response.ok) {
        // Handle specific errors, e.g., email already registered
        if (response.status === 400 && data.error && data.error.toLowerCase().includes('email')) {
          setEmailError(data.error);
        } else {
          setFormError(data.error || 'Registration failed. Please try again.');
        }
        throw new Error(data.error || 'Registration failed');
      }
      
      // On successful registration, redirect to overview dashboard
      router.push('/dashboard');

    } catch (err: any) {
      console.error("Registration submission error:", err.message);
      if (!formError && !emailError) { // Avoid overwriting specific errors
        setFormError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                  <Link href="/" passHref legacyBehavior>
                    <ChakraLink>
                      <Image src="/logo.png" alt="TIC GLOBAL Logo" htmlWidth="40px" objectFit="contain" />
                    </ChakraLink>
                  </Link>
                  {/* Language switcher placeholder */}
                </HStack>

                <Heading fontSize={{ base: '2xl', md: '3xl' }} fontFamily="var(--font-titles)">
                  Sign up
                </Heading>
                <HStack spacing={1} fontSize="sm">
                  <Text>Account already exists?</Text>
                  <Link href="/login" passHref legacyBehavior>
                    <ChakraLink color="blue.500" fontWeight="medium">
                      Login
                    </ChakraLink>
                  </Link>
                </HStack>
                {/* Form starts here, within the main Stack */}
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                  <VStack spacing={5} w="full"> {/* Use VStack for form elements */}
                    <FormControl id="email" isRequired isInvalid={!!emailError || !!formError.includes('email')}>
                      <FormLabel>Email</FormLabel>
                      <Input type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      {emailError && <FormErrorMessage>{emailError}</FormErrorMessage>}
                    </FormControl>

                    <FormControl id="password" isRequired isInvalid={!!formError.includes('password')}>
                      <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
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

                <FormControl id="confirmPassword" isRequired isInvalid={!!formError.includes('Passwords don\'t match')}>
                  <FormLabel>Confirm password</FormLabel>
                  <InputGroup>
                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
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

                <FormControl id="referralId">
                  <FormLabel>Referral ID (Optional)</FormLabel>
                  <Input type="text" placeholder="Enter referral ID" value={referralId} onChange={(e) => setReferralId(e.target.value)} />
                </FormControl>

                <Checkbox isChecked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}>
                  I agree to the{' '}
                  <Link href="/terms" passHref legacyBehavior>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'underline' }}> {/* Plain <a> tag, isExternal handled by target */}
                      Terms & Conditions
                    </a>
                  </Link>
                </Checkbox>

                <Button
                  bg="yellow.400"
                  color="black"
                  _hover={{ bg: 'yellow.500' }}
                  size="lg"
                  fontSize="md"
                  w="full"
                  fontFamily="var(--font-titles)"
                  fontWeight="bold"
                  isLoading={isLoading}
                  type="submit"
                >
                  Open an Account for Free
                </Button>
                {formError && !emailError && <Text color="red.500" fontSize="sm" pt={2}>{formError}</Text>}
                </VStack> {/* Closes VStack for form elements */}
              </form> {/* Closes form */}
              </Stack> {/* This is the missing closing tag for Stack on line 114 */}
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