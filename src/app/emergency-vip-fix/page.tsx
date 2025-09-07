'use client';

import React, { useState, useEffect } from 'react';
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
  Badge,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Code,
  Spinner,
  Divider,
} from '@chakra-ui/react';

interface VipStatus {
  success: boolean;
  vip_status: {
    total_active_vip_users: number;
    wrong_distributions: number;
    correct_distributions: number;
    users_with_correct_distributions: number;
    users_missing_correct_distributions: number;
    fix_needed: boolean;
  };
  correct_amounts: {
    vip_daily: number;
    vip_display: string;
    starter_daily: number;
    starter_display: string;
  };
}

interface VipFixResult {
  success: boolean;
  message: string;
  date: string;
  summary: {
    wrong_distributions_deleted: number;
    correct_distributions_created: number;
    vip_subscriptions_processed: number;
    correct_vip_daily_amount: number;
    expected_display: string;
  };
  fix_details: {
    problem: string;
    solution: string;
    correct_amount: number;
    date_fixed: string;
  };
}

const EmergencyVipFixPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [fixResult, setFixResult] = useState<VipFixResult | null>(null);
  const toast = useToast();

  const checkVipStatus = async () => {
    setIsChecking(true);
    
    try {
      console.log('🔍 Checking VIP distribution status...');
      
      const res = await fetch('/api/fix-vip-distributions', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      
      console.log('📊 VIP Status:', data);
      
      setVipStatus(data);

      if (data.success) {
        const needsFix = data.vip_status?.fix_needed || false;
        toast({
          title: 'VIP Status Check Complete',
          description: needsFix 
            ? `🚨 ${data.vip_status?.wrong_distributions || 0} VIP users have wrong distributions!`
            : '✅ All VIP distributions are correct',
          status: needsFix ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Status Check Failed',
          description: data.error || 'Failed to check VIP status',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ VIP status check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      toast({
        title: 'Status Check Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const runEmergencyVipFix = async () => {
    setIsLoading(true);
    setFixResult(null);
    
    try {
      console.log('🚨 Running emergency VIP distribution fix...');
      
      const res = await fetch('/api/fix-vip-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const data = await res.json();
      console.log('📊 VIP Fix Result:', data);
      
      setFixResult(data);

      if (data.success) {
        toast({
          title: '🎉 EMERGENCY VIP FIX COMPLETE!',
          description: `Fixed ${data.summary?.correct_distributions_created || 0} VIP distributions! Deleted ${data.summary?.wrong_distributions_deleted || 0} wrong ones.`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh status after fix
        setTimeout(() => {
          checkVipStatus();
        }, 3000);
      } else {
        toast({
          title: 'Emergency Fix Failed',
          description: data.error || 'Failed to run emergency fix',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Emergency VIP fix failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setFixResult({
        success: false,
        message: 'Request failed',
        error: errorMessage
      } as any);
      
      toast({
        title: 'Emergency Fix Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyVipFix = async () => {
    setIsVerifying(true);
    
    try {
      // Check status again to verify
      await checkVipStatus();
      
      toast({
        title: 'Verification Complete',
        description: 'VIP fix verification completed. Check the status above.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Verification failed:', error);
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-check on page load
  useEffect(() => {
    checkVipStatus();
  }, []);

  return (
    <Box p={6} maxW="6xl" mx="auto" bg="gray.50" minH="100vh">
      <VStack spacing={6} align="stretch">
        <Card bg="red.50" borderColor="red.200" borderWidth={2}>
          <CardHeader>
            <Heading as="h1" size="xl" textAlign="center" color="red.600">
              🚨 EMERGENCY VIP DISTRIBUTION FIX
            </Heading>
          </CardHeader>
          <CardBody>
            <Alert status="error" variant="left-accent">
              <AlertIcon />
              <Box>
                <AlertTitle>Critical Issue Detected!</AlertTitle>
                <AlertDescription>
                  <strong>Problem:</strong> VIP users receiving +810 TIC instead of +18.90 TIC per day
                  <br />
                  <strong>Impact:</strong> Wrong distribution amounts in user dashboards
                  <br />
                  <strong>Solution:</strong> Emergency fix to delete wrong distributions and create correct ones
                </AlertDescription>
              </Box>
            </Alert>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            onClick={checkVipStatus}
            isLoading={isChecking}
            loadingText="Checking..."
            colorScheme="blue"
            size="lg"
          >
            📊 Check VIP Status
          </Button>
          
          <Button
            onClick={runEmergencyVipFix}
            isLoading={isLoading}
            loadingText="Running emergency fix..."
            colorScheme="red"
            size="lg"
            variant="solid"
          >
            🚨 EMERGENCY FIX VIP DISTRIBUTIONS
          </Button>

          <Button
            onClick={verifyVipFix}
            isLoading={isVerifying}
            loadingText="Verifying..."
            colorScheme="green"
            size="lg"
          >
            ✅ Verify Fix
          </Button>
        </HStack>

        {/* VIP Status Display */}
        {vipStatus && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">VIP Distribution Status</Heading>
                <Badge
                  colorScheme={vipStatus.vip_status?.fix_needed ? 'red' : 'green'}
                  size="lg"
                >
                  {vipStatus.vip_status?.fix_needed ? 'NEEDS FIX' : 'ALL GOOD'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total VIP Users</StatLabel>
                  <StatNumber color="blue.500">{vipStatus.vip_status?.total_active_vip_users || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Wrong Distributions</StatLabel>
                  <StatNumber color="red.500">{vipStatus.vip_status?.wrong_distributions || 0}</StatNumber>
                  <StatHelpText>+810 TIC (incorrect)</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Correct Distributions</StatLabel>
                  <StatNumber color="green.500">{vipStatus.vip_status?.correct_distributions || 0}</StatNumber>
                  <StatHelpText>+18.90 TIC (correct)</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Users Missing Fix</StatLabel>
                  <StatNumber color={vipStatus.vip_status?.users_missing_correct_distributions > 0 ? 'red.500' : 'green.500'}>
                    {vipStatus.vip_status?.users_missing_correct_distributions || 0}
                  </StatNumber>
                </Stat>
              </SimpleGrid>

              {vipStatus.vip_status?.fix_needed && (
                <Alert status="error" mt={4}>
                  <AlertIcon />
                  <AlertDescription>
                    🚨 <strong>{vipStatus.vip_status?.wrong_distributions || 0} VIP users</strong> have wrong distribution amounts! 
                    Click "EMERGENCY FIX VIP DISTRIBUTIONS" to fix immediately.
                  </AlertDescription>
                </Alert>
              )}

              <Box mt={4}>
                <Heading size="sm" mb={3}>Expected Correct Amounts</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Box p={3} bg="purple.50" borderRadius="md">
                    <Text fontWeight="bold" color="purple.600">VIP Plan</Text>
                    <Text>Daily: <Code>{vipStatus.correct_amounts?.vip_display || '+18.90 TIC'}</Code></Text>
                    <Text fontSize="sm" color="gray.600">Exact: {vipStatus.correct_amounts?.vip_daily?.toFixed(6)} TIC</Text>
                  </Box>
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <Text fontWeight="bold" color="blue.600">Starter Plan</Text>
                    <Text>Daily: <Code>{vipStatus.correct_amounts?.starter_display || '+1.37 TIC'}</Code></Text>
                    <Text fontSize="sm" color="gray.600">Exact: {vipStatus.correct_amounts?.starter_daily?.toFixed(6)} TIC</Text>
                  </Box>
                </SimpleGrid>
              </Box>
            </CardBody>
          </Card>
        )}

        {/* Fix Results */}
        {fixResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Emergency Fix Results</Heading>
                <Badge
                  colorScheme={fixResult.success ? 'green' : 'red'}
                  size="lg"
                >
                  {fixResult.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                {fixResult.success ? (
                  <>
                    <Alert status="success">
                      <AlertIcon />
                      <AlertDescription>
                        <strong>🎉 EMERGENCY VIP FIX SUCCESSFUL!</strong>
                        <br />Date: {fixResult.date}
                        <br />Message: {fixResult.message}
                      </AlertDescription>
                    </Alert>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Stat>
                        <StatLabel>Wrong Distributions Deleted</StatLabel>
                        <StatNumber color="red.500">{fixResult.summary?.wrong_distributions_deleted || 0}</StatNumber>
                        <StatHelpText>+810 TIC amounts removed</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Correct Distributions Created</StatLabel>
                        <StatNumber color="green.500">{fixResult.summary?.correct_distributions_created || 0}</StatNumber>
                        <StatHelpText>+18.90 TIC amounts added</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>VIP Users Processed</StatLabel>
                        <StatNumber color="blue.500">{fixResult.summary?.vip_subscriptions_processed || 0}</StatNumber>
                        <StatHelpText>Total VIP subscriptions</StatHelpText>
                      </Stat>
                    </SimpleGrid>

                    <Box p={4} bg="green.50" borderRadius="md" borderColor="green.200" borderWidth={1}>
                      <Heading size="sm" color="green.700" mb={2}>✅ Problem Solved</Heading>
                      <Text><strong>Old Problem:</strong> <Text as="span" textDecoration="line-through" color="red.500">+810 TIC (WRONG)</Text></Text>
                      <Text><strong>New Solution:</strong> <Text as="span" color="green.600" fontWeight="bold">{fixResult.summary?.expected_display || '+18.90 TIC'} (CORRECT)</Text></Text>
                      <Text><strong>Date Fixed:</strong> {fixResult.fix_details?.date_fixed} (TODAY)</Text>
                    </Box>

                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Next Steps</AlertTitle>
                        <AlertDescription>
                          1. Go to <strong>User Dashboard</strong> (/my-accounts)
                          <br />2. Check <strong>TIC Token Distribution</strong> section
                          <br />3. Verify Recent Distributions show <strong>+18.90 TIC</strong> with today's date
                          <br />4. Click <strong>"Refresh"</strong> button if needed
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </>
                ) : (
                  <Alert status="error">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Emergency Fix Failed</AlertTitle>
                      <AlertDescription>
                        {fixResult.message}
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="warning" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Important Information</AlertTitle>
            <AlertDescription>
              <strong>This emergency fix will:</strong>
              <br />• Delete all VIP distributions with amounts over 100 TIC (wrong amounts)
              <br />• Create new VIP distributions with exactly 18.90 TIC per day
              <br />• Update wallet balances with correct amounts
              <br />• Set distribution dates to today (September 6, 2025)
              <br />• Ensure VIP users see correct amounts in their dashboards
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default EmergencyVipFixPage;
