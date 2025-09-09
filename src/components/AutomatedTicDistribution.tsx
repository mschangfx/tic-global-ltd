'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
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
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { FaCoins, FaClock, FaRocket, FaCheckCircle, FaCalendarAlt, FaSync, FaPlay } from 'react-icons/fa';

interface DistributionStatus {
  nextDistributionTime: string;
  timeUntilNext: number;
  todayDistributed: boolean;
  totalDistributionsToday: number;
  expectedAmount: {
    vip: number;
    starter: number;
  };
  lastDistribution?: {
    date: string;
    amount: number;
    status: string;
  };
}

interface AutomatedTicDistributionProps {
  userEmail?: string;
  showAdminControls?: boolean;
}

const AutomatedTicDistribution: React.FC<AutomatedTicDistributionProps> = ({ 
  userEmail, 
  showAdminControls = false 
}) => {
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
  const [isRunningDistribution, setIsRunningDistribution] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.300');

  // Calculate next distribution time (midnight UTC)
  const getNextDistributionTime = (): Date => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0); // Next midnight UTC
    return nextMidnight;
  };

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextDistribution = getNextDistributionTime();
      const timeDiff = nextDistribution.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const totalSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        setCountdown({ hours, minutes, seconds, totalSeconds });
      } else {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch distribution status
  const fetchDistributionStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check today's distribution status
      const response = await fetch('/api/cron/daily-tic-distribution');
      const data = await response.json();
      
      const nextDistribution = getNextDistributionTime();
      const now = new Date();
      const timeUntilNext = nextDistribution.getTime() - now.getTime();
      
      setDistributionStatus({
        nextDistributionTime: nextDistribution.toISOString(),
        timeUntilNext: Math.max(0, timeUntilNext),
        todayDistributed: (data.total_distributed || 0) > 0,
        totalDistributionsToday: data.total_distributed || 0,
        expectedAmount: {
          vip: 18.904109589, // 6900 / 365
          starter: 1.369863014 // 500 / 365
        },
        lastDistribution: data.distributions?.[0] ? {
          date: data.distributions[0].distribution_date,
          amount: parseFloat(data.distributions[0].token_amount),
          status: data.distributions[0].status
        } : undefined
      });
    } catch (error) {
      console.error('Failed to fetch distribution status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run manual distribution (admin only)
  const runManualDistribution = async () => {
    if (!showAdminControls) return;
    
    try {
      setIsRunningDistribution(true);
      
      const response = await fetch('/api/unified-daily-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh status after successful distribution
        await fetchDistributionStatus();
      }
    } catch (error) {
      console.error('Failed to run manual distribution:', error);
    } finally {
      setIsRunningDistribution(false);
    }
  };

  // Auto-refresh status every 5 minutes
  useEffect(() => {
    fetchDistributionStatus();
    const interval = setInterval(fetchDistributionStatus, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Auto-run distribution when countdown reaches zero (if admin controls enabled)
  useEffect(() => {
    if (showAdminControls && countdown.totalSeconds === 0 && distributionStatus && !distributionStatus.todayDistributed) {
      runManualDistribution();
    }
  }, [countdown.totalSeconds, showAdminControls, distributionStatus]);

  if (isLoading) {
    return (
      <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
        <CardBody>
          <VStack spacing={4}>
            <Spinner size="lg" color={accentColor} />
            <Text color={subtleTextColor}>Loading distribution status...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  const progressPercentage = distributionStatus ? 
    Math.max(0, Math.min(100, ((24 * 3600 - countdown.totalSeconds) / (24 * 3600)) * 100)) : 0;

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1} shadow="md">
      <CardHeader>
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon as={FaRocket} color={accentColor} boxSize={6} />
            <VStack align="start" spacing={0}>
              <Heading size="md" color={textColor}>
                Automated TIC Distribution
              </Heading>
              <Text fontSize="sm" color={subtleTextColor}>
                Daily distribution runs at midnight UTC
              </Text>
            </VStack>
          </HStack>
          <Badge
            colorScheme={distributionStatus?.todayDistributed ? 'green' : 'blue'}
            variant="solid"
            px={3}
            py={1}
          >
            {distributionStatus?.todayDistributed ? 'Distributed Today' : 'Pending'}
          </Badge>
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={6} align="stretch">
          
          {/* Countdown Timer */}
          <Box>
            <HStack justify="space-between" mb={3}>
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Next Distribution In:
              </Text>
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<Icon as={FaSync} />}
                onClick={fetchDistributionStatus}
                color={subtleTextColor}
              >
                Refresh
              </Button>
            </HStack>
            
            <HStack spacing={4} justify="center" mb={4}>
              <VStack spacing={1}>
                <CircularProgress
                  value={countdown.hours > 0 ? (countdown.hours / 24) * 100 : 0}
                  size="60px"
                  color="blue.400"
                  trackColor="gray.200"
                >
                  <CircularProgressLabel fontSize="sm" fontWeight="bold">
                    {countdown.hours.toString().padStart(2, '0')}
                  </CircularProgressLabel>
                </CircularProgress>
                <Text fontSize="xs" color={subtleTextColor}>Hours</Text>
              </VStack>
              
              <VStack spacing={1}>
                <CircularProgress
                  value={countdown.minutes > 0 ? (countdown.minutes / 60) * 100 : 0}
                  size="60px"
                  color="green.400"
                  trackColor="gray.200"
                >
                  <CircularProgressLabel fontSize="sm" fontWeight="bold">
                    {countdown.minutes.toString().padStart(2, '0')}
                  </CircularProgressLabel>
                </CircularProgress>
                <Text fontSize="xs" color={subtleTextColor}>Minutes</Text>
              </VStack>
              
              <VStack spacing={1}>
                <CircularProgress
                  value={countdown.seconds > 0 ? (countdown.seconds / 60) * 100 : 0}
                  size="60px"
                  color="orange.400"
                  trackColor="gray.200"
                >
                  <CircularProgressLabel fontSize="sm" fontWeight="bold">
                    {countdown.seconds.toString().padStart(2, '0')}
                  </CircularProgressLabel>
                </CircularProgress>
                <Text fontSize="xs" color={subtleTextColor}>Seconds</Text>
              </VStack>
            </HStack>

            <Progress
              value={progressPercentage}
              colorScheme="blue"
              size="sm"
              borderRadius="full"
              bg="gray.200"
            />
            <Text fontSize="xs" color={subtleTextColor} textAlign="center" mt={2}>
              {progressPercentage.toFixed(1)}% through current distribution cycle
            </Text>
          </Box>

          <Divider />

          {/* Distribution Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat>
              <StatLabel fontSize="xs">Today's Status</StatLabel>
              <StatNumber fontSize="lg" color={distributionStatus?.todayDistributed ? 'green.500' : 'orange.500'}>
                {distributionStatus?.todayDistributed ? 'Complete' : 'Pending'}
              </StatNumber>
              <StatHelpText fontSize="xs">
                {distributionStatus?.totalDistributionsToday || 0} distributions
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">VIP Daily</StatLabel>
              <StatNumber fontSize="lg" color="purple.500">
                {distributionStatus?.expectedAmount.vip.toFixed(2)} TIC
              </StatNumber>
              <StatHelpText fontSize="xs">
                6900 TIC/year
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">Starter Daily</StatLabel>
              <StatNumber fontSize="lg" color="blue.500">
                {distributionStatus?.expectedAmount.starter.toFixed(2)} TIC
              </StatNumber>
              <StatHelpText fontSize="xs">
                500 TIC/year
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">Next Run</StatLabel>
              <StatNumber fontSize="lg" color={accentColor}>
                00:00
              </StatNumber>
              <StatHelpText fontSize="xs">
                UTC Daily
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Last Distribution Info */}
          {distributionStatus?.lastDistribution && (
            <>
              <Divider />
              <Alert status="success" variant="left-accent">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Last Distribution: {new Date(distributionStatus.lastDistribution.date).toLocaleDateString()}
                  </Text>
                  <Text fontSize="xs" color={subtleTextColor}>
                    Amount: +{distributionStatus.lastDistribution.amount.toFixed(4)} TIC • 
                    Status: {distributionStatus.lastDistribution.status}
                  </Text>
                </VStack>
              </Alert>
            </>
          )}

          {/* Admin Controls */}
          {showAdminControls && (
            <>
              <Divider />
              <HStack spacing={3}>
                <Button
                  leftIcon={<Icon as={FaPlay} />}
                  colorScheme="blue"
                  size="sm"
                  onClick={runManualDistribution}
                  isLoading={isRunningDistribution}
                  loadingText="Running..."
                  isDisabled={distributionStatus?.todayDistributed}
                >
                  Run Manual Distribution
                </Button>
                <Tooltip label="This will run the daily TIC distribution immediately">
                  <Button
                    leftIcon={<Icon as={FaSync} />}
                    variant="outline"
                    size="sm"
                    onClick={fetchDistributionStatus}
                  >
                    Refresh Status
                  </Button>
                </Tooltip>
              </HStack>
            </>
          )}

          {/* System Status */}
          <Alert status="info" variant="subtle">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              <strong>Automated System:</strong> TIC tokens are distributed automatically every day at midnight UTC. 
              VIP users receive 18.90 TIC/day, Starter users receive 1.37 TIC/day. 
              The system runs via Vercel cron jobs and requires no manual intervention.
            </AlertDescription>
          </Alert>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default AutomatedTicDistribution;
