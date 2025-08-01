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
  Icon,
  useColorModeValue,
  Divider,
  Flex,
  Spacer,
  Button,
  useToast,
} from '@chakra-ui/react';
import { 
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaIdCard,
  FaEdit
} from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';

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
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: true, // Always true since phone verification is removed
    profileCompleted: false,
    identityVerified: false,
    identityStatus: null,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        return;
      }

      // Fetch user profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          email,
          first_name,
          last_name,
          phone_number,
          country_of_residence,
          email_verified,
          phone_verified,
          profile_completed,
          identity_verification_status,
          identity_verification_submitted
        `)
        .eq('email', user.email)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (userData) {
        setUserProfile({
          email: userData.email || '',
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          phoneNumber: userData.phone_number || '',
          country: userData.country_of_residence || '',
        });

        setVerificationStatus({
          emailVerified: userData.email_verified || false,
          phoneVerified: userData.phone_verified || false,
          profileCompleted: userData.profile_completed || false,
          identityVerified: userData.identity_verification_status === 'approved',
          identityStatus: userData.identity_verification_submitted 
            ? userData.identity_verification_status || 'pending'
            : null,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
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
            <Heading as="h1" size="2xl" color={textColor} mb={4}>
              Profile & Verification
            </Heading>
            <Text fontSize="lg" color={subtleTextColor}>
              Manage your account information and verification status
            </Text>
          </Box>

          {/* Account Status Card */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Heading as="h2" size="lg" color={textColor} mb={6}>
                Account Status
              </Heading>
              
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
            </CardBody>
          </Card>

          {/* Verification Steps */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Heading as="h2" size="lg" color={textColor} mb={6}>
                Verification Steps
              </Heading>
              
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
                        
                        <HStack spacing={3}>
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
                        </HStack>
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
    </Box>
  );
}
