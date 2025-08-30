'use client';

import { useEffect, useState } from 'react'; // Added useEffect, useState
import { useSession } from 'next-auth/react'; // Added NextAuth session hook
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation'; // Added for navigation
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Flex,
  SimpleGrid,
  Circle,
  Button, // Added Button import
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge as ChakraBadge, // Alias Badge to avoid conflict if you have a custom Badge component
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  List,
  ListItem,
  ListIcon,
  Input,
  PinInput,
  PinInputField,
  useToast,
  FormControl,
  FormLabel,
  Select,
  Spinner,
  Checkbox,
  Link,
} from '@chakra-ui/react';
import { FaUserCheck, FaClipboardList, FaAward, FaGamepad, FaChartLine, FaCheckCircle, FaFire, FaHeadset, FaBrain, FaRocket, FaUsersCog, FaMedal, FaTimesCircle, FaInfoCircle, FaTimes, FaEnvelope, FaPhone, FaUser, FaLock, FaIdCard, FaCamera, FaCloudUploadAlt, FaClock } from 'react-icons/fa'; // Added FaClock
// Supabase client removed - using NextAuth for authentication
import { initializeRecaptcha, sendFirebasePhoneVerification, verifyFirebasePhoneCode, cleanupRecaptcha, isFirebaseConfigured } from '@/lib/firebase';
import VerificationBanner from '@/components/VerificationBanner';


const StepItem = ({ icon, title, description, stepNumber }: { icon: React.ElementType, title: string, description: string, stepNumber: string }) => {
  const stepBg = useColorModeValue('white', 'gray.700');
  const numberBg = useColorModeValue('gray.200', 'gray.600');
  const numberColor = useColorModeValue('gray.800', 'white');

  return (
    <HStack spacing={4} align="center">
      <Circle size="40px" bg={numberBg} color={numberColor} fontWeight="bold" fontSize="lg">
        {stepNumber}
      </Circle>
      <VStack align="start" spacing={0}>
        <Text fontWeight="bold" color="black">{title}</Text>
        <Text fontSize="sm" color="black">{description}</Text>
      </VStack>
    </HStack>
  );
};


export default function DashboardOverviewPage() {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const { data: nextAuthSession, status: nextAuthStatus } = useSession(); // NextAuth session for Google OAuth
  const [userName, setUserName] = useState("Valued Member"); // State for user name
  const [userEmail, setUserEmail] = useState(""); // State for user email
  const { language, t } = useLanguage();
  const router = useRouter(); // Router for navigation
  const [showProfileBanner, setShowProfileBanner] = useState(true); // State for profile completion banner
  const [verificationCode, setVerificationCode] = useState(""); // State for verification code
  const [phoneVerificationCode, setPhoneVerificationCode] = useState(""); // State for phone verification code
  const [phoneNumber, setPhoneNumber] = useState(""); // State for phone number
  const [countryCode, setCountryCode] = useState("+63"); // State for country code
  const [isLoading, setIsLoading] = useState(false); // Loading state for verification
  const [isPhoneLoading, setIsPhoneLoading] = useState(false); // Loading state for phone verification
  const [isEmailLoading, setIsEmailLoading] = useState(true); // Loading state for email fetching
  const [isIdentityLoading, setIsIdentityLoading] = useState(false); // Loading state for identity verification
  const [identityForm, setIdentityForm] = useState({
    fullName: "",
    country: "Philippines"
  });
  const [dataConsentChecked, setDataConsentChecked] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    issuingCountry: "Philippines",
    documentType: "passport",
    uploadedFile: null as File | null
  });
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Current verification step
  const [firebaseVerificationId, setFirebaseVerificationId] = useState(""); // Firebase verification ID
  const [smsMethod, setSmsMethod] = useState<'firebase' | 'twilio' | 'development'>('development'); // SMS method being used

  // Verification status states (phone verification removed)
  const [verificationStatus, setVerificationStatus] = useState({
    emailVerified: false,
    phoneVerified: true, // Always true since phone verification is removed
    profileCompleted: false,
    identityVerified: false,
    identityDocumentUploaded: false,
    phoneNumber: null as string | null,
    firstName: null as string | null,
    lastName: null as string | null,
    name: null as string | null,
    countryOfBirth: null as string | null
  });

  // Profile form states
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    countryOfBirth: "Philippines",
    gender: "",
    address: ""
  });

  const { isOpen, onOpen, onClose } = useDisclosure(); // Modal state for verification steps
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure(); // Modal state for profile completion
  const { isOpen: isEmailVerifyOpen, onOpen: onEmailVerifyOpen, onClose: onEmailVerifyClose } = useDisclosure(); // Modal state for email verification
  const { isOpen: isPhoneVerifyOpen, onOpen: onPhoneVerifyOpen, onClose: onPhoneVerifyClose } = useDisclosure(); // Modal state for phone verification
  const { isOpen: isProfileFormOpen, onOpen: onProfileFormOpen, onClose: onProfileFormClose } = useDisclosure(); // Modal state for profile form
  const { isOpen: isIdentityVerifyOpen, onOpen: onIdentityVerifyOpen, onClose: onIdentityVerifyClose } = useDisclosure(); // Modal state for identity verification
  const { isOpen: isDataAgreementOpen, onOpen: onDataAgreementOpen, onClose: onDataAgreementClose } = useDisclosure(); // Modal state for data use agreement
  const { isOpen: isDocumentUploadOpen, onOpen: onDocumentUploadOpen, onClose: onDocumentUploadClose } = useDisclosure(); // Modal state for document upload
  const { isOpen: isDocumentReviewOpen, onOpen: onDocumentReviewOpen, onClose: onDocumentReviewClose } = useDisclosure(); // Modal state for document review status
  // Supabase client removed - using NextAuth for authentication
  const toast = useToast();

  // Debounce mechanism to prevent rapid successive calls
  const [lastVerificationUpdate, setLastVerificationUpdate] = useState<number>(0);

  // Function to fetch verification status and update user name
  const fetchVerificationStatus = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/verification-status?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Dashboard verification status response:', data);

        if (data.success && data.user) {
          // Map API response to dashboard verification status format
          const mappedStatus = {
            emailVerified: data.user.email_verified || false,
            phoneVerified: data.user.phone_verified || true, // Always true since phone verification is removed
            profileCompleted: data.user.profile_completed || false,
            identityVerified: data.user.identity_verification_status === 'approved',
            identityDocumentUploaded: data.user.identity_verification_submitted || false,
            phoneNumber: data.user.phone_number || null,
            firstName: data.user.first_name || null,
            lastName: data.user.last_name || null,
            name: data.user.first_name && data.user.last_name
              ? `${data.user.first_name} ${data.user.last_name}`
              : null,
            countryOfBirth: data.user.country_of_residence || data.user.country_of_birth || null
          };

          console.log('📋 Mapped verification status:', mappedStatus);
          setVerificationStatus(mappedStatus);

          if (data.user.phone_number) {
            setPhoneNumber(data.user.phone_number);
          }

          // Update user name based on profile data from database
          let nameToDisplay = "Valued Member";
          if (data.user.first_name) {
            nameToDisplay = data.user.first_name;
          } else if (data.user.name) {
            nameToDisplay = data.user.name.split(' ')[0]; // Get first name from full name
          } else if (email) {
            nameToDisplay = email.split('@')[0]; // Fallback to email username
          }
          setUserName(nameToDisplay);

          // Update identity form with user data
          if (data.user.first_name && data.user.last_name) {
            setIdentityForm(prev => ({
              ...prev,
              fullName: `${data.user.first_name} ${data.user.last_name}`,
              country: data.user.country_of_birth || data.user.country_of_residence || "Philippines"
            }));
          } else if (data.user.name) {
            setIdentityForm(prev => ({
              ...prev,
              fullName: data.user.name,
              country: data.user.country_of_birth || data.user.country_of_residence || "Philippines"
            }));
          } else if (data.user.country_of_birth || data.user.country_of_residence) {
            setIdentityForm(prev => ({
              ...prev,
              country: data.user.country_of_birth || data.user.country_of_residence || "Philippines"
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      setIsEmailLoading(true);
      try {
        // Method 1: Check NextAuth session (Google OAuth)
        if (nextAuthSession?.user?.email) {
          const email = nextAuthSession.user.email;
          const name = nextAuthSession.user.name || "";

          setUserEmail(email);

          // Fetch verification status with error handling
          try {
            await fetchVerificationStatus(email);
          } catch (verificationError) {
            console.warn('Verification status fetch failed:', verificationError);
            // Continue with user setup even if verification status fails
          }

          // Set display name from Google OAuth
          let nameToDisplay = "Valued Member";
          if (name) {
            nameToDisplay = name.split(' ')[0]; // Get first name
          } else if (email) {
            nameToDisplay = email.split('@')[0]; // Fallback to email username
          }
          setUserName(nameToDisplay);
          setIsEmailLoading(false);
          return; // Exit early if NextAuth session worked
        }

        // For Google OAuth users, we only use NextAuth session
        // No need to check Supabase session since user authenticated via Google

        // If no session found, user is not authenticated
        // Don't redirect immediately, let the user see the dashboard briefly
        // The middleware should handle authentication redirects
      } catch (err) {
        console.error('Error in fetchUser:', err);
        // Set fallback values to prevent UI issues
        setUserName("Valued Member");
      } finally {
        setIsEmailLoading(false);
      }
    };

    // Only run if NextAuth status is not loading
    if (nextAuthStatus !== 'loading') {
      fetchUser();
    }

    // Auth state listener removed - using NextAuth session only
    // NextAuth handles session management automatically
  }, [nextAuthSession, nextAuthStatus]); // NextAuth dependencies only

  const welcomeBg = useColorModeValue('#14c3cb', '#14c3cb'); // Your brand teal
  const welcomeTextColor = 'black';
  const stepsBg = useColorModeValue('#E0B528', '#E0B528'); // Gold dust background
  const stepsTextColor = 'black'; // Solid black text
  const sectionBg = useColorModeValue('gray.50', 'gray.800');

  const handleOpenProfileModal = async () => {
    // Ensure we have user email before opening modal
    if (!userEmail) {
      try {
        // Check NextAuth session first (Google OAuth)
        if (nextAuthSession?.user?.email) {
          setUserEmail(nextAuthSession.user.email);
          await fetchVerificationStatus(nextAuthSession.user.email);
        }
      } catch (error) {
        // Handle error silently
      }
    }

    // Check if all verification steps are completed (excluding phone verification)
    if (verificationStatus.emailVerified &&
        verificationStatus.profileCompleted &&
        verificationStatus.identityDocumentUploaded) {
      // All steps completed, show review status
      onDocumentReviewOpen();
    } else {
      // Open the profile completion modal
      onProfileOpen();
    }
  };

  const handleLearnMore = () => {
    // Open the verification steps modal
    onOpen();
  };

  const handleGetStarted = async () => {
    // Close profile modal
    onProfileClose();

    // Determine which step to start based on verification status (skip phone verification)
    if (!verificationStatus.emailVerified) {
      // Start with email verification
      setCurrentStep(1);
      onEmailVerifyOpen();

      // Send verification email in the background
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/send-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: userEmail }),
        });

        if (response.ok) {
          toast({
            title: "Verification code sent",
            description: `We've sent a verification code to ${maskEmail(userEmail)}`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        } else {
          throw new Error('Failed to send verification email');
        }
      } catch (error) {
        console.error('Error sending verification email:', error);
        toast({
          title: "Error",
          description: "Failed to send verification code. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    } else if (!verificationStatus.profileCompleted) {
      // Start with profile completion (skip phone verification)
      setCurrentStep(2);
      onProfileFormOpen();
    } else {
      // All steps completed
      toast({
        title: "All verification steps completed!",
        description: "Your account is fully verified.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the complete 6-digit verification code.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          code: verificationCode
        }),
      });

      if (response.ok) {
        onEmailVerifyClose();
        setVerificationCode("");
        setVerificationStatus(prev => ({ ...prev, emailVerified: true }));
        setCurrentStep(2); // Move to profile completion step
        toast({
          title: "Email verified successfully!",
          description: "Your email has been confirmed. Now let's complete your profile.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // Open profile completion modal (skip phone verification)
        onProfileFormOpen();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid verification code. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsPhoneLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      // First, check what SMS method the backend will use
      const response = await fetch('/api/auth/send-phone-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: fullPhoneNumber }),
      });

      if (response.ok) {
        const responseData = await response.json();
        setSmsMethod(responseData.method);

        if (responseData.method === 'firebase') {
          // Use Firebase for phone verification
          if (!isFirebaseConfigured()) {
            throw new Error('Firebase is not configured');
          }

          // Initialize reCAPTCHA
          const recaptchaVerifier = initializeRecaptcha('recaptcha-container');
          if (!recaptchaVerifier) {
            throw new Error('Failed to initialize reCAPTCHA');
          }

          // Send verification code via Firebase
          const firebaseResult = await sendFirebasePhoneVerification(fullPhoneNumber, recaptchaVerifier);

          if (firebaseResult.success && firebaseResult.verificationId) {
            setFirebaseVerificationId(firebaseResult.verificationId);
            toast({
              title: "Verification code sent via Firebase",
              description: `We've sent a verification code to ${fullPhoneNumber}`,
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          } else {
            throw new Error(firebaseResult.error || 'Failed to send verification code via Firebase');
          }
        } else {
          // Handle Twilio or development mode
          if (responseData.code && responseData.devMessage) {
            // Development mode - show the code
            toast({
              title: "Verification code sent (DEV MODE)",
              description: responseData.devMessage,
              status: "success",
              duration: 10000, // Longer duration so user can see the code
              isClosable: true,
            });
          } else {
            // Production mode - normal message
            toast({
              title: "Verification code sent",
              description: `We've sent a verification code to ${fullPhoneNumber}`,
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          }
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending phone verification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification code. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (phoneVerificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the complete 6-digit verification code.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsPhoneLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      if (smsMethod === 'firebase' && firebaseVerificationId) {
        // Verify using Firebase
        const firebaseResult = await verifyFirebasePhoneCode(firebaseVerificationId, phoneVerificationCode);

        if (firebaseResult.success) {
          // Update our database via API
          const response = await fetch('/api/auth/verify-firebase-phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: fullPhoneNumber,
              verificationId: firebaseVerificationId,
              code: phoneVerificationCode,
              email: userEmail
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update verification status');
          }

          // Success
          onPhoneVerifyClose();
          setPhoneVerificationCode("");
          setFirebaseVerificationId("");
          setVerificationStatus(prev => ({ ...prev, phoneVerified: true }));
          setCurrentStep(3); // Move to profile completion step
          cleanupRecaptcha(); // Clean up reCAPTCHA

          toast({
            title: "Phone verified successfully!",
            description: "Your phone number has been confirmed via Firebase. Now let's complete your profile.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          // Open profile form modal
          onProfileFormOpen();
        } else {
          throw new Error(firebaseResult.error || 'Firebase verification failed');
        }
      } else {
        // Use Twilio or development mode verification
        const response = await fetch('/api/auth/verify-phone-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: fullPhoneNumber,
            code: phoneVerificationCode,
            email: userEmail
          }),
        });

        if (response.ok) {
          onPhoneVerifyClose();
          setPhoneVerificationCode("");
          setVerificationStatus(prev => ({ ...prev, phoneVerified: true }));
          setCurrentStep(3); // Move to profile completion step
          toast({
            title: "Phone verified successfully!",
            description: "Your phone number has been confirmed. Now let's complete your profile.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          // Open profile form modal
          onProfileFormOpen();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid verification code');
        }
      }
    } catch (error) {
      console.error('Error verifying phone code:', error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid verification code. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleSubmitProfile = async () => {
    // Validate all required fields
    if (!profileForm.firstName || !profileForm.lastName || !profileForm.dateOfBirth ||
        !profileForm.countryOfBirth || !profileForm.gender || !profileForm.address) {
      toast({
        title: "All fields are required",
        description: "Please fill out all fields to complete your profile.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          ...profileForm
        }),
      });

      if (response.ok) {
        onProfileFormClose();
        setVerificationStatus(prev => ({ ...prev, profileCompleted: true }));
        setShowProfileBanner(false); // Hide the profile completion banner

        // Update user name with the first name from the profile form
        if (profileForm.firstName) {
          setUserName(profileForm.firstName);
        }

        // Refresh verification status to get updated profile data
        await fetchVerificationStatus(userEmail);

        toast({
          title: "Profile completed successfully!",
          description: "Your profile has been completed. You can now access all features.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete profile. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitIdentityVerification = async () => {
    if (!identityForm.fullName.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your full name as shown on your ID.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsIdentityLoading(true);
    try {
      // Here you would typically upload documents and submit identity verification
      // For now, we'll simulate the process

      const response = await fetch('/api/auth/submit-identity-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          fullName: identityForm.fullName,
          country: identityForm.country
        }),
      });

      if (response.ok) {
        onIdentityVerifyClose();
        setVerificationStatus(prev => ({ ...prev, identityVerified: true }));

        toast({
          title: "Identity verification submitted!",
          description: "Your documents have been submitted for review. We'll notify you once verified.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit identity verification');
      }
    } catch (error) {
      console.error('Error submitting identity verification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit identity verification. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsIdentityLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        toast({
          title: "Code resent",
          description: `A new verification code has been sent to ${maskEmail(userEmail)}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to resend verification code');
      }
    } catch (error) {
      console.error('Error resending verification code:', error);
      toast({
        title: "Error",
        description: "Failed to resend verification code. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get country flag emoji
  const getCountryFlag = (country: string) => {
    const countryFlags: { [key: string]: string } = {
      'Philippines': '🇵🇭',
      'Singapore': '🇸🇬',
      'Malaysia': '🇲🇾',
      'Thailand': '🇹🇭',
      'Vietnam': '🇻🇳',
      'Indonesia': '🇮🇩',
      'Japan': '🇯🇵',
      'South Korea': '🇰🇷',
      'China': '🇨🇳',
      'India': '🇮🇳'
    };
    return countryFlags[country] || '🏳️'; // Default flag if country not found
  };

  // Function to mask email address
  const maskEmail = (email: string) => {
    if (!email || email.trim() === "") {
      return "Loading email...";
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return email;
    }

    // Show first 2 characters and last 2 characters of local part
    let maskedEmail;
    if (localPart.length <= 4) {
      // For very short emails, show first char + dots + last char
      maskedEmail = `${localPart[0]}••••••••••${localPart[localPart.length - 1]}@${domain}`;
    } else {
      // For longer emails, show first 2 + dots + last 2
      maskedEmail = `${localPart.substring(0, 2)}••••••••••${localPart.substring(localPart.length - 2)}@${domain}`;
    }

    return maskedEmail;
  };

  // Handle data agreement continue
  const handleDataAgreementContinue = () => {
    if (dataConsentChecked) {
      onDataAgreementClose();
      onDocumentUploadOpen();
    }
  };

  // Handle document form changes
  const handleDocumentFormChange = (field: string, value: string) => {
    setDocumentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, or WebP image file.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setDocumentForm(prev => ({
        ...prev,
        uploadedFile: file
      }));
    }
  };

  // Submit document verification
  const handleSubmitDocument = async () => {
    if (!documentForm.uploadedFile) {
      toast({
        title: "Document required",
        description: "Please upload your identity document.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsDocumentLoading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('document', documentForm.uploadedFile);
      formData.append('email', userEmail);
      formData.append('issuingCountry', documentForm.issuingCountry);
      formData.append('documentType', documentForm.documentType);

      const response = await fetch('/api/auth/upload-identity-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        onDocumentUploadClose();
        setVerificationStatus(prev => ({ ...prev, identityDocumentUploaded: true }));

        toast({
          title: "Document uploaded successfully!",
          description: "Your identity document has been submitted for verification. We'll review it within 24-48 hours.",
          status: "success",
          duration: 7000,
          isClosable: true,
        });

        // Reset form
        setDocumentForm({
          issuingCountry: "Philippines",
          documentType: "passport",
          uploadedFile: null
        });

        // Show the review status modal after successful upload
        setTimeout(() => {
          onDocumentReviewOpen();
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDocumentLoading(false);
    }
  };

  // Handle plan selection and redirect to billing
  const handleGetStartedWithPlan = (planId: string) => {
    router.push(`/my-accounts/billing?plan=${planId}`);
  };

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  return (
    <Box p={{ base: 4, md: 6 }} bg={sectionBg} minH="calc(100vh - 60px)"> {/* Adjust minH if needed */}
      <VStack spacing={8} align="stretch">
        {/* Verification Banner */}
        <VerificationBanner onVerificationUpdate={async () => {
          // Debounce verification updates to prevent infinite loops
          const now = Date.now();
          if (now - lastVerificationUpdate < 2000) { // 2 second debounce
            console.log('🚫 Dashboard: Verification update debounced');
            return;
          }

          setLastVerificationUpdate(now);
          console.log('Verification status updated - refreshing dashboard');
          if (userEmail) {
            await fetchVerificationStatus(userEmail);
          }
        }} />

        {/* Profile Completion Banner */}
        {false && showProfileBanner && (
          <Box
            bg={
              verificationStatus.emailVerified &&
              verificationStatus.phoneVerified &&
              verificationStatus.profileCompleted &&
              verificationStatus.identityDocumentUploaded
                ? useColorModeValue('yellow.50', 'yellow.900')
                : useColorModeValue('blue.50', 'blue.900')
            }
            border="1px"
            borderColor={
              verificationStatus.emailVerified &&
              verificationStatus.phoneVerified &&
              verificationStatus.profileCompleted &&
              verificationStatus.identityDocumentUploaded
                ? useColorModeValue('yellow.200', 'yellow.700')
                : useColorModeValue('blue.200', 'blue.700')
            }
            borderRadius="lg"
            p={4}
          >
            <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
              <HStack spacing={3} flex="1">
                <Icon
                  as={
                    verificationStatus.emailVerified &&
                    verificationStatus.phoneVerified &&
                    verificationStatus.profileCompleted &&
                    verificationStatus.identityDocumentUploaded
                      ? FaClock
                      : FaInfoCircle
                  }
                  color={
                    verificationStatus.emailVerified &&
                    verificationStatus.phoneVerified &&
                    verificationStatus.profileCompleted &&
                    verificationStatus.identityDocumentUploaded
                      ? "yellow.500"
                      : "blue.500"
                  }
                  boxSize={5}
                />
                <Text color={useColorModeValue('gray.700', 'gray.200')} fontSize="sm">
                  Hello, Fill in your account details to make your first deposit!
                </Text>
              </HStack>

              <HStack spacing={3}>
                {!(verificationStatus.emailVerified &&
                   verificationStatus.phoneVerified &&
                   verificationStatus.profileCompleted &&
                   verificationStatus.identityDocumentUploaded) && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      color="blue.600"
                      _hover={{ bg: useColorModeValue('blue.100', 'blue.800') }}
                      onClick={handleLearnMore}
                    >
                      Learn more
                    </Button>
                    <Button
                      bg="#14c3cb"
                      color="black"
                      size="sm"
                      _hover={{ bg: '#0891b2' }}
                      fontWeight="bold"
                      onClick={handleOpenProfileModal}
                    >
                      Complete profile
                    </Button>
                  </>
                )}
                {verificationStatus.emailVerified &&
                 verificationStatus.phoneVerified &&
                 verificationStatus.profileCompleted &&
                 verificationStatus.identityDocumentUploaded && (
                  <Button
                    bg="#E0B528"
                    color="black"
                    size="sm"
                    _hover={{ bg: '#c9a224' }}
                    fontWeight="bold"
                    onClick={onDocumentReviewOpen}
                  >
                    View Status
                  </Button>
                )}
              </HStack>
            </Flex>
          </Box>
        )}
        {/* Welcome Banner */}
        <Box
          bg={welcomeBg}
          color={welcomeTextColor}
          p={{ base: 6, md: 8 }}
          borderRadius="xl"
          boxShadow="lg"
        >
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center">
            <VStack align={{ base: 'center', md: 'start' }} spacing={3} textAlign={{ base: 'center', md: 'left' }}>
              <Heading as="h1" size="xl" fontWeight="bold" color="black">
                {t('dashboard.welcome')}, {userName}!
              </Heading>

              <Text fontSize="lg" maxW="3xl" color="black"> {/* Increased maxW for potentially longer text */}
{language === 'vi' ?
                  'Là thành viên của cộng đồng TIC GLOBAL Ltd., bạn giờ đây có quyền truy cập vào thế giới không biên giới của trò chơi, kiếm tiền và cơ hội tài chính được hỗ trợ bởi tiền điện tử.' :
                  'As a member of the TIC GLOBAL Ltd. community, you now have access to a borderless world of crypto-powered gaming, earning, and financial opportunities.'
                }
              </Text>
              <Text fontSize="md" maxW="3xl" color="black"> {/* Increased maxW */}
                Explore our game-based earning plans and passive income tools designed to fuel your growth—no matter where you are in the world. Let’s build your digital wealth, one reward at a time.
              </Text>
            </VStack>
            <Box display={{ base: 'none', md: 'block' }} ml={8}>
               <Icon as={FaUserCheck} boxSize="100px" opacity={0.5} />
            </Box>
          </Flex>
        </Box>

        {/* Get Started Steps */}
        <Box
          bg={stepsBg}
          color={stepsTextColor}
          p={{ base: 6, md: 8 }}
          borderRadius="xl"
          boxShadow="lg"
        >
          <VStack spacing={4} mb={6} textAlign="center">
            <Heading as="h2" size="lg" fontWeight="bold" color="black">
              Get Started in 3 Simple Steps: Fast & Rewarding!
            </Heading>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 6, md: 8 }}>
            <StepItem
              stepNumber="1"
              icon={FaClipboardList} // You can change this icon if desired
              title="Choose Your Plan"
              description="Select a plan that suits your goals—Starter or VIP—and unlock your token rewards instantly."
            />
            <StepItem
              stepNumber="2"
              icon={FaGamepad} // Changed icon to FaGamepad
              title="Activate & Play"
              description="Start earning TIC and GIC tokens daily through gaming, referrals, or staking."
            />
            <StepItem
              stepNumber="3"
              icon={FaChartLine} // Changed icon to FaChartLine
              title="Grow & Earn More"
              description="Climb the ranks, unlock bonuses, and multiply your income through our 15-level community system."
            />
          </SimpleGrid>
        </Box>
        
        {/* You can add more dashboard widgets or sections below */}

        {/* Select from Plans Section */}
        <Box pt={8}> {/* Add some padding top */}
          <Heading as="h2" size="lg" fontWeight="bold" mb={6} textAlign="center" color="black">
            Select from the Industry's Best Plans
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 6, md: 8 }}>
            {/* Starter Plan Card */}
            <Box
              bg={useColorModeValue('white', 'gray.700')}
              p={6}
              borderRadius="xl"
              boxShadow="lg"
              border="2px"
              borderColor="#14c3cb"
              transition="all 0.3s ease-in-out"
              cursor="pointer"
              _hover={{
                transform: 'scale(1.05)',
                bg: useColorModeValue('#f0fdfe', 'gray.600'),
                boxShadow: 'xl',
                borderColor: '#0891b2'
              }}
            >
              <VStack spacing={4} align="start">
                <Heading as="h3" size="md" color="#14c3cb">
                  Starter Plan
                </Heading>
                <HStack align="baseline">
                  <Text fontSize="3xl" fontWeight="bold" color="black">
                    {formatCurrency(10, language)}
                  </Text>
                  <Text fontSize="sm" color="black">
                    / one-time
                  </Text>
                </HStack>
                <Text fontSize="sm" color="black">
                  Perfect for beginners entering the TIC ecosystem. Get essential access and start your journey.
                </Text>
                <VStack spacing={2} align="start" w="full">
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">500 TIC Tokens</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">1st Level Community Earnings</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">{formatCurrency(138, language)} Daily Unilevel Potential</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">Basic Gaming Access</Text>
                  </HStack>
                </VStack>
                <Button
                  onClick={() => handleGetStartedWithPlan('starter')}
                  bg="#14c3cb"
                  color="white"
                  border="2px solid #14c3cb"
                  _hover={{
                    bg: "#0891b2",
                    borderColor: "#0891b2",
                    transform: "scale(1.02)"
                  }}
                  w="full"
                  mt={4}
                  transition="all 0.2s ease-in-out"
                >
                  Get Started with Starter Plan
                </Button>
              </VStack>
            </Box>

            {/* VIP Plan Card */}
            <Box
              bg={useColorModeValue('white', 'gray.700')}
              p={6}
              borderRadius="xl"
              boxShadow="xl" // More prominent shadow for VIP
              border="2px" // Thicker border for VIP
              borderColor="#E0B528" // Gold dust border color
              position="relative"
              transition="all 0.3s ease-in-out"
              cursor="pointer"
              _hover={{
                transform: 'scale(1.05)',
                bg: useColorModeValue('#fcf6e4', 'gray.600'),
                boxShadow: '2xl',
                borderColor: '#c9a224'
              }}
            >
              <Box
                position="absolute"
                top="-1px" // Adjust to align with border
                left="50%"
                transform="translateX(-50%) translateY(-50%)"
                bg={useColorModeValue('yellow.400', 'yellow.500')}
                color={useColorModeValue('black', 'gray.800')}
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                <Icon as={FaFire} mr={1} /> MOST POPULAR
              </Box>
              <VStack spacing={4} align="start" mt={4}> {/* Added mt to account for badge */}
                <Heading as="h3" size="md" color="#E0B528">
                  VIP Plan
                </Heading>
                <HStack align="baseline">
                  <Text fontSize="3xl" fontWeight="bold" color="black">
                    {formatCurrency(138, language)}
                  </Text>
                  <Text fontSize="sm" color="black">
                    / one-time
                  </Text>
                </HStack>
                <Text fontSize="sm" color="black">
                  Premium experience with enhanced earning potential and exclusive benefits.
                </Text>
                <VStack spacing={2} align="start" w="full">
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">6900 TIC Tokens</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">10% Monthly Income</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">1st - 10th Level Community Earnings</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">11th - 15th Level Community Earnings (Extended)</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm" color="black">{formatCurrency(1380, language)} Daily Unilevel Potential</Text>
                  </HStack>
                </VStack>
                <Button
                  onClick={() => handleGetStartedWithPlan('vip')}
                  bg={useColorModeValue('yellow.400', 'yellow.500')}
                  color={useColorModeValue('black', 'gray.800')}
                  _hover={{ bg: useColorModeValue('yellow.500', 'yellow.600')}}
                  w="full"
                  mt={4}
                >
                  Get Started with VIP Plan
                </Button>
              </VStack>
            </Box>
          </SimpleGrid>
        </Box>
        
        {/* Compare Plans Table Section */}
        <Box pt={10} pb={8}>
          <Heading as="h2" size="xl" fontWeight="bold" mb={8} textAlign="center" color="black">
            Compare Our Plans
          </Heading>
          <TableContainer bg={useColorModeValue('white', 'gray.700')} borderRadius="xl" boxShadow="lg" p={4}>
            <Table variant="simple" size="md">
              <Thead>
                <Tr>
                  <Th fontSize="sm" color="black">FEATURE</Th>
                  <Th textAlign="center" fontSize="sm" color="black">STARTER PLAN</Th>
                  <Th textAlign="center" fontSize="sm" color="black">
                    VIP PLAN <ChakraBadge ml={2} colorScheme="orange" variant="solid" fontSize="xs">MOST POPULAR</ChakraBadge>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {[
                  { feature: 'Price', starter: formatCurrency(10, language), vip: formatCurrency(138, language) },
                  { feature: 'TIC Tokens', starter: '500', vip: '6900' },
                  { feature: 'Community Earnings', starter: '1st Level', vip: '1st - 15th Level' },
                  { feature: 'Daily Unilevel Potential', starter: `${formatCurrency(138, language)} Potential`, vip: `${formatCurrency(1380, language)} Potential` },
                  { feature: 'Gaming Access', starter: 'Basic', vip: 'Premium (All Titles)' },
                  { feature: 'Support', starter: 'Standard', vip: 'Exclusive VIP Channel' },
                  { feature: 'GIC Token Access', starter: false, vip: true },
                  { feature: 'Early Access to New Features', starter: false, vip: true },
                  { feature: 'Tournament Entry', starter: 'Select', vip: 'All' },
                  { feature: 'Monthly GIC Airdrop', starter: false, vip: true },
                ].map((item, index) => (
                  <Tr
                    key={index}
                    _hover={{
                      bg: useColorModeValue('gray.200', 'gray.600'),
                      transform: 'scale(1.01)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    transition="all 0.2s ease-in-out"
                    cursor="pointer"
                  >
                    <Td fontWeight="medium" color="black">{item.feature}</Td>
                    <Td textAlign="center" color="black">
                      {typeof item.starter === 'boolean' ? (
                        item.starter ? <Icon as={FaCheckCircle} color="green.500" boxSize={5} /> : <Icon as={FaTimesCircle} color="red.500" boxSize={5} />
                      ) : (
                        item.starter
                      )}
                    </Td>
                    <Td textAlign="center" color="black">
                      {typeof item.vip === 'boolean' ? (
                        item.vip ? <Icon as={FaCheckCircle} color="green.500" boxSize={5} /> : <Icon as={FaTimesCircle} color="red.500" boxSize={5} />
                      ) : (
                        item.vip
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Unlimited Plan Activation Section */}
        <Box pt={10} pb={8}>
          <VStack spacing={8} textAlign="center" maxW="4xl" mx="auto">
            <Heading as="h2" size="xl" fontWeight="bold" color="black">
              Unlimited Plan Activation
            </Heading>
            <Text fontSize="lg" color="blue.600" fontWeight="medium">
              More Plans, More Power — Stack and Scale Freely
            </Text>
            <Text fontSize="md" color="black" maxW="3xl">
              At TIC GLOBAL Ltd, we believe in giving you full freedom over your income potential. That's why we allow you to:
            </Text>

            <VStack spacing={4} align="start" maxW="2xl">
              <HStack align="start">
                <Icon as={FaCheckCircle} color="green.500" mt={1} />
                <Text color="black">Activate multiple plans at any time</Text>
              </HStack>
              <HStack align="start">
                <Icon as={FaCheckCircle} color="green.500" mt={1} />
                <Text color="black">Combine Starter and VIP Packages freely</Text>
              </HStack>
              <HStack align="start">
                <Icon as={FaCheckCircle} color="green.500" mt={1} />
                <Text color="black">Scale up your staking, bonuses, and rewards without limits</Text>
              </HStack>
            </VStack>

            <Text fontSize="md" color="black" maxW="3xl">
              Whether you're growing your daily returns, boosting team commissions, or building for long-term passive income—there's no cap on how many plans you can own.
            </Text>

            <Text fontSize="lg" fontWeight="bold" color="black">
              No restrictions. No limits. Just growth on your terms.
            </Text>
          </VStack>
        </Box>

        {/* Benefits Section */}
        <Box pt={8} pb={8}>
          <Heading as="h2" size="lg" fontWeight="bold" mb={10} textAlign="center" color="black">
            The Benefits of Being Part of a Borderless Crypto-Gaming Community
          </Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={{ base: 6, md: 8 }} justifyContent="center">
            {[
              { icon: FaHeadset, text: "24/7 Real Human Support", description: "We’re always here for you—whether you need help setting up your wallet, understanding packages, or troubleshooting your account." },
              { icon: FaBrain, text: "Smart, Simplified Platform", description: "No tech background needed. Just log in, play, stake, and grow. We’ve made the crypto experience smooth and stress-free." },
              { icon: FaRocket, text: "Earn & Scale at Your Own Pace", description: `Start with as little as ${formatCurrency(10, language)}, or go VIP and unlock bigger bonuses. Either way, you grow your digital income on your terms.` },
              { icon: FaUsersCog, text: "Community-Driven Affiliate System", description: "Our 15-level bonus structure rewards you for every connection. Help others win and you win too. No pressure—just potential." },
              { icon: FaMedal, text: "Backed by a Vision, Built for Real People", description: "TIC GLOBAL isn’t just hype—it’s a movement. Our system is built by traders, players, and crypto fans for everyday earners around the world." },
            ].map((benefit, index) => (
              <VStack key={index} spacing={3} textAlign="center" p={4} bg={useColorModeValue('white', 'gray.700')} borderRadius="lg" boxShadow="md">
                <Circle size="60px" bg={useColorModeValue('blue.100', 'blue.800')} color={useColorModeValue('blue.500', 'blue.300')}>
                  <Icon as={benefit.icon} boxSize="30px" />
                </Circle>
                <Text fontWeight="semibold" color="black">{benefit.text}</Text>

              </VStack>
            ))}
          </SimpleGrid>
        </Box>

      </VStack>

      {/* Verification Steps Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="black">
                Verification steps
              </Text>
              <Text fontSize="sm" color="black" fontWeight="normal">
                This will take about 10 minutes
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">

              {/* Step 1: Confirm email and phone number */}
              <Box>
                <HStack spacing={3} mb={3}>
                  <Circle size="24px" bg="blue.500" color="white" fontSize="sm" fontWeight="bold">
                    1
                  </Circle>
                  <Text fontWeight="semibold" color="black">
                    Confirm email and phone number
                  </Text>
                </HStack>
                <Text fontSize="sm" color="black" mb={3} ml={9}>
                  Features and Limits
                </Text>
                <List spacing={1} ml={9}>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Deposits up to 2 000 USD within 30 days
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Global and local payment methods
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Withdrawals
                    </Text>
                  </ListItem>
                </List>
              </Box>

              {/* Step 2: Add profile information */}
              <Box>
                <HStack spacing={3} mb={3}>
                  <Circle size="24px" bg="gray.300" color="gray.600" fontSize="sm" fontWeight="bold">
                    2
                  </Circle>
                  <Text fontWeight="semibold" color="black">
                    Add profile information
                  </Text>
                </HStack>
                <Text fontSize="sm" color="black" mb={3} ml={9}>
                  Features and Limits
                </Text>
                <List spacing={1} ml={9}>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Enhanced account security
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Personalized experience
                    </Text>
                  </ListItem>
                </List>
              </Box>

              {/* Step 3: Verify your identity */}
              <Box>
                <HStack spacing={3} mb={3}>
                  <Circle size="24px" bg="gray.300" color="gray.600" fontSize="sm" fontWeight="bold">
                    3
                  </Circle>
                  <Text fontWeight="semibold" color="black">
                    Verify your identity
                  </Text>
                </HStack>
                <Text fontSize="sm" color="black" mb={3} ml={9}>
                  Features and Limits
                </Text>
                <List spacing={1} ml={9}>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Deposits up to 10 000 USD
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Enhanced security features
                    </Text>
                  </ListItem>
                </List>
              </Box>

              {/* Step 4: Verify residential address */}
              <Box>
                <HStack spacing={3} mb={3}>
                  <Circle size="24px" bg="gray.300" color="gray.600" fontSize="sm" fontWeight="bold">
                    4
                  </Circle>
                  <Text fontWeight="semibold" color="black">
                    Verify residential address
                  </Text>
                </HStack>
                <Text fontSize="sm" color="black" mb={3} ml={9}>
                  Features and Limits
                </Text>
                <List spacing={1} ml={9}>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Unlimited deposits
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Global and local payment methods
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Trading
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheckCircle} color="green.500" />
                    <Text as="span" fontSize="sm" color="black">
                      Withdrawals
                    </Text>
                  </ListItem>
                </List>
              </Box>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              bg="#14c3cb"
              color="black"
              _hover={{ bg: '#0891b2' }}
              fontWeight="bold"
              onClick={() => {
                onClose();
                onProfileOpen();
              }}
            >
              Start now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile Completion Modal */}
      <Modal isOpen={isProfileOpen} onClose={onProfileClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="black">
                Verify your contact details
              </Text>
              <Text fontSize="sm" color="black" fontWeight="normal">
                This process takes less than 5 minutes
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">

              {/* Step 1: Confirm email address */}
              <HStack spacing={4} align="start">
                <Box mt={1}>
                  {verificationStatus.emailVerified ? (
                    <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                  ) : (
                    <Icon as={FaEnvelope} color="gray.500" boxSize={6} />
                  )}
                </Box>
                <VStack align="start" spacing={1} flex="1">
                  <HStack spacing={2}>
                    <Text fontWeight="semibold" color="black">
                      1. Confirm email address
                    </Text>
                    {verificationStatus.emailVerified && (
                      <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    )}
                  </HStack>
                  <Text fontSize="sm" color={verificationStatus.emailVerified ? "green.500" : "gray.500"}>
                    {verificationStatus.emailVerified
                      ? "✓ Email verified"
                      : (isEmailLoading ? "Loading email..." : (userEmail ? maskEmail(userEmail) : "Email not found"))
                    }
                  </Text>
                </VStack>
              </HStack>

              {/* Step 2: Add profile information */}
              <HStack spacing={4} align="start">
                <Box mt={1}>
                  {verificationStatus.profileCompleted ? (
                    <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                  ) : (
                    <Icon as={FaUser} color="gray.500" boxSize={6} />
                  )}
                </Box>
                <VStack align="start" spacing={1} flex="1">
                  <HStack spacing={2}>
                    <Text fontWeight="semibold" color="black">
                      2. Add profile information
                    </Text>
                    {verificationStatus.profileCompleted && (
                      <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    )}
                  </HStack>
                  <Text fontSize="sm" color={verificationStatus.profileCompleted ? "green.500" : "gray.500"}>
                    {verificationStatus.profileCompleted
                      ? "✓ Profile completed"
                      : "Get a more tailored experience"
                    }
                  </Text>
                </VStack>
              </HStack>

              {/* Step 3: Verify identity */}
              <HStack
                spacing={4}
                align="start"
                cursor={!verificationStatus.identityVerified ? "pointer" : "default"}
                onClick={!verificationStatus.identityVerified ? onIdentityVerifyOpen : undefined}
                _hover={!verificationStatus.identityVerified ? { bg: "gray.50" } : {}}
                p={2}
                borderRadius="md"
                transition="all 0.2s"
              >
                <Box mt={1}>
                  {verificationStatus.identityVerified ? (
                    <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                  ) : (
                    <Icon as={FaIdCard} color="gray.500" boxSize={6} />
                  )}
                </Box>
                <VStack align="start" spacing={1} flex="1">
                  <HStack spacing={2}>
                    <Text fontWeight="semibold" color="black">
                      3. Verify identity
                    </Text>
                    {verificationStatus.identityVerified && (
                      <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    )}
                  </HStack>
                  <Text fontSize="sm" color={verificationStatus.identityVerified ? "green.500" : "gray.500"}>
                    {verificationStatus.identityVerified
                      ? "✓ Identity verified"
                      : "Upload your ID for account security"
                    }
                  </Text>
                </VStack>
              </HStack>

            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="space-between">
            <Button
              variant="ghost"
              color="gray.600"
              onClick={onProfileClose}
            >
              Do it later
            </Button>
            <Button
              bg="#14c3cb"
              color="black"
              _hover={{ bg: '#0891b2' }}
              fontWeight="bold"
              isLoading={isLoading}
              loadingText="Sending..."
              onClick={handleGetStarted}
            >
              Get started now
            </Button>
          </ModalFooter>

          {/* Security notice */}
          <Box textAlign="center" pb={4}>
            <HStack justify="center" spacing={2}>
              <Icon as={FaLock} color="gray.400" boxSize={3} />
              <Text fontSize="xs" color="gray.500">
                All data is encrypted for security
              </Text>
            </HStack>
          </Box>
        </ModalContent>
      </Modal>

      {/* Email Verification Modal */}
      <Modal isOpen={isEmailVerifyOpen} onClose={onEmailVerifyClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW="md" mx={4}>
          <ModalHeader>
            <VStack spacing={2} align="start">
              <Heading as="h3" size="lg" color="black">
                {t('dashboard.verifyEmail')}
              </Heading>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                {isLoading ? "Sending verification code..." : "We've sent you email with verification code. It's valid for 30 minutes"}
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={3} align="center">
                <Icon as={FaEnvelope} color="gray.500" boxSize={5} />
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color="gray.600">
                    Enter the code we sent to:
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="black">
                    {maskEmail(userEmail)}
                  </Text>
                </VStack>
              </HStack>

              <VStack spacing={4} align="stretch">
                <HStack spacing={2} justify="center">
                  <PinInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    size="lg"
                    placeholder=""
                  >
                    <PinInputField
                      border="2px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: "#14c3cb" }}
                      _hover={{ borderColor: "gray.400" }}
                    />
                    <PinInputField
                      border="2px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: "#14c3cb" }}
                      _hover={{ borderColor: "gray.400" }}
                    />
                    <PinInputField
                      border="2px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: "#14c3cb" }}
                      _hover={{ borderColor: "gray.400" }}
                    />
                    <PinInputField
                      border="2px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: "#14c3cb" }}
                      _hover={{ borderColor: "gray.400" }}
                    />
                    <PinInputField
                      border="2px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: "#14c3cb" }}
                      _hover={{ borderColor: "gray.400" }}
                    />
                    <PinInputField
                      border="2px solid"
                      borderColor="gray.300"
                      _focus={{ borderColor: "#14c3cb" }}
                      _hover={{ borderColor: "gray.400" }}
                    />
                  </PinInput>
                </HStack>

                <VStack spacing={2}>
                  <Button
                    variant="link"
                    color="#14c3cb"
                    fontSize="sm"
                    onClick={handleResendCode}
                    isLoading={isLoading}
                    loadingText="Sending..."
                  >
                    Get a new code
                  </Button>
                  <Button
                    variant="link"
                    color="#14c3cb"
                    fontSize="sm"
                    onClick={() => {
                      toast({
                        title: "Check your email",
                        description: "Please check your spam folder if you don't see the email in your inbox.",
                        status: "info",
                        duration: 5000,
                        isClosable: true,
                      });
                    }}
                  >
                    I didn't receive a code
                  </Button>
                </VStack>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={6}>
            <VStack spacing={4} w="full">
              <Button
                bg="#14c3cb"
                color="black"
                _hover={{ bg: '#0891b2' }}
                fontWeight="bold"
                w="full"
                isLoading={isLoading}
                loadingText="Verifying..."
                onClick={handleVerifyCode}
                isDisabled={verificationCode.length !== 6}
              >
                Verify Email
              </Button>
              <HStack spacing={1} justify="center">
                <Icon as={FaLock} color="gray.400" boxSize={3} />
                <Text fontSize="xs" color="gray.500">
                  All data is encrypted for security
                </Text>
              </HStack>
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Phone Verification Modal */}
      <Modal isOpen={isPhoneVerifyOpen} onClose={onPhoneVerifyClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW="md" mx={4}>
          <ModalHeader>
            <VStack spacing={2} align="start">
              <Heading as="h3" size="lg" color="black">
                Confirm your phone number
              </Heading>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                We'll send you a verification code to secure your account
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={3} align="center">
                <Icon as={FaPhone} color="gray.500" boxSize={5} />
                <Text fontSize="sm" color="gray.600">
                  Enter your phone number:
                </Text>
              </HStack>

              <HStack spacing={2}>
                <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} width="120px">
                  <option value="+63">🇵🇭 +63</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+60">🇲🇾 +60</option>
                  <option value="+66">🇹🇭 +66</option>
                  <option value="+84">🇻🇳 +84</option>
                  <option value="+62">🇮🇩 +62</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+82">🇰🇷 +82</option>
                </Select>
                <Input
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  flex="1"
                />
              </HStack>

              {phoneNumber && (
                <VStack spacing={4} align="stretch">
                  <Button
                    bg="#14c3cb"
                    color="black"
                    _hover={{ bg: '#0891b2' }}
                    fontWeight="bold"
                    onClick={handleSendPhoneVerification}
                    isLoading={isPhoneLoading}
                    loadingText="Sending..."
                  >
                    Send Verification Code
                  </Button>

                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Enter the 6-digit code we'll send to {countryCode}{phoneNumber}
                  </Text>

                  <HStack spacing={2} justify="center">
                    <PinInput
                      value={phoneVerificationCode}
                      onChange={setPhoneVerificationCode}
                      size="lg"
                      placeholder=""
                    >
                      <PinInputField
                        border="2px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: "#14c3cb" }}
                        _hover={{ borderColor: "gray.400" }}
                      />
                      <PinInputField
                        border="2px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: "#14c3cb" }}
                        _hover={{ borderColor: "gray.400" }}
                      />
                      <PinInputField
                        border="2px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: "#14c3cb" }}
                        _hover={{ borderColor: "gray.400" }}
                      />
                      <PinInputField
                        border="2px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: "#14c3cb" }}
                        _hover={{ borderColor: "gray.400" }}
                      />
                      <PinInputField
                        border="2px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: "#14c3cb" }}
                        _hover={{ borderColor: "gray.400" }}
                      />
                      <PinInputField
                        border="2px solid"
                        borderColor="gray.300"
                        _focus={{ borderColor: "#14c3cb" }}
                        _hover={{ borderColor: "gray.400" }}
                      />
                    </PinInput>
                  </HStack>

                  <Button
                    bg="#14c3cb"
                    color="black"
                    _hover={{ bg: '#0891b2' }}
                    fontWeight="bold"
                    onClick={handleVerifyPhoneCode}
                    isLoading={isPhoneLoading}
                    loadingText="Verifying..."
                    isDisabled={phoneVerificationCode.length !== 6}
                  >
                    Verify Phone Number
                  </Button>
                </VStack>
              )}

              {/* Hidden reCAPTCHA container for Firebase */}
              <Box id="recaptcha-container" style={{ display: 'none' }}></Box>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={6}>
            <HStack spacing={1} justify="center">
              <Icon as={FaLock} color="gray.400" boxSize={3} />
              <Text fontSize="xs" color="gray.500">
                All data is encrypted for security
              </Text>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile Completion Form Modal */}
      <Modal isOpen={isProfileFormOpen} onClose={onProfileFormClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent maxW="lg" mx={4}>
          <ModalHeader>
            <VStack spacing={2} align="start">
              <HStack spacing={2}>
                <Text fontSize="sm" color="gray.500">1/18</Text>
              </HStack>
              <Heading as="h3" size="lg" color="black">
                Add profile information
              </Heading>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">

              {/* First Name */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="black" fontWeight="medium">First Name</FormLabel>
                <Input
                  placeholder="Enter your first name"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>Your first name as shown on your ID</Text>
              </FormControl>

              {/* Last Name */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="black" fontWeight="medium">Last Name</FormLabel>
                <Input
                  placeholder="Enter your last name"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>Your last name as shown on your ID</Text>
              </FormControl>

              {/* Date of Birth */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="black" fontWeight="medium">Date of birth</FormLabel>
                <HStack spacing={2}>
                  <Select
                    placeholder="Day"
                    value={profileForm.dateOfBirth.split('-')[2] || ''}
                    onChange={(e) => {
                      const day = e.target.value;
                      const [year, month] = profileForm.dateOfBirth.split('-');
                      setProfileForm(prev => ({ ...prev, dateOfBirth: `${year || ''}-${month || ''}-${day.padStart(2, '0')}` }));
                    }}
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Month"
                    value={profileForm.dateOfBirth.split('-')[1] || ''}
                    onChange={(e) => {
                      const month = e.target.value;
                      const [year, , day] = profileForm.dateOfBirth.split('-');
                      setProfileForm(prev => ({ ...prev, dateOfBirth: `${year || ''}-${month.padStart(2, '0')}-${day || ''}` }));
                    }}
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Year"
                    value={profileForm.dateOfBirth.split('-')[0] || ''}
                    onChange={(e) => {
                      const year = e.target.value;
                      const [, month, day] = profileForm.dateOfBirth.split('-');
                      setProfileForm(prev => ({ ...prev, dateOfBirth: `${year}-${month || ''}-${day || ''}` }));
                    }}
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                  >
                    {Array.from({ length: 80 }, (_, i) => {
                      const year = new Date().getFullYear() - 18 - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </Select>
                </HStack>
              </FormControl>

              {/* Country of Birth */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="black" fontWeight="medium">Country of birth</FormLabel>
                <Select
                  value={profileForm.countryOfBirth}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, countryOfBirth: e.target.value }))}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                >
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="South Korea">🇰🇷 South Korea</option>
                  <option value="China">🇨🇳 China</option>
                  <option value="India">🇮🇳 India</option>
                </Select>
              </FormControl>

              {/* Gender */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="black" fontWeight="medium">Your gender</FormLabel>
                <HStack spacing={4}>
                  <Button
                    variant={profileForm.gender === 'Female' ? 'solid' : 'outline'}
                    bg={profileForm.gender === 'Female' ? '#14c3cb' : 'transparent'}
                    color={profileForm.gender === 'Female' ? 'white' : 'black'}
                    borderColor="#14c3cb"
                    _hover={{ bg: profileForm.gender === 'Female' ? '#0891b2' : '#f0fdfe' }}
                    onClick={() => setProfileForm(prev => ({ ...prev, gender: 'Female' }))}
                    size="sm"
                    borderRadius="full"
                  >
                    Female
                  </Button>
                  <Button
                    variant={profileForm.gender === 'Male' ? 'solid' : 'outline'}
                    bg={profileForm.gender === 'Male' ? '#14c3cb' : 'transparent'}
                    color={profileForm.gender === 'Male' ? 'white' : 'black'}
                    borderColor="#14c3cb"
                    _hover={{ bg: profileForm.gender === 'Male' ? '#0891b2' : '#f0fdfe' }}
                    onClick={() => setProfileForm(prev => ({ ...prev, gender: 'Male' }))}
                    size="sm"
                    borderRadius="full"
                  >
                    Male
                  </Button>
                  <Button
                    variant={profileForm.gender === 'Other' ? 'solid' : 'outline'}
                    bg={profileForm.gender === 'Other' ? '#14c3cb' : 'transparent'}
                    color={profileForm.gender === 'Other' ? 'white' : 'black'}
                    borderColor="#14c3cb"
                    _hover={{ bg: profileForm.gender === 'Other' ? '#0891b2' : '#f0fdfe' }}
                    onClick={() => setProfileForm(prev => ({ ...prev, gender: 'Other' }))}
                    size="sm"
                    borderRadius="full"
                  >
                    Other
                  </Button>
                </HStack>
              </FormControl>

              {/* Residential Address */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="black" fontWeight="medium">Your residential address</FormLabel>
                <Input
                  placeholder="City, Street, house (apartment)"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>You will be asked to verify your address later</Text>
              </FormControl>

              {/* Action Buttons */}
              <HStack spacing={3} justify="flex-end" mt={6}>
                <Button
                  variant="ghost"
                  color="gray.600"
                  onClick={onProfileFormClose}
                >
                  Do it later
                </Button>
                <Button
                  bg="#E0B528"
                  color="black"
                  _hover={{ bg: '#c9a224' }}
                  fontWeight="bold"
                  onClick={handleSubmitProfile}
                  isLoading={isLoading}
                  loadingText="Completing..."
                  px={8}
                >
                  Continue
                </Button>
              </HStack>

            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={6}>
            <HStack spacing={1} justify="center">
              <Icon as={FaLock} color="gray.400" boxSize={3} />
              <Text fontSize="xs" color="gray.500">
                All data is encrypted for security
              </Text>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Identity Verification Modal */}
      <Modal isOpen={isIdentityVerifyOpen} onClose={onIdentityVerifyClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent maxW="lg" mx={4}>
          <ModalHeader>
            <HStack spacing={2} justify="space-between" align="center">
              <VStack spacing={2} align="start">
                <Heading as="h3" size="lg" color="black">
                  Document verification
                </Heading>
              </VStack>
              <ModalCloseButton position="static" />
            </HStack>
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">

              {/* Document Icon and Description */}
              <VStack spacing={4} align="center" py={4}>
                <Box position="relative">
                  <Box
                    w="120px"
                    h="80px"
                    bg="gray.100"
                    borderRadius="lg"
                    border="2px dashed"
                    borderColor="gray.300"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                  >
                    <Icon as={FaUser} color="gray.400" boxSize={8} />
                    <Box
                      position="absolute"
                      right="-10px"
                      bottom="-10px"
                      bg="yellow.400"
                      borderRadius="full"
                      p={2}
                    >
                      <Icon as={FaIdCard} color="black" boxSize={4} />
                    </Box>
                  </Box>
                </Box>

                <Text fontSize="sm" color="black" textAlign="center" maxW="md">
                  On the next screen we will ask you to upload one or two documents that can prove your name and country / region of residence. Your current place of residence is
                </Text>

                <HStack spacing={2}>
                  <Text fontSize="sm">{getCountryFlag(identityForm.country)}</Text>
                  <Text fontSize="sm" color="black" fontWeight="medium">
                    {identityForm.country}
                  </Text>
                </HStack>
              </VStack>

              {/* Name Verification Section */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="md" fontWeight="semibold" color="black">
                  Check your name:
                </Text>

                <HStack spacing={2} align="center">
                  <Input
                    value={identityForm.fullName}
                    onChange={(e) => setIdentityForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                    flex="1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    color="#14c3cb"
                    _hover={{ bg: "#f0fdfe" }}
                    rightIcon={<Icon as={FaUser} />}
                  >
                    Edit
                  </Button>
                </HStack>
              </VStack>

              {/* Upload Button */}
              <Button
                bg="#E0B528"
                color="black"
                _hover={{ bg: '#c9a224' }}
                fontWeight="bold"
                onClick={() => {
                  if (!identityForm.fullName.trim()) {
                    toast({
                      title: "Name is required",
                      description: "Please enter your full name as shown on your ID.",
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    return;
                  }
                  onDataAgreementOpen();
                }}
                size="lg"
                mt={4}
              >
                Upload documents
              </Button>

            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Data Use Agreement Modal */}
      <Modal isOpen={isDataAgreementOpen} onClose={onDataAgreementClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent maxW="md" mx={4}>
          <ModalHeader>
            <HStack spacing={2} justify="space-between" align="center">
              <Heading as="h3" size="lg" color="black">
                Data use agreement
              </Heading>
              <ModalCloseButton position="static" />
            </HStack>
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">

              <Text fontSize="sm" color="black" lineHeight="1.6">
                To continue, we need your consent to process your personal data, including biometrics.
              </Text>

              <Checkbox
                isChecked={dataConsentChecked}
                onChange={(e) => setDataConsentChecked(e.target.checked)}
                colorScheme="cyan"
                size="sm"
              >
                <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                  I confirm that I have read the{' '}
                  <Link color="#14c3cb" textDecoration="underline" href="/privacy-notice" target="_blank">
                    Privacy Notice
                  </Link>
                  {' '}and give my consent to the processing of my personal data, including biometrics, as described in this{' '}
                  <Link color="#14c3cb" textDecoration="underline" href="/notification-processing" target="_blank">
                    Notification to Processing of Personal Data
                  </Link>
                  .
                </Text>
              </Checkbox>

            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={6}>
            <Button
              bg="#14c3cb"
              color="black"
              _hover={{ bg: '#0891b2' }}
              fontWeight="bold"
              onClick={handleDataAgreementContinue}
              isLoading={isIdentityLoading}
              loadingText="Submitting..."
              isDisabled={!dataConsentChecked}
              w="full"
            >
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Document Upload Modal */}
      <Modal isOpen={isDocumentUploadOpen} onClose={onDocumentUploadClose} isCentered size="xl">
        <ModalOverlay />
        <ModalContent maxW="2xl" mx={4}>
          <ModalHeader>
            <HStack spacing={2} justify="space-between" align="center">
              <Heading as="h3" size="lg" color="black">
                Verify identity
              </Heading>
              <ModalCloseButton position="static" />
            </HStack>
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">

              {/* Step 1: Country Selection */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="md" fontWeight="semibold" color="black">
                  1. Select the country / region that issued your identity document
                </Text>
                <Select
                  value={documentForm.issuingCountry}
                  onChange={(e) => handleDocumentFormChange('issuingCountry', e.target.value)}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: "#14c3cb", boxShadow: "0 0 0 1px #14c3cb" }}
                >
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="South Korea">🇰🇷 South Korea</option>
                  <option value="China">🇨🇳 China</option>
                  <option value="India">🇮🇳 India</option>
                </Select>
              </VStack>

              {/* Step 2: Document Type Selection */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="md" fontWeight="semibold" color="black">
                  2. Select your identity document
                </Text>
                <VStack spacing={2} align="stretch">
                  {[
                    { value: 'passport', label: 'Passport' },
                    { value: 'drivers_license', label: "Driver's license (front)" },
                    { value: 'unified_id', label: 'Unified Multi-Purpose ID (front side)' },
                    { value: 'national_id', label: 'National ID (front and back)' },
                    { value: 'postal_id', label: 'Postal identity card (front)' },
                    { value: 'taxpayer_id', label: 'Taxpayer / BIR card (front and back)' },
                    { value: 'voters_id', label: "Voter's ID (front and back)" }
                  ].map((doc) => (
                    <HStack
                      key={doc.value}
                      spacing={3}
                      p={3}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={documentForm.documentType === doc.value ? "#14c3cb" : "gray.200"}
                      bg={documentForm.documentType === doc.value ? "#f0fdfe" : "white"}
                      cursor="pointer"
                      onClick={() => handleDocumentFormChange('documentType', doc.value)}
                      _hover={{ borderColor: "#14c3cb", bg: "#f0fdfe" }}
                      transition="all 0.2s"
                    >
                      <Box
                        w={4}
                        h={4}
                        borderRadius="full"
                        border="2px solid"
                        borderColor={documentForm.documentType === doc.value ? "#14c3cb" : "gray.300"}
                        bg={documentForm.documentType === doc.value ? "#14c3cb" : "white"}
                        position="relative"
                      >
                        {documentForm.documentType === doc.value && (
                          <Box
                            w={2}
                            h={2}
                            borderRadius="full"
                            bg="white"
                            position="absolute"
                            top="50%"
                            left="50%"
                            transform="translate(-50%, -50%)"
                          />
                        )}
                      </Box>
                      <Text fontSize="sm" color="black">{doc.label}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>

              {/* Step 3: Photo Guidelines */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="md" fontWeight="semibold" color="black">
                  3. Take photo of ID document
                </Text>

                <Box bg="blue.50" p={4} borderRadius="md" border="1px solid" borderColor="blue.200">
                  <HStack spacing={2} mb={2}>
                    <Icon as={FaInfoCircle} color="blue.500" />
                    <Text fontSize="sm" fontWeight="medium" color="blue.700">
                      Make sure the document shows your photo, full name, date of birth and date of issue.
                    </Text>
                  </HStack>
                </Box>

                <SimpleGrid columns={2} spacing={4}>
                  <VStack spacing={2}>
                    <Box
                      w="full"
                      h="120px"
                      bg="gray.100"
                      borderRadius="md"
                      border="2px solid"
                      borderColor="green.400"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                    >
                      <Icon as={FaIdCard} color="gray.400" boxSize={8} />
                      <Box
                        position="absolute"
                        bottom={2}
                        right={2}
                        bg="green.400"
                        borderRadius="full"
                        p={1}
                      >
                        <Icon as={FaCheckCircle} color="white" boxSize={3} />
                      </Box>
                    </Box>
                    <Text fontSize="xs" fontWeight="bold" color="green.600">Do</Text>
                    <VStack spacing={1} align="start">
                      <Text fontSize="xs" color="black">• Photo is clear and sharp</Text>
                      <Text fontSize="xs" color="black">• Details can be read clearly</Text>
                      <Text fontSize="xs" color="black">• High or good photo quality</Text>
                      <Text fontSize="xs" color="black">• All 4 corners of the document are visible</Text>
                    </VStack>
                  </VStack>

                  <VStack spacing={2}>
                    <Box
                      w="full"
                      h="120px"
                      bg="gray.100"
                      borderRadius="md"
                      border="2px solid"
                      borderColor="red.400"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      filter="blur(1px)"
                    >
                      <Icon as={FaIdCard} color="gray.400" boxSize={8} />
                      <Box
                        position="absolute"
                        bottom={2}
                        right={2}
                        bg="red.400"
                        borderRadius="full"
                        p={1}
                      >
                        <Icon as={FaTimes} color="white" boxSize={3} />
                      </Box>
                    </Box>
                    <Text fontSize="xs" fontWeight="bold" color="red.600">Don't</Text>
                    <VStack spacing={1} align="start">
                      <Text fontSize="xs" color="black">• Photo is blurry and not focused</Text>
                      <Text fontSize="xs" color="black">• Details cannot be read clearly</Text>
                      <Text fontSize="xs" color="black">• Poor photo quality (too dark or bright)</Text>
                      <Text fontSize="xs" color="black">• Not all corners are visible</Text>
                    </VStack>
                  </VStack>
                </SimpleGrid>

                {/* Upload Section */}
                <VStack spacing={4} mt={4}>
                  <Button
                    variant="outline"
                    borderColor="#14c3cb"
                    color="#14c3cb"
                    _hover={{ bg: "#f0fdfe" }}
                    leftIcon={<Icon as={FaCamera} />}
                    size="lg"
                    w="full"
                  >
                    Upload documents with your phone
                  </Button>

                  <Box
                    w="full"
                    h="120px"
                    border="2px dashed"
                    borderColor="gray.300"
                    borderRadius="md"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{ borderColor: "#14c3cb", bg: "#f0fdfe" }}
                    transition="all 0.2s"
                    position="relative"
                  >
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      position="absolute"
                      top={0}
                      left={0}
                      w="full"
                      h="full"
                      opacity={0}
                      cursor="pointer"
                    />
                    {documentForm.uploadedFile ? (
                      <VStack spacing={2}>
                        <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                        <Text fontSize="sm" color="green.600" fontWeight="medium">
                          {documentForm.uploadedFile.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Click to change file
                        </Text>
                      </VStack>
                    ) : (
                      <VStack spacing={2}>
                        <Icon as={FaCloudUploadAlt} color="gray.400" boxSize={6} />
                        <Text fontSize="sm" color="gray.600">Upload document</Text>
                        <Text fontSize="xs" color="gray.500">
                          JPEG, PNG, WebP (max 10MB)
                        </Text>
                      </VStack>
                    )}
                  </Box>
                </VStack>
              </VStack>

            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={6}>
            <Button
              bg="#E0B528"
              color="black"
              _hover={{ bg: '#c9a224' }}
              fontWeight="bold"
              onClick={handleSubmitDocument}
              isLoading={isDocumentLoading}
              loadingText="Uploading..."
              isDisabled={!documentForm.uploadedFile}
              w="full"
              size="lg"
            >
              Submit document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Document Review Status Modal */}
      <Modal isOpen={isDocumentReviewOpen} onClose={onDocumentReviewClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent maxW="md" mx={4}>
          <ModalHeader>
            <HStack spacing={2} justify="center" align="center">
              <Icon as={FaClock} color="#E0B528" boxSize={8} />
            </HStack>
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6} align="center" textAlign="center">
              <Heading as="h3" size="lg" color="black">
                Your documents are under review
              </Heading>

              <Text fontSize="sm" color="gray.600" lineHeight="1.6" maxW="sm">
                This process usually takes from 3 to 7 minutes but might last up to 24 hours in special cases. In the meantime you are allowed to deposit up to 2 000 USD, trade and withdraw your profit
              </Text>

              <Button
                bg="#E0B528"
                color="black"
                _hover={{ bg: '#c9a224' }}
                fontWeight="bold"
                onClick={onDocumentReviewClose}
                w="full"
                size="lg"
                mt={4}
              >
                Deposit
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

    </Box>
  );
}