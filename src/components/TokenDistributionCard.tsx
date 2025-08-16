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
  SimpleGrid
} from '@chakra-ui/react';
import { FaCoins, FaCalendarAlt, FaClock } from 'react-icons/fa';
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
  const [totalTokensReceived, setTotalTokensReceived] = useState(0);
  const { language } = useLanguage();

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const distributionItemBg = useColorModeValue('gray.50', 'gray.600');

  useEffect(() => {
    const fetchDistributions = async () => {
      try {
        const response = await fetch(`/api/tokens/distribute?planId=${encodeURIComponent(subscription.plan_id)}&limit=30`);
        const data = await response.json();

        if (data.success) {
          // Filter distributions to only show this specific plan
          const planDistributions = (data.distributions || []).filter(
            (dist: TokenDistribution) => dist.plan_id === subscription.plan_id
          );
          setDistributions(planDistributions);

          // Calculate total tokens received for this specific plan only
          const planTotalTokens = planDistributions.reduce(
            (sum: number, dist: TokenDistribution) => sum + parseFloat(dist.token_amount.toString()),
            0
          );
          setTotalTokensReceived(planTotalTokens);
        }
      } catch (error) {
        console.error('Error fetching token distributions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userEmail && subscription.plan_id) {
      fetchDistributions();
    }
  }, [userEmail, subscription.plan_id]);

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
        <HStack spacing={2}>
          <Icon as={FaCoins} color="orange.500" boxSize={5} />
          <Heading as="h4" size="sm" color={textColor}>
            TIC Token Distribution
          </Heading>
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
        {distributions.length > 0 && (
          <>
            <Divider />
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Recent Distributions (Last 5)
              </Text>
              {distributions.slice(0, 5).map((dist) => (
                <HStack key={dist.id} justify="space-between" p={2} bg={distributionItemBg} borderRadius="md">
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
              ))}
            </VStack>
          </>
        )}
      </VStack>
    </VStack>
  );
};

export default TokenDistributionCard;
