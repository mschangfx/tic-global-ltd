'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Card,
  CardBody,
  useToast,
  useColorModeValue,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  useClipboard,
  Grid,
  GridItem,
  Progress,
  SimpleGrid,
  Avatar,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Center,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import { FaUsers, FaDollarSign, FaLink, FaCopy, FaCheck, FaTrophy, FaMedal, FaCrown, FaGem, FaShare, FaSync } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { useSession } from 'next-auth/react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';


interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalEarnings: number;
  createdAt: string;
}

interface ReferralStats {
  totalReferrals: number;
  directReferrals: number;
  totalEarnings: string;
  monthlyEarnings: string;
  currentLevel: number;
  rankTitle: string;
  monthlyBonus: number;
  relationships: any[];
  recentCommissions: any[];
}

interface CommissionStructure {
  commissionRates: Record<number, { rate: number; description: string }>;
  rankBonuses: Record<number, { rank: string; bonus: number; description: string }>;
  baseEarnings: number;
  description: string;
}

export default function ReferralPage() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [commissionStructure, setCommissionStructure] = useState<CommissionStructure | null>(null);
  const [partnerWalletBalance, setPartnerWalletBalance] = useState<number>(0);
  const [partnerWalletData, setPartnerWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeActivities, setRealtimeActivities] = useState<Array<{
    id: string;
    type: 'referral' | 'commission' | 'wallet_update';
    message: string;
    timestamp: Date;
    amount?: number;
  }>>([]);

  const { hasCopied, onCopy } = useClipboard(referralData?.referralLink || '');
  const toast = useToast();
  const supabase = createClient();
  const { data: session } = useSession();
  const realtimeChannelRef = useRef<any>(null);
  const { language, t } = useLanguage();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    console.log('Session changed:', session);
    if (session?.user?.email) {
      console.log('User authenticated, loading referral data...');
      loadReferralData();
      fetchPartnerWalletBalance();
      setupRealtimeSubscriptions();
    } else {
      console.log('User not authenticated');
    }

    // Cleanup on unmount
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [session]);

  // Auto-refresh data every 30 seconds as backup
  useEffect(() => {
    if (!session?.user?.email) return;

    const interval = setInterval(() => {
      loadReferralData();
      fetchPartnerWalletBalance();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  const fetchPartnerWalletBalance = async () => {
    if (!session?.user?.email) return;

    try {
      // Get partner wallet balance
      const balanceResponse = await fetch('/api/partner-wallet/balance');
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setPartnerWalletBalance(balanceData.balance || 0);
      }

      // Get partner wallet commission data
      const commissionsResponse = await fetch('/api/partner-wallet/commissions');
      if (commissionsResponse.ok) {
        const commissionsData = await commissionsResponse.json();
        console.log('🔍 Partner wallet commission data:', commissionsData);
        setPartnerWalletData(commissionsData || null);
      }
    } catch (error) {
      console.error('Error fetching partner wallet data:', error);
    }
  };

  const setupRealtimeSubscriptions = async () => {
    if (!session?.user?.email) return;

    try {
      // Remove existing channel if any
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }

      // Create a new channel for real-time updates
      const channel = supabase
        .channel(`partnership-updates-${session.user.email}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_wallets',
            filter: `user_email=eq.${session.user.email}`
          },
          (payload) => {
            console.log('💰 Partner wallet updated:', payload);
            fetchPartnerWalletBalance();

            // Add to activity feed
            const newActivity = {
              id: `wallet-${Date.now()}`,
              type: 'wallet_update' as const,
              message: 'Partner wallet balance updated',
              timestamp: new Date()
            };
            setRealtimeActivities(prev => [newActivity, ...prev.slice(0, 9)]);

            toast({
              title: 'Wallet Updated',
              description: 'Your partner wallet balance has been updated',
              status: 'info',
              duration: 3000,
              isClosable: true,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'referral_relationships',
            filter: `referrer_email=eq.${session.user.email}`
          },
          (payload) => {
            console.log('👥 Referral relationship updated:', payload);
            loadReferralData();

            if (payload.eventType === 'INSERT') {
              const referral = payload.new as any;

              // Add to activity feed
              const newActivity = {
                id: `referral-${Date.now()}`,
                type: 'referral' as const,
                message: `New referral: ${referral.referred_email}`,
                timestamp: new Date()
              };
              setRealtimeActivities(prev => [newActivity, ...prev.slice(0, 9)]);

              toast({
                title: 'New Referral!',
                description: 'You have a new referral in your network',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'referral_commissions',
            filter: `earner_email=eq.${session.user.email}`
          },
          (payload) => {
            console.log('💵 Commission earned:', payload);
            loadReferralData();
            fetchPartnerWalletBalance();

            if (payload.eventType === 'INSERT') {
              const commission = payload.new as any;
              const amount = parseFloat(commission.commission_amount);

              // Add to activity feed
              const newActivity = {
                id: `commission-${Date.now()}`,
                type: 'commission' as const,
                message: `Commission earned from ${commission.referred_email}`,
                timestamp: new Date(),
                amount: amount
              };
              setRealtimeActivities(prev => [newActivity, ...prev.slice(0, 9)]);

              toast({
                title: 'Commission Earned!',
                description: `You earned $${amount.toFixed(2)} from ${commission.referred_email}`,
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);

          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time updates are now active');
          } else if (status === 'CHANNEL_ERROR') {
            console.log('❌ Real-time connection error');
          }
        });

      realtimeChannelRef.current = channel;
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        loadReferralData(),
        fetchPartnerWalletBalance()
      ]);

      toast({
        title: 'Data Refreshed',
        description: 'All partnership data has been updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh data. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateReferralCode = async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    try {
      // Create a referral code using the current user's email
      const userEmail = session.user.email;
      const referralCode = `TIC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const referralLink = `https://ticglobal.com/join?ref=${referralCode}`;

      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-referral-code',
          referralCode,
          referralLink,
          userEmail
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Reload referral data
          await loadReferralData();
          toast({
            title: 'Referral Code Generated',
            description: 'Your referral code has been created successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate referral code. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      // Get authenticated user from session
      const userEmail = session?.user?.email;

      if (!userEmail) {
        // User not authenticated - this should be handled by middleware
        setIsLoading(false);
        return;
      }

      console.log('Loading referral data for user:', userEmail);

      // Load real referral data (userEmail now handled server-side)
      const referralResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-referral-data' })
      });

      console.log('Referral response status:', referralResponse.status);

      if (referralResponse.ok) {
        const referralResult = await referralResponse.json();
        console.log('Referral result:', referralResult);
        if (referralResult.success) {
          setReferralData(referralResult.data);
        } else {
          console.error('Referral API returned error:', referralResult.error);
        }
      } else {
        const errorText = await referralResponse.text();
        console.error('Referral API failed:', referralResponse.status, errorText);
      }

      // Load real referral stats (userEmail now handled server-side)
      const statsResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-referral-stats' })
      });

      console.log('Stats response status:', statsResponse.status);

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        console.log('Stats result:', statsResult);
        if (statsResult.success) {
          setReferralStats(statsResult.data);
        } else {
          console.error('Stats API returned error:', statsResult.error);
        }
      } else {
        const errorText = await statsResponse.text();
        console.error('Stats API failed:', statsResponse.status, errorText);
      }

      // Load commission structure
      const commissionResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, action: 'get-commission-structure' })
      });

      if (commissionResponse.ok) {
        const commissionResult = await commissionResponse.json();
        if (commissionResult.success) {
          setCommissionStructure(commissionResult.data);
        }
      }

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load referral information. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    onCopy();
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'No Rank': return FaUsers;
      case 'Bronze': return FaTrophy;
      case 'Silver': return FaMedal;
      case 'Gold': return FaCrown;
      case 'Platinum': return FaGem;
      case 'Diamond': return FaGem;
      default: return FaUsers;
    }
  };

  const getRankColorFull = (rank: string) => {
    switch (rank) {
      case 'No Rank': return 'gray.500';
      case 'Bronze': return 'orange.500';
      case 'Silver': return 'gray.400';
      case 'Gold': return 'yellow.500';
      case 'Platinum': return 'purple.500';
      case 'Diamond': return 'blue.500';
      default: return 'gray.500';
    }
  };

  const getUserRank = (directReferrals: number, maxLevel: number) => {
    // Must reach 10th unilevel to qualify for ranking bonuses
    const hasUnilevelQualification = maxLevel >= 10;

    if (!hasUnilevelQualification) return 'No Rank';

    // Rank based on number of direct referrals (level 1)
    if (directReferrals >= 9) return 'Diamond';
    if (directReferrals >= 8) return 'Platinum';
    if (directReferrals >= 7) return 'Gold';
    if (directReferrals >= 6) return 'Silver';
    if (directReferrals >= 5) return 'Bronze';
    return 'No Rank';
  };

  const getReferralRank = (referralEmail: string) => {
    // For individual referrals, we'll assume they start as Common
    // In a real system, this would check each referral's own referral count
    // For now, we'll simulate some having different ranks
    const emailHash = referralEmail.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const rankIndex = emailHash % 6;
    const ranks = ['Common', 'Advance', 'Bronze', 'Silver', 'Gold', 'Platinum'];
    return ranks[rankIndex];
  };

  const getRankColor = (rank: string) => {
    switch (rank.toLowerCase()) {
      case 'common': return 'gray';
      case 'advance': return 'green';
      case 'bronze': return 'orange';
      case 'silver': return 'gray';
      case 'gold': return 'yellow';
      case 'platinum': return 'purple';
      case 'diamond': return 'blue';
      default: return 'gray';
    }
  };

  const getReferralRankColor = (rank: string) => {
    return getRankColor(rank);
  };

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <HStack spacing={4} align="center">
              <Heading size="xl" color={textColor}>
                Partner Program
              </Heading>

              {/* Manual Refresh Button */}
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                leftIcon={<Icon as={FaSync} />}
                onClick={handleManualRefresh}
                isLoading={isRefreshing}
                loadingText="Refreshing..."
              >
                Refresh
              </Button>
            </HStack>

            <Text fontSize="lg" color={subtleTextColor} maxW="2xl">
              Invite friends and earn multi-level commissions from their VIP plan earnings
            </Text>


          </VStack>

          {/* Partner Link Section */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4}>
                <Heading size="md" color={textColor}>Your Partner Link</Heading>
                <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                  Share this link with friends to start earning commissions
                </Text>
                <HStack w="full">
                  <Input
                    value={referralData?.referralLink || 'Click Refresh to generate your referral link'}
                    isReadOnly
                    bg={useColorModeValue('gray.100', 'gray.700')}
                    fontSize="sm"
                  />
                  <Button
                    leftIcon={hasCopied ? <FaCheck /> : <FaCopy />}
                    colorScheme={hasCopied ? 'green' : 'cyan'}
                    onClick={copyToClipboard}
                    minW="120px"
                    isDisabled={!referralData?.referralLink}
                  >
                    {hasCopied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </HStack>
                <HStack spacing={4} justify="space-between" w="full">
                  <VStack align="start" spacing={1}>
                    <Badge colorScheme="cyan" fontSize="sm" p={2}>
                      Code: {referralData?.referralCode || (isLoading ? 'Loading...' : 'Not Generated')}
                    </Badge>
                    <Text fontSize="xs" color={subtleTextColor}>
                      {referralData?.referralCode ? 'Share this code with friends' : 'Generate your unique referral code'}
                    </Text>
                  </VStack>
                  {!referralData?.referralCode && !isLoading && (
                    <Button
                      size="sm"
                      colorScheme="cyan"
                      onClick={generateReferralCode}
                      isLoading={isLoading}
                    >
                      Generate Code
                    </Button>
                  )}
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Stats Overview */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 6 }} spacing={6}>
            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Stat>
                  <StatLabel>Total Referrals</StatLabel>
                  <StatNumber color="cyan.500">
                    {isLoading ? <Spinner size="sm" /> : (referralStats?.totalReferrals || 0)}
                  </StatNumber>
                  <StatHelpText>All levels</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Stat>
                  <StatLabel>Direct Referrals</StatLabel>
                  <StatNumber color="blue.500">
                    {isLoading ? <Spinner size="sm" /> : (referralStats?.directReferrals || 0)}
                  </StatNumber>
                  <StatHelpText>Level 1</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Stat>
                  <StatLabel>Total Earnings</StatLabel>
                  <StatNumber color="green.500">
                    {isLoading ? <Spinner size="sm" /> : `$${(partnerWalletData?.summary?.total_earned || 0).toFixed(2)}`}
                  </StatNumber>
                  <StatHelpText>All time</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Stat>
                  <StatLabel>Monthly Earnings</StatLabel>
                  <StatNumber color="purple.500">
                    {isLoading ? <Spinner size="sm" /> : `$${(() => {
                      if (!partnerWalletData?.commissions) return '0';
                      const currentMonth = new Date().getMonth();
                      const currentYear = new Date().getFullYear();
                      const monthlyTotal = partnerWalletData.commissions
                        .filter((c: any) => {
                          const commissionDate = new Date(c.created_at);
                          return commissionDate.getMonth() === currentMonth &&
                                 commissionDate.getFullYear() === currentYear;
                        })
                        .reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount || 0), 0);
                      return monthlyTotal.toFixed(2);
                    })()}`}
                  </StatNumber>
                  <StatHelpText>This month</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Stat>
                  <StatLabel>Partner Wallet</StatLabel>
                  <StatNumber color="blue.500">
                    {isLoading ? <Spinner size="md" /> : `$${partnerWalletBalance.toFixed(2)}`}
                  </StatNumber>
                  <StatHelpText>Available balance</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderWidth={2} borderColor={getRankColorFull(getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0))}>
              <CardBody textAlign="center">
                <VStack spacing={2}>
                  <Icon
                    as={getRankIcon(getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0))}
                    boxSize={6}
                    color={getRankColorFull(getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0))}
                  />
                  <Badge
                    colorScheme={getRankColor(getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0))}
                    fontSize="sm"
                    p={2}
                  >
                    {getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0).toUpperCase()}
                  </Badge>
                  <Text fontSize="xs" color={subtleTextColor}>
                    Current Rank
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Real-time Activity Feed */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md" color={textColor}>Recent Activity</Heading>
                  <Badge colorScheme="blue" variant="subtle">Live Updates</Badge>
                </HStack>

                <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                  {realtimeActivities.length > 0 ? (
                    realtimeActivities.map((activity) => (
                      <HStack key={activity.id} p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md" justify="space-between">
                        <HStack spacing={3}>
                          <Icon
                            as={activity.type === 'commission' ? FaDollarSign : activity.type === 'referral' ? FaUsers : FaDollarSign}
                            color={activity.type === 'commission' ? 'green.500' : activity.type === 'referral' ? 'blue.500' : 'purple.500'}
                            boxSize={4}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium">{activity.message}</Text>
                            {activity.amount && (
                              <Text fontSize="xs" color="green.500" fontWeight="bold">
                                +${activity.amount.toFixed(2)}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                        <Text fontSize="xs" color={subtleTextColor}>
                          {activity.timestamp.toLocaleTimeString()}
                        </Text>
                      </HStack>
                    ))
                  ) : (
                    <VStack spacing={3} py={8}>
                      <Icon as={FaDollarSign} boxSize={12} color="gray.400" />
                      <Text color={subtleTextColor} textAlign="center">
                        No recent activity
                      </Text>
                      <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                        New referrals, commissions, and wallet updates will appear here automatically
                      </Text>
                    </VStack>
                  )}
                </VStack>
              </VStack>
            </CardBody>
          </Card>



          {/* Tabs for different sections */}
          <Tabs variant="enclosed" colorScheme="cyan">
            <TabList>
              <Tab>Community</Tab>
              <Tab>Rank Bonuses</Tab>
              <Tab>How It Works</Tab>
            </TabList>

            <TabPanels>
              {/* Community Tab */}
              <TabPanel p={0} pt={6}>
                <Card bg={cardBg}>
                  <CardBody>
                    <VStack spacing={6} align="stretch">
                      <VStack spacing={2} textAlign="center">
                        <Heading size="md" color={textColor}>My Referral Community</Heading>
                        <Text color={subtleTextColor}>
                          Your network of referrals and their status
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          Track your community growth and earnings
                        </Text>
                      </VStack>

                      {/* Current Rank Status */}
                      <Card bg={useColorModeValue('blue.50', 'blue.900')} borderWidth={2} borderColor="blue.200">
                        <CardBody textAlign="center">
                          <VStack spacing={3}>
                            <Icon as={FaTrophy} boxSize={8} color="blue.500" />
                            <Badge colorScheme={getRankColor(getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0))} fontSize="lg" p={3}>
                              CURRENT RANK: {getUserRank(referralStats?.directReferrals || 0, referralStats?.currentLevel || 0).toUpperCase()}
                            </Badge>
                            <Text fontSize="sm" color={subtleTextColor}>
                              Level {referralStats?.currentLevel || 1} • {referralStats?.totalReferrals || 0} Total Referrals
                            </Text>
                            {referralStats?.monthlyBonus && referralStats.monthlyBonus > 0 && (
                              <Text fontSize="lg" fontWeight="bold" color="green.500">
                                Monthly Bonus: ${referralStats.monthlyBonus.toLocaleString()}
                              </Text>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>

                      {/* Referrals Table */}
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Referral Email</Th>
                              <Th textAlign="center">Level</Th>
                              <Th textAlign="center">Status</Th>
                              <Th textAlign="center">Join Date</Th>
                              <Th textAlign="center">Rank</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {referralStats?.relationships && referralStats.relationships.length > 0 ? (
                              referralStats.relationships.map((referral: any, index: number) => (
                                <Tr key={index}>
                                  <Td>
                                    <HStack>
                                      <Avatar size="sm" name={referral.referred_email} />
                                      <Text fontSize="sm">{referral.referred_email}</Text>
                                    </HStack>
                                  </Td>
                                  <Td textAlign="center">
                                    <Badge
                                      colorScheme={referral.level_depth === 1 ? 'green' : 'blue'}
                                      fontSize="xs"
                                    >
                                      Level {referral.level_depth}
                                    </Badge>
                                  </Td>
                                  <Td textAlign="center">
                                    <Badge
                                      colorScheme={referral.is_active ? 'green' : 'red'}
                                      fontSize="xs"
                                    >
                                      {referral.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </Td>
                                  <Td textAlign="center">
                                    <Text fontSize="xs" color={subtleTextColor}>
                                      {new Date(referral.created_at).toLocaleDateString()}
                                    </Text>
                                  </Td>
                                  <Td textAlign="center">
                                    {(() => {
                                      const rank = getReferralRank(referral.referred_email);
                                      return (
                                        <Badge colorScheme={getReferralRankColor(rank)} fontSize="xs">
                                          {rank}
                                        </Badge>
                                      );
                                    })()}
                                  </Td>
                                </Tr>
                              ))
                            ) : (
                              <Tr>
                                <Td colSpan={5} textAlign="center" py={8}>
                                  <VStack spacing={3}>
                                    <Icon as={FaUsers} boxSize={12} color="gray.400" />
                                    <Text color={subtleTextColor}>No referrals yet</Text>
                                    <Text fontSize="sm" color={subtleTextColor}>
                                      Share your referral link to start building your community
                                    </Text>
                                  </VStack>
                                </Td>
                              </Tr>
                            )}
                          </Tbody>
                        </Table>
                      </TableContainer>



                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="bold">Rank System & Benefits (Direct Referrals + 10th Unilevel):</Text>
                          <Text fontSize="xs">• <strong>Bronze:</strong> 5 direct referrals + 10th unilevel = $690/month</Text>
                          <Text fontSize="xs">• <strong>Silver:</strong> 5 direct referrals + 10th unilevel = $2,484/month (3 Group)</Text>
                          <Text fontSize="xs">• <strong>Gold:</strong> 6 active players + 10th unilevel = $4,830/month (3 Group A,B&C)</Text>
                          <Text fontSize="xs">• <strong>Platinum:</strong> 8 active players + 10th unilevel = $8,832/month (4 Group A,B,C&D)</Text>
                          <Text fontSize="xs">• <strong>Diamond:</strong> 12 active players + 10th unilevel = $14,904/month (5 Group A,B,C,D&E)</Text>
                          <Text fontSize="xs" color="gray.600">* Must reach 10th unilevel to qualify for ranking bonuses</Text>
                          <Text fontSize="xs" color="gray.600">* Bonus paid 50% GIC tokens + 50% TIC tokens</Text>
                        </VStack>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>

              {/* Rank Bonuses Tab */}
              <TabPanel p={0} pt={6}>
                <Card bg={cardBg}>
                  <CardBody>
                    <VStack spacing={6} align="stretch">
                      <VStack spacing={2} textAlign="center">
                        <Heading size="md" color={textColor}>Referral Bonus Structure</Heading>
                        <Text color={subtleTextColor} fontWeight="bold">
                          Rank up reward and incentive program
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          Exclusive for levels 11th-15th only
                        </Text>
                      </VStack>

                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        {commissionStructure && Object.entries(commissionStructure.rankBonuses)
                          .filter(([level, data]) => data.rank !== 'Common' && data.rank !== 'Advance')
                          .map(([level, data]) => {
                          const IconComponent = getRankIcon(data.rank);
                          const rankColor = getRankColorFull(data.rank);

                          return (
                            <Card key={level} bg={useColorModeValue('gray.50', 'gray.700')} borderWidth={2} borderColor={rankColor}>
                              <CardBody textAlign="center">
                                <VStack spacing={3}>
                                  <Icon as={IconComponent} boxSize={8} color={rankColor} />
                                  <Badge colorScheme={data.rank.toLowerCase()} fontSize="md" p={2}>
                                    {level}TH LEVEL
                                  </Badge>
                                  <Heading size="sm" color={rankColor}>
                                    {data.rank.toUpperCase()}
                                  </Heading>
                                  <Text fontSize="lg" fontWeight="bold" color="green.500">
                                    ${data.bonus.toLocaleString()}/MOS.
                                  </Text>
                                  <Text fontSize="xs" color={subtleTextColor}>
                                    Monthly bonus reward
                                  </Text>
                                </VStack>
                              </CardBody>
                            </Card>
                          );
                        })}
                      </SimpleGrid>

                      <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="bold">Bronze Rank Example (5 Direct - 2 Group):</Text>
                          <Text fontSize="xs">• PL (Personal Line): A = $6,900</Text>
                          <Text fontSize="xs">• WL (Weak Line): B+C+D+E = $1,380+$1,380+$1,380+$2,760 = $13,800</Text>
                          <Text fontSize="xs">• Calculation: $13,800 × 5% = $690/2 = $345</Text>
                          <Text fontSize="xs">• Bonus: $345 GIC + $345 TIC = $690 total</Text>

                          <Divider my={2} />

                          <Text fontSize="sm" fontWeight="bold">Silver Rank Example (5 Direct - 3 Group):</Text>
                          <Text fontSize="xs">• WL (Weak Line): A = $13,800</Text>
                          <Text fontSize="xs">• PL (Personal Line): B+C+D+E = $6,900+$6,900+$1,380+$12,420 = $27,600</Text>
                          <Text fontSize="xs">• Calculation: $41,400 × 6% = $2,484/2 = $1,242</Text>
                          <Text fontSize="xs">• Bonus: $1,242 GIC + $1,242 TIC = $2,484 total</Text>
                          <Text fontSize="xs" color="gray.600">• Requires: 5 direct referrals + 10th unilevel</Text>

                          <Divider my={2} />

                          <Text fontSize="sm" fontWeight="bold">Gold Rank Example (6 Active Players - 3 Group A,B&C):</Text>
                          <Text fontSize="xs">• WL (Weak Line): A = $23,000</Text>
                          <Text fontSize="xs">• PL (Personal Line): B+C+D+E = $4,140+$11,500+$11,500+$18,860 = $46,000</Text>
                          <Text fontSize="xs">• Total Volume: $23,000 + $46,000 = $69,000</Text>
                          <Text fontSize="xs">• Calculation: $69,000 × 7% = $4,830/2 = $2,415</Text>
                          <Text fontSize="xs">• Bonus: $2,415 GIC + $2,415 TIC = $4,830 total</Text>
                          <Text fontSize="xs" color="gray.600">• Requires: 6 active players + 10th unilevel</Text>

                          <Divider my={2} />

                          <Text fontSize="sm" fontWeight="bold">Platinum Rank Example (8 Active Players - 4 Group A,B,C&D):</Text>
                          <Text fontSize="xs">• WL (Weak Line): A = $27,600</Text>
                          <Text fontSize="xs">• PL (Personal Line): B+C+D+E = $1,380+$1,380+$40,020+$40,020 = $82,800</Text>
                          <Text fontSize="xs">• Total Volume: $27,600 + $82,800 = $110,400</Text>
                          <Text fontSize="xs">• Calculation: $110,400 × 8% = $8,832/2 = $4,416</Text>
                          <Text fontSize="xs">• Bonus: $4,416 GIC + $4,416 TIC = $8,832 total</Text>
                          <Text fontSize="xs" color="gray.600">• Requires: 8 active players + 10th unilevel</Text>

                          <Divider my={2} />

                          <Text fontSize="sm" fontWeight="bold">Diamond Rank Example (12 Active Players - 5 Group A,B,C,D&E):</Text>
                          <Text fontSize="xs">• PL (Personal Line): A = $33,120</Text>
                          <Text fontSize="xs">• WL (Weak Line): B+C+D+E = $32,970+$32,970+$32,970+$32,970 = $131,880</Text>
                          <Text fontSize="xs">• Total Volume: $33,120 + $131,880 = $165,000</Text>
                          <Text fontSize="xs">• Calculation: $165,000 × 9% = $14,904/2 = $7,452</Text>
                          <Text fontSize="xs">• Bonus: $7,452 GIC + $7,452 TIC = $14,904 total</Text>
                          <Text fontSize="xs" color="gray.600">• Requires: 12 active players + 10th unilevel</Text>
                        </VStack>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>

              {/* How It Works Tab */}
              <TabPanel p={0} pt={6}>
                <Card bg={cardBg}>
                  <CardBody>
                    <VStack spacing={6} align="stretch">
                      <Heading size="md" color={textColor} textAlign="center">
                        How the Referral System Works
                      </Heading>

                      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                        <VStack spacing={4} align="stretch">
                          <Heading size="sm" color="cyan.500">📋 Getting Started</Heading>
                          <VStack spacing={2} align="start">
                            <Text fontSize="sm">1. Share your unique referral link</Text>
                            <Text fontSize="sm">2. Friends join using your link</Text>
                            <Text fontSize="sm">3. They purchase VIP plans ({formatCurrency(138, language)} each)</Text>
                            <Text fontSize="sm">4. You earn daily commissions automatically</Text>
                          </VStack>
                        </VStack>

                        <VStack spacing={4} align="stretch">
                          <Heading size="sm" color="green.500">💰 Earnings Calculation</Heading>
                          <VStack spacing={2} align="start">
                            <Text fontSize="sm">• Base earnings: {formatCurrency(0.44, language)} daily per VIP plan</Text>
                            <Text fontSize="sm">• Level 1: 10% = $0.04 daily bonus</Text>
                            <Text fontSize="sm">• Levels 2-6: 5% = $0.02 daily bonus</Text>
                            <Text fontSize="sm">• Levels 7-10: 2.5% = $0.01 daily bonus</Text>
                            <Text fontSize="sm">• Levels 11-15: 1% = $0.004 daily bonus</Text>
                          </VStack>
                        </VStack>

                        <VStack spacing={4} align="stretch">
                          <Heading size="sm" color="blue.500">🎯 Plan Requirements</Heading>
                          <VStack spacing={2} align="start">
                            <Text fontSize="sm">• <strong>Starter Plan:</strong> Earn from Level 1 only</Text>
                            <Text fontSize="sm">• <strong>VIP Plan:</strong> Earn from all 15 levels</Text>
                            <Text fontSize="sm">• Multiple accounts multiply earnings</Text>
                            <Text fontSize="sm">• Rank bonuses unlock at levels 11-15</Text>
                          </VStack>
                        </VStack>

                        <VStack spacing={4} align="stretch">
                          <Heading size="sm" color="purple.500">🏆 Rank Progression</Heading>
                          <VStack spacing={2} align="start">
                            <Text fontSize="sm">• Bronze: 5 direct + 10th unilevel = $690/month</Text>
                            <Text fontSize="sm">• Silver: 5 direct + 10th unilevel = $2,484/month (3 Group)</Text>
                            <Text fontSize="sm">• Gold: 6 active players + 10th unilevel = $4,830/month (3 Group A,B&C)</Text>
                            <Text fontSize="sm">• Platinum: 8 active players + 10th unilevel = $8,832/month (4 Group A,B,C&D)</Text>
                            <Text fontSize="sm">• Diamond: 12 active players + 10th unilevel = $14,904/month (5 Group A,B,C,D&E)</Text>
                            <Text fontSize="xs" color="gray.500">All bonuses paid 50% GIC + 50% TIC</Text>
                          </VStack>
                        </VStack>
                      </SimpleGrid>

                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="bold">💡 Pro Tips:</Text>
                          <Text fontSize="xs">• Focus on helping referrals succeed with VIP plans</Text>
                          <Text fontSize="xs">• Build deep networks for maximum commission levels</Text>
                          <Text fontSize="xs">• Rank bonuses provide substantial monthly income</Text>
                          <Text fontSize="xs">• Commissions are paid automatically daily</Text>
                        </VStack>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>



              {/* How It Works Tab - Educational content about commission system */}
              <TabPanel>
                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                  <CardBody>
                    <VStack spacing={6} align="stretch">
                      <HStack>
                        <Icon as={FaDollarSign} color="green.500" boxSize={6} />
                        <Heading size="lg" color={textColor}>How Commission System Works</Heading>
                      </HStack>

                      <Text color={subtleTextColor}>
                        Learn about the unilevel commission system and how you can earn daily commissions from your referral network.
                      </Text>

                      {/* Commission Structure */}
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={2}>
                          <Text fontWeight="medium">💰 Earnings Calculation</Text>
                          <Text fontSize="sm">• Base earnings: $0.44 daily per VIP plan</Text>
                          <Text fontSize="xs" color="gray.600">The $0.44 is from the earnings of your unilevel per $138 VIP plan.</Text>
                          <Text fontSize="sm" mt={2}>Unilevel Earnings calculation:</Text>
                          <Text fontSize="xs">$138 x 10% = $13.8 monthly or $0.44 daily per account</Text>
                          <Text fontSize="xs">(System detects if your referral has multiple plan accounts)</Text>
                        </VStack>
                      </Alert>

                      {/* Commission Rates */}
                      <Box>
                        <Text fontWeight="medium" mb={3} color={textColor}>Referral Commission = Level × Unilevel Earnings Daily</Text>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <VStack align="start" spacing={2}>
                            <HStack>
                              <Badge colorScheme="green">Level 1</Badge>
                              <Text fontSize="sm">10% = $0.044 daily bonus</Text>
                            </HStack>
                            <HStack>
                              <Badge colorScheme="blue">Levels 2-6</Badge>
                              <Text fontSize="sm">5% = $0.022 daily bonus</Text>
                            </HStack>
                          </VStack>
                          <VStack align="start" spacing={2}>
                            <HStack>
                              <Badge colorScheme="orange">Levels 7-10</Badge>
                              <Text fontSize="sm">2.5% = $0.011 daily bonus</Text>
                            </HStack>
                            <HStack>
                              <Badge colorScheme="red">Levels 11-15</Badge>
                              <Text fontSize="sm">1% = $0.0044 daily bonus</Text>
                            </HStack>
                          </VStack>
                        </SimpleGrid>
                      </Box>

                      {/* Access Rules */}
                      <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">Access Rules:</Text>
                          <Text fontSize="sm">• VIP Plan members can access and earn commission up to 15th level referrals</Text>
                          <Text fontSize="sm">• Starter Plan members can earn commission from level 1 only</Text>
                        </VStack>
                      </Alert>

                      {/* How It Works Steps */}
                      <Box>
                        <Text fontWeight="medium" mb={3} color={textColor}>How It Works:</Text>
                        <VStack align="start" spacing={3}>
                          <HStack align="start">
                            <Badge colorScheme="purple" variant="solid">1</Badge>
                            <Text fontSize="sm">Your referrals purchase VIP plans ({formatCurrency(138, language)} each)</Text>
                          </HStack>
                          <HStack align="start">
                            <Badge colorScheme="purple" variant="solid">2</Badge>
                            <Text fontSize="sm">System calculates daily earnings: {formatCurrency(138, language)} × 10% ÷ 30 = {formatCurrency(0.44, language)} per VIP account</Text>
                          </HStack>
                          <HStack align="start">
                            <Badge colorScheme="purple" variant="solid">3</Badge>
                            <Text fontSize="sm">You earn commission based on your level relationship and plan type</Text>
                          </HStack>
                          <HStack align="start">
                            <Badge colorScheme="purple" variant="solid">4</Badge>
                            <Text fontSize="sm">Commissions are automatically distributed daily to your Partner Wallet</Text>
                          </HStack>
                          <HStack align="start">
                            <Badge colorScheme="purple" variant="solid">5</Badge>
                            <Text fontSize="sm">Transfer earnings to main wallet anytime for withdrawals or purchases</Text>
                          </HStack>
                        </VStack>
                      </Box>

                      {/* Example Calculation */}
                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">Example Calculation:</Text>
                          <Text fontSize="sm">If you have a Level 1 referral with 2 VIP accounts:</Text>
                          <Text fontSize="sm" color="green.600">Daily Commission = {formatCurrency(0.44, language)} × 10% × 2 accounts = {formatCurrency(0.088, language)}</Text>
                          <Text fontSize="sm" color="green.600">Monthly Commission = {formatCurrency(0.088, language)} × 30 days = {formatCurrency(2.64, language)}</Text>
                        </VStack>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}
