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
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  useSteps,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
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
  HStack as PinHStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Flex,
  Spacer,
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
} from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { useSession } from 'next-auth/react';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityVerified: boolean;
  identityDocumentUploaded: boolean;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  countryOfBirth?: string;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  countryOfBirth: string;
  gender: string;
  address: string;
}

const steps = [
  { title: 'Email', description: 'Verify your email address' },
  { title: 'Profile', description: 'Complete your profile' },
  { title: 'Identity', description: 'Upload identity document' },
  { title: 'Review', description: 'Verification review' },
];

export default function VerifyAccountPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  // State
  const [userEmail, setUserEmail] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: true, // Always true now
    profileCompleted: false,
    identityVerified: false,
    identityDocumentUploaded: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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

  // Identity verification
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Modals
  const { isOpen: isEmailModalOpen, onOpen: onEmailModalOpen, onClose: onEmailModalClose } = useDisclosure();
  const { isOpen: isProfileModalOpen, onOpen: onProfileModalOpen, onClose: onProfileModalClose } = useDisclosure();
  const { isOpen: isIdentityModalOpen, onOpen: onIdentityModalOpen, onClose: onIdentityModalClose } = useDisclosure();

  // Load user data and verification status
  useEffect(() => {
    // Only load data when session status is determined
    if (sessionStatus !== 'loading') {
      loadUserData();
    }
  }, [sessionStatus]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Check if session is still loading
      if (sessionStatus === 'loading') {
        return;
      }

      // If no session after loading is complete, redirect to join page
      if (sessionStatus === 'unauthenticated' || !session?.user?.email) {
        router.push('/join');
        return;
      }

      setUserEmail(session.user.email);
      await fetchVerificationStatus(session.user.email);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVerificationStatus = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/verification-status?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(data);
        
        // Set profile form with existing data
        if (data.firstName) {
          setProfileForm(prev => ({
            ...prev,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            countryOfBirth: data.countryOfBirth || '',
          }));
        }

        // Determine current step
        if (!data.emailVerified) {
          setCurrentStepIndex(0);
        } else if (!data.profileCompleted) {
          setCurrentStepIndex(1);
        } else if (!data.identityDocumentUploaded) {
          setCurrentStepIndex(2);
        } else {
          setCurrentStepIndex(3);
        }
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  // Calculate overall progress
  const getOverallProgress = () => {
    let completed = 0;
    if (verificationStatus.emailVerified) completed++;
    if (verificationStatus.profileCompleted) completed++;
    if (verificationStatus.identityDocumentUploaded) completed++;
    if (verificationStatus.identityVerified) completed++;
    return (completed / 4) * 100;
  };

  // Send email verification code
  const sendEmailVerificationCode = async () => {
    try {
      setIsSendingEmailCode(true);
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        setIsEmailCodeSent(true);
        toast({
          title: 'Verification code sent',
          description: 'Please check your email for the verification code',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to send verification code');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  // Verify email code
  const verifyEmailCode = async () => {
    if (emailCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit verification code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsVerifyingEmail(true);
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, code: emailCode }),
      });

      if (response.ok) {
        // Refetch verification status to ensure UI is in sync with database
        await fetchVerificationStatus(userEmail);
        onEmailModalClose();
        setEmailCode('');

        toast({
          title: 'Email verified!',
          description: 'Your email has been successfully verified',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify email');
      }
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Failed to verify email code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Submit profile form
  const submitProfile = async () => {
    // Validate required fields
    if (!profileForm.firstName || !profileForm.lastName || !profileForm.dateOfBirth ||
        !profileForm.countryOfBirth || !profileForm.gender || !profileForm.address) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmittingProfile(true);
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          ...profileForm,
        }),
      });

      if (response.ok) {
        onProfileModalClose();

        toast({
          title: 'Profile completed!',
          description: 'Your profile has been successfully completed',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Small delay to ensure database update is complete, then refetch verification status
        setTimeout(async () => {
          await fetchVerificationStatus(userEmail);
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete profile');
      }
    } catch (error: any) {
      toast({
        title: 'Profile submission failed',
        description: error.message || 'Failed to complete profile',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Upload identity document
  const uploadIdentityDocument = async () => {
    if (!selectedFile || !documentType) {
      toast({
        title: 'Missing information',
        description: 'Please select a file and document type',
        status: 'error',
        duration: 3000,
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

      const response = await fetch('/api/auth/upload-identity-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Refetch verification status to ensure UI is in sync with database
        await fetchVerificationStatus(userEmail);
        onIdentityModalClose();

        // Reset form
        setSelectedFile(null);
        setDocumentType('');

        toast({
          title: 'Document uploaded!',
          description: 'Your identity document has been uploaded and is under review',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload identity document',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  // Show loading while session or verification data is loading
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <Box p={8} bg={bgColor} minH="calc(100vh - 60px)">
        <Container maxW="4xl">
          <VStack spacing={8} align="center" justify="center" minH="60vh">
            <Spinner size="xl" color="blue.500" />
            <Text color={subtleTextColor}>
              {sessionStatus === 'loading' ? 'Loading session...' : 'Loading verification status...'}
            </Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }} bg={bgColor} minH="calc(100vh - 60px)">
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading as="h1" size="xl" color={textColor}>
              Account Verification
            </Heading>
            <Text fontSize="lg" color={subtleTextColor}>
              Complete these steps to verify your account and unlock all features
            </Text>
            
            {/* Overall Progress */}
            <Box w="full" maxW="md">
              <Text fontSize="sm" color={subtleTextColor} mb={2}>
                Overall Progress: {Math.round(getOverallProgress())}%
              </Text>
              <Progress 
                value={getOverallProgress()} 
                colorScheme="blue" 
                size="lg" 
                borderRadius="full"
              />
            </Box>
          </VStack>

          {/* Verification Steps */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Stepper index={currentStepIndex} orientation="vertical" height="400px" gap="0">
                {steps.map((step, index) => (
                  <Step key={index}>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink="0">
                      <StepTitle>{step.title}</StepTitle>
                      <StepDescription>{step.description}</StepDescription>
                      
                      {/* Step Content */}
                      <Box mt={4}>
                        {index === 0 && (
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <Icon as={FaEnvelope} color="blue.500" />
                              <Text fontSize="sm">{userEmail}</Text>
                              {verificationStatus.emailVerified ? (
                                <Badge colorScheme="green">Verified</Badge>
                              ) : (
                                <Badge colorScheme="red">Not Verified</Badge>
                              )}
                            </HStack>
                            {!verificationStatus.emailVerified && (
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={onEmailModalOpen}
                                leftIcon={<FaEnvelope />}
                              >
                                Verify Email
                              </Button>
                            )}
                          </VStack>
                        )}

                        {index === 1 && (
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <Icon as={FaUser} color="blue.500" />
                              <Text fontSize="sm">
                                {verificationStatus.profileCompleted 
                                  ? `${verificationStatus.firstName} ${verificationStatus.lastName}`
                                  : 'Profile not completed'
                                }
                              </Text>
                              {verificationStatus.profileCompleted ? (
                                <Badge colorScheme="green">Completed</Badge>
                              ) : (
                                <Badge colorScheme="red">Incomplete</Badge>
                              )}
                            </HStack>
                            {!verificationStatus.profileCompleted && verificationStatus.emailVerified && (
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={onProfileModalOpen}
                                leftIcon={<FaUser />}
                              >
                                Complete Profile
                              </Button>
                            )}
                          </VStack>
                        )}

                        {index === 2 && (
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <Icon as={FaIdCard} color="blue.500" />
                              <Text fontSize="sm">Identity Document</Text>
                              {verificationStatus.identityDocumentUploaded ? (
                                <Badge colorScheme="green">Uploaded</Badge>
                              ) : (
                                <Badge colorScheme="red">Not Uploaded</Badge>
                              )}
                            </HStack>
                            {!verificationStatus.identityDocumentUploaded && verificationStatus.profileCompleted && (
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={onIdentityModalOpen}
                                leftIcon={<FaUpload />}
                              >
                                Upload Document
                              </Button>
                            )}
                          </VStack>
                        )}

                        {index === 3 && (
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <Icon as={FaClock} color="orange.500" />
                              <Text fontSize="sm">Verification Review</Text>
                              {verificationStatus.identityVerified ? (
                                <Badge colorScheme="green">Approved</Badge>
                              ) : (
                                <Badge colorScheme="orange">Under Review</Badge>
                              )}
                            </HStack>
                            <Text fontSize="sm" color={subtleTextColor}>
                              {verificationStatus.identityVerified 
                                ? 'Your account is fully verified!'
                                : 'Your documents are being reviewed by our team. This usually takes 1-2 business days.'
                              }
                            </Text>
                          </VStack>
                        )}
                      </Box>
                    </Box>

                    <StepSeparator />
                  </Step>
                ))}
              </Stepper>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <HStack justify="space-between">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              leftIcon={<FaArrowLeft />}
            >
              Back to Dashboard
            </Button>
            
            {verificationStatus.identityVerified && (
              <Button
                colorScheme="green"
                onClick={() => router.push('/wallet')}
                rightIcon={<FaArrowRight />}
              >
                Access Wallet
              </Button>
            )}
          </HStack>
        </VStack>
      </Container>

      {/* Email Verification Modal */}
      <Modal isOpen={isEmailModalOpen} onClose={onEmailModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Verify Your Email</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              <Text textAlign="center" color={subtleTextColor}>
                We'll send a 6-digit verification code to:
              </Text>
              <Text fontWeight="bold" color={textColor}>
                {userEmail}
              </Text>

              {!isEmailCodeSent ? (
                <Button
                  colorScheme="blue"
                  onClick={sendEmailVerificationCode}
                  isLoading={isSendingEmailCode}
                  loadingText="Sending..."
                  w="full"
                >
                  Send Verification Code
                </Button>
              ) : (
                <VStack spacing={4} w="full">
                  <Text textAlign="center" fontSize="sm" color={subtleTextColor}>
                    Enter the 6-digit code sent to your email:
                  </Text>

                  <PinHStack justify="center">
                    <PinInput
                      value={emailCode}
                      onChange={setEmailCode}
                      size="lg"
                      placeholder=""
                    >
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                    </PinInput>
                  </PinHStack>

                  <Button
                    colorScheme="blue"
                    onClick={verifyEmailCode}
                    isLoading={isVerifyingEmail}
                    loadingText="Verifying..."
                    w="full"
                    isDisabled={emailCode.length !== 6}
                  >
                    Verify Email
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendEmailVerificationCode}
                    isLoading={isSendingEmailCode}
                  >
                    Resend Code
                  </Button>
                </VStack>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Profile Completion Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={onProfileModalClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Complete Your Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <HStack spacing={4} w="full">
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

              <FormControl isRequired>
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </FormControl>

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
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Gender</FormLabel>
                <Select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                  placeholder="Select your gender"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
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

              <Button
                colorScheme="blue"
                onClick={submitProfile}
                isLoading={isSubmittingProfile}
                loadingText="Saving..."
                w="full"
                mt={4}
              >
                Complete Profile
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Identity Document Upload Modal */}
      <Modal isOpen={isIdentityModalOpen} onClose={onIdentityModalClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Identity Document</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Document Requirements</AlertTitle>
                  <AlertDescription>
                    Please upload a clear photo of your government-issued ID (passport, driver's license, or national ID card).
                    The document must be valid and all text must be clearly readable.
                  </AlertDescription>
                </Box>
              </Alert>



              <FormControl isRequired>
                <FormLabel>Document Type</FormLabel>
                <Select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="Select your document type"
                >
                  <option value="Passport">Passport</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="National ID Card">National ID Card</option>
                  <option value="Other Government ID">Other Government ID</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Document File</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  p={1}
                />
                <Text fontSize="xs" color={subtleTextColor} mt={1}>
                  Supported formats: JPEG, PNG, WebP. Max size: 10MB
                </Text>
              </FormControl>

              {selectedFile && (
                <Text fontSize="sm" color="green.500">
                  Selected: {selectedFile.name}
                </Text>
              )}

              <Button
                colorScheme="blue"
                onClick={uploadIdentityDocument}
                isLoading={isUploadingDocument}
                loadingText="Uploading..."
                w="full"
                isDisabled={!selectedFile || !documentType}
              >
                Upload Document
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
