'use client'

import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Stack,
  VStack,
  Text,
  useColorModeValue,
  Link as ChakraLink,
  Flex,
  Image,
  Icon,
  InputRightElement,
  InputGroup,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Center,
  Select,
  Checkbox,
  List,
  ListItem,
  Spinner,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { FaEye, FaEyeSlash, FaGoogle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { signIn, getSession } from 'next-auth/react'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

// Global type declaration for validation timeouts
declare global {
  interface Window {
    emailValidationTimeout?: NodeJS.Timeout;
    referralValidationTimeout?: NodeJS.Timeout;
  }
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Login States
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Register States
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isRegisterLoading, setIsRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [country, setCountry] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [emailValidation, setEmailValidation] = useState({
    isValid: false,
    message: '',
    isChecking: false,
    isDeliverable: false
  });
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    isValid: false
  });
  const [referralValidation, setReferralValidation] = useState({
    isValid: false,
    message: '',
    isChecking: false,
    referrerName: ''
  });


  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const formBgColor = useColorModeValue('white', 'gray.800')
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  // Auto-populate referral code from URL parameters and validate it
  useEffect(() => {
    const refCode = searchParams?.get('ref');
    if (refCode) {
      setPartnerCode(refCode);
      // Automatically validate the referral code from URL
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  // Email validation function with real email verification
  const validateEmail = async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setEmailValidation({ isValid: false, message: '', isChecking: false, isDeliverable: false });
      return;
    }

    if (!emailRegex.test(email)) {
      setEmailValidation({
        isValid: false,
        message: 'Please enter a valid email format',
        isChecking: false,
        isDeliverable: false
      });
      return;
    }

    // Set checking state
    setEmailValidation({
      isValid: false,
      message: 'Verifying email...',
      isChecking: true,
      isDeliverable: false
    });

    try {
      // Call our email verification API
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.isValid) {
        setEmailValidation({
          isValid: true,
          message: 'Valid and deliverable email address ✓',
          isChecking: false,
          isDeliverable: true
        });
      } else {
        setEmailValidation({
          isValid: false,
          message: data.message || 'Email address is not deliverable',
          isChecking: false,
          isDeliverable: false
        });
      }
    } catch (error) {
      // Fallback to basic validation if verification service fails
      setEmailValidation({
        isValid: true,
        message: 'Email format is valid (verification unavailable)',
        isChecking: false,
        isDeliverable: false
      });
    }
  };

  // Handle email input change with debouncing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setRegisterEmail(email);

    // Clear previous timeout
    if (window.emailValidationTimeout) {
      clearTimeout(window.emailValidationTimeout);
    }

    // Set new timeout for validation (wait 1 second after user stops typing)
    window.emailValidationTimeout = setTimeout(() => {
      validateEmail(email);
    }, 1000);
  };

  // Password validation function
  const validatePassword = (password: string) => {
    const validation = {
      length: password.length >= 8 && password.length <= 15,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isValid: false
    };

    validation.isValid = validation.length && validation.uppercase &&
                        validation.lowercase && validation.number && validation.special;

    setPasswordValidation(validation);
  };

  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setRegisterPassword(password);
    validatePassword(password);
  };

  // Referral code validation function
  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferralValidation({ isValid: false, message: '', isChecking: false, referrerName: '' });
      return;
    }

    setReferralValidation({
      isValid: false,
      message: 'Validating referral code...',
      isChecking: true,
      referrerName: ''
    });

    try {
      const response = await fetch(`/api/referrals/validate?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (data.isValid) {
        setReferralValidation({
          isValid: true,
          message: `Valid referral from ${data.referrer.name} ✓`,
          isChecking: false,
          referrerName: data.referrer.name
        });
      } else {
        setReferralValidation({
          isValid: false,
          message: data.message || 'Invalid referral code',
          isChecking: false,
          referrerName: ''
        });
      }
    } catch (error) {
      setReferralValidation({
        isValid: false,
        message: 'Unable to validate referral code',
        isChecking: false,
        referrerName: ''
      });
    }
  };

  // Handle referral code input change with debouncing
  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setPartnerCode(code);

    // Clear previous timeout
    if (window.referralValidationTimeout) {
      clearTimeout(window.referralValidationTimeout);
    }

    // Set new timeout for validation (wait 1 second after user stops typing)
    window.referralValidationTimeout = setTimeout(() => {
      validateReferralCode(code);
    }, 1000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoginLoading(true)
    setLoginError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      // Small delay for better UX, then redirect
      setTimeout(() => {
        router.push('/dashboard'); // Redirect to Overview Dashboard on successful login
      }, 500);
    } catch (err: any) {
      setLoginError(err.message)
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!country) {
      setRegisterError("Please select your country of residence.");
      return;
    }
    // Referral code is now optional - if provided via URL, it will be used automatically
    if (!declaration) {
      setRegisterError("Please agree to the Terms & Conditions.");
      return;
    }

    setIsRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          country: country,
          referralId: partnerCode
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }
      setRegisterSuccess('Registration successful! Redirecting to dashboard...');
      // Small delay to show success message, then redirect
      setTimeout(() => {
        router.push('/dashboard'); // Redirect to Overview Dashboard
      }, 1500);
    } catch (err: any) {
      setRegisterError(err.message);
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <Box>
      <Flex minH="100vh" align="center" justify="center" bg={bgColor} position="relative"> {/* Added position relative for page-level absolute positioning */}
        <Container maxW="lg" py={{ base: '12', md: '24' }}> {/* Changed maxW to lg */}
        <Box
          bg={formBgColor}
          boxShadow={{ base: 'none', sm: 'xl' }}
          borderRadius={{ base: 'none', sm: 'xl' }}
          p={{ base: '6', sm: '10' }}
        >
          {/* Circular Logo - Centered above heading */}
          <Center mb={8}>
            <Link href="/" passHref legacyBehavior>
              <ChakraLink _hover={{ textDecoration: 'none' }}>
                <Image src="/logo.png" alt="TIC GLOBAL Logo" htmlWidth="50px" objectFit="contain" />
              </ChakraLink>
            </Link>
          </Center>
          <Heading textAlign="center" fontSize={{ base: 'xl', md: '2xl' }} mb={2} fontFamily="var(--font-titles)">
            Welcome to TIC Global
          </Heading>
          <Text textAlign="center" color={subtleTextColor} mb={8}>
            Access your account or create a new one.
          </Text>

          <Tabs isFitted variant="enclosed-colored" colorScheme="blue">
            <TabList mb="1em">
              <Tab _selected={{ color: 'white', bg: '#14c3cb' }}>Sign In</Tab>
              <Tab _selected={{ color: 'white', bg: '#14c3cb' }}>Create an account</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <form onSubmit={handleLoginSubmit}>
                  <Stack spacing={5}>
                    <FormControl id="login-email" isRequired isInvalid={!!loginError}>
                      <FormLabel>Your email address</FormLabel>
                      <Input type="email" placeholder="your.email@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    </FormControl>

                    <FormControl id="login-password" isRequired isInvalid={!!loginError}>
                      <FormLabel>Password</FormLabel>
                      <InputGroup>
                        <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                        <InputRightElement h="full">
                          <Button variant="ghost" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <Icon as={FaEyeSlash} /> : <Icon as={FaEye} />}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    {loginError && <Text color="red.500" fontSize="sm">{loginError}</Text>}
                    
                    <HStack justify="flex-end">
                      <Link href="/forgot-password" passHref legacyBehavior>
                        <ChakraLink color="blue.500" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                          I forgot my password
                        </ChakraLink>
                      </Link>
                    </HStack>

                    <Button
                      type="submit"
                      bg="#14c3cb"
                      color="white"
                      _hover={{ bg: '#0ea5ad' }}
                      size="lg"
                      fontSize="md"
                      w="full"
                      isLoading={isLoginLoading}
                    >
                      Continue
                    </Button>
                  </Stack>
                </form>
                <Divider my={6} />
                <Text textAlign="center" fontSize="sm" color={subtleTextColor} mb={3}>Or sign in with</Text>
                <Button
                  w="full"
                  variant="outline"
                  leftIcon={<Icon as={FaGoogle} />}
                  onClick={async () => {
                    try {
                      await signIn('google', { callbackUrl: '/dashboard' })
                    } catch (error) {
                      console.error('SignIn error:', error)
                    }
                  }}
                >
                  Google
                </Button>
              </TabPanel>

              <TabPanel px={0}>
                <form onSubmit={handleRegisterSubmit}>
                  <Stack spacing={5}>
                    <FormControl id="country" isRequired>
                      <FormLabel>Country / Region of residence</FormLabel>
                      <Select placeholder="Select country" value={country} onChange={(e) => setCountry(e.target.value)}>
                        {/* Asian Countries */}
                        <option value="AF">Afghanistan</option>
                        <option value="AM">Armenia</option>
                        <option value="AZ">Azerbaijan</option>
                        <option value="BH">Bahrain</option>
                        <option value="BD">Bangladesh</option>
                        <option value="BT">Bhutan</option>
                        <option value="BN">Brunei</option>
                        <option value="KH">Cambodia</option>
                        <option value="CN">China</option>
                        <option value="CY">Cyprus</option>
                        <option value="GE">Georgia</option>
                        <option value="IN">India</option>
                        <option value="ID">Indonesia</option>
                        <option value="IR">Iran</option>
                        <option value="IQ">Iraq</option>
                        <option value="IL">Israel</option>
                        <option value="JP">Japan</option>
                        <option value="JO">Jordan</option>
                        <option value="KZ">Kazakhstan</option>
                        <option value="KW">Kuwait</option>
                        <option value="KG">Kyrgyzstan</option>
                        <option value="LA">Laos</option>
                        <option value="LB">Lebanon</option>
                        <option value="MY">Malaysia</option>
                        <option value="MV">Maldives</option>
                        <option value="MN">Mongolia</option>
                        <option value="MM">Myanmar</option>
                        <option value="NP">Nepal</option>
                        <option value="KP">North Korea</option>
                        <option value="OM">Oman</option>
                        <option value="PK">Pakistan</option>
                        <option value="PS">Palestine</option>
                        <option value="PH">Philippines</option>
                        <option value="QA">Qatar</option>
                        <option value="SA">Saudi Arabia</option>
                        <option value="SG">Singapore</option>
                        <option value="KR">South Korea</option>
                        <option value="LK">Sri Lanka</option>
                        <option value="SY">Syria</option>
                        <option value="TW">Taiwan</option>
                        <option value="TJ">Tajikistan</option>
                        <option value="TH">Thailand</option>
                        <option value="TL">Timor-Leste</option>
                        <option value="TR">Turkey</option>
                        <option value="TM">Turkmenistan</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="UZ">Uzbekistan</option>
                        <option value="VN">Vietnam</option>
                        <option value="YE">Yemen</option>
                      </Select>
                    </FormControl>

                    <FormControl id="register-email" isRequired isInvalid={!!registerError || (!!emailValidation.message && !emailValidation.isValid)}>
                      <FormLabel>Your email address</FormLabel>
                      <InputGroup>
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          value={registerEmail}
                          onChange={handleEmailChange}
                          borderColor={
                            registerEmail && emailValidation.isValid
                              ? 'green.500'
                              : registerEmail && !emailValidation.isValid
                                ? 'red.500'
                                : undefined
                          }
                        />
                        {registerEmail && (
                          <InputRightElement h="full">
                            {emailValidation.isChecking ? (
                              <Spinner size="sm" color="blue.500" />
                            ) : emailValidation.isValid ? (
                              <Icon as={FaCheckCircle} color="green.500" />
                            ) : (
                              <Icon as={FaTimesCircle} color="red.500" />
                            )}
                          </InputRightElement>
                        )}
                      </InputGroup>

                    </FormControl>

                    <FormControl id="register-password" isRequired isInvalid={!!registerError}>
                      <FormLabel>Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={registerPassword}
                          onChange={handlePasswordChange}
                          borderColor={
                            registerPassword && passwordValidation.isValid
                              ? 'green.500'
                              : registerPassword && !passwordValidation.isValid
                                ? 'orange.500'
                                : undefined
                          }
                        />
                        <InputRightElement h="full" width="4.5rem">
                          <HStack spacing={1}>
                            {registerPassword && (
                              <Icon
                                as={passwordValidation.isValid ? FaCheckCircle : FaTimesCircle}
                                color={passwordValidation.isValid ? 'green.500' : 'orange.500'}
                                boxSize={4}
                              />
                            )}
                            <Button variant="ghost" onClick={() => setShowPassword(!showPassword)} size="sm">
                              {showPassword ? <Icon as={FaEyeSlash} /> : <Icon as={FaEye} />}
                            </Button>
                          </HStack>
                        </InputRightElement>
                      </InputGroup>

                      {/* Password Requirements with Real-time Validation */}
                      <VStack spacing={1} mt={2} align="start">
                        <HStack spacing={2}>
                          <Icon
                            as={passwordValidation.length ? FaCheckCircle : FaTimesCircle}
                            color={passwordValidation.length ? 'green.500' : 'gray.400'}
                            boxSize={3}
                          />
                          <Text fontSize="xs" color={passwordValidation.length ? 'green.500' : subtleTextColor}>
                            Between 8-15 characters
                          </Text>
                        </HStack>

                        <HStack spacing={2}>
                          <Icon
                            as={passwordValidation.uppercase ? FaCheckCircle : FaTimesCircle}
                            color={passwordValidation.uppercase ? 'green.500' : 'gray.400'}
                            boxSize={3}
                          />
                          <Text fontSize="xs" color={passwordValidation.uppercase ? 'green.500' : subtleTextColor}>
                            At least one uppercase letter
                          </Text>
                        </HStack>

                        <HStack spacing={2}>
                          <Icon
                            as={passwordValidation.lowercase ? FaCheckCircle : FaTimesCircle}
                            color={passwordValidation.lowercase ? 'green.500' : 'gray.400'}
                            boxSize={3}
                          />
                          <Text fontSize="xs" color={passwordValidation.lowercase ? 'green.500' : subtleTextColor}>
                            At least one lowercase letter
                          </Text>
                        </HStack>

                        <HStack spacing={2}>
                          <Icon
                            as={passwordValidation.number ? FaCheckCircle : FaTimesCircle}
                            color={passwordValidation.number ? 'green.500' : 'gray.400'}
                            boxSize={3}
                          />
                          <Text fontSize="xs" color={passwordValidation.number ? 'green.500' : subtleTextColor}>
                            At least one number
                          </Text>
                        </HStack>

                        <HStack spacing={2}>
                          <Icon
                            as={passwordValidation.special ? FaCheckCircle : FaTimesCircle}
                            color={passwordValidation.special ? 'green.500' : 'gray.400'}
                            boxSize={3}
                          />
                          <Text fontSize="xs" color={passwordValidation.special ? 'green.500' : subtleTextColor}>
                            At least one special character
                          </Text>
                        </HStack>

                        {/* Overall Password Strength Indicator */}
                        {registerPassword && (
                          <HStack spacing={2} mt={2}>
                            <Text fontSize="xs" fontWeight="medium">
                              Password Strength:
                            </Text>
                            <Text
                              fontSize="xs"
                              fontWeight="bold"
                              color={passwordValidation.isValid ? 'green.500' : 'orange.500'}
                            >
                              {passwordValidation.isValid ? 'Strong ✓' : 'Weak'}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </FormControl>

                    {/* Confirm Password can be removed if not strictly needed by backend for this new flow, or kept */}
                    {/* For this example, let's assume it's removed to match the screenshot more closely */}
                    {/* <FormControl id="confirm-password" isRequired isInvalid={!!registerError && registerError.includes('match')}>
                      <FormLabel>Confirm Password</FormLabel>
                      <InputGroup>
                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        <InputRightElement h="full">
                          <Button variant="ghost" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <Icon as={FaEyeSlash} /> : <Icon as={FaEye} />}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    </FormControl> */}

                    <FormControl id="referral-id" isInvalid={!!registerError || (!!referralValidation.message && !referralValidation.isValid)}>
                      <FormLabel>
                        Referral ID
                        <Text as="span" fontSize="sm" color="gray.500" ml={2}>
                          (Optional)
                        </Text>
                      </FormLabel>
                      <InputGroup>
                        <Input
                          type="text"
                          placeholder={searchParams?.get('ref') ? "Auto-filled from referral link" : "Enter referral code (optional)"}
                          value={partnerCode}
                          onChange={handleReferralChange}
                          borderColor={
                            partnerCode && referralValidation.isValid
                              ? 'green.500'
                              : partnerCode && !referralValidation.isValid && !referralValidation.isChecking
                                ? 'red.500'
                                : undefined
                          }
                          readOnly={!!searchParams?.get('ref')}
                          bg={searchParams?.get('ref') ? 'gray.50' : 'white'}
                        />
                        {partnerCode && (
                          <InputRightElement h="full">
                            {referralValidation.isChecking ? (
                              <Spinner size="sm" color="blue.500" />
                            ) : referralValidation.isValid ? (
                              <Icon as={FaCheckCircle} color="green.500" />
                            ) : (
                              <Icon as={FaTimesCircle} color="red.500" />
                            )}
                          </InputRightElement>
                        )}
                      </InputGroup>
                      {referralValidation.message && (
                        <Text
                          fontSize="xs"
                          color={referralValidation.isValid ? 'green.500' : 'red.500'}
                          mt={1}
                        >
                          {referralValidation.message}
                        </Text>
                      )}
                      {searchParams?.get('ref') && referralValidation.isValid && (
                        <Text fontSize="xs" color="blue.500" mt={1}>
                          🎉 You're registering through a referral link! You'll automatically be connected to your referrer.
                        </Text>
                      )}
                      {!partnerCode && !searchParams?.get('ref') && (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          💡 Have a referral code? Enter it above to connect with your referrer and unlock partnership benefits.
                        </Text>
                      )}
                    </FormControl>

                    <Checkbox
                      id="terms"
                      isChecked={declaration}
                      onChange={(e) => setDeclaration(e.target.checked)}
                      colorScheme="blue"
                    >
                      <Text as="span" fontSize="sm">
                        Agree to the{' '}
                        <ChakraLink
                          href="/terms-and-conditions"
                          color="blue.500"
                          target="_blank"
                          rel="noopener noreferrer"
                          textDecoration="underline"
                        >
                          Terms & Conditions
                        </ChakraLink>
                      </Text>
                    </Checkbox>

                    {registerError && <Text color="red.500" fontSize="sm">{registerError}</Text>}
                    {registerSuccess && <Text color="green.500" fontSize="sm">{registerSuccess}</Text>}

                    <Button
                      type="submit"
                      bg="#14c3cb"
                      color="white"
                      _hover={{ bg: '#0ea5ad' }}
                      size="lg"
                      fontSize="md"
                      w="full"
                      isLoading={isRegisterLoading}
                      isDisabled={!declaration} // Disable if declaration not checked
                    >
                      Continue
                    </Button>
                  </Stack>
                </form>
                 <Divider my={6} />
                <Text textAlign="center" fontSize="sm" color={subtleTextColor} mb={3}>Or create account with</Text>
                <Button
                  w="full"
                  variant="outline"
                  leftIcon={<Icon as={FaGoogle} />}
                  onClick={async () => {
                    try {
                      await signIn('google', { callbackUrl: '/dashboard' })
                    } catch (error) {
                      console.error('SignIn error:', error)
                    }
                  }}
                >
                  Google
                </Button>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        </Container>
      </Flex>

      {/* Call to Action Banner */}
      <CallToActionBanner
        title="Already Have an Account?"
        description="Join thousands of players already earning with TIC GLOBAL. Access your dashboard and start your journey today."
        buttonText="Sign In"
        showButton={false}
      />
    </Box>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<Box p={8}><Text>Loading...</Text></Box>}>
      <JoinPageContent />
    </Suspense>
  );
}