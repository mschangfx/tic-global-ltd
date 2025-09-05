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
  Input,
  FormControl,
  FormLabel,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';

interface SystemOverview {
  total_active_subscriptions: number;
  total_distributions: number;
  unique_users_with_subscriptions: number;
  unique_users_with_distributions: number;
  users_missing_distributions: number;
}

interface PlanBreakdown {
  plan_id: string;
  subscriptions: number;
  distributions: number;
  unique_users_with_subscriptions: number;
  unique_users_with_distributions: number;
  daily_amount: number;
}

interface SystemStatus {
  success: boolean;
  system_overview: SystemOverview;
  plan_breakdown: PlanBreakdown[];
  needs_fix: boolean;
  recommendation: string;
}

interface FixResult {
  success: boolean;
  message?: string;
  error?: string;
  total_users?: number;
  users_processed?: number;
  distributions_created?: number;
  summary?: {
    successful_users: number;
    failed_users: number;
    total_distributions: number;
    vip_users: number;
    starter_users: number;
  };
  next_steps?: string[];
}

const OneTimeSystemFixPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const toast = useToast();

  const checkSystemStatus = async () => {
    if (!adminKey.trim()) {
      toast({
        title: 'Admin Key Required',
        description: 'Please enter the admin key first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsCheckingStatus(true);
    
    try {
      console.log('🔍 Checking system status...');
      
      const res = await fetch(`/api/admin/one-time-system-fix?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      
      console.log('📊 System Status:', data);
      
      setSystemStatus(data);

      if (data.success) {
        toast({
          title: 'System Status Check Complete',
          description: data.needs_fix 
            ? `${data.system_overview.users_missing_distributions} users need distributions` 
            : 'System is healthy',
          status: data.needs_fix ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Status Check Failed',
          description: data.error || 'Failed to check system status',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Status check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      toast({
        title: 'Status Check Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const runOneTimeFix = async () => {
    if (!adminKey.trim()) {
      toast({
        title: 'Admin Key Required',
        description: 'Please enter the admin key first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setFixResult(null);
    
    try {
      console.log('🚀 Starting one-time system fix...');
      
      const res = await fetch('/api/admin/one-time-system-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminKey: adminKey.trim() })
      });

      const data = await res.json();
      console.log('📊 Fix Result:', data);
      
      setFixResult(data);

      if (data.success) {
        toast({
          title: 'ONE-TIME SYSTEM FIX COMPLETE! 🎉',
          description: `Fixed ${data.users_processed} users with ${data.distributions_created} distributions`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh system status after fix
        setTimeout(() => {
          checkSystemStatus();
        }, 3000);
      } else {
        toast({
          title: 'System Fix Failed',
          description: data.error || 'Failed to run system fix',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Fix failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      setFixResult({
        success: false,
        error: 'Request failed',
        message: errorMessage
      });
      
      toast({
        title: 'System Fix Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-check on page load
  useEffect(() => {
    if (adminKey.trim()) {
      checkSystemStatus();
    }
  }, []);

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="red.500">
          🚀 ONE-TIME SYSTEM-WIDE FIX
        </Heading>

        <Alert status="info" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Automated System-Wide Solution</AlertTitle>
            <AlertDescription>
              This tool will automatically fix TIC distributions for ALL users across ALL plans. 
              After running this ONCE, the system will work automatically for all future users.
              <br /><br />
              <strong>What it does:</strong>
              <br />• Fixes ALL existing users (VIP + Starter + any other plans)
              <br />• Creates proper distribution history for the last 5 days
              <br />• Ensures automated daily distributions work for future users
              <br />• No more manual fixes needed ever again
            </AlertDescription>
          </Box>
        </Alert>

        {/* Admin Key Input */}
        <Card>
          <CardHeader>
            <Heading size="md">Admin Authentication</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Admin Key</FormLabel>
                <Input
                  type="password"
                  placeholder="Enter admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </FormControl>
              
              <HStack spacing={4} width="full">
                <Button
                  onClick={checkSystemStatus}
                  isLoading={isCheckingStatus}
                  loadingText="Checking..."
                  colorScheme="blue"
                  size="lg"
                  flex={1}
                >
                  Check System Status
                </Button>
                
                <Button
                  onClick={runOneTimeFix}
                  isLoading={isLoading}
                  loadingText="Running system fix..."
                  colorScheme="red"
                  size="lg"
                  flex={1}
                  isDisabled={!systemStatus?.needs_fix}
                >
                  🚀 RUN ONE-TIME FIX
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* System Status Display */}
        {systemStatus && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">System Status</Heading>
                <Badge
                  colorScheme={systemStatus.needs_fix ? 'red' : 'green'}
                  size="lg"
                >
                  {systemStatus.needs_fix ? 'NEEDS FIX' : 'HEALTHY'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Active Subscriptions</StatLabel>
                  <StatNumber>{systemStatus.system_overview.total_active_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Distributions</StatLabel>
                  <StatNumber>{systemStatus.system_overview.total_distributions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Users with Subscriptions</StatLabel>
                  <StatNumber color="blue.500">{systemStatus.system_overview.unique_users_with_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Users Missing Distributions</StatLabel>
                  <StatNumber color="red.500">{systemStatus.system_overview.users_missing_distributions}</StatNumber>
                  <StatHelpText>These users need fixing</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Divider my={4} />
              <Heading size="sm" mb={3}>Plan Breakdown</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {systemStatus.plan_breakdown.map((plan) => (
                  <Card key={plan.plan_id} variant="outline">
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <Badge colorScheme={plan.plan_id === 'vip' ? 'purple' : 'blue'} size="lg">
                            {plan.plan_id.toUpperCase()}
                          </Badge>
                          <Text fontWeight="bold">{plan.daily_amount.toFixed(4)} TIC/day</Text>
                        </HStack>
                        <Text fontSize="sm">
                          <strong>Subscriptions:</strong> {plan.subscriptions} | 
                          <strong> Distributions:</strong> {plan.distributions}
                        </Text>
                        <Text fontSize="sm">
                          <strong>Users with subscriptions:</strong> {plan.unique_users_with_subscriptions} | 
                          <strong> Users with distributions:</strong> {plan.unique_users_with_distributions}
                        </Text>
                        {plan.unique_users_with_subscriptions > plan.unique_users_with_distributions && (
                          <Badge colorScheme="red" size="sm">
                            {plan.unique_users_with_subscriptions - plan.unique_users_with_distributions} users need fixing
                          </Badge>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>

              <Divider my={4} />
              <Alert status={systemStatus.needs_fix ? 'warning' : 'success'}>
                <AlertIcon />
                <AlertDescription>
                  <strong>Recommendation:</strong> {systemStatus.recommendation}
                </AlertDescription>
              </Alert>
            </CardBody>
          </Card>
        )}

        {/* Fix Results Display */}
        {fixResult && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Fix Results</Heading>
                <Badge
                  colorScheme={fixResult.success ? 'green' : 'red'}
                  size="lg"
                >
                  {fixResult.success ? 'SUCCESS' : 'ERROR'}
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
                        <strong>{fixResult.message}</strong>
                      </AlertDescription>
                    </Alert>

                    {fixResult.summary && (
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Stat>
                          <StatLabel>Users Processed</StatLabel>
                          <StatNumber color="green.500">{fixResult.users_processed}</StatNumber>
                          <StatHelpText>out of {fixResult.total_users} total</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Distributions Created</StatLabel>
                          <StatNumber color="blue.500">{fixResult.distributions_created}</StatNumber>
                          <StatHelpText>for last 5 days</StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Success Rate</StatLabel>
                          <StatNumber color="green.500">
                            {fixResult.summary.successful_users}/{fixResult.summary.successful_users + fixResult.summary.failed_users}
                          </StatNumber>
                        </Stat>
                      </SimpleGrid>
                    )}

                    {fixResult.summary && (
                      <>
                        <Divider />
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <Stat>
                            <StatLabel>VIP Users Fixed</StatLabel>
                            <StatNumber color="purple.500">{fixResult.summary.vip_users}</StatNumber>
                            <StatHelpText>Now see 18.90 TIC per day</StatHelpText>
                          </Stat>
                          <Stat>
                            <StatLabel>Starter Users Fixed</StatLabel>
                            <StatNumber color="blue.500">{fixResult.summary.starter_users}</StatNumber>
                            <StatHelpText>Now see 1.37 TIC per day</StatHelpText>
                          </Stat>
                        </SimpleGrid>
                      </>
                    )}

                    {fixResult.next_steps && (
                      <>
                        <Divider />
                        <Heading size="sm">✅ What Happens Next</Heading>
                        <List spacing={2}>
                          {fixResult.next_steps.map((step, index) => (
                            <ListItem key={index}>
                              <ListIcon as={CheckCircleIcon} color="green.500" />
                              {step}
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </>
                ) : (
                  <Alert status="error">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Error: {fixResult.error}</AlertTitle>
                      {fixResult.message && (
                        <AlertDescription mt={2}>
                          {fixResult.message}
                        </AlertDescription>
                      )}
                    </Box>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Alert status="success" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>After Running This Fix</AlertTitle>
            <AlertDescription>
              <strong>✅ ALL users will see proper TIC distributions:</strong>
              <br />• VIP users: 18.90 TIC per day (6900 TIC ÷ 365 days)
              <br />• Starter users: 1.37 TIC per day (500 TIC ÷ 365 days)
              <br />• New users: Automatically get distributions via daily cron job
              <br />• No more manual fixes needed - system works automatically!
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default OneTimeSystemFixPage;
