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
  Progress,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Divider,
  SimpleGrid,
  Button,
  Spinner
} from '@chakra-ui/react';
import { FaCoins, FaCalendarAlt, FaClock, FaSync } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';

interface TokenDistribution {
  id: string;
  plan_id: string;
  plan_name: string;
  token_amount: number;
  distribution_date: string;
  status: string;
}

interface TokenDistributionCardProps {
  userEmail: string;
  subscription: {
    id: string;
    plan_id: string;
    plan_name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
}

// Token allocation per plan (total for 1-year plan duration)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,    // Total TIC tokens for 1-year VIP plan
  'starter': 500  // Total TIC tokens for 1-year Starter plan
};

// TIC token price
const TIC_PRICE = 0.02; // 0.02 USD per TIC

const TokenDistributionCard: React.FC<TokenDistributionCardProps> = ({ userEmail, subscription }) => {
  const [distributions, setDistributions] = useState<TokenDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalTokensReceived, setTotalTokensReceived] = useState(0);
  const { language } = useLanguage();

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const distributionItemBg = useColorModeValue('gray.50', 'gray.600');

  const fetchDistributions = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      console.log(`🔍 ${isRefresh ? 'Refreshing' : 'Fetching'} distributions for user: ${userEmail}, plan: ${subscription.plan_id}, subscription: ${subscription.id}`);

      // Use the distribution/history API to fetch ALL distributions for the user (not just this plan)
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/distribution/history?limit=30&_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('📊 Distribution API response:', data);

      if (data.success || data.distributions) {
        // Use all distributions for the user (from all their subscriptions)
        // This will show the complete daily distribution history
        const allDistributions = data.distributions || [];

        console.log(`📊 Found ${allDistributions.length} total distributions for user`);

        // Filter and sort distributions for this specific plan only
        const currentPlanId = subscription.plan_id?.toLowerCase();
        const planSpecificDistributions = allDistributions.filter((dist: TokenDistribution) =>
          dist.plan_id?.toLowerCase() === currentPlanId
        );

        const sortedDistributions = planSpecificDistributions.sort((a: TokenDistribution, b: TokenDistribution) =>
          new Date(b.distribution_date).getTime() - new Date(a.distribution_date).getTime()
        );

        setDistributions(sortedDistributions);

        // Calculate total tokens received from THIS specific plan only
        const totalTokens = planSpecificDistributions.reduce(
          (sum: number, dist: TokenDistribution) => sum + parseFloat(dist.token_amount.toString()),
          0
        );
        setTotalTokensReceived(totalTokens);

        console.log(`💰 Total TIC tokens received from ${subscription.plan_name || subscription.plan_id} plan: ${totalTokens}`);
        console.log(`📋 Recent distributions:`, sortedDistributions.slice(0, 5).map((d: TokenDistribution) => ({
          date: d.distribution_date,
          amount: d.token_amount,
          status: d.status
        })));
      } else {
        console.error('❌ Distribution API error:', data.error);
        setDistributions([]);
        setTotalTokensReceived(0);
      }
    } catch (error) {
      console.error('❌ Error fetching token distributions:', error);
      setDistributions([]);
      setTotalTokensReceived(0);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchDistributions(true);
  };

  useEffect(() => {
    if (userEmail && subscription.plan_id) {
      fetchDistributions();
    }
  }, [userEmail, subscription.plan_id, subscription.id]);

  const planAllocation = TOKEN_ALLOCATIONS[subscription.plan_id as keyof typeof TOKEN_ALLOCATIONS] || 0;
  const dailyAllocation = planAllocation / 365; // Exact daily allocation without rounding

  // Calculate progress (how much of the 12-month period has passed)
  const startDate = new Date(subscription.start_date);
  const endDate = new Date(subscription.end_date);
  const currentDate = new Date();

  // Total days in the subscription (should be 365 days for 12 months)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.max(0, Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercentage = Math.min((daysPassed / totalDays) * 100, 100);

  // Expected tokens based on days passed (capped at plan allocation)
  const expectedTokens = Math.min(daysPassed * dailyAllocation, planAllocation);

  // Days remaining in the 12-month period
  const daysRemaining = Math.max(totalDays - daysPassed, 0);

  if (isLoading) {
    return (
      <Card bg={cardBg} borderRadius="lg" shadow="md">
        <CardBody p={6}>
          <Text color={textColor}>Loading token distribution...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Heading as="h3" size="md" color={textColor}>
          {subscription.plan_name}
        </Heading>
        <Badge colorScheme="green" variant="solid">
          ACTIVE
        </Badge>
      </HStack>

      {/* Plan Duration Info */}
      <HStack justify="space-between" fontSize="sm" color={subtleTextColor}>
        <Text>Started: {new Date(subscription.start_date).toLocaleDateString()}</Text>
        <Text>Expires: {new Date(subscription.end_date).toLocaleDateString()}</Text>
      </HStack>

      <Divider />

      {/* TIC Token Distribution Section */}
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={FaCoins} color="orange.500" boxSize={5} />
            <Heading as="h4" size="sm" color={textColor}>
              TIC Token Distribution
            </Heading>
          </HStack>
          <Button
            size="xs"
            variant="outline"
            colorScheme="blue"
            leftIcon={isRefreshing ? <Spinner size="xs" /> : <Icon as={FaSync} />}
            onClick={handleRefresh}
            isLoading={isRefreshing}
            loadingText="Refreshing"
          >
            Refresh
          </Button>
        </HStack>

        {/* Token Statistics */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat>
            <StatLabel color={subtleTextColor}>Daily Tokens</StatLabel>
            <StatNumber color={textColor} fontSize="lg">{dailyAllocation.toFixed(2)}</StatNumber>
            <StatHelpText color={subtleTextColor}>TIC/day ({formatCurrency(dailyAllocation * TIC_PRICE, language)})</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel color={subtleTextColor}>Received</StatLabel>
            <StatNumber color={textColor} fontSize="lg">{totalTokensReceived.toFixed(2)}</StatNumber>
            <StatHelpText color={subtleTextColor}>TIC (${(totalTokensReceived * TIC_PRICE).toFixed(2)})</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel color={subtleTextColor}>Plan Allocation</StatLabel>
            <StatNumber color={textColor} fontSize="lg">{planAllocation}</StatNumber>
            <StatHelpText color={subtleTextColor}>TIC (${planAllocation * TIC_PRICE})</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel color={subtleTextColor}>Days Remaining</StatLabel>
            <StatNumber color={textColor} fontSize="lg">{daysRemaining}</StatNumber>
            <StatHelpText color={subtleTextColor}>days left</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Progress Bar */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color={subtleTextColor}>Distribution Progress</Text>
            <Text fontSize="sm" color={textColor}>{progressPercentage.toFixed(1)}%</Text>
          </HStack>
          <Progress
            value={progressPercentage}
            colorScheme="orange"
            size="md"
            borderRadius="md"
          />
          <HStack justify="space-between">
            <Text fontSize="xs" color={subtleTextColor}>
              Expected: {expectedTokens} TIC (${expectedTokens * TIC_PRICE})
            </Text>
            <Text fontSize="xs" color={subtleTextColor}>
              Target: {planAllocation} TIC (${planAllocation * TIC_PRICE})
            </Text>
          </HStack>
        </VStack>

        {/* Recent Distributions */}
        <Divider />
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm" fontWeight="medium" color={textColor}>
            Recent Distributions ({subscription.plan_name || subscription.plan_id?.toUpperCase() || 'This Plan'})
          </Text>
          {distributions.length > 0 ? (
            (() => {
              // Distributions are already filtered for this specific plan
              // Just slice to show the most recent 10 distributions
              const recentDistributions = distributions.slice(0, 10);

              return recentDistributions.map((dist: any, index: number) => (
                <HStack key={`${dist.id}-${index}`} justify="space-between" p={2} bg={distributionItemBg} borderRadius="md">
                  <HStack spacing={2}>
                    <Icon as={FaCalendarAlt} color={subtleTextColor} boxSize={3} />
                    <Text fontSize="xs" color={subtleTextColor}>
                      {new Date(dist.distribution_date).toLocaleDateString()}
                    </Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Text fontSize="xs" fontWeight="medium" color={textColor}>
                      +{parseFloat(dist.token_amount.toString()).toFixed(2)} TIC
                    </Text>
                    <Badge
                      size="sm"
                      colorScheme={dist.status === 'completed' ? 'green' : 'red'}
                    >
                      {dist.status}
                    </Badge>
                  </HStack>
                </HStack>
              ));
            })()
          ) : (
            <VStack spacing={2} py={4}>
              <Icon as={FaClock} color={subtleTextColor} boxSize={6} />
              <Text fontSize="sm" color={subtleTextColor} textAlign="center">
                No distributions yet for this subscription
              </Text>
              <Text fontSize="xs" color={subtleTextColor} textAlign="center">
                TIC tokens are distributed daily. Your first distribution will appear here within 24 hours of subscription activation.
              </Text>
              <Text fontSize="xs" color="blue.500" textAlign="center" fontWeight="medium">
                Started: {new Date(subscription.start_date).toLocaleDateString()}
              </Text>
            </VStack>
          )}
        </VStack>
      </VStack>
    </VStack>
  );
};

export default TokenDistributionCard;
