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
  Spacer,
  SimpleGrid,
  Progress,
  Divider
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaUsers, FaCoins, FaCrown, FaLink, FaChartLine, FaGift, FaSync } from 'react-icons/fa';

interface ReferralRelationship {
  referrer_email: string;
  referred_email: string;
  level_depth: number;
  referral_code: string;
  created_at: string;
  is_active: boolean;
}

interface CommissionData {
  earner_email: string;
  referral_email: string;
  commission_level: number;
  commission_amount: number;
  commission_rate: number;
  created_at: string;
}

interface PartnershipStats {
  totalReferrals: number;
  directReferrals: number;
  maxLevel: number;
  totalCommissions: number;
  monthlyCommissions: number;
  currentRank: string;
  rankBonus: number;
  referralCode: string;
  referralLink: string;
}

export default function TestPartnershipSystem() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<PartnershipStats | null>(null);
  const [relationships, setRelationships] = useState<ReferralRelationship[]>([]);
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchPartnershipData = async () => {
    if (!session?.user?.email) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch referral stats
      const statsResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-referral-stats',
          userEmail: session.user.email
        })
      });

      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats({
          totalReferrals: statsData.data.totalReferrals || 0,
          directReferrals: statsData.data.directReferrals || 0,
          maxLevel: statsData.data.maxLevel || 0,
          totalCommissions: parseFloat(statsData.data.totalEarnings || '0'),
          monthlyCommissions: parseFloat(statsData.data.monthlyEarnings || '0'),
          currentRank: statsData.data.rankTitle || 'No Rank',
          rankBonus: statsData.data.monthlyBonus || 0,
          referralCode: '',
          referralLink: ''
        });

        setRelationships(statsData.data.relationships || []);
        setCommissions(statsData.data.recentCommissions || []);
      }

      // Fetch referral code
      const codeResponse = await fetch('/api/referrals/user-data');
      const codeData = await codeResponse.json();

      if (codeData.referralCode) {
        setStats(prev => prev ? {
          ...prev,
          referralCode: codeData.referralCode,
          referralLink: codeData.referralLink
        } : null);
      }

    } catch (err) {
      console.error('Error fetching partnership data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testCommissionCalculation = async () => {
    try {
      const response = await fetch('/api/referral/calculate-commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          planType: 'vip',
          planValue: 500,
          planCount: 1
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Commission Test Successful',
          description: `Calculated commissions for ${data.commissionsCreated?.length || 0} referrers`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchPartnershipData(); // Refresh data
      } else {
        toast({
          title: 'Commission Test Failed',
          description: data.error || 'Failed to calculate commissions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing commission calculation:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test commission calculation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchPartnershipData();
    }
  }, [session]);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test the partnership system
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

  const getCommissionStructure = () => [
    { level: 1, rate: 10, requirement: 'Starter Plan' },
    { level: 2, rate: 5, requirement: 'VIP Plan' },
    { level: 3, rate: 5, requirement: 'VIP Plan' },
    { level: 4, rate: 5, requirement: 'VIP Plan' },
    { level: 5, rate: 5, requirement: 'VIP Plan' },
    { level: 6, rate: 5, requirement: 'VIP Plan' },
    { level: 7, rate: 2.5, requirement: 'VIP Plan' },
    { level: 8, rate: 2.5, requirement: 'VIP Plan' },
    { level: 9, rate: 2.5, requirement: 'VIP Plan' },
    { level: 10, rate: 2.5, requirement: 'VIP Plan' },
    { level: 11, rate: 1, requirement: 'VIP Plan' },
    { level: 12, rate: 1, requirement: 'VIP Plan' },
    { level: 13, rate: 1, requirement: 'VIP Plan' },
    { level: 14, rate: 1, requirement: 'VIP Plan' },
    { level: 15, rate: 1, requirement: 'VIP Plan' }
  ];

  const getRankBonuses = () => [
    { rank: 'Bronze', referrals: 5, bonus: 690 },
    { rank: 'Silver', referrals: 10, bonus: 2484 },
    { rank: 'Gold', referrals: 15, bonus: 4830 },
    { rank: 'Platinum', referrals: 20, bonus: 8832 },
    { rank: 'Diamond', referrals: 25, bonus: 14904 }
  ];

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            Partnership System Test
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchPartnershipData}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<FaCoins />}
              colorScheme="green"
              onClick={testCommissionCalculation}
              size="sm"
            >
              Test Commissions
            </Button>
          </HStack>
        </Flex>

        <Text color="gray.600">
          Testing partnership system for user: {session.user.email}
        </Text>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Partnership Overview */}
        {stats && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Partnership Overview</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Total Referrals</StatLabel>
                    <StatNumber>{stats.totalReferrals}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Direct Referrals</StatLabel>
                    <StatNumber color="blue.500">{stats.directReferrals}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Max Level</StatLabel>
                    <StatNumber color="purple.500">{stats.maxLevel}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Current Rank</StatLabel>
                    <StatNumber color={`${getRankColor(stats.currentRank)}.500`}>
                      {stats.currentRank}
                    </StatNumber>
                  </Stat>
                </StatGroup>

                <Divider />

                <StatGroup>
                  <Stat>
                    <StatLabel>Total Commissions</StatLabel>
                    <StatNumber color="green.500">${stats.totalCommissions.toFixed(2)}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Monthly Commissions</StatLabel>
                    <StatNumber color="green.500">${stats.monthlyCommissions.toFixed(2)}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Rank Bonus</StatLabel>
                    <StatNumber color="gold">${stats.rankBonus.toFixed(2)}/month</StatNumber>
                  </Stat>
                </StatGroup>

                {stats.referralCode && (
                  <VStack spacing={2} align="stretch">
                    <Text fontWeight="bold">Your Referral Information:</Text>
                    <HStack>
                      <Text fontSize="sm">Code:</Text>
                      <Badge colorScheme="blue">{stats.referralCode}</Badge>
                    </HStack>
                    <HStack>
                      <Text fontSize="sm">Link:</Text>
                      <Text fontSize="xs" color="blue.500" isTruncated>
                        {stats.referralLink}
                      </Text>
                    </HStack>
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Tabs for different sections */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaUsers} />
                    <Text>My Community</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaCoins} />
                    <Text>Commission Structure</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaCrown} />
                    <Text>Rank Bonuses</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaChartLine} />
                    <Text>System Status</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* My Community Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">My Referral Community</Heading>
                    
                    {isLoading ? (
                      <HStack justify="center" py={8}>
                        <Spinner />
                        <Text>Loading community data...</Text>
                      </HStack>
                    ) : relationships.length > 0 ? (
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Referred User</Th>
                              <Th textAlign="center">Level</Th>
                              <Th textAlign="center">Status</Th>
                              <Th textAlign="center">Join Date</Th>
                              <Th textAlign="center">Referral Code</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {relationships.map((rel, index) => (
                              <Tr key={index}>
                                <Td>
                                  <Text fontSize="sm">{rel.referred_email}</Text>
                                </Td>
                                <Td textAlign="center">
                                  <Badge
                                    colorScheme={rel.level_depth === 1 ? 'green' : 'blue'}
                                    fontSize="xs"
                                  >
                                    Level {rel.level_depth}
                                  </Badge>
                                </Td>
                                <Td textAlign="center">
                                  <Badge
                                    colorScheme={rel.is_active ? 'green' : 'red'}
                                    size="sm"
                                  >
                                    {rel.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </Td>
                                <Td textAlign="center">
                                  <Text fontSize="sm">
                                    {new Date(rel.created_at).toLocaleDateString()}
                                  </Text>
                                </Td>
                                <Td textAlign="center">
                                  <Badge variant="outline" fontSize="xs">
                                    {rel.referral_code}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <VStack spacing={4} py={10} textAlign="center">
                        <Icon as={FaUsers} boxSize={12} color="gray.400" />
                        <Text color="gray.500" fontSize="lg">No referrals yet</Text>
                        <Text color="gray.400" fontSize="sm">
                          Share your referral link to start building your community
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </TabPanel>

                {/* Commission Structure Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">15-Level Commission Structure</Heading>
                    <Text color="gray.600" fontSize="sm">
                      Based on $0.44 daily earnings per VIP plan
                    </Text>
                    
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th textAlign="center">Level</Th>
                            <Th textAlign="center">Commission Rate</Th>
                            <Th textAlign="center">Daily Earning</Th>
                            <Th textAlign="center">Plan Requirement</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {getCommissionStructure().map((level) => (
                            <Tr key={level.level}>
                              <Td textAlign="center">
                                <Badge colorScheme="blue">{level.level}</Badge>
                              </Td>
                              <Td textAlign="center">
                                <Text fontWeight="bold">{level.rate}%</Text>
                              </Td>
                              <Td textAlign="center">
                                <Text color="green.500" fontWeight="bold">
                                  ${(0.44 * level.rate / 100).toFixed(3)}
                                </Text>
                              </Td>
                              <Td textAlign="center">
                                <Badge 
                                  colorScheme={level.requirement === 'VIP Plan' ? 'purple' : 'blue'}
                                  size="sm"
                                >
                                  {level.requirement}
                                </Badge>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </VStack>
                </TabPanel>

                {/* Rank Bonuses Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Rank Bonus System</Heading>
                    <Text color="gray.600" fontSize="sm">
                      Monthly bonuses based on direct referrals (50% TIC + 50% GIC)
                    </Text>
                    
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {getRankBonuses().map((rank) => (
                        <Card key={rank.rank} borderWidth={2} borderColor={`${getRankColor(rank.rank)}.200`}>
                          <CardBody textAlign="center">
                            <VStack spacing={3}>
                              <Icon as={FaCrown} boxSize={8} color={`${getRankColor(rank.rank)}.500`} />
                              <Badge colorScheme={getRankColor(rank.rank)} fontSize="md" p={2}>
                                {rank.rank.toUpperCase()}
                              </Badge>
                              <Text fontSize="sm" color="gray.600">
                                {rank.referrals} Direct Referrals
                              </Text>
                              <Text fontSize="lg" fontWeight="bold" color="green.500">
                                ${rank.bonus.toLocaleString()}/month
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                50% TIC + 50% GIC tokens
                              </Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </VStack>
                </TabPanel>

                {/* System Status Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Partnership System Status</Heading>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Card>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Heading size="sm">✅ System Components</Heading>
                            <VStack align="stretch" spacing={2}>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Referral Link Generation:</Text>
                                <Badge colorScheme="green">Active</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Community Tracking:</Text>
                                <Badge colorScheme="green">Active</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Commission Structure:</Text>
                                <Badge colorScheme="green">15 Levels</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Rank Bonus System:</Text>
                                <Badge colorScheme="green">5 Ranks</Badge>
                              </HStack>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>

                      <Card>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Heading size="sm">📊 Your Progress</Heading>
                            <VStack align="stretch" spacing={2}>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Referral Code:</Text>
                                <Badge colorScheme={stats?.referralCode ? 'green' : 'red'}>
                                  {stats?.referralCode ? 'Generated' : 'Missing'}
                                </Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Community Size:</Text>
                                <Badge colorScheme="blue">{stats?.totalReferrals || 0} Members</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Max Level Reached:</Text>
                                <Badge colorScheme="purple">Level {stats?.maxLevel || 0}</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Current Rank:</Text>
                                <Badge colorScheme={getRankColor(stats?.currentRank || '')}>
                                  {stats?.currentRank || 'No Rank'}
                                </Badge>
                              </HStack>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </SimpleGrid>

                    <Alert status="info">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">Partnership System Features:</Text>
                        <Text fontSize="sm">
                          ✅ Referral links automatically track new users to your community<br/>
                          ✅ 15-level commission structure with daily payouts<br/>
                          ✅ Rank bonuses distributed monthly in TIC + GIC tokens<br/>
                          ✅ Real-time community tracking and statistics<br/>
                          ✅ Partner wallet for commission management
                        </Text>
                      </VStack>
                    </Alert>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
