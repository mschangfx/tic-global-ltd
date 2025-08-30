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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';

interface PlanDetails {
  subscriptions: number;
  distributions: number;
  users: number;
}

interface StarterDetails extends PlanDetails {
  users_with_subscriptions: string[];
  users_with_distributions: string[];
  users_missing_distributions: string[];
  sample_subscriptions: any[];
  sample_distributions: any[];
}

interface CheckResult {
  success: boolean;
  summary: {
    total_subscriptions: number;
    total_distributions: number;
    vip_users: number;
    starter_users: number;
    starter_users_with_distributions: number;
    starter_users_without_distributions: number;
  };
  subscriptions_by_plan: Array<{
    plan_id: string;
    subscription_count: number;
    unique_users: number;
  }>;
  distributions_by_plan: Array<{
    plan_id: string;
    distribution_count: number;
    unique_users: number;
  }>;
  starter_plan_details: StarterDetails;
  vip_plan_details: PlanDetails;
}

const DebugStarterPlansPage: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const toast = useToast();

  const checkStarterPlans = async () => {
    setIsChecking(true);
    
    try {
      console.log('🔍 Checking Starter plan status...');
      
      const res = await fetch('/api/debug/check-starter-plans');
      const data = await res.json();
      
      console.log('📊 Check Result:', data);
      
      setCheckResult(data);

      if (data.success) {
        toast({
          title: 'Check Complete',
          description: `Found ${data.summary.starter_users_without_distributions} Starter users without distributions`,
          status: data.summary.starter_users_without_distributions > 0 ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Check Failed',
          description: data.error || 'Failed to check Starter plans',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('❌ Check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      toast({
        title: 'Check Failed',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const fixStarterDistributions = async () => {
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
      console.log('🔧 Fixing Starter plan distributions...');
      
      const res = await fetch('/api/debug/check-starter-plans', {
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
          title: 'Fix Complete!',
          description: `Created ${data.distributions_created} distributions for ${data.starter_subscriptions} Starter users`,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });
        
        // Refresh check after fix
        setTimeout(() => {
          checkStarterPlans();
        }, 2000);
      } else {
        toast({
          title: 'Fix Failed',
          description: data.error || 'Failed to fix Starter distributions',
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
        title: 'Fix Failed',
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
    checkStarterPlans();
  }, []);

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Debug: Starter Plan Distributions
        </Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Starter Plan Issue</AlertTitle>
            <AlertDescription>
              This tool checks why Starter plan users don't see TIC distributions. 
              Starter plan should show 1.37 TIC per day (500 TIC per year ÷ 365 days).
            </AlertDescription>
          </Box>
        </Alert>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          <Button
            onClick={checkStarterPlans}
            isLoading={isChecking}
            loadingText="Checking..."
            colorScheme="blue"
            size="lg"
          >
            Check Starter Plans
          </Button>
        </HStack>

        {/* Check Results */}
        {checkResult && (
          <Card>
            <CardHeader>
              <Heading size="md">System Overview</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Subscriptions</StatLabel>
                  <StatNumber>{checkResult.summary.total_subscriptions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Distributions</StatLabel>
                  <StatNumber>{checkResult.summary.total_distributions}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>VIP Users</StatLabel>
                  <StatNumber color="purple.500">{checkResult.summary.vip_users}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Starter Users</StatLabel>
                  <StatNumber color="blue.500">{checkResult.summary.starter_users}</StatNumber>
                </Stat>
              </SimpleGrid>

              <Divider my={4} />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat>
                  <StatLabel>Starter Users WITH Distributions</StatLabel>
                  <StatNumber color="green.500">{checkResult.summary.starter_users_with_distributions}</StatNumber>
                  <StatHelpText>Users who can see their TIC distributions</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Starter Users WITHOUT Distributions</StatLabel>
                  <StatNumber color="red.500">{checkResult.summary.starter_users_without_distributions}</StatNumber>
                  <StatHelpText>Users who can't see TIC distributions</StatHelpText>
                </Stat>
              </SimpleGrid>

              {/* Plan Breakdown */}
              <Divider my={4} />
              <Heading size="sm" mb={3}>Plan Breakdown</Heading>
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Plan</Th>
                      <Th>Subscriptions</Th>
                      <Th>Distributions</Th>
                      <Th>Unique Users</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {checkResult.subscriptions_by_plan.map((plan) => {
                      const distributions = checkResult.distributions_by_plan.find(d => d.plan_id === plan.plan_id);
                      return (
                        <Tr key={plan.plan_id}>
                          <Td>
                            <Badge colorScheme={plan.plan_id === 'vip' ? 'purple' : 'blue'}>
                              {plan.plan_id.toUpperCase()}
                            </Badge>
                          </Td>
                          <Td>{plan.subscription_count}</Td>
                          <Td>{distributions?.distribution_count || 0}</Td>
                          <Td>{plan.unique_users}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>

              {/* Missing Distributions Alert */}
              {checkResult.summary.starter_users_without_distributions > 0 && (
                <>
                  <Divider my={4} />
                  <Alert status="warning">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Missing Distributions Found!</AlertTitle>
                      <AlertDescription>
                        {checkResult.summary.starter_users_without_distributions} Starter users don't have distribution records.
                        This is why they can't see their daily TIC distributions.
                      </AlertDescription>
                    </Box>
                  </Alert>

                  {/* Admin Fix Section */}
                  <Card mt={4}>
                    <CardHeader>
                      <Heading size="md">Fix Missing Distributions</Heading>
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
                        
                        <Button
                          onClick={fixStarterDistributions}
                          isLoading={isLoading}
                          loadingText="Creating distributions..."
                          colorScheme="green"
                          size="lg"
                          width="full"
                        >
                          Create Missing Starter Distributions
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                </>
              )}
            </CardBody>
          </Card>
        )}

        {/* Fix Results */}
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
                  <Alert status="success">
                    <AlertIcon />
                    <AlertDescription>
                      {fixResult.message} - Created {fixResult.distributions_created} distributions 
                      for {fixResult.starter_subscriptions} Starter users at {fixResult.daily_amount?.toFixed(4)} TIC per day.
                    </AlertDescription>
                  </Alert>
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

        <Alert status="success">
          <AlertIcon />
          <AlertDescription>
            After fixing, Starter plan users will see their daily TIC distributions: 1.37 TIC per day 
            (500 TIC tokens per year ÷ 365 days).
          </AlertDescription>
        </Alert>
      </VStack>
    </Box>
  );
};

export default DebugStarterPlansPage;
