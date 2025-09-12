'use client';

import { useState, useEffect } from 'react';
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
  Badge,
  Icon,
  useColorModeValue,
  Divider,
  Button,
  useToast,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  PinInput,
  PinInputField,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Flex,
  Spacer,
  CircularProgress,
  CircularProgressLabel,
  SimpleGrid,
  List,
  ListItem,
  ListIcon,
  Tooltip,
  Center,
} from '@chakra-ui/react';
import { 
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEnvelope,
  FaUser,
  FaIdCard,
  FaUpload,
  FaArrowRight,
  FaArrowLeft,
  FaInfoCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaFileUpload,
  FaEye,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityVerified: boolean;
  identityDocumentUploaded: boolean;
  identityStatus: 'pending' | 'approved' | 'rejected' | null;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  countryOfBirth?: string;
  email?: string;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  countryOfBirth: string;
  gender: string;
  address: string;
}

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  isCompleted: boolean;
  isPending?: boolean;
  isActive: boolean;
  requirements: string[];
  tips: string[];
}

const verificationSteps = [
  {
    id: 'email',
    title: 'Email Verification',
    description: 'Verify your email address to secure your account',
    icon: FaEnvelope,
    requirements: [
      'Access to your registered email address',
      'Ability to receive verification codes',
    ],
    tips: [
      'Check your spam/junk folder if you don\'t see the email',
      'The verification code expires in 10 minutes',
      'You can request a new code if needed',
    ],
  },
  {
    id: 'profile',
    title: 'Profile Completion',
    description: 'Complete your personal information and profile details',
    icon: FaUser,
    requirements: [
      'Full legal name (as it appears on your ID)',
      'Date of birth',
      'Country of birth',
      'Current address',
      'Gender information',
    ],
    tips: [
      'Use your legal name exactly as it appears on your government ID',
      'Ensure all information is accurate and up-to-date',
      'This information will be used for identity verification',
    ],
  },
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Upload identity documents for account verification',
    icon: FaIdCard,
    requirements: [
      'Government-issued photo ID (passport, driver\'s license, or national ID)',
      'Clear, high-quality photo or scan',
      'All information must be clearly visible',
      'Document must be valid and not expired',
    ],
    tips: [
      'Ensure good lighting when taking photos',
      'Avoid glare and shadows on the document',
      'All four corners of the document should be visible',
      'File size should be under 10MB',
      'Accepted formats: JPEG, PNG, PDF',
    ],
  },
  {
    id: 'review',
    title: 'Verification Review',
    description: 'Our team reviews your submitted documents',
    icon: FaShieldAlt,
    requirements: [
      'All previous steps completed',
      'Documents submitted for review',
      'Wait for admin approval',
    ],
    tips: [
      'Review typically takes 1-3 business days',
      'You\'ll receive an email notification when complete',
      'Contact support if you have questions',
    ],
  },
];

export default function VerifyAccountPage() {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const router = useRouter();
  const toast = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const successColor = useColorModeValue('green.500', 'green.300');
  const warningColor = useColorModeValue('orange.500', 'orange.300');
  const errorColor = useColorModeValue('red.500', 'red.300');

  // State
  const [userEmail, setUserEmail] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: true, // Always true now
    profileCompleted: false,
    identityVerified: false,
    identityDocumentUploaded: false,
    identityStatus: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeStepId, setActiveStepId] = useState<string>('email');

  // Email verification
  const [emailCode, setEmailCode] = useState('');
  const [isEmailCodeSent, setIsEmailCodeSent] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    countryOfBirth: '',
    gender: '',
    address: '',
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileJustCompleted, setProfileJustCompleted] = useState(false);
  const [identityJustUploaded, setIdentityJustUploaded] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  // Identity verification
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('');
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Modals
  const { isOpen: isEmailModalOpen, onOpen: onEmailModalOpen, onClose: onEmailModalClose } = useDisclosure();
  const { isOpen: isProfileModalOpen, onOpen: onProfileModalOpen, onClose: onProfileModalClose } = useDisclosure();
  const { isOpen: isIdentityModalOpen, onOpen: onIdentityModalOpen, onClose: onIdentityModalClose } = useDisclosure();

  // Handle unauthenticated redirect via useEffect
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/join');
    }
  }, [sessionStatus, router]);

  // Load user data and verification status
  useEffect(() => {
    if (sessionStatus !== 'loading') {
      // Reset flags when page loads
      setProfileJustCompleted(false);
      setIdentityJustUploaded(false);

      // Check if user has dismissed the modal before
      const dismissed = localStorage.getItem(`profile-modal-dismissed-${session?.user?.email}`);
      setModalDismissed(dismissed === 'true');

      loadUserData();
    }
  }, [sessionStatus, session?.user?.email]);

  // Update active step based on verification status
  useEffect(() => {
    if (!isLoading) {
      updateActiveStep();
    }
  }, [verificationStatus, isLoading]);

  // Auto-open next step modal when page loads if previous steps are completed
  useEffect(() => {
    if (!isLoading && sessionStatus === 'authenticated' && !isSubmittingProfile && !isUploadingDocument && !profileJustCompleted && !identityJustUploaded) {
      // Small delay to ensure state is properly set
      const timer = setTimeout(() => {
        // If email is verified but profile is not completed, open profile modal
        // Also check if profile form has data (additional safety check)
        const hasProfileData = profileForm.firstName && profileForm.lastName && profileForm.dateOfBirth;
        if (verificationStatus.emailVerified && !verificationStatus.profileCompleted && !hasProfileData && !isProfileModalOpen && !modalDismissed) {
          console.log('🚀 Auto-opening profile completion modal on page load');
          console.log('🔍 Current verification status:', verificationStatus);
          console.log('🔍 Profile form data:', profileForm);
          console.log('🔍 Modal dismissed:', modalDismissed);
          onProfileModalOpen();
        } else if (verificationStatus.profileCompleted || hasProfileData || modalDismissed) {
          console.log('✅ Profile already completed, has data, or modal dismissed - not opening modal');
          console.log('🔍 Profile completed:', verificationStatus.profileCompleted);
          console.log('🔍 Has profile data:', hasProfileData);
          console.log('🔍 Modal dismissed:', modalDismissed);
        }
        // If profile is completed but identity is not uploaded, open identity modal
        else if (verificationStatus.profileCompleted && !verificationStatus.identityDocumentUploaded && !isIdentityModalOpen) {
          console.log('🚀 Auto-opening identity verification modal on page load');
          onIdentityModalOpen();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, sessionStatus, verificationStatus.emailVerified, verificationStatus.profileCompleted, verificationStatus.identityDocumentUploaded, isProfileModalOpen, isIdentityModalOpen, onProfileModalOpen, onIdentityModalOpen, isSubmittingProfile, isUploadingDocument, profileJustCompleted, identityJustUploaded, modalDismissed, profileForm.firstName, profileForm.lastName, profileForm.dateOfBirth]);

  // Handle completion of all verification steps - ONLY when identity is actually approved
  useEffect(() => {
    const isAllComplete = verificationStatus.emailVerified &&
                         verificationStatus.profileCompleted &&
                         verificationStatus.identityDocumentUploaded &&
                         verificationStatus.identityVerified;

    if (isAllComplete && !isLoading) {
      // Show completion message only when fully verified (identity approved)
      toast({
        title: 'Account Verification Complete! 🎉',
        description: 'All verification steps have been completed and approved. You now have full access to your account.',
        status: 'success',
        duration: 8000,
        isClosable: true,
      });
    }
  }, [verificationStatus.emailVerified, verificationStatus.profileCompleted, verificationStatus.identityDocumentUploaded, verificationStatus.identityVerified, isLoading, toast]);

  const loadUserData = async () => {
    if (sessionStatus !== 'authenticated' || !session?.user?.email) {
      return;
    }

    try {
      setIsLoading(true);
      setUserEmail(session.user.email);

      const response = await fetch(`/api/auth/verification-status?email=${encodeURIComponent(session.user.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch verification status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Verification status API response:', data);

      if (data.success && data.user) {
        const newStatus: VerificationStatus = {
          emailVerified: data.user.email_verified || false,
          phoneVerified: data.user.phone_verified || true, // Always true now
          profileCompleted: data.user.profile_completed || false,
          identityVerified: data.user.identity_verification_status === 'approved',
          identityDocumentUploaded: data.user.identity_verification_submitted || false,
          identityStatus: data.user.identity_verification_submitted
            ? data.user.identity_verification_status || 'pending'
            : null,
          firstName: data.user.first_name || '',
          lastName: data.user.last_name || '',
          phoneNumber: data.user.phone_number || '',
          countryOfBirth: data.user.country_of_birth || '',
          email: data.user.email || session.user.email,
        };

        console.log('🔍 New verification status:', newStatus);
        setVerificationStatus(newStatus);

        // Pre-fill profile form with existing data
        setProfileForm({
          firstName: data.user.first_name || '',
          lastName: data.user.last_name || '',
          dateOfBirth: data.user.date_of_birth || '',
          countryOfBirth: data.user.country_of_birth || '',
          gender: data.user.gender || '',
          address: data.user.address || '',
        });
      } else {
        // Set default values
        setVerificationStatus({
          emailVerified: false,
          phoneVerified: true,
          profileCompleted: false,
          identityVerified: false,
          identityDocumentUploaded: false,
          identityStatus: null,
          email: session.user.email,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification status. Please refresh the page.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateActiveStep = () => {
    console.log('🔍 Updating active step with verification status:', verificationStatus);

    if (!verificationStatus.emailVerified) {
      console.log('📧 Setting active step to email verification');
      setActiveStepId('email');
      setCurrentStepIndex(0);
    } else if (!verificationStatus.profileCompleted) {
      console.log('👤 Setting active step to profile completion');
      setActiveStepId('profile');
      setCurrentStepIndex(1);
    } else if (!verificationStatus.identityDocumentUploaded) {
      console.log('🆔 Setting active step to identity verification');
      setActiveStepId('identity');
      setCurrentStepIndex(2);
    } else {
      console.log('✅ All steps completed, setting to review');
      setActiveStepId('review');
      setCurrentStepIndex(3);
    }
  };

  const getStepData = (): VerificationStep[] => {
    return verificationSteps.map((step) => ({
      ...step,
      isCompleted:
        step.id === 'email' ? verificationStatus.emailVerified :
        step.id === 'profile' ? verificationStatus.profileCompleted :
        step.id === 'identity' ? verificationStatus.identityDocumentUploaded :
        step.id === 'review' ? verificationStatus.identityVerified : false,
      isPending:
        step.id === 'identity' ? (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) :
        step.id === 'review' ? (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) : false,
      isActive: step.id === activeStepId,
    }));
  };

  const getOverallProgress = () => {
    const steps = getStepData();
    const completedSteps = steps.filter(step => step.isCompleted).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  // Email verification functions
  const sendEmailVerificationCode = async () => {
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
      setIsSendingEmailCode(true);
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
      setIsSendingEmailCode(false);
    }
  };

  const verifyEmailCode = async () => {
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
      setIsVerifyingEmail(true);
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
        // Update verification status immediately for instant visual feedback
        setVerificationStatus(prev => ({ ...prev, emailVerified: true }));
        setEmailCode('');
        setIsEmailCodeSent(false);

        // Close the email modal
        onEmailModalClose();

        // Show success message
        toast({
          title: 'Email Verified Successfully!',
          description: 'Your email has been verified. You can now proceed to the next step.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Small delay to ensure database update is processed, then refresh data
        setTimeout(async () => {
          await loadUserData();

          // Auto-advance to next step after data is refreshed
          setTimeout(() => {
            // Use the updated state from loadUserData
            if (!verificationStatus.profileCompleted) {
              onProfileModalOpen();
            }
          }, 500);
        }, 1000);

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
      setIsVerifyingEmail(false);
    }
  };

  // Profile completion functions
  const submitProfile = async () => {
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
      setIsSubmittingProfile(true);
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
        // Update verification status immediately for instant visual feedback
        setVerificationStatus(prev => ({ ...prev, profileCompleted: true }));
        setProfileJustCompleted(true);

        // Close the profile modal and mark as dismissed
        onProfileModalClose();
        if (userEmail) {
          localStorage.setItem(`profile-modal-dismissed-${userEmail}`, 'true');
          setModalDismissed(true);
        }

        // Show success message
        toast({
          title: 'Profile Completed Successfully!',
          description: 'Your profile has been completed. You can now proceed to identity verification.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Small delay to ensure database update is processed, then refresh data
        setTimeout(async () => {
          await loadUserData();

          // Auto-advance to next step after data is refreshed - only if not already uploading identity
          setTimeout(() => {
            if (!verificationStatus.identityDocumentUploaded && !isUploadingDocument) {
              setProfileJustCompleted(false); // Reset flag before opening next modal
              onIdentityModalOpen();
            } else {
              setProfileJustCompleted(false); // Reset flag if not opening next modal
            }
          }, 500);
        }, 1500); // Increased delay to ensure database update is complete

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
      setIsSubmittingProfile(false);
    }
  };

  // Identity verification functions
  const uploadIdentityDocument = async () => {
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
      setIsUploadingDocument(true);
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
        // Update verification status immediately for instant visual feedback
        setVerificationStatus(prev => ({
          ...prev,
          identityDocumentUploaded: true,
          identityStatus: 'pending'
        }));
        setIdentityJustUploaded(true);

        // Reset form
        setSelectedFile(null);
        setDocumentType('');
        setIssuingCountry('');

        // Close the identity modal
        onIdentityModalClose();

        // Show success message
        toast({
          title: 'Document Uploaded Successfully!',
          description: 'Your identity document has been uploaded and is under review. You will receive an email notification once the review is complete.',
          status: 'success',
          duration: 7000,
          isClosable: true,
        });

        // Small delay to ensure database update is processed, then refresh data
        setTimeout(async () => {
          await loadUserData();
          setIdentityJustUploaded(false); // Reset flag after data refresh
        }, 1500);

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
      setIsUploadingDocument(false);
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

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  // Loading state
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="6xl">
          <Center minH="60vh">
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Text fontSize="lg" color={subtleTextColor}>
                Loading verification status...
              </Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  // Show loading placeholder while redirecting (redirect handled in useEffect)
  if (sessionStatus === 'unauthenticated') {
    return (
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="6xl">
          <Center minH="60vh">
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </Center>
        </Container>
      </Box>
    );
  }

  const steps = getStepData();
  const overallProgress = getOverallProgress();
  const currentStep = steps.find(step => step.isActive) || steps[0];

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="6xl">
        <VStack spacing={8} align="stretch">

          {/* Header */}
          <Box textAlign="center" py={4}>
            <Heading as="h1" size="2xl" color={textColor} mb={4}>
              Account Verification
            </Heading>
            <Text fontSize="lg" color={subtleTextColor} mb={6}>
              Complete these steps to verify your account and unlock all features
            </Text>

            {/* Overall Progress */}
            <Box maxW="md" mx="auto">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color={subtleTextColor}>
                  Overall Progress
                </Text>
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  {overallProgress}%
                </Text>
              </HStack>
              <Progress
                value={overallProgress}
                colorScheme={overallProgress === 100 ? "green" : "blue"}
                size="lg"
                borderRadius="full"
                bg={useColorModeValue('gray.200', 'gray.600')}
              />
            </Box>
          </Box>

          {/* Step Progress Cards */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {steps.map((step, index) => (
              <Card
                key={step.id}
                bg={cardBg}
                shadow="lg"
                borderWidth="2px"
                borderColor={
                  step.isCompleted ? successColor :
                  step.isActive ? 'blue.500' :
                  step.isPending ? warningColor :
                  borderColor
                }
                position="relative"
                overflow="hidden"
              >
                <CardBody p={6}>
                  <VStack spacing={4} align="center" textAlign="center">

                    {/* Step Icon */}
                    <Box
                      bg={
                        step.isCompleted ? successColor :
                        step.isActive ? 'blue.500' :
                        step.isPending ? warningColor :
                        'gray.400'
                      }
                      p={4}
                      borderRadius="full"
                      color="white"
                    >
                      <Icon
                        as={
                          step.isCompleted ? FaCheckCircle :
                          step.isPending ? FaClock :
                          step.icon
                        }
                        boxSize={8}
                      />
                    </Box>

                    {/* Step Title */}
                    <VStack spacing={1}>
                      <Heading as="h3" size="md" color={textColor}>
                        {step.title}
                      </Heading>
                      <Text fontSize="sm" color={subtleTextColor}>
                        {step.description}
                      </Text>
                    </VStack>

                    {/* Step Status */}
                    <Badge
                      colorScheme={
                        step.isCompleted ? 'green' :
                        step.isActive ? 'blue' :
                        step.isPending ? 'orange' :
                        'gray'
                      }
                      size="lg"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      {step.isCompleted ? 'Completed' :
                       step.isPending ? 'Under Review' :
                       step.isActive ? 'In Progress' :
                       'Not Started'}
                    </Badge>

                    {/* Action Button */}
                    {step.isActive && !step.isCompleted && !step.isPending && (
                      <Button
                        colorScheme="blue"
                        size="sm"
                        onClick={() => {
                          if (step.id === 'email') onEmailModalOpen();
                          else if (step.id === 'profile') onProfileModalOpen();
                          else if (step.id === 'identity') onIdentityModalOpen();
                        }}
                        leftIcon={<Icon as={step.icon} />}
                        width="full"
                      >
                        {step.id === 'email' ? 'Verify Email' :
                         step.id === 'profile' ? 'Complete Profile' :
                         step.id === 'identity' ? 'Upload Documents' :
                         'Continue'}
                      </Button>
                    )}

                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Current Step Details */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <VStack spacing={6} align="stretch">

                {/* Step Header */}
                <HStack spacing={4}>
                  <Box
                    bg={currentStep.isCompleted ? successColor : currentStep.isActive ? 'blue.500' : 'gray.400'}
                    p={3}
                    borderRadius="full"
                    color="white"
                  >
                    <Icon as={currentStep.icon} boxSize={6} />
                  </Box>
                  <VStack spacing={1} align="start" flex={1}>
                    <Heading as="h2" size="lg" color={textColor}>
                      {currentStep.title}
                    </Heading>
                    <Text color={subtleTextColor}>
                      {currentStep.description}
                    </Text>
                  </VStack>
                  {currentStep.isCompleted && (
                    <Badge colorScheme="green" size="lg" px={3} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaCheckCircle} boxSize={3} />
                        <Text fontSize="sm">Completed</Text>
                      </HStack>
                    </Badge>
                  )}
                  {currentStep.isPending && (
                    <Badge colorScheme="orange" size="lg" px={3} py={1} borderRadius="full">
                      <HStack spacing={1}>
                        <Icon as={FaClock} boxSize={3} />
                        <Text fontSize="sm">Under Review</Text>
                      </HStack>
                    </Badge>
                  )}
                </HStack>

                <Divider />

                {/* Step Requirements */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
                  <Box>
                    <Heading as="h3" size="md" color={textColor} mb={3}>
                      Requirements
                    </Heading>
                    <List spacing={2}>
                      {currentStep.requirements.map((requirement, index) => (
                        <ListItem key={index}>
                          <ListIcon as={FaInfoCircle} color="blue.500" />
                          <Text fontSize="sm" color={subtleTextColor}>
                            {requirement}
                          </Text>
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box>
                    <Heading as="h3" size="md" color={textColor} mb={3}>
                      Tips for Success
                    </Heading>
                    <List spacing={2}>
                      {currentStep.tips.map((tip, index) => (
                        <ListItem key={index}>
                          <ListIcon as={FaCheckCircle} color="green.500" />
                          <Text fontSize="sm" color={subtleTextColor}>
                            {tip}
                          </Text>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </SimpleGrid>

                {/* Action Section */}
                <Box textAlign="center">
                  {!currentStep.isCompleted && !currentStep.isPending && (
                    <Button
                      colorScheme="blue"
                      size="lg"
                      leftIcon={<Icon as={currentStep.icon} />}
                      onClick={() => {
                        if (currentStep.id === 'email') onEmailModalOpen();
                        else if (currentStep.id === 'profile') onProfileModalOpen();
                        else if (currentStep.id === 'identity') onIdentityModalOpen();
                      }}
                      isDisabled={
                        (currentStep.id === 'profile' && !verificationStatus.emailVerified) ||
                        (currentStep.id === 'identity' && (!verificationStatus.emailVerified || !verificationStatus.profileCompleted))
                      }
                    >
                      {currentStep.id === 'email' ? 'Verify Email' :
                       currentStep.id === 'profile' ? 'Complete Profile' :
                       currentStep.id === 'identity' ? 'Upload Documents' :
                       'Continue'}
                    </Button>
                  )}



                  {currentStep.isCompleted && (
                    <Alert status="success" borderRadius="md" maxW="md" mx="auto">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Step Completed!</AlertTitle>
                        <AlertDescription>
                          This verification step has been completed successfully.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </Box>

              </VStack>
            </CardBody>
          </Card>

          {/* Navigation */}
          <HStack justify="space-between">
            <Button
              variant="outline"
              leftIcon={<Icon as={FaArrowLeft} />}
              onClick={() => router.push('/profile')}
            >
              Back to Profile
            </Button>
            <Spacer />
            {overallProgress === 100 && (
              <Button
                colorScheme="green"
                leftIcon={<Icon as={FaCheckCircle} />}
                onClick={() => router.push('/my-accounts')}
              >
                Go to Dashboard
              </Button>
            )}
          </HStack>

        </VStack>
      </Container>

      {/* Email Verification Modal */}
      <Modal isOpen={isEmailModalOpen} onClose={onEmailModalClose} size="md" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={FaEnvelope} color="blue.500" />
              <Text>Email Verification</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Verify Your Email Address</AlertTitle>
                  <AlertDescription>
                    We'll send a 6-digit verification code to your email address to confirm it's really you.
                  </AlertDescription>
                </Box>
              </Alert>

              <Box>
                <Text fontSize="sm" color={subtleTextColor} mb={2}>
                  Email Address:
                </Text>
                <Text fontWeight="bold" color={textColor} fontSize="lg">
                  {userEmail}
                </Text>
              </Box>

              {!isEmailCodeSent ? (
                <VStack spacing={4}>
                  <Text textAlign="center" color={subtleTextColor}>
                    Click the button below to send a verification code to your email.
                  </Text>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={sendEmailVerificationCode}
                    isLoading={isSendingEmailCode}
                    loadingText="Sending Code..."
                    leftIcon={<Icon as={FaEnvelope} />}
                    width="full"
                  >
                    Send Verification Code
                  </Button>
                </VStack>
              ) : (
                <VStack spacing={4}>
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>
                      Verification code sent! Check your email and enter the 6-digit code below.
                    </AlertDescription>
                  </Alert>

                  <Box textAlign="center">
                    <Text fontSize="sm" color={subtleTextColor} mb={4}>
                      Enter the 6-digit code from your email:
                    </Text>
                    <HStack justify="center" spacing={2}>
                      <PinInput
                        value={emailCode}
                        onChange={setEmailCode}
                        size="lg"
                        focusBorderColor="blue.500"
                      >
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                      </PinInput>
                    </HStack>
                  </Box>

                  <HStack spacing={3} width="full">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setEmailCode('');
                        await sendEmailVerificationCode();
                      }}
                      size="md"
                      flex={1}
                      isLoading={isSendingEmailCode}
                      loadingText="Resending..."
                    >
                      Resend Code
                    </Button>
                    <Button
                      colorScheme="blue"
                      onClick={verifyEmailCode}
                      isLoading={isVerifyingEmail}
                      loadingText="Verifying..."
                      isDisabled={emailCode.length !== 6}
                      size="md"
                      flex={2}
                    >
                      Verify Email
                    </Button>
                  </HStack>
                </VStack>
              )}

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onEmailModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile Completion Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={() => {
        onProfileModalClose();
        if (userEmail) {
          localStorage.setItem(`profile-modal-dismissed-${userEmail}`, 'true');
          setModalDismissed(true);
        }
      }} size="xl" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={FaUser} color="blue.500" />
              <Text>Complete Your Profile</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Personal Information Required</AlertTitle>
                  <AlertDescription>
                    Please provide accurate personal details as they appear on your government-issued ID.
                  </AlertDescription>
                </Box>
              </Alert>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Date of Birth</FormLabel>
                  <Input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    focusBorderColor="blue.500"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                    placeholder="Select gender"
                    focusBorderColor="blue.500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Country of Birth</FormLabel>
                <Select
                  value={profileForm.countryOfBirth}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, countryOfBirth: e.target.value }))}
                  placeholder="Select your country of birth"
                  focusBorderColor="blue.500"
                >
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="China">🇨🇳 China</option>
                  <option value="South Korea">🇰🇷 South Korea</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="Other">🌏 Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Current Address</FormLabel>
                <Textarea
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your full current address"
                  rows={3}
                  focusBorderColor="blue.500"
                />
              </FormControl>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Make sure all information matches your government-issued ID exactly. This will be used for identity verification.
                </AlertDescription>
              </Alert>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onProfileModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={submitProfile}
              isLoading={isSubmittingProfile}
              loadingText="Saving Profile..."
              leftIcon={<Icon as={FaUser} />}
            >
              Complete Profile
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Identity Verification Modal */}
      <Modal isOpen={isIdentityModalOpen} onClose={onIdentityModalClose} size="xl" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={FaIdCard} color="blue.500" />
              <Text>Identity Verification</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Upload Identity Document</AlertTitle>
                  <AlertDescription>
                    Please upload a clear photo of your government-issued ID. Make sure all information is clearly visible.
                  </AlertDescription>
                </Box>
              </Alert>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Document Type</FormLabel>
                  <Select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="Select document type"
                    focusBorderColor="blue.500"
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
                    focusBorderColor="blue.500"
                  >
                    <option value="Philippines">🇵🇭 Philippines</option>
                    <option value="Thailand">🇹🇭 Thailand</option>
                    <option value="Vietnam">🇻🇳 Vietnam</option>
                    <option value="Indonesia">🇮🇩 Indonesia</option>
                    <option value="Malaysia">🇲🇾 Malaysia</option>
                    <option value="Singapore">🇸🇬 Singapore</option>
                    <option value="India">🇮🇳 India</option>
                    <option value="China">🇨🇳 China</option>
                    <option value="South Korea">🇰🇷 South Korea</option>
                    <option value="Japan">🇯🇵 Japan</option>
                    <option value="Other">🌏 Other</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Upload Document</FormLabel>
                <Box
                  border="2px dashed"
                  borderColor={selectedFile ? "green.300" : borderColor}
                  borderRadius="lg"
                  p={6}
                  textAlign="center"
                  bg={selectedFile ? useColorModeValue('green.50', 'green.900') : 'transparent'}
                  transition="all 0.2s"
                >
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    display="none"
                    id="document-upload"
                  />
                  <VStack spacing={3}>
                    <Icon
                      as={selectedFile ? FaCheckCircle : FaFileUpload}
                      boxSize={8}
                      color={selectedFile ? "green.500" : "gray.400"}
                    />
                    {selectedFile ? (
                      <VStack spacing={1}>
                        <Text fontWeight="bold" color="green.500">
                          ✓ File Selected
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          {selectedFile.name}
                        </Text>
                        <Text fontSize="xs" color={subtleTextColor}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                      </VStack>
                    ) : (
                      <VStack spacing={1}>
                        <Text fontWeight="bold" color={textColor}>
                          Click to upload or drag and drop
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          JPEG, PNG, or PDF (max 10MB)
                        </Text>
                      </VStack>
                    )}
                    <Button
                      as="label"
                      htmlFor="document-upload"
                      colorScheme={selectedFile ? "green" : "blue"}
                      variant={selectedFile ? "outline" : "solid"}
                      size="sm"
                      leftIcon={<Icon as={selectedFile ? FaEye : FaUpload} />}
                      cursor="pointer"
                    >
                      {selectedFile ? 'Change File' : 'Select File'}
                    </Button>
                  </VStack>
                </Box>
              </FormControl>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Document Requirements</AlertTitle>
                  <AlertDescription fontSize="sm">
                    <List spacing={1} mt={2}>
                      <ListItem>• Document must be valid and not expired</ListItem>
                      <ListItem>• All information must be clearly visible</ListItem>
                      <ListItem>• Good lighting, no glare or shadows</ListItem>
                      <ListItem>• All four corners of the document visible</ListItem>
                    </List>
                  </AlertDescription>
                </Box>
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
              isLoading={isUploadingDocument}
              loadingText="Uploading..."
              isDisabled={!selectedFile || !documentType || !issuingCountry}
              leftIcon={<Icon as={FaUpload} />}
            >
              Upload Document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}
