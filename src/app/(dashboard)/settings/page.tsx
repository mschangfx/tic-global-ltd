'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Button,
  Input,
  FormControl,
  FormLabel,
  useColorModeValue,
  useToast,
  Divider,
  Icon,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import {
  FaEye,
  FaEyeSlash,
  FaKey,
  FaEnvelope,
  FaEdit,
  FaSave,
  FaTimes,
  FaGoogle
} from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [userRegistrationMethod, setUserRegistrationMethod] = useState<'google' | 'manual' | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    // Check if user is authenticated
    if (nextAuthStatus === 'loading') {
      // Still loading, wait
      return;
    }

    if (nextAuthStatus === 'unauthenticated') {
      // Not authenticated via NextAuth, check Supabase
      checkSupabaseAuth();
    } else {
      // Authenticated via NextAuth or check Supabase anyway
      fetchUserData();
    }
  }, [nextAuthSession, nextAuthStatus]);

  const checkSupabaseAuth = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // No authentication found, redirect to login
      console.log('No authentication found, redirecting to login');
      router.push('/join');
      return;
    }

    // User is authenticated via Supabase, proceed to fetch data
    fetchUserData();
  };

  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true);
      const supabase = createClient();

      // Method 1: Check NextAuth session (Google OAuth)
      if (nextAuthSession?.user?.email) {
        const email = nextAuthSession.user.email;
        setUserEmail(email);
        setIsGoogleUser(true);
        setUserRegistrationMethod('google');
        console.log('🔍 User detected: Google OAuth user');
        return;
      }

      // Method 2: Check Supabase session (manual registration)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (session?.user?.email) {
        const email = session.user.email;
        setUserEmail(email);
        setIsGoogleUser(false);
        setUserRegistrationMethod('manual');
        console.log('🔍 User detected: Manual registration user');
        return;
      }

      // Method 3: Fallback - try getUser from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();

      if (!error && user?.email) {
        const email = user.email;
        setUserEmail(email);
        setIsGoogleUser(false);
        setUserRegistrationMethod('manual');
        console.log('🔍 User detected: Manual registration user (fallback)');
        return;
      }

      // Method 4: Try localStorage fallback
      const storedEmail = localStorage.getItem('userEmail');
      if (storedEmail) {
        setUserEmail(storedEmail);
        return;
      }

      // If no email found, redirect to login
      router.push('/join');

    } catch (error) {
      console.error('Error fetching user data:', error);
      // Redirect to login on error
      router.push('/join');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation password do not match.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Reset form and close edit mode
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);

    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsChangingPassword(false);
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          
          {/* Header */}
          <Box textAlign="center" py={4}>
            <Heading as="h1" size="2xl" color={textColor} mb={4}>
              Settings
            </Heading>
          </Box>

          {/* Authorization Section */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading as="h2" size="lg" color={textColor} mb={2}>
                    Authorization
                  </Heading>
                  <Text color={subtleTextColor} mb={4}>
                    Information for logging in to TIC Global Ltd.
                  </Text>
                  <Text fontSize="sm" color={subtleTextColor}>
                    {userRegistrationMethod === 'manual'
                      ? 'Change your password whenever you think it might have been compromised.'
                      : userRegistrationMethod === 'google'
                      ? 'Your account is secured through Google OAuth authentication.'
                      : 'Loading account information...'
                    }
                  </Text>
                </Box>

                <Divider borderColor={borderColor} />

                {/* Email Display */}
                <FormControl>
                  <FormLabel color={textColor} fontWeight="semibold">
                    <HStack spacing={2}>
                      <Icon as={FaEnvelope} />
                      <Text>Email Address</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    value={isLoadingUser ? 'Loading...' : userEmail || 'No email found'}
                    isReadOnly
                    bg={useColorModeValue('gray.100', 'gray.600')}
                    color={textColor}
                    borderColor={borderColor}
                    _focus={{ borderColor: '#14c3cb' }}
                    placeholder={isLoadingUser ? 'Loading user email...' : 'Email address'}
                  />
                  <Text fontSize="xs" color={subtleTextColor} mt={1}>
                    Email address cannot be changed
                  </Text>
                </FormControl>

                {/* Password Section - Only show for manual registration users */}
                {userRegistrationMethod === 'manual' ? (
                  <FormControl>
                    <FormLabel color={textColor} fontWeight="semibold">
                      <HStack spacing={2}>
                        <Icon as={FaKey} />
                        <Text>Password</Text>
                      </HStack>
                    </FormLabel>

                    {!isChangingPassword ? (
                      <HStack spacing={3}>
                        <Input
                          type="password"
                          value="••••••••••••"
                          isReadOnly
                          bg={useColorModeValue('gray.100', 'gray.600')}
                          color={textColor}
                          borderColor={borderColor}
                          flex={1}
                        />
                        <Button
                          leftIcon={<Icon as={FaEdit} />}
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => setIsChangingPassword(true)}
                          size="md"
                        >
                          Change Password
                        </Button>
                      </HStack>
                  ) : (
                    <VStack spacing={4} align="stretch">
                      {/* Current Password */}
                      <FormControl>
                        <FormLabel fontSize="sm" color={subtleTextColor}>
                          Current Password
                        </FormLabel>
                        <InputGroup>
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter your current password"
                            borderColor={borderColor}
                            _focus={{ borderColor: '#14c3cb' }}
                          />
                          <InputRightElement>
                            <IconButton
                              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                              icon={<Icon as={showCurrentPassword ? FaEyeSlash : FaEye} />}
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            />
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>

                      {/* New Password */}
                      <FormControl>
                        <FormLabel fontSize="sm" color={subtleTextColor}>
                          New Password
                        </FormLabel>
                        <InputGroup>
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter your new password"
                            borderColor={borderColor}
                            _focus={{ borderColor: '#14c3cb' }}
                          />
                          <InputRightElement>
                            <IconButton
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                              icon={<Icon as={showNewPassword ? FaEyeSlash : FaEye} />}
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            />
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>

                      {/* Confirm New Password */}
                      <FormControl>
                        <FormLabel fontSize="sm" color={subtleTextColor}>
                          Confirm New Password
                        </FormLabel>
                        <InputGroup>
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm your new password"
                            borderColor={borderColor}
                            _focus={{ borderColor: '#14c3cb' }}
                          />
                          <InputRightElement>
                            <IconButton
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              icon={<Icon as={showConfirmPassword ? FaEyeSlash : FaEye} />}
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            />
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>

                      {/* Action Buttons */}
                      <HStack spacing={3} pt={2}>
                        <Button
                          leftIcon={<Icon as={FaSave} />}
                          bg="#14c3cb"
                          color="white"
                          _hover={{ bg: '#0ea5ad' }}
                          onClick={handlePasswordChange}
                          isLoading={isLoading}
                          loadingText="Updating..."
                          flex={1}
                        >
                          Save New Password
                        </Button>
                        <Button
                          leftIcon={<Icon as={FaTimes} />}
                          variant="outline"
                          colorScheme="gray"
                          onClick={handleCancelPasswordChange}
                          flex={1}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    </VStack>
                  )}
                  </FormControl>
                ) : userRegistrationMethod === 'google' ? (
                  <FormControl>
                    <FormLabel color={textColor} fontWeight="semibold">
                      <HStack spacing={2}>
                        <Icon as={FaKey} />
                        <Text>Password</Text>
                      </HStack>
                    </FormLabel>

                    <Box
                      p={4}
                      bg={useColorModeValue('blue.50', 'blue.900')}
                      borderRadius="md"
                      border="1px"
                      borderColor={useColorModeValue('blue.200', 'blue.700')}
                    >
                      <VStack spacing={2} align="start">
                        <HStack spacing={2}>
                          <Icon as={FaGoogle} color={useColorModeValue('blue.600', 'blue.300')} />
                          <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('blue.700', 'blue.200')}>
                            Google Account Authentication
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color={useColorModeValue('blue.600', 'blue.300')}>
                          You signed in using Google OAuth. Password changes are managed through your Google account settings.
                        </Text>
                        <Text fontSize="xs" color={useColorModeValue('blue.500', 'blue.400')}>
                          To change your password, please visit your Google Account security settings.
                        </Text>
                      </VStack>
                    </Box>
                  </FormControl>
                ) : null}

              </VStack>
            </CardBody>
          </Card>

        </VStack>
      </Container>
    </Box>
  );
}
