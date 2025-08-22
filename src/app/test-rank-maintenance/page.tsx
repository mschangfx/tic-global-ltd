'use client';

import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Flex,
  SimpleGrid,
  Progress,
  Divider
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaCrown, FaCalendarCheck, FaChartLine, FaSync, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface MaintenanceRecord {
  user_email: string;
  check_date: string;
  current_referrals: number;
  required_referrals: number;
  rank_maintained: string;
  is_qualified: boolean;
}

interface MonthlyTracking {
  user_email: string;
  tracking_month: string;
  rank_achieved: string;
  referrals_required: number;
  maintenance_days: number;
  total_days_in_month: number;
  maintenance_percentage: number;
  is_qualified: boolean;
  bonus_amount: number;
}

export default function TestRankMaintenance() {
  const { data: session } = useSession();
  const [maintenanceStatus, setMaintenanceStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchMaintenanceStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/cron/daily-rank-maintenance');
      const data = await response.json();

      if (data.success) {
        setMaintenanceStatus(data);
      } else {
        setError(data.error || 'Failed to fetch maintenance status');
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const runMaintenanceCheck = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cron/daily-rank-maintenance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'cron-secret-key'}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Maintenance Check Successful',
          description: `Checked ${data.statistics.total_users_checked} users, ${data.statistics.qualified_users} qualified`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchMaintenanceStatus(); // Refresh data
      } else {
        toast({
          title: 'Maintenance Check Failed',
          description: data.error || 'Failed to run maintenance check',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error running maintenance check:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to run maintenance check',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test rank maintenance system
        </Alert>
      </Box>
    );
  }

  const getRankColor = (rank: string) => {
    switch (rank.toLowerCase()) {
      case 'bronze': return 'orange';
      case 'silver': return 'gray';
      case 'gold': return 'yellow';
      case 'platinum': return 'purple';
      case 'diamond': return 'blue';
      default: return 'gray';
    }
  };

  const userMaintenanceRecord = maintenanceStatus?.daily_status?.records?.find(
    (record: MaintenanceRecord) => record.user_email === session.user?.email
  );

  const userMonthlyTracking = maintenanceStatus?.monthly_tracking?.records?.find(
    (tracking: MonthlyTracking) => tracking.user_email === session.user?.email
  );

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            Rank Maintenance System Test
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchMaintenanceStatus}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<FaCalendarCheck />}
              colorScheme="blue"
              onClick={runMaintenanceCheck}
              isLoading={isLoading}
              size="sm"
            >
              Run Check
            </Button>
          </HStack>
        </Flex>

        <Text color="gray.600">
          Testing rank maintenance requirements for user: {session.user.email}
        </Text>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* System Overview */}
        {maintenanceStatus && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">System Overview</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Users Checked Today</StatLabel>
                    <StatNumber>{maintenanceStatus.daily_status.total_users_checked}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Qualified Users</StatLabel>
                    <StatNumber color="green.500">{maintenanceStatus.daily_status.qualified_users}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Unqualified Users</StatLabel>
                    <StatNumber color="red.500">{maintenanceStatus.daily_status.unqualified_users}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Monthly Tracked</StatLabel>
                    <StatNumber color="blue.500">{maintenanceStatus.monthly_tracking.total_tracked}</StatNumber>
                  </Stat>
                </StatGroup>

                <Alert status="info">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">Maintenance Requirements:</Text>
                    <Text fontSize="sm">
                      Users must maintain their rank requirements for at least 80% of the month to qualify for bonuses.
                      Daily checks verify referral counts and track maintenance percentage.
                    </Text>
                  </VStack>
                </Alert>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Your Status */}
        {(userMaintenanceRecord || userMonthlyTracking) && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Your Maintenance Status</Heading>
                
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {/* Today's Status */}
                  {userMaintenanceRecord && (
                    <Card borderWidth={1} borderColor={userMaintenanceRecord.is_qualified ? 'green.200' : 'red.200'}>
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <HStack justify="space-between">
                            <Heading size="sm">Today's Status</Heading>
                            <Icon 
                              as={userMaintenanceRecord.is_qualified ? FaCheckCircle : FaTimesCircle}
                              color={userMaintenanceRecord.is_qualified ? 'green.500' : 'red.500'}
                            />
                          </HStack>
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm">Current Rank:</Text>
                            <Badge colorScheme={getRankColor(userMaintenanceRecord.rank_maintained)}>
                              {userMaintenanceRecord.rank_maintained}
                            </Badge>
                          </HStack>
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm">Referrals:</Text>
                            <Text fontWeight="bold">
                              {userMaintenanceRecord.current_referrals}/{userMaintenanceRecord.required_referrals}
                            </Text>
                          </HStack>
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm">Qualified:</Text>
                            <Badge colorScheme={userMaintenanceRecord.is_qualified ? 'green' : 'red'}>
                              {userMaintenanceRecord.is_qualified ? 'YES' : 'NO'}
                            </Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}

                  {/* Monthly Tracking */}
                  {userMonthlyTracking && (
                    <Card borderWidth={1} borderColor={userMonthlyTracking.is_qualified ? 'green.200' : 'red.200'}>
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <HStack justify="space-between">
                            <Heading size="sm">Monthly Progress</Heading>
                            <Icon 
                              as={userMonthlyTracking.is_qualified ? FaCheckCircle : FaTimesCircle}
                              color={userMonthlyTracking.is_qualified ? 'green.500' : 'red.500'}
                            />
                          </HStack>
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm">Rank Achieved:</Text>
                            <Badge colorScheme={getRankColor(userMonthlyTracking.rank_achieved)}>
                              {userMonthlyTracking.rank_achieved}
                            </Badge>
                          </HStack>
                          
                          <VStack spacing={2} align="stretch">
                            <HStack justify="space-between">
                              <Text fontSize="sm">Maintenance:</Text>
                              <Text fontWeight="bold" color={userMonthlyTracking.maintenance_percentage >= 80 ? 'green.500' : 'red.500'}>
                                {userMonthlyTracking.maintenance_percentage.toFixed(1)}%
                              </Text>
                            </HStack>
                            <Progress 
                              value={userMonthlyTracking.maintenance_percentage} 
                              colorScheme={userMonthlyTracking.maintenance_percentage >= 80 ? 'green' : 'red'}
                              size="sm"
                            />
                            <Text fontSize="xs" color="gray.500" textAlign="center">
                              {userMonthlyTracking.maintenance_days}/{userMonthlyTracking.total_days_in_month} days maintained
                            </Text>
                          </VStack>
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm">Bonus Eligible:</Text>
                            <Badge colorScheme={userMonthlyTracking.is_qualified ? 'green' : 'red'}>
                              {userMonthlyTracking.is_qualified ? `$${userMonthlyTracking.bonus_amount}` : 'NO'}
                            </Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Rank Distribution */}
        {maintenanceStatus?.daily_status?.rank_distribution && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Current Rank Distribution</Heading>
                
                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                  {Object.entries(maintenanceStatus.daily_status.rank_distribution).map(([rank, count]) => (
                    <Card key={rank} borderWidth={2} borderColor={`${getRankColor(rank)}.200`}>
                      <CardBody textAlign="center">
                        <VStack spacing={2}>
                          <Icon as={FaCrown} boxSize={6} color={`${getRankColor(rank)}.500`} />
                          <Badge colorScheme={getRankColor(rank)} fontSize="sm">
                            {rank}
                          </Badge>
                          <Text fontSize="lg" fontWeight="bold">
                            {count as number}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            qualified users
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Maintenance Requirements */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Rank Maintenance Requirements</Heading>
              
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Rank</Th>
                      <Th textAlign="center">Required Referrals</Th>
                      <Th textAlign="center">Monthly Bonus</Th>
                      <Th textAlign="center">Maintenance Required</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[
                      { rank: 'Bronze', referrals: 5, bonus: 690 },
                      { rank: 'Silver', referrals: 10, bonus: 2484 },
                      { rank: 'Gold', referrals: 15, bonus: 4830 },
                      { rank: 'Platinum', referrals: 20, bonus: 8832 },
                      { rank: 'Diamond', referrals: 25, bonus: 14904 }
                    ].map((rank) => (
                      <Tr key={rank.rank}>
                        <Td>
                          <Badge colorScheme={getRankColor(rank.rank)}>
                            {rank.rank}
                          </Badge>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold">{rank.referrals} direct referrals</Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="green.500">
                            ${rank.bonus.toLocaleString()}
                          </Text>
                        </Td>
                        <Td textAlign="center">
                          <Badge colorScheme="blue" size="sm">
                            80% of month
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>

              <Alert status="warning">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Important:</Text>
                  <Text fontSize="sm">
                    Users must maintain their required referral count for at least 80% of the month (24+ days) 
                    to qualify for rank bonuses. Daily checks track maintenance status automatically.
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
