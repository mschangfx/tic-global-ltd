'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Icon,
  useColorModeValue,
  Divider,
  Flex,
  Spacer,
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  PinInput,
  PinInputField,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useColorMode,
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaIdCard,
  FaEdit,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaExclamationTriangle,
  FaInfoCircle,
} from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityVerified: boolean;
  identityStatus: 'pending' | 'approved' | 'rejected' | null;
}

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
}

export default function ProfilePage() {
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

  // Real-time update states
  const [isPolling, setIsPolling] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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

  // GIC Pricing state for peso display
  const [gicPricing, setGicPricing] = useState<any>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

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

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/join');
    return null;
  }

  // Function to check for verification status updates (for real-time updates)
  const checkVerificationStatusUpdate = useCallback(async (silent = true) => {
    try {
      if (!silent) {
        setIsPolling(true);
      }

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
      console.log('🔄 Real-time verification status check:', data);

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

        // Use functional update to access current state
        setVerificationStatus(currentStatus => {
          // Check if verification status has changed
          const hasStatusChanged =
            newVerificationStatus.identityVerified !== currentStatus.identityVerified ||
            newVerificationStatus.identityStatus !== currentStatus.identityStatus;

          if (hasStatusChanged) {
            console.log('✅ Verification status changed, updating UI');

            // Show toast notification for status changes
            if (newVerificationStatus.identityStatus === 'approved' && !currentStatus.identityVerified) {
              toast({
                title: '🎉 Identity Verified!',
                description: 'Your identity verification has been approved.',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            } else if (newVerificationStatus.identityStatus === 'rejected' && currentStatus.identityStatus !== 'rejected') {
              toast({
                title: '❌ Identity Verification Rejected',
                description: 'Your identity verification was rejected. Please resubmit your documents.',
                status: 'error',
                duration: 8000,
                isClosable: true,
              });
            }
          }

          return newVerificationStatus;
        });

        setLastStatusCheck(new Date());
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to check verification status',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      if (!silent) {
        setIsPolling(false);
      }
    }
  }, [toast]);

  // Manual refresh function
  const refreshVerificationStatus = () => {
    checkVerificationStatusUpdate(false);
  };

  const fetchUserProfile = async () => {
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
        console.error('API response not ok:', response.status, response.statusText);
        throw new Error(`Failed to fetch profile data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Profile API response:', data);

      if (data.success && data.user) {
        setUserProfile({
          email: data.user.email || '',
          firstName: data.user.first_name || '',
          lastName: data.user.last_name || '',
          phoneNumber: data.user.phone_number || '',
          country: data.user.country_of_residence || '',
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
      } else if (data.success === false) {
        // Handle API error response
        console.error('API returned error:', data.error);
        throw new Error(data.error || 'Failed to load profile data');
      } else {
        // Handle unexpected response format
        console.error('Unexpected API response format:', data);
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);

      // Set default values to prevent UI errors
      setUserProfile({
        email: session?.user?.email || '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        country: '',
      });

      setVerificationStatus({
        emailVerified: false,
        phoneVerified: false,
        profileCompleted: false,
        identityVerified: false,
        identityStatus: null,
      });

      toast({
        title: "Error",
        description: "Failed to load profile data. Please refresh the page.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (status !== 'authenticated' || !session?.user?.email) {
        return;
      }

      try {
        setIsLoading(true);

        const response = await fetch('/api/auth/verification-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile data: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) return; // Prevent state updates if component unmounted

        if (data.success && data.user) {
          setUserProfile({
            email: data.user.email || '',
            firstName: data.user.first_name || '',
            lastName: data.user.last_name || '',
            phoneNumber: data.user.phone_number || '',
            country: data.user.country_of_residence || '',
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
        } else {
          // Set default values
          setUserProfile({
            email: session?.user?.email || '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            country: '',
          });

          setVerificationStatus({
            emailVerified: false,
            phoneVerified: false,
            profileCompleted: false,
            identityVerified: false,
            identityStatus: null,
          });
        }
      } catch (error) {
        if (!isMounted) return;

        console.error('Error fetching profile:', error);

        // Set default values to prevent UI errors
        setUserProfile({
          email: session?.user?.email || '',
          firstName: '',
          lastName: '',
          phoneNumber: '',
          country: '',
        });

        setVerificationStatus({
          emailVerified: false,
          phoneVerified: false,
          profileCompleted: false,
          identityVerified: false,
          identityStatus: null,
        });

        toast({
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false; // Cleanup flag
    };
  }, [status, session?.user?.email, toast]);

  // useEffect to manage polling for real-time updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Start polling when user is authenticated and has pending identity verification
    if (status === 'authenticated' && verificationStatus.identityStatus === 'pending') {
      console.log('🔄 Starting polling for verification status updates');
      interval = setInterval(() => {
        checkVerificationStatusUpdate(true);
      }, 30000);
      setPollingInterval(interval);
    }

    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('⏹️ Stopped polling for verification status updates');
      }
      setPollingInterval(null);
    };
  }, [status, verificationStatus.identityStatus]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [pollingInterval]);

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
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsEmailCodeSent(true);
        toast({
          title: 'Verification Code Sent',
          description: 'Please check your email for the 6-digit verification code',
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
    if (!userEmail || emailCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit code',
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
        body: JSON.stringify({
          email: userEmail,
          code: emailCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(prev => ({ ...prev, emailVerified: true }));
        onEmailModalClose();
        setEmailCode('');
        setIsEmailCodeSent(false);
        toast({
          title: 'Email Verified',
          description: 'Your email has been successfully verified',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchUserProfile(); // Refresh data
      } else {
        throw new Error(data.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying email:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsEmailVerifying(false);
    }
  };

  // Profile completion functions
  const submitProfile = async () => {
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

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'countryOfBirth', 'gender', 'address'];
    const missingFields = requiredFields.filter(field => !profileForm[field as keyof typeof profileForm]);

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsProfileSubmitting(true);
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          dateOfBirth: profileForm.dateOfBirth,
          countryOfBirth: profileForm.countryOfBirth,
          gender: profileForm.gender,
          address: profileForm.address,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(prev => ({ ...prev, profileCompleted: true }));
        onProfileModalClose();
        toast({
          title: 'Profile Completed',
          description: 'Your profile has been successfully completed',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchUserProfile(); // Refresh data
      } else {
        throw new Error(data.error || 'Failed to complete profile');
      }
    } catch (error: any) {
      console.error('Error completing profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete profile',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  // Identity verification functions
  const uploadIdentityDocument = async () => {
    const userEmail = session?.user?.email || userProfile?.email;
    if (!userEmail || !selectedFile || !documentType || !issuingCountry) {
      toast({
        title: 'Missing Information',
        description: 'Please select a document, document type, and issuing country',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsIdentityUploading(true);
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('email', userEmail);
      formData.append('documentType', documentType);
      formData.append('issuingCountry', issuingCountry);

      const response = await fetch('/api/auth/upload-identity-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(prev => ({
          ...prev,
          identityStatus: 'pending'
        }));
        onIdentityModalClose();
        setSelectedFile(null);
        setDocumentType('');
        setIssuingCountry('');
        toast({
          title: 'Document Uploaded',
          description: 'Your identity document has been uploaded and is under review',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchUserProfile(); // Refresh data
      } else {
        throw new Error(data.error || 'Failed to upload document');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsIdentityUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a JPEG, PNG, or PDF file',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select a file smaller than 10MB',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const getOverallStatus = () => {
    const { emailVerified, profileCompleted, identityVerified } = verificationStatus;

    if (emailVerified && profileCompleted && identityVerified) {
      return { status: 'Fully Verified', color: 'green', icon: FaCheckCircle };
    } else if (emailVerified && profileCompleted) {
      return { status: 'Pending Identity Review', color: 'yellow', icon: FaClock };
    } else {
      return { status: 'Verification Incomplete', color: 'red', icon: FaTimesCircle };
    }
  };

  const getStepStatus = (isCompleted: boolean, isPending: boolean = false) => {
    if (isCompleted) {
      return { text: 'Confirmed', color: 'green', icon: FaCheckCircle };
    } else if (isPending) {
      return { text: 'Pending Review', color: 'yellow', icon: FaClock };
    } else {
      return { text: 'Not Completed', color: 'red', icon: FaTimesCircle };
    }
  };

  const verificationSteps = [
    {
      step: 1,
      title: 'Email Verification',
      description: 'Verify your email address to secure your account',
      icon: FaEnvelope,
      isCompleted: verificationStatus.emailVerified,
      details: userProfile?.email || 'No email provided',
      actionText: 'Verify Email',
      onAction: onEmailModalOpen,
    },
    {
      step: 2,
      title: 'Profile Completion',
      description: 'Complete your personal information and profile details',
      icon: FaUser,
      isCompleted: verificationStatus.profileCompleted,
      details: userProfile?.firstName && userProfile?.lastName
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : 'Profile not completed',
      actionText: 'Complete Profile',
      onAction: () => {
        // Pre-fill form with existing data
        setProfileForm({
          firstName: userProfile?.firstName || '',
          lastName: userProfile?.lastName || '',
          dateOfBirth: '',
          countryOfBirth: userProfile?.country || '',
          gender: '',
          address: '',
        });
        onProfileModalOpen();
      },
    },
    {
      step: 3,
      title: 'Identity Verification',
      description: 'Upload identity documents for account verification',
      icon: FaIdCard,
      isCompleted: verificationStatus.identityVerified,
      isPending: verificationStatus.identityStatus === 'pending',
      details: verificationStatus.identityStatus === 'approved'
        ? 'Identity verified successfully'
        : verificationStatus.identityStatus === 'pending'
        ? 'Under review by our team'
        : verificationStatus.identityStatus === 'rejected'
        ? 'Verification rejected - please resubmit'
        : 'Identity verification not submitted',
      actionText: verificationStatus.identityStatus === 'rejected' ? 'Resubmit Documents' : 'Upload Documents',
      onAction: onIdentityModalOpen,
      showAction: verificationStatus.identityStatus !== 'pending' && !verificationStatus.identityVerified,
    },
  ];

  const overallStatus = getOverallStatus();

  if (isLoading) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
        <Container maxW="4xl">
          <Text>Loading profile...</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
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
                isLoading={isPolling}
                loadingText="Checking..."
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

          {/* Account Status Card */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Flex align="center" justify="space-between" mb={6}>
                <Heading as="h2" size="lg" color={textColor}>
                  Account Status
                </Heading>

                {/* Quick Action Button */}
                {overallStatus.status !== 'Fully Verified' && (
                  <Button
                    colorScheme="blue"
                    size="md"
                    onClick={() => router.push('/verify-account')}
                    leftIcon={<Icon as={FaUser} />}
                  >
                    Complete Verification
                  </Button>
                )}
              </Flex>

              <Flex align="center" justify="space-between">
                <HStack spacing={3}>
                  <Icon
                    as={overallStatus.icon}
                    color={`${overallStatus.color}.500`}
                    boxSize={6}
                  />
                  <VStack spacing={0} align="start">
                    <Text fontSize="xl" fontWeight="bold" color={textColor}>
                      {overallStatus.status}
                    </Text>
                    <Text fontSize="sm" color={subtleTextColor}>
                      {overallStatus.status === 'Fully Verified'
                        ? 'All verification steps completed successfully'
                        : overallStatus.status === 'Pending Identity Review'
                        ? 'Identity verification is under review'
                        : 'Please complete all verification steps'
                      }
                    </Text>
                  </VStack>
                </HStack>
                <Badge
                  colorScheme={overallStatus.color}
                  size="lg"
                  px={4}
                  py={2}
                  borderRadius="full"
                >
                  {overallStatus.status}
                </Badge>
              </Flex>

              {/* Progress Bar for incomplete verification */}
              {overallStatus.status !== 'Fully Verified' && (
                <Box mt={6}>
                  <Text fontSize="sm" color={subtleTextColor} mb={2}>
                    Verification Progress
                  </Text>
                  <Progress
                    value={
                      (Number(verificationStatus.emailVerified) +
                       Number(verificationStatus.profileCompleted) +
                       Number(verificationStatus.identityVerified)) / 3 * 100
                    }
                    colorScheme={overallStatus.color}
                    size="md"
                    borderRadius="full"
                  />
                </Box>
              )}

              {/* Real-time Status Indicator */}
              {verificationStatus.identityStatus === 'pending' && pollingInterval && (
                <Box mt={4} p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                  <HStack spacing={2}>
                    <Spinner size="sm" color="blue.500" />
                    <Text fontSize="sm" color="blue.700" fontWeight="medium">
                      🔄 Monitoring for verification updates...
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="blue.600" mt={1}>
                    We'll notify you immediately when your verification status changes
                  </Text>
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Verification Steps */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Heading as="h2" size="lg" color={textColor} mb={6}>
                Verification Steps
              </Heading>

              {/* Helpful Alert */}
              {overallStatus.status !== 'Fully Verified' && (
                <Alert status="info" mb={6} borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Need Help with Verification?</AlertTitle>
                    <AlertDescription>
                      Use our step-by-step verification page for a guided experience.
                      <Button
                        variant="link"
                        colorScheme="blue"
                        size="sm"
                        ml={2}
                        onClick={() => router.push('/verify-account')}
                      >
                        Go to Verification Page →
                      </Button>
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              <VStack spacing={6} align="stretch">
                {verificationSteps.map((step, index) => {
                  const stepStatus = getStepStatus(step.isCompleted, step.isPending);
                  
                  return (
                    <Box key={step.step}>
                      <Flex align="center" justify="space-between">
                        <HStack spacing={4} flex={1}>
                          <Box
                            bg={step.isCompleted ? 'green.100' : 'gray.100'}
                            p={3}
                            borderRadius="full"
                          >
                            <Icon 
                              as={step.icon} 
                              color={step.isCompleted ? 'green.600' : 'gray.600'} 
                              boxSize={5} 
                            />
                          </Box>
                          <VStack spacing={1} align="start" flex={1}>
                            <HStack>
                              <Text fontWeight="bold" color={textColor}>
                                Step {step.step}: {step.title}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color={subtleTextColor}>
                              {step.description}
                            </Text>
                            <Text fontSize="sm" color={textColor} fontWeight="medium">
                              {step.details}
                            </Text>
                          </VStack>
                        </HStack>
                        
                        <VStack spacing={2} align="end">
                          <Badge
                            colorScheme={stepStatus.color}
                            variant="subtle"
                            px={3}
                            py={1}
                            borderRadius="full"
                          >
                            <HStack spacing={1}>
                              <Icon as={stepStatus.icon} boxSize={3} />
                              <Text fontSize="sm">{stepStatus.text}</Text>
                            </HStack>
                          </Badge>

                          {/* Action Button - Always show if not completed */}
                          {!step.isCompleted && (
                            <Button
                              size="sm"
                              colorScheme="blue"
                              variant={step.isPending ? "outline" : "solid"}
                              onClick={step.onAction}
                              leftIcon={<Icon as={step.icon} />}
                              isDisabled={step.isPending}
                            >
                              {step.isPending ? 'Under Review' : step.actionText}
                            </Button>
                          )}

                          {/* Alternative: Go to Verification Page */}
                          {!step.isCompleted && !step.isPending && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => router.push('/verify-account')}
                            >
                              Go to Verification Page
                            </Button>
                          )}
                        </VStack>
                      </Flex>
                      
                      {index < verificationSteps.length - 1 && (
                        <Divider mt={6} />
                      )}
                    </Box>
                  );
                })}
              </VStack>
            </CardBody>
          </Card>

        </VStack>
      </Container>

      {/* Email Verification Modal */}
      <Modal isOpen={isEmailModalOpen} onClose={onEmailModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Email Verification</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Verify Your Email</AlertTitle>
                  <AlertDescription>
                    We'll send a 6-digit verification code to your email address.
                  </AlertDescription>
                </Box>
              </Alert>

              <Text fontSize="sm" color={subtleTextColor}>
                Email: <strong>{session?.user?.email || userProfile?.email}</strong>
              </Text>

              {!isEmailCodeSent ? (
                <Button
                  colorScheme="blue"
                  onClick={sendEmailVerificationCode}
                  isLoading={emailCodeSending}
                  loadingText="Sending Code..."
                >
                  Send Verification Code
                </Button>
              ) : (
                <VStack spacing={4}>
                  <Text fontSize="sm" textAlign="center">
                    Enter the 6-digit code sent to your email:
                  </Text>

                  <HStack justify="center">
                    <PinInput value={emailCode} onChange={setEmailCode} size="lg">
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                    </PinInput>
                  </HStack>

                  <HStack spacing={2} width="100%">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEmailCodeSent(false);
                        setEmailCode('');
                      }}
                      size="sm"
                    >
                      Resend Code
                    </Button>
                    <Button
                      colorScheme="blue"
                      onClick={verifyEmailCode}
                      isLoading={isEmailVerifying}
                      loadingText="Verifying..."
                      isDisabled={emailCode.length !== 6}
                      flex={1}
                    >
                      Verify Email
                    </Button>
                  </HStack>
                </VStack>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Profile Completion Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={onProfileModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Complete Your Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Personal Information Required</AlertTitle>
                  <AlertDescription>
                    Please provide your personal details to complete your profile.
                  </AlertDescription>
                </Box>
              </Alert>

              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Date of Birth</FormLabel>
                  <Input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                    placeholder="Select gender"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Country of Birth</FormLabel>
                <Select
                  value={profileForm.countryOfBirth}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, countryOfBirth: e.target.value }))}
                  placeholder="Select your country of birth"
                >
                  <option value="Afghanistan">🇦🇫 Afghanistan</option>
                  <option value="Armenia">🇦🇲 Armenia</option>
                  <option value="Azerbaijan">🇦🇿 Azerbaijan</option>
                  <option value="Bahrain">🇧🇭 Bahrain</option>
                  <option value="Bangladesh">🇧🇩 Bangladesh</option>
                  <option value="Bhutan">🇧🇹 Bhutan</option>
                  <option value="Brunei">🇧🇳 Brunei</option>
                  <option value="Cambodia">🇰🇭 Cambodia</option>
                  <option value="China">🇨🇳 China</option>
                  <option value="Cyprus">🇨🇾 Cyprus</option>
                  <option value="Georgia">🇬🇪 Georgia</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Iran">🇮🇷 Iran</option>
                  <option value="Iraq">🇮🇶 Iraq</option>
                  <option value="Israel">🇮🇱 Israel</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="Jordan">🇯🇴 Jordan</option>
                  <option value="Kazakhstan">🇰🇿 Kazakhstan</option>
                  <option value="Kuwait">🇰🇼 Kuwait</option>
                  <option value="Kyrgyzstan">🇰🇬 Kyrgyzstan</option>
                  <option value="Laos">🇱🇦 Laos</option>
                  <option value="Lebanon">🇱🇧 Lebanon</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Maldives">🇲🇻 Maldives</option>
                  <option value="Mongolia">🇲🇳 Mongolia</option>
                  <option value="Myanmar">🇲🇲 Myanmar</option>
                  <option value="Nepal">🇳🇵 Nepal</option>
                  <option value="North Korea">🇰🇵 North Korea</option>
                  <option value="Oman">🇴🇲 Oman</option>
                  <option value="Pakistan">🇵🇰 Pakistan</option>
                  <option value="Palestine">🇵🇸 Palestine</option>
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="Qatar">🇶🇦 Qatar</option>
                  <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="South Korea">🇰🇷 South Korea</option>
                  <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                  <option value="Syria">🇸🇾 Syria</option>
                  <option value="Taiwan">🇹🇼 Taiwan</option>
                  <option value="Tajikistan">🇹🇯 Tajikistan</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Timor-Leste">🇹🇱 Timor-Leste</option>
                  <option value="Turkey">🇹🇷 Turkey</option>
                  <option value="Turkmenistan">🇹🇲 Turkmenistan</option>
                  <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                  <option value="Uzbekistan">🇺🇿 Uzbekistan</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                  <option value="Yemen">🇾🇪 Yemen</option>
                  <option value="Other">🌏 Other</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="India">India</option>
                  <option value="China">China</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Address</FormLabel>
                <Textarea
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your full address"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onProfileModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={submitProfile}
              isLoading={isProfileSubmitting}
              loadingText="Saving..."
            >
              Complete Profile
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Identity Verification Modal */}
      <Modal isOpen={isIdentityModalOpen} onClose={onIdentityModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Identity Verification</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Upload Identity Document</AlertTitle>
                  <AlertDescription>
                    Please upload a clear photo of your government-issued ID (passport, driver's license, or national ID).
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Document Type</FormLabel>
                <Select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="Select document type"
                >
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="national_id">National ID Card</option>
                  <option value="other">Other Government ID</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Issuing Country</FormLabel>
                <Select
                  value={issuingCountry}
                  onChange={(e) => setIssuingCountry(e.target.value)}
                  placeholder="Select issuing country"
                >
                  <option value="Afghanistan">🇦🇫 Afghanistan</option>
                  <option value="Armenia">🇦🇲 Armenia</option>
                  <option value="Azerbaijan">🇦🇿 Azerbaijan</option>
                  <option value="Bahrain">🇧🇭 Bahrain</option>
                  <option value="Bangladesh">🇧🇩 Bangladesh</option>
                  <option value="Bhutan">🇧🇹 Bhutan</option>
                  <option value="Brunei">🇧🇳 Brunei</option>
                  <option value="Cambodia">🇰🇭 Cambodia</option>
                  <option value="China">🇨🇳 China</option>
                  <option value="Cyprus">🇨🇾 Cyprus</option>
                  <option value="Georgia">🇬🇪 Georgia</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Iran">🇮🇷 Iran</option>
                  <option value="Iraq">🇮🇶 Iraq</option>
                  <option value="Israel">🇮🇱 Israel</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="Jordan">🇯🇴 Jordan</option>
                  <option value="Kazakhstan">🇰🇿 Kazakhstan</option>
                  <option value="Kuwait">🇰🇼 Kuwait</option>
                  <option value="Kyrgyzstan">🇰🇬 Kyrgyzstan</option>
                  <option value="Laos">🇱🇦 Laos</option>
                  <option value="Lebanon">🇱🇧 Lebanon</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Maldives">🇲🇻 Maldives</option>
                  <option value="Mongolia">🇲🇳 Mongolia</option>
                  <option value="Myanmar">🇲🇲 Myanmar</option>
                  <option value="Nepal">🇳🇵 Nepal</option>
                  <option value="North Korea">🇰🇵 North Korea</option>
                  <option value="Oman">🇴🇲 Oman</option>
                  <option value="Pakistan">🇵🇰 Pakistan</option>
                  <option value="Palestine">🇵🇸 Palestine</option>
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="Qatar">🇶🇦 Qatar</option>
                  <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="South Korea">🇰🇷 South Korea</option>
                  <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                  <option value="Syria">🇸🇾 Syria</option>
                  <option value="Taiwan">🇹🇼 Taiwan</option>
                  <option value="Tajikistan">🇹🇯 Tajikistan</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Timor-Leste">🇹🇱 Timor-Leste</option>
                  <option value="Turkey">🇹🇷 Turkey</option>
                  <option value="Turkmenistan">🇹🇲 Turkmenistan</option>
                  <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                  <option value="Uzbekistan">🇺🇿 Uzbekistan</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                  <option value="Yemen">🇾🇪 Yemen</option>
                  <option value="Other">🌏 Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Upload Document</FormLabel>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  p={1}
                />
                {selectedFile && (
                  <Text fontSize="sm" color="green.500" mt={2}>
                    ✓ Selected: {selectedFile.name}
                  </Text>
                )}
                <Text fontSize="xs" color={subtleTextColor} mt={1}>
                  Accepted formats: JPEG, PNG, PDF (max 10MB)
                </Text>
              </FormControl>

              <Alert status="warning" size="sm">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Make sure your document is clearly visible and all information is readable.
                  Processing may take 1-3 business days.
                </AlertDescription>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onIdentityModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={uploadIdentityDocument}
              isLoading={isIdentityUploading}
              loadingText="Uploading..."
              isDisabled={!selectedFile || !documentType || !issuingCountry}
            >
              Upload Document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
