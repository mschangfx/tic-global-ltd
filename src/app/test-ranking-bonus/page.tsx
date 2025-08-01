'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  useToast,
  Alert,
  AlertIcon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Code,
  Textarea,
  FormControl,
  FormLabel,
  Input
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import RankingBonusCard from '@/components/RankingBonusCard';
import RankingMaintenanceCard from '@/components/RankingMaintenanceCard';

export default function TestRankingBonusPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const { data: session } = useSession();
  const toast = useToast();

  const testRankingQualification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ranking-bonus/distribute');
      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: 'Qualification Check Complete',
          description: `Current rank: ${data.data.qualification.currentRank}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Check Failed',
          description: data.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing ranking qualification:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testBonusDistribution = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ranking-bonus/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserEmail: targetEmail || undefined,
          forceDistribution: true // Force distribution for testing
        })
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: 'Bonus Distribution Successful!',
          description: `Distributed ${data.data.rank} bonus: ${data.data.ticAmount} TIC + ${data.data.gicAmount} GIC`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing bonus distribution:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testBonusHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ranking-bonus/history');
      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: 'History Loaded',
          description: `Found ${data.data.bonusHistory.length} bonus transactions`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'History Load Failed',
          description: data.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing bonus history:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to API',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading>Ranking Bonus System Test</Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page tests the Ranking Bonus system where users earn TIC and GIC tokens based on their referral rank achievements.
        </Alert>

        {session?.user?.email && (
          <Alert status="success">
            <AlertIcon />
            <Text>Authenticated as: <strong>{session.user.email}</strong></Text>
          </Alert>
        )}

        {/* Test Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Test Controls</Heading>
              
              <FormControl>
                <FormLabel>Target Email (optional - leave empty for current user)</FormLabel>
                <Input
                  placeholder="user@example.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
              </FormControl>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Button
                  onClick={testRankingQualification}
                  isLoading={isLoading}
                  loadingText="Checking..."
                  colorScheme="blue"
                >
                  Check Qualification
                </Button>
                
                <Button
                  onClick={testBonusDistribution}
                  isLoading={isLoading}
                  loadingText="Distributing..."
                  colorScheme="green"
                >
                  Test Distribution
                </Button>
                
                <Button
                  onClick={testBonusHistory}
                  isLoading={isLoading}
                  loadingText="Loading..."
                  colorScheme="purple"
                >
                  Load History
                </Button>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Ranking Bonus Component */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Ranking Bonus Component</Heading>
              <RankingBonusCard />
            </VStack>
          </CardBody>
        </Card>

        {/* Ranking Maintenance Component */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Ranking Maintenance Component</Heading>
              <RankingMaintenanceCard />
            </VStack>
          </CardBody>
        </Card>

        {/* Test Results */}
        {testResult && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Test Results</Heading>
                <Code p={4} borderRadius="md" overflow="auto" maxH="400px">
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                </Code>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading size="md">Testing Instructions:</Heading>
              <Text>1. <strong>Check Qualification:</strong> See if current user qualifies for ranking bonuses</Text>
              <Text>2. <strong>Test Distribution:</strong> Force distribute ranking bonus (for testing purposes)</Text>
              <Text>3. <strong>Load History:</strong> View all ranking bonus transactions</Text>
              <Text>4. <strong>Component Test:</strong> Use the Ranking Bonus Card above to test the UI</Text>
              <Text>5. <strong>Wallet Check:</strong> Go to My Accounts → Wallet to see TIC/GIC balances</Text>
              
              <Alert status="warning" mt={4}>
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Ranking Requirements:</Text>
                  <Text fontSize="sm">• Bronze: 5 direct referrals + 10th unilevel = $690/month</Text>
                  <Text fontSize="sm">• Silver: 5 direct referrals + 10th unilevel = $2,484/month (3 Group)</Text>
                  <Text fontSize="sm">• Gold: 6 active players + 10th unilevel = $4,830/month (3 Group A,B&C)</Text>
                  <Text fontSize="sm">• Platinum: 8 active players + 10th unilevel = $8,832/month (4 Group A,B,C&D)</Text>
                  <Text fontSize="sm">• Diamond: 12 active players + 10th unilevel = $14,904/month (5 Group A,B,C,D&E)</Text>
                  <Text fontSize="sm" color="blue.600">All bonuses split 50% TIC + 50% GIC tokens</Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
