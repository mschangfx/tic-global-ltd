'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Spinner,
  Badge
} from '@chakra-ui/react';

interface ReferralStats {
  totalUsers: number;
  usersWithCodes: number;
  usersWithoutCodes: number;
  coveragePercentage: number;
}

interface GenerationResult {
  success: boolean;
  message: string;
  processed: number;
  created: number;
  errors: number;
  errorDetails?: string[];
}

export default function AdminReferralSetupPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const toast = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/generate-missing-referral-codes');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch referral statistics',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch referral statistics',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateMissingCodes = async () => {
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch('/api/admin/generate-missing-referral-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      setGenerationResult(data);

      if (data.success) {
        toast({
          title: 'Success',
          description: `Generated ${data.created} referral codes successfully`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Refresh stats
        await fetchStats();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate referral codes',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error generating codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate referral codes',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Box maxW="6xl" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Referral System Setup</Heading>
          <Text color="gray.600">
            Manage referral code generation for all users
          </Text>
        </Box>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <Heading size="md">Referral Code Coverage</Heading>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4}>Loading statistics...</Text>
              </Box>
            ) : stats ? (
              <VStack spacing={6}>
                <HStack spacing={8} w="full" justify="space-around">
                  <Stat textAlign="center">
                    <StatLabel>Total Users</StatLabel>
                    <StatNumber>{stats.totalUsers}</StatNumber>
                  </Stat>
                  
                  <Stat textAlign="center">
                    <StatLabel>With Referral Codes</StatLabel>
                    <StatNumber color="green.500">{stats.usersWithCodes}</StatNumber>
                  </Stat>
                  
                  <Stat textAlign="center">
                    <StatLabel>Missing Codes</StatLabel>
                    <StatNumber color="red.500">{stats.usersWithoutCodes}</StatNumber>
                  </Stat>
                  
                  <Stat textAlign="center">
                    <StatLabel>Coverage</StatLabel>
                    <StatNumber>{stats.coveragePercentage}%</StatNumber>
                  </Stat>
                </HStack>

                <Box w="full">
                  <Text mb={2} fontSize="sm" color="gray.600">
                    Coverage Progress
                  </Text>
                  <Progress 
                    value={stats.coveragePercentage} 
                    colorScheme={stats.coveragePercentage === 100 ? "green" : "blue"}
                    size="lg"
                    hasStripe
                    isAnimated
                  />
                </Box>
              </VStack>
            ) : (
              <Text>Failed to load statistics</Text>
            )}
          </CardBody>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <Heading size="md">Actions</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="semibold">Generate Missing Referral Codes</Text>
                  <Text fontSize="sm" color="gray.600">
                    Create referral codes for users who don't have them yet
                  </Text>
                </Box>
                <Button
                  colorScheme="blue"
                  onClick={generateMissingCodes}
                  isLoading={isGenerating}
                  loadingText="Generating..."
                  isDisabled={stats?.usersWithoutCodes === 0}
                >
                  Generate Codes
                </Button>
              </HStack>

              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="semibold">Refresh Statistics</Text>
                  <Text fontSize="sm" color="gray.600">
                    Update the current referral code coverage statistics
                  </Text>
                </Box>
                <Button
                  variant="outline"
                  onClick={fetchStats}
                  isLoading={isLoading}
                  loadingText="Refreshing..."
                >
                  Refresh
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Generation Results */}
        {generationResult && (
          <Card>
            <CardHeader>
              <Heading size="md">Generation Results</Heading>
            </CardHeader>
            <CardBody>
              <Alert status={generationResult.success ? "success" : "error"} mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>
                    {generationResult.success ? "Success!" : "Error!"}
                  </AlertTitle>
                  <AlertDescription>
                    {generationResult.message}
                  </AlertDescription>
                </Box>
              </Alert>

              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text>Processed:</Text>
                  <Badge colorScheme="blue">{generationResult.processed}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>Created:</Text>
                  <Badge colorScheme="green">{generationResult.created}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>Errors:</Text>
                  <Badge colorScheme="red">{generationResult.errors}</Badge>
                </HStack>

                {generationResult.errorDetails && generationResult.errorDetails.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Error Details:</Text>
                    <VStack spacing={1} align="stretch">
                      {generationResult.errorDetails.map((error, index) => (
                        <Text key={index} fontSize="sm" color="red.600">
                          {error}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}
