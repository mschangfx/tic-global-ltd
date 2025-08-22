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
import { FaUser, FaEnvelope, FaIdCard, FaEdit, FaFileUpload, FaCheckCircle } from 'react-icons/fa';

// Types
interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityVerified: boolean;
  identityStatus: 'pending' | 'approved' | 'rejected' | null;
  identityRejectionReason?: string | null;
  identityVerifiedAt?: string | null;
  identityUploadDate?: string | null;
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
            identityRejectionReason: data.user.identity_document_rejection_reason,
            identityVerifiedAt: data.user.identity_document_verified_at,
            identityUploadDate: data.user.identity_document_upload_date,
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

  // Edit profile function
  const handleEditProfile = async () => {
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
    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name and last name are required',
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
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          countryOfBirth: profileForm.countryOfBirth || userProfile?.country || '',
          // Keep existing values for required fields if not provided
          dateOfBirth: profileForm.dateOfBirth || '1990-01-01',
          gender: profileForm.gender || 'prefer-not-to-say',
          address: profileForm.address || 'Not provided',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state with new profile data
        setUserProfile(prev => ({
          ...prev!,
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          country: profileForm.countryOfBirth || prev?.country || '',
        }));

        // Update verification status if profile is now complete
        setVerificationStatus(prev => ({
          ...prev,
          profileCompleted: true,
        }));

        onEditProfileModalClose();
        toast({
          title: '✅ Profile Updated!',
          description: 'Your profile has been successfully updated.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Refresh profile data from server
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  // Identity document upload function
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
        // Update verification status to show document uploaded
        setVerificationStatus(prev => ({
          ...prev,
          identityStatus: 'pending',
        }));

        onIdentityModalClose();
        setSelectedFile(null);
        setDocumentType('');
        setIssuingCountry('');

        toast({
          title: '✅ Document Uploaded!',
          description: 'Your identity document has been uploaded and is under review.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Refresh verification status
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to upload document');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload identity document',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsIdentityUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a JPEG, PNG, WebP, or PDF file',
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
                  onClick={() => {
                    // Pre-fill form with existing data
                    setProfileForm({
                      firstName: userProfile?.firstName || '',
                      lastName: userProfile?.lastName || '',
                      dateOfBirth: '',
                      countryOfBirth: userProfile?.country || '',
                      gender: '',
                      address: '',
                    });
                    onEditProfileModalOpen();
                  }}
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

                  {/* Show additional info for different statuses */}
                  {verificationStatus.identityStatus === 'approved' && verificationStatus.identityVerifiedAt && (
                    <Text fontSize="xs" color="green.500">
                      Verified on {new Date(verificationStatus.identityVerifiedAt).toLocaleDateString()}
                    </Text>
                  )}

                  {verificationStatus.identityStatus === 'pending' && verificationStatus.identityUploadDate && (
                    <Text fontSize="xs" color="yellow.600">
                      Submitted on {new Date(verificationStatus.identityUploadDate).toLocaleDateString()} - Please wait for admin review
                    </Text>
                  )}

                  {verificationStatus.identityStatus === 'rejected' && (
                    <VStack align="start" spacing={1}>
                      {verificationStatus.identityRejectionReason && (
                        <Text fontSize="xs" color="red.500" fontWeight="medium">
                          Reason: {verificationStatus.identityRejectionReason}
                        </Text>
                      )}
                      <Text fontSize="xs" color="red.400">
                        Please upload a new document with the required corrections
                      </Text>
                    </VStack>
                  )}
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
                      colorScheme={verificationStatus.identityStatus === 'rejected' ? 'red' : 'purple'}
                      variant="outline"
                      leftIcon={<Icon as={FaIdCard} />}
                      onClick={onIdentityModalOpen}
                    >
                      {verificationStatus.identityStatus === 'rejected' ? 'Reupload ID Document' : 'Upload ID Document'}
                    </Button>
                  )}
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditProfileModalOpen} onClose={onEditProfileModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Update Your Profile Information</AlertTitle>
                  <AlertDescription>
                    Please provide accurate information. This will help complete your profile verification.
                  </AlertDescription>
                </Box>
              </Alert>

              <HStack spacing={4} width="100%">
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    placeholder="Enter your first name"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    placeholder="Enter your last name"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} width="100%">
                <FormControl>
                  <FormLabel>Date of Birth</FormLabel>
                  <Input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    placeholder="Select gender"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Country of Birth</FormLabel>
                <Select
                  placeholder="Select your country of birth"
                  value={profileForm.countryOfBirth}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, countryOfBirth: e.target.value }))}
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="India">India</option>
                  <option value="China">China</option>
                  <option value="Hong Kong">Hong Kong</option>
                  <option value="Taiwan">Taiwan</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  placeholder="Enter your address (optional)"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleEditProfile}
              isLoading={isProfileSubmitting}
              loadingText="Updating..."
            >
              Update Profile
            </Button>
            <Button variant="ghost" onClick={onEditProfileModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Identity Document Upload Modal */}
      <Modal isOpen={isIdentityModalOpen} onClose={onIdentityModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {verificationStatus.identityStatus === 'rejected' ? 'Reupload Identity Document' : 'Upload Identity Document'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              {verificationStatus.identityStatus === 'rejected' && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Document Rejected</AlertTitle>
                    <AlertDescription>
                      {verificationStatus.identityRejectionReason || 'Your previous document was rejected. Please upload a new document that meets our requirements.'}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Identity Verification Required</AlertTitle>
                  <AlertDescription>
                    Please upload a clear photo of your government-issued ID (passport, driver's license, or national ID card).
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Document Type</FormLabel>
                <Select
                  placeholder="Select document type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
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
                  placeholder="Select issuing country"
                  value={issuingCountry}
                  onChange={(e) => setIssuingCountry(e.target.value)}
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="India">India</option>
                  <option value="China">China</option>
                  <option value="Hong Kong">Hong Kong</option>
                  <option value="Taiwan">Taiwan</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Upload Document</FormLabel>
                <Box
                  border="2px dashed"
                  borderColor={selectedFile ? "green.300" : "gray.300"}
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
                        <Text fontWeight="bold" color="gray.500">
                          Click to upload or drag and drop
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          JPEG, PNG, WebP, or PDF (max 10MB)
                        </Text>
                      </VStack>
                    )}
                    <Button
                      as="label"
                      htmlFor="document-upload"
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      cursor="pointer"
                    >
                      Choose File
                    </Button>
                  </VStack>
                </Box>
              </FormControl>

              <Alert status="warning" borderRadius="md" fontSize="sm">
                <AlertIcon />
                <AlertDescription>
                  <strong>Important:</strong> Ensure your document is clear, well-lit, and all text is readable.
                  Blurry or unclear images will be rejected.
                </AlertDescription>
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={uploadIdentityDocument}
              isLoading={isIdentityUploading}
              loadingText="Uploading..."
              isDisabled={!selectedFile || !documentType || !issuingCountry}
            >
              {verificationStatus.identityStatus === 'rejected' ? 'Reupload Document' : 'Upload Document'}
            </Button>
            <Button variant="ghost" onClick={onIdentityModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}