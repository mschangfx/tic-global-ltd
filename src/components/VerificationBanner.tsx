'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Icon,
  useColorModeValue,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaEnvelope,
  FaUser,
  FaIdCard,
  FaClock,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityVerified: boolean;
  identityDocumentUploaded: boolean;
  firstName?: string;
  lastName?: string;
}

interface VerificationBannerProps {
  onVerificationUpdate?: () => void;
}

export default function VerificationBanner({ onVerificationUpdate }: VerificationBannerProps) {
  const router = useRouter();
  const { isOpen, onToggle } = useDisclosure();
  const { data: session } = useSession();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: true,
    profileCompleted: false,
    identityVerified: false,
    identityDocumentUploaded: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    loadVerificationStatus();
  }, [session?.user?.email]);

  const loadVerificationStatus = async () => {
    try {
      setIsLoading(true);

      if (!session?.user?.email) {
        setIsLoading(false);
        return;
      }

      setUserEmail(session.user.email);

      const response = await fetch(`/api/auth/verification-status?email=${encodeURIComponent(session.user.email)}`);
      const data = await response.json();

      if (response.ok) {
        setVerificationStatus(data);
        if (onVerificationUpdate) {
          onVerificationUpdate();
        }
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    let completed = 0;
    if (verificationStatus.emailVerified) completed++;
    if (verificationStatus.profileCompleted) completed++;
    if (verificationStatus.identityDocumentUploaded) completed++;
    if (verificationStatus.identityVerified) completed++;
    return (completed / 4) * 100;
  };

  // Check if fully verified
  const isFullyVerified = verificationStatus.emailVerified && 
    verificationStatus.profileCompleted && 
    verificationStatus.identityDocumentUploaded && 
    verificationStatus.identityVerified;

  // Check if verification is in progress
  const hasStartedVerification = verificationStatus.emailVerified || 
    verificationStatus.profileCompleted || 
    verificationStatus.identityDocumentUploaded;

  // Don't show banner if fully verified or still loading
  if (isLoading || isFullyVerified) {
    return null;
  }

  const getAlertStatus = () => {
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      return 'info'; // Under review
    }
    if (hasStartedVerification) {
      return 'warning'; // In progress
    }
    return 'error'; // Not started
  };

  const getAlertTitle = () => {
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      return 'Verification Under Review';
    }
    if (hasStartedVerification) {
      return 'Complete Your Verification';
    }
    return 'Account Verification Required';
  };

  const getAlertDescription = () => {
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      return 'Your documents are being reviewed by our team. This usually takes 1-2 business days.';
    }
    if (hasStartedVerification) {
      return 'You\'ve started the verification process. Complete the remaining steps to unlock all features.';
    }
    return 'Verify your account to access all features including withdrawals and higher limits.';
  };

  const getMissingSteps = () => {
    const missing = [];
    if (!verificationStatus.emailVerified) missing.push('Email verification');
    if (!verificationStatus.profileCompleted) missing.push('Profile completion');
    if (!verificationStatus.identityDocumentUploaded) missing.push('Identity document upload');
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      missing.push('Identity verification review');
    }
    return missing;
  };

  return (
    <Alert
      status={getAlertStatus()}
      variant="left-accent"
      borderRadius="lg"
      p={6}
      bg={bgColor}
      border="1px"
      borderColor={useColorModeValue('gray.200', 'gray.600')}
    >
      <AlertIcon />
      <Box flex="1">
        <AlertTitle mb={2} fontSize="lg">
          {getAlertTitle()}
        </AlertTitle>
        <AlertDescription mb={4}>
          {getAlertDescription()}
        </AlertDescription>

        {/* Progress Bar */}
        <Box mb={4}>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color={subtleTextColor}>
              Progress: {Math.round(getCompletionPercentage())}%
            </Text>
            <Button
              size="xs"
              variant="ghost"
              onClick={onToggle}
              rightIcon={isOpen ? <FaChevronUp /> : <FaChevronDown />}
            >
              {isOpen ? 'Hide' : 'Show'} Details
            </Button>
          </HStack>
          <Progress
            value={getCompletionPercentage()}
            colorScheme={getAlertStatus() === 'error' ? 'red' : getAlertStatus() === 'warning' ? 'orange' : 'blue'}
            size="sm"
            borderRadius="full"
          />
        </Box>

        {/* Detailed Steps */}
        <Collapse in={isOpen} animateOpacity>
          <VStack align="start" spacing={3} mb={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
              Verification Steps:
            </Text>
            
            {/* Email Verification */}
            <HStack spacing={3}>
              <Icon 
                as={verificationStatus.emailVerified ? FaCheckCircle : FaEnvelope} 
                color={verificationStatus.emailVerified ? 'green.500' : 'gray.400'} 
              />
              <Text fontSize="sm" flex="1">Email Verification</Text>
              <Badge colorScheme={verificationStatus.emailVerified ? 'green' : 'red'} size="sm">
                {verificationStatus.emailVerified ? 'Complete' : 'Pending'}
              </Badge>
            </HStack>

            {/* Profile Completion */}
            <HStack spacing={3}>
              <Icon 
                as={verificationStatus.profileCompleted ? FaCheckCircle : FaUser} 
                color={verificationStatus.profileCompleted ? 'green.500' : 'gray.400'} 
              />
              <Text fontSize="sm" flex="1">Profile Completion</Text>
              <Badge colorScheme={verificationStatus.profileCompleted ? 'green' : 'red'} size="sm">
                {verificationStatus.profileCompleted ? 'Complete' : 'Pending'}
              </Badge>
            </HStack>

            {/* Identity Document */}
            <HStack spacing={3}>
              <Icon 
                as={verificationStatus.identityDocumentUploaded ? FaCheckCircle : FaIdCard} 
                color={verificationStatus.identityDocumentUploaded ? 'green.500' : 'gray.400'} 
              />
              <Text fontSize="sm" flex="1">Identity Document</Text>
              <Badge colorScheme={verificationStatus.identityDocumentUploaded ? 'green' : 'red'} size="sm">
                {verificationStatus.identityDocumentUploaded ? 'Uploaded' : 'Pending'}
              </Badge>
            </HStack>

            {/* Identity Verification */}
            <HStack spacing={3}>
              <Icon 
                as={verificationStatus.identityVerified ? FaCheckCircle : FaClock} 
                color={verificationStatus.identityVerified ? 'green.500' : 'orange.400'} 
              />
              <Text fontSize="sm" flex="1">Identity Verification</Text>
              <Badge 
                colorScheme={verificationStatus.identityVerified ? 'green' : verificationStatus.identityDocumentUploaded ? 'orange' : 'red'} 
                size="sm"
              >
                {verificationStatus.identityVerified ? 'Approved' : verificationStatus.identityDocumentUploaded ? 'Under Review' : 'Pending'}
              </Badge>
            </HStack>
          </VStack>
        </Collapse>

        {/* Action Buttons */}
        <HStack spacing={3}>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => router.push('/verify-account')}
          >
            {hasStartedVerification ? 'Continue Verification' : 'Start Verification'}
          </Button>
          
          {hasStartedVerification && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadVerificationStatus}
            >
              Refresh Status
            </Button>
          )}
        </HStack>
      </Box>
    </Alert>
  );
}
