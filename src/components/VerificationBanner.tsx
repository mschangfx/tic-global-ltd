'use client';

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Progress,
  HStack,
  VStack,
  Text,
  useColorModeValue,
  Collapse,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  identityDocumentUploaded: boolean;
  identityVerified: boolean;
  identityStatus: string;
}

interface VerificationBannerProps {
  onVerificationUpdate?: () => Promise<void>;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({ onVerificationUpdate }) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: false,
    profileCompleted: false,
    identityDocumentUploaded: false,
    identityVerified: false,
    identityStatus: 'not_started',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  const loadVerificationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/verification-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Map the API response to our verification status
        const mappedStatus: VerificationStatus = {
          emailVerified: data.user?.email_verified || false,
          phoneVerified: data.user?.phone_verified || false,
          profileCompleted: data.user?.profile_completed || false,
          identityDocumentUploaded: data.user?.identity_document_uploaded || false,
          identityVerified: data.user?.identity_verification_status === 'approved',
          identityStatus: data.user?.identity_verification_status || 'not_started',
        };

        setVerificationStatus(mappedStatus);
        console.log('🔄 VerificationBanner status updated:', mappedStatus);
        console.log('🔍 Raw API data:', data.user);
        
        // Call the update callback if provided
        if (onVerificationUpdate) {
          await onVerificationUpdate();
        }
      } else {
        console.error('Failed to load verification status');
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  // Calculate progress
  const getProgress = () => {
    let completed = 0;
    const total = 4; // email, phone, profile, identity

    if (verificationStatus.emailVerified) completed++;
    if (verificationStatus.phoneVerified) completed++;
    if (verificationStatus.profileCompleted) completed++;
    if (verificationStatus.identityVerified) completed++; // Only count when actually verified

    return Math.round((completed / total) * 100);
  };

  // Check if user has started verification
  const hasStartedVerification = verificationStatus.emailVerified ||
    verificationStatus.phoneVerified ||
    verificationStatus.profileCompleted ||
    verificationStatus.identityDocumentUploaded;

  // Check if fully verified - ONLY when identity is actually approved, not just uploaded
  const isFullyVerified = verificationStatus.emailVerified &&
    verificationStatus.profileCompleted &&
    verificationStatus.identityDocumentUploaded &&
    verificationStatus.identityVerified;

  // Don't show banner if loading
  if (isLoading) {
    return null;
  }

  // Don't show banner if fully verified
  if (isFullyVerified) {
    return null;
  }

  const getAlertStatus = () => {
    if (isFullyVerified) {
      return 'success'; // Fully verified (identity approved)
    }
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      return 'warning'; // Under review (documents uploaded but not approved)
    }
    if (hasStartedVerification) {
      return 'warning'; // In progress
    }
    return 'error'; // Not started
  };

  const getAlertTitle = () => {
    if (isFullyVerified) {
      return 'Fully Verified';
    }
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      return 'Documents Under Review';
    }
    if (hasStartedVerification) {
      return 'Complete Your Verification';
    }
    return 'Complete the Verification';
  };

  const getAlertDescription = () => {
    if (isFullyVerified) {
      return 'Your account is fully verified! You now have access to all features including withdrawals and higher limits.';
    }
    if (verificationStatus.identityDocumentUploaded && !verificationStatus.identityVerified) {
      return 'Your documents are under review. This process usually takes 3-7 minutes but might last up to 24 hours.';
    }
    if (hasStartedVerification) {
      return 'You\'ve started the verification process. Complete the remaining steps to unlock all features.';
    }
    return 'Verify your account to access all features including withdrawals and higher limits.';
  };

  const handleViewStatus = () => {
    router.push('/verify-account');
  };

  const progress = getProgress();

  return (
    <Alert
      status={getAlertStatus()}
      borderRadius="lg"
      p={4}
      mb={6}
      variant="left-accent"
    >
      <AlertIcon />
      <Box flex="1">
        <HStack justify="space-between" align="start" mb={2}>
          <VStack align="start" spacing={1} flex="1">
            <AlertTitle fontSize="md" mb={0}>
              {getAlertTitle()}
            </AlertTitle>
            <AlertDescription fontSize="sm">
              {getAlertDescription()}
            </AlertDescription>
          </VStack>
          <VStack align="end" spacing={2}>
            <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('gray.600', 'gray.300')}>
              Progress: {progress}%
            </Text>
            <Button
              size="sm"
              colorScheme={getAlertStatus() === 'success' ? 'green' : getAlertStatus() === 'warning' ? 'orange' : 'blue'}
              onClick={handleViewStatus}
            >
              {getAlertStatus() === 'success' ? 'View Details' : 'View Status'}
            </Button>
          </VStack>
        </HStack>
        
        <Progress
          value={progress}
          size="sm"
          colorScheme={getAlertStatus() === 'success' ? 'green' : getAlertStatus() === 'warning' ? 'orange' : 'blue'}
          borderRadius="full"
          mb={3}
        />

        <Button
          size="xs"
          variant="ghost"
          onClick={() => setShowDetails(!showDetails)}
          rightIcon={<Icon as={showDetails ? FaChevronUp : FaChevronDown} />}
          color={useColorModeValue('gray.600', 'gray.300')}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>

        <Collapse in={showDetails}>
          <Box mt={3} pt={3}>
            <Divider mb={3} />
            <VStack align="start" spacing={2}>
              <HStack>
                <Icon 
                  as={verificationStatus.emailVerified ? FaCheckCircle : FaClock} 
                  color={verificationStatus.emailVerified ? 'green.500' : 'gray.400'} 
                />
                <Text fontSize="sm">Email Verification</Text>
                <Text fontSize="xs" color={verificationStatus.emailVerified ? 'green.500' : 'gray.500'}>
                  {verificationStatus.emailVerified ? 'Completed' : 'Pending'}
                </Text>
              </HStack>
              
              <HStack>
                <Icon 
                  as={verificationStatus.profileCompleted ? FaCheckCircle : FaClock} 
                  color={verificationStatus.profileCompleted ? 'green.500' : 'gray.400'} 
                />
                <Text fontSize="sm">Profile Completion</Text>
                <Text fontSize="xs" color={verificationStatus.profileCompleted ? 'green.500' : 'gray.500'}>
                  {verificationStatus.profileCompleted ? 'Completed' : 'Pending'}
                </Text>
              </HStack>
              
              <HStack>
                <Icon 
                  as={verificationStatus.identityDocumentUploaded ? 
                    (verificationStatus.identityVerified ? FaCheckCircle : FaClock) : 
                    FaExclamationTriangle
                  } 
                  color={verificationStatus.identityVerified ? 'green.500' : 
                    verificationStatus.identityDocumentUploaded ? 'orange.500' : 'gray.400'} 
                />
                <Text fontSize="sm">Identity Verification</Text>
                <Text fontSize="xs" color={
                  verificationStatus.identityVerified ? 'green.500' : 
                  verificationStatus.identityDocumentUploaded ? 'orange.500' : 'gray.500'
                }>
                  {verificationStatus.identityVerified ? 'Approved' : 
                   verificationStatus.identityDocumentUploaded ? 'Under Review' : 'Pending'}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Collapse>
      </Box>
    </Alert>
  );
};

export default VerificationBanner;
