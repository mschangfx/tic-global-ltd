'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Badge,
  Button,
  Spinner,
  useColorModeValue,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Icon,
  Divider,
  PinInput,
  PinInputField,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaUser, FaEnvelope, FaIdCard, FaEdit } from 'react-icons/fa';

// Types
interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityVerified: boolean;
  identityStatus: 'pending' | 'approved' | 'rejected' | null;
}

interface UserProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  country?: string;
}

export default function ProfilePage() {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const { data: session, status } = useSession();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: true, // Always true since phone verification is removed
    profileCompleted: false,
    identityVerified: false,
    identityStatus: null,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Modal states
  const { isOpen: isEmailModalOpen, onOpen: onEmailModalOpen, onClose: onEmailModalClose } = useDisclosure();
  const { isOpen: isProfileModalOpen, onOpen: onProfileModalOpen, onClose: onProfileModalClose } = useDisclosure();
  const { isOpen: isIdentityModalOpen, onOpen: onIdentityModalOpen, onClose: onIdentityModalClose } = useDisclosure();
  const { isOpen: isEditProfileModalOpen, onOpen: onEditProfileModalOpen, onClose: onEditProfileModalClose } = useDisclosure();

  // Manual refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);

  // Email verification states
  const [emailCode, setEmailCode] = useState('');
  const [isEmailCodeSent, setIsEmailCodeSent] = useState(false);
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [emailCodeSending, setEmailCodeSending] = useState(false);

  // Profile completion states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    countryOfBirth: '',
    gender: '',
    address: '',
  });
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  // Identity verification states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('');
  const [isIdentityUploading, setIsIdentityUploading] = useState(false);

  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  // ✅ ALL EFFECTS AFTER STATE HOOKS
  // Handle unauthenticated redirect via useEffect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/join');
    }
  }, [status, router]);

  // Unified effect to fetch profile data (prevents duplication and race conditions)
  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (status !== 'authenticated' || !session?.user?.email) return;

      try {
        setIsLoading(true);

        // Use API route to fetch profile data
        const response = await fetch('/api/auth/verification-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const data = await response.json();
        console.log('📋 Profile data fetched:', data);

        if (data.success && data.user) {
          setUserProfile({
            email: data.user.email,
            firstName: data.user.first_name,
            lastName: data.user.last_name,
            phoneNumber: data.user.phone_number,
            country: data.user.country,
          });

          setVerificationStatus({
            emailVerified: data.user.email_verified || false,
            phoneVerified: data.user.phone_verified || false,
            profileCompleted: data.user.profile_completed || false,
            identityVerified: data.user.identity_verification_status === 'approved',
            identityStatus: data.user.identity_verification_submitted
              ? data.user.identity_verification_status || 'pending'
              : null,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [status, session?.user?.email, toast]);

  // ✅ FUNCTION DEFINITIONS AFTER HOOKS BUT BEFORE RENDER LOGIC
  const refreshVerificationStatus = async () => {
    try {
      setIsRefreshing(true);

      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/auth/verification-status?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }

      const data = await response.json();
      console.log('🔄 Manual verification status refresh:', data);

      if (data.success && data.user) {
        const newVerificationStatus = {
          emailVerified: data.user.email_verified || false,
          phoneVerified: data.user.phone_verified || false,
          profileCompleted: data.user.profile_completed || false,
          identityVerified: data.user.identity_verification_status === 'approved',
          identityStatus: data.user.identity_verification_submitted
            ? data.user.identity_verification_status || 'pending'
            : null,
        };

        setVerificationStatus(newVerificationStatus);
        setLastStatusCheck(new Date());

        toast({
          title: '✅ Status Updated',
          description: 'Verification status has been refreshed.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error refreshing verification status:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh verification status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Email verification functions
  const sendEmailVerificationCode = async () => {
    const userEmail = session?.user?.email || userProfile?.email;
    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'No email address found',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setEmailCodeSending(true);
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsEmailCodeSent(true);
        toast({
          title: 'Verification Code Sent',
          description: `A 6-digit code has been sent to ${userEmail}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setEmailCodeSending(false);
    }
  };

  const verifyEmailCode = async () => {
    const userEmail = session?.user?.email || userProfile?.email;
    if (!userEmail || !emailCode) {
      toast({
        title: 'Error',
        description: 'Email address and verification code are required',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsEmailVerifying(true);
      const response = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail, code: emailCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(prev => ({ ...prev, emailVerified: true }));
        onEmailModalClose();
        setEmailCode('');
        setIsEmailCodeSent(false);
        toast({
          title: '✅ Email Verified!',
          description: 'Your email has been successfully verified.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to verify email code');
      }
    } catch (error: any) {
      console.error('Error verifying email code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify email code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsEmailVerifying(false);
    }
  };

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  // Show loading spinner while session is loading or fetching profile
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="4xl">
          <VStack spacing={8} align="center" justify="center" minH="60vh">
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text fontSize="lg" color={subtleTextColor}>
              Loading profile...
            </Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Show loading placeholder while redirecting
  if (status === 'unauthenticated') {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center" py={4}>
            <Flex justify="center" align="center" mb={4}>
              <Heading as="h1" size="2xl" color={textColor}>
                Profile & Verification
              </Heading>
              <Button
                ml={4}
                size="sm"
                colorScheme="blue"
                variant="outline"
                onClick={refreshVerificationStatus}
                isLoading={isRefreshing}
                loadingText="Refreshing..."
              >
                🔄 Refresh Status
              </Button>
            </Flex>
            <Text fontSize="lg" color={subtleTextColor}>
              Manage your account information and verification status
            </Text>
            {lastStatusCheck && (
              <Text fontSize="sm" color={subtleTextColor} mt={2}>
                Last updated: {lastStatusCheck.toLocaleTimeString()}
              </Text>
            )}
          </Box>

          {/* User Profile Information Card */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Flex align="center" justify="space-between" mb={6}>
                <Heading as="h2" size="lg" color={textColor}>
                  Profile Information
                </Heading>
                <Button
                  colorScheme="blue"
                  size="sm"
                  leftIcon={<Icon as={FaEdit} />}
                  onClick={onEditProfileModalOpen}
                >
                  Edit Profile
                </Button>
              </Flex>

              <VStack spacing={4} align="stretch">
                <HStack spacing={8} wrap="wrap">
                  <VStack align="start" spacing={1} minW="200px">
                    <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                      Email Address
                    </Text>
                    <Text fontSize="md" color={textColor} fontWeight="semibold">
                      {userProfile?.email || session?.user?.email || 'Not provided'}
                    </Text>
                    <Badge
                      colorScheme={verificationStatus.emailVerified ? 'green' : 'red'}
                      size="sm"
                    >
                      {verificationStatus.emailVerified ? '✓ Verified' : '✗ Not Verified'}
                    </Badge>
                  </VStack>

                  <VStack align="start" spacing={1} minW="200px">
                    <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                      Full Name
                    </Text>
                    <Text fontSize="md" color={textColor} fontWeight="semibold">
                      {userProfile?.firstName && userProfile?.lastName
                        ? `${userProfile.firstName} ${userProfile.lastName}`
                        : 'Not provided'
                      }
                    </Text>
                    <Badge
                      colorScheme={verificationStatus.profileCompleted ? 'green' : 'orange'}
                      size="sm"
                    >
                      {verificationStatus.profileCompleted ? '✓ Complete' : '⚠ Incomplete'}
                    </Badge>
                  </VStack>
                </HStack>

                <HStack spacing={8} wrap="wrap">
                  <VStack align="start" spacing={1} minW="200px">
                    <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                      Phone Number
                    </Text>
                    <Text fontSize="md" color={textColor} fontWeight="semibold">
                      {userProfile?.phoneNumber || 'Not provided'}
                    </Text>
                    <Badge colorScheme="green" size="sm">
                      ✓ Verified (Auto)
                    </Badge>
                  </VStack>

                  <VStack align="start" spacing={1} minW="200px">
                    <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                      Country
                    </Text>
                    <Text fontSize="md" color={textColor} fontWeight="semibold">
                      {userProfile?.country || 'Not provided'}
                    </Text>
                  </VStack>
                </HStack>

                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color={subtleTextColor} fontWeight="medium">
                    Identity Verification Status
                  </Text>
                  <HStack>
                    <Text fontSize="md" color={textColor} fontWeight="semibold">
                      {verificationStatus.identityStatus === 'approved'
                        ? 'Identity Verified'
                        : verificationStatus.identityStatus === 'pending'
                        ? 'Under Review'
                        : verificationStatus.identityStatus === 'rejected'
                        ? 'Verification Rejected'
                        : 'Not Submitted'
                      }
                    </Text>
                    <Badge
                      colorScheme={
                        verificationStatus.identityStatus === 'approved' ? 'green' :
                        verificationStatus.identityStatus === 'pending' ? 'yellow' :
                        verificationStatus.identityStatus === 'rejected' ? 'red' : 'gray'
                      }
                      size="sm"
                    >
                      {verificationStatus.identityStatus === 'approved' ? '✓ Approved' :
                       verificationStatus.identityStatus === 'pending' ? '⏳ Pending' :
                       verificationStatus.identityStatus === 'rejected' ? '✗ Rejected' : '○ Not Submitted'
                      }
                    </Badge>
                  </HStack>
                </VStack>

                {/* Quick Actions */}
                <Divider my={4} />
                <HStack spacing={4} wrap="wrap">
                  {!verificationStatus.emailVerified && (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      leftIcon={<Icon as={FaEnvelope} />}
                      onClick={onEmailModalOpen}
                    >
                      Verify Email
                    </Button>
                  )}
                  {!verificationStatus.profileCompleted && (
                    <Button
                      size="sm"
                      colorScheme="orange"
                      variant="outline"
                      leftIcon={<Icon as={FaUser} />}
                      onClick={onProfileModalOpen}
                    >
                      Complete Profile
                    </Button>
                  )}
                  {!verificationStatus.identityVerified && verificationStatus.identityStatus !== 'pending' && (
                    <Button
                      size="sm"
                      colorScheme="purple"
                      variant="outline"
                      leftIcon={<Icon as={FaIdCard} />}
                      onClick={onIdentityModalOpen}
                    >
                      {verificationStatus.identityStatus === 'rejected' ? 'Resubmit ID' : 'Upload ID'}
                    </Button>
                  )}
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}