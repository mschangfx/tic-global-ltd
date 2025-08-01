'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  useToast,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  HStack,
  Input,
  FormControl,
  FormLabel,
  Badge
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';

export default function TestCommunityPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { data: session } = useSession();
  const toast = useToast();

  const createTestData = async () => {
    setIsLoading(true);
    try {
      const userEmail = testEmail || session?.user?.email;
      
      if (!userEmail) {
        toast({
          title: 'No User Email',
          description: 'Please log in or enter an email address',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch('/api/referral/create-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Test Data Created!',
          description: `Created ${data.data.relationshipsCreated} referrals and ${data.data.commissionsCreated} commissions`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Creation Failed',
          description: data.error || 'Failed to create test data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupTestData = async () => {
    setIsLoading(true);
    try {
      const userEmail = testEmail || session?.user?.email;
      
      if (!userEmail) {
        toast({
          title: 'No User Email',
          description: 'Please log in or enter an email address',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch(`/api/referral/create-test-data?userEmail=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Test Data Cleaned Up!',
          description: 'All test referrals and commissions removed',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Cleanup Failed',
          description: data.error || 'Failed to cleanup test data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={6} maxW="800px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Test Community Data</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page creates test referral data to demonstrate the Community tab functionality.
        </Alert>

        <Card>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Test User Email (optional - will use current user if empty)</FormLabel>
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </FormControl>
              
              <HStack spacing={4} w="full">
                <Button
                  onClick={createTestData}
                  isLoading={isLoading}
                  loadingText="Creating..."
                  colorScheme="green"
                  flex={1}
                >
                  Create Test Referrals
                </Button>
                
                <Button
                  onClick={cleanupTestData}
                  isLoading={isLoading}
                  loadingText="Cleaning..."
                  colorScheme="red"
                  flex={1}
                >
                  Cleanup Test Data
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Alert status="success">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">✅ Test Data Will Include:</Text>
            <Text>• 11 test referrals (9 Level 1, 2 Level 2)</Text>
            <Text>• Realistic join dates (spread over past 2 weeks)</Text>
            <Text>• Commission records for each referral</Text>
            <Text>• Updated earnings and referral counts</Text>
            <Text>• <strong>Bronze rank</strong> achievement (11+ referrals)</Text>
            <Text>• Dynamic rank assignments for each referral</Text>
          </VStack>
        </Alert>

        <Card>
          <CardBody>
            <VStack spacing={3}>
              <Heading size="md">Rank System Explanation:</Heading>
              <VStack align="start" spacing={2} w="full">
                <HStack>
                  <Badge colorScheme="gray">Common</Badge>
                  <Text fontSize="sm">0 referrals - Starting rank</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="green">Advance</Badge>
                  <Text fontSize="sm">1-10 referrals - Commission earnings</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="orange">Bronze</Badge>
                  <Text fontSize="sm">11+ referrals - $690/month bonus</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="gray">Silver</Badge>
                  <Text fontSize="sm">12+ referrals - $2,484/month bonus</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="yellow">Gold</Badge>
                  <Text fontSize="sm">13+ referrals - $4,830/month bonus</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="purple">Platinum</Badge>
                  <Text fontSize="sm">14+ referrals - $8,832/month bonus</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="blue">Diamond</Badge>
                  <Text fontSize="sm">15+ referrals - $14,904/month bonus</Text>
                </HStack>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack spacing={3}>
              <Heading size="md">Next Steps:</Heading>
              <Text>1. Click "Create Test Referrals" to add sample data</Text>
              <Text>2. Go to the Referrals page and click the "Community" tab</Text>
              <Text>3. View your test referral community with ranks and status</Text>
              <Text>4. Notice your rank changes to <strong>Bronze</strong> with 11 referrals</Text>
              <Text>5. Use "Cleanup Test Data" to remove test entries when done</Text>

              <HStack spacing={4} pt={4}>
                <Button
                  as="a"
                  href="/referrals"
                  colorScheme="blue"
                  target="_blank"
                >
                  View Referrals Page
                </Button>
                <Badge colorScheme="orange" p={2}>
                  Bronze Rank Demo
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
