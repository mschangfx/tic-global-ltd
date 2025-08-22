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
import { FaCrown, FaUsers, FaDollarSign, FaSync, FaCalculator, FaChartPie } from 'react-icons/fa';

interface GroupVolume {
  group_letter: string;
  group_volume: number;
  active_players: number;
}

interface RankQualification {
  qualified_rank: string;
  bonus_amount: number;
  is_qualified: boolean;
  total_volume: number;
  total_active_players: number;
  bonus_percentage: number;
}

export default function TestGroupVolumeRanks() {
  const { data: session } = useSession();
  const [groupData, setGroupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  const fetchGroupData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/group-volume-ranks');
      const data = await response.json();

      if (data.success) {
        setGroupData(data);
      } else {
        setError(data.error || 'Failed to fetch group volume data');
      }
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateVolumes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/group-volume-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate-volumes' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Volumes Calculated',
          description: 'Group volumes and rank qualification updated',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchGroupData(); // Refresh data
      } else {
        toast({
          title: 'Calculation Failed',
          description: data.error || 'Failed to calculate volumes',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error calculating volumes:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to calculate group volumes',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testBonusDistribution = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/group-volume-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-bonus-distribution' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Bonus Distribution Test',
          description: `Bonus distribution ${data.bonus_distributed ? 'successful' : 'not qualified'}`,
          status: data.bonus_distributed ? 'success' : 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Distribution Test Failed',
          description: data.error || 'Failed to test bonus distribution',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing bonus distribution:', error);
      toast({
        title: 'Network Error',
        description: 'Failed to test bonus distribution',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchGroupData();
    }
  }, [session]);

  if (!session?.user?.email) {
    return (
      <Box p={6} maxW="1200px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          Please log in to test group volume rank system
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

  const getRankRequirements = () => [
    {
      rank: 'Bronze',
      players: 5,
      groups: 2,
      volume: 13800,
      percentage: 5,
      bonus: 690,
      structure: 'A: $6,900 | B: $1,380+'
    },
    {
      rank: 'Silver',
      players: 5,
      groups: 3,
      volume: 41400,
      percentage: 6,
      bonus: 2484,
      structure: 'A: $13,800 | B: $6,900 | C: $6,900+'
    },
    {
      rank: 'Gold',
      players: 6,
      groups: 3,
      volume: 69000,
      percentage: 7,
      bonus: 4830,
      structure: 'A: $23,000 | B: $4,140 | C: $11,500+'
    },
    {
      rank: 'Platinum',
      players: 8,
      groups: 4,
      volume: 110400,
      percentage: 8,
      bonus: 8832,
      structure: 'A: $27,600 | B: $1,380 | C: $1,380 | D: $40,020+'
    },
    {
      rank: 'Diamond',
      players: 12,
      groups: 5,
      volume: 165600,
      percentage: 9,
      bonus: 14904,
      structure: 'A: $33,120 | B-E: $32,970 each'
    }
  ];

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            Group Volume Rank System Test
          </Heading>
          <HStack spacing={2}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchGroupData}
              isLoading={isLoading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<FaCalculator />}
              colorScheme="blue"
              onClick={calculateVolumes}
              isLoading={isLoading}
              size="sm"
            >
              Calculate
            </Button>
          </HStack>
        </Flex>

        <Text color="gray.600">
          Testing group volume rank system for user: {session.user.email}
        </Text>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Current Status */}
        {groupData && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Current Rank Status</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Current Rank</StatLabel>
                    <StatNumber color={`${getRankColor(groupData.progress_analysis.current_rank)}.500`}>
                      {groupData.progress_analysis.current_rank}
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Volume</StatLabel>
                    <StatNumber color="green.500">
                      ${groupData.progress_analysis.current_volume.toLocaleString()}
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Active Players</StatLabel>
                    <StatNumber color="blue.500">
                      {groupData.progress_analysis.current_players}
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Potential Bonus</StatLabel>
                    <StatNumber color="purple.500">
                      ${groupData.progress_analysis.potential_bonus.toFixed(2)}
                    </StatNumber>
                  </Stat>
                </StatGroup>

                <Alert status={groupData.progress_analysis.bonus_eligible ? 'success' : 'warning'}>
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">
                      {groupData.progress_analysis.bonus_eligible ? 'Qualified for Bonus!' : 'Not Yet Qualified'}
                    </Text>
                    <Text fontSize="sm">
                      {groupData.progress_analysis.bonus_eligible 
                        ? `You qualify for ${groupData.progress_analysis.current_rank} rank bonus`
                        : 'Build more volume and active players to qualify for rank bonuses'
                      }
                    </Text>
                  </VStack>
                </Alert>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Group Breakdown */}
        {groupData?.group_volumes && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Group Volume Breakdown</Heading>
                
                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                  {['A', 'B', 'C', 'D', 'E'].map((group) => {
                    const groupData_vol = groupData.group_volumes.find((g: GroupVolume) => g.group_letter === group);
                    return (
                      <Card key={group} borderWidth={2} borderColor="blue.200">
                        <CardBody textAlign="center">
                          <VStack spacing={2}>
                            <Badge colorScheme="blue" fontSize="lg" p={2}>
                              Group {group}
                            </Badge>
                            <Text fontSize="sm" color="gray.600">Volume</Text>
                            <Text fontSize="lg" fontWeight="bold" color="green.500">
                              ${(groupData_vol?.group_volume || 0).toLocaleString()}
                            </Text>
                            <Text fontSize="sm" color="gray.600">Players</Text>
                            <Text fontSize="lg" fontWeight="bold" color="blue.500">
                              {groupData_vol?.active_players || 0}
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Rank Requirements */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Rank Requirements & Structure</Heading>
              
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Rank</Th>
                      <Th textAlign="center">Players</Th>
                      <Th textAlign="center">Groups</Th>
                      <Th textAlign="center">Min Volume</Th>
                      <Th textAlign="center">Bonus %</Th>
                      <Th textAlign="center">Monthly Bonus</Th>
                      <Th>Group Structure</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {getRankRequirements().map((rank) => (
                      <Tr key={rank.rank}>
                        <Td>
                          <Badge colorScheme={getRankColor(rank.rank)}>
                            {rank.rank}
                          </Badge>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold">{rank.players}</Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold">{rank.groups}</Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="green.500">
                            ${rank.volume.toLocaleString()}
                          </Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="blue.500">
                            {rank.percentage}%
                          </Text>
                        </Td>
                        <Td textAlign="center">
                          <Text fontWeight="bold" color="purple.500">
                            ${rank.bonus.toLocaleString()}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="xs">{rank.structure}</Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>

              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Group Volume System:</Text>
                  <Text fontSize="sm">
                    • Users are assigned to groups A, B, C, D, E in round-robin fashion<br/>
                    • Each rank requires specific volume thresholds in different groups<br/>
                    • Bonus = Total Volume × Rank Percentage, split 50/50 TIC/GIC<br/>
                    • Must maintain requirements throughout the month
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Actions */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Test Actions</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Button
                  leftIcon={<FaCalculator />}
                  colorScheme="blue"
                  onClick={calculateVolumes}
                  isLoading={isLoading}
                  size="lg"
                >
                  Calculate Group Volumes
                </Button>
                
                <Button
                  leftIcon={<FaCrown />}
                  colorScheme="purple"
                  onClick={testBonusDistribution}
                  isLoading={isLoading}
                  size="lg"
                >
                  Test Bonus Distribution
                </Button>
              </SimpleGrid>

              <Alert status="warning">
                <AlertIcon />
                <Text fontSize="sm">
                  The group volume system calculates volumes based on your referral network's 
                  active subscriptions and assigns them to groups A-E. Each rank has specific 
                  volume requirements that must be met in designated groups.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
