'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  useToast,
  useColorModeValue,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner,
  Divider,
  SimpleGrid,
  Progress,
  Tooltip,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import { 
  FaChartLine, 
  FaHistory, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaTrophy,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaInfoCircle
} from 'react-icons/fa';

interface MaintenanceStatus {
  currentStatus: {
    currentRank: string;
    qualifies: boolean;
    directReferrals: number;
    maxLevel: number;
    monthlyBonus: number;
    missingRequirements: string[];
    eligibleForBonus: boolean;
    eligibilityReason: string;
  };
  maintenanceHistory: Array<{
    qualification_month: string;
    rank_achieved: string;
    qualifies_for_bonus: boolean;
    bonus_amount: number;
    bonus_distributed: boolean;
    direct_referrals: number;
    max_unilevel_depth: number;
    rank_change_type: string;
    missing_requirements: string[];
  }>;
  statistics: {
    totalMonthsTracked: number;
    qualifiedMonths: number;
    qualificationRate: string;
    bonusesDistributed: number;
    totalBonusesEarned: number;
    rankStability: number;
    uniqueRanksAchieved: number;
    ranksAchieved: string[];
  };
}

export default function RankingMaintenanceCard() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ranking-bonus/maintenance');
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load maintenance data');
      }
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ranking maintenance data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recordCurrentQualification = async () => {
    setIsRecording(true);
    try {
      const response = await fetch('/api/ranking-bonus/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Qualification Recorded',
          description: 'Current month qualification has been recorded',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        await loadMaintenanceData(); // Refresh data
      } else {
        toast({
          title: 'Recording Failed',
          description: data.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error recording qualification:', error);
      toast({
        title: 'Recording Error',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRecording(false);
    }
  };

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

  const getRankChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'promotion': return FaArrowUp;
      case 'demotion': return FaArrowDown;
      case 'lost': return FaArrowDown;
      case 'maintained': return FaMinus;
      default: return FaInfoCircle;
    }
  };

  const getRankChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'promotion': return 'green';
      case 'demotion': return 'red';
      case 'lost': return 'red';
      case 'maintained': return 'blue';
      default: return 'gray';
    }
  };

  const formatMonth = (monthStr: string) => {
    return new Date(monthStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <>
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
              <HStack>
                <Icon as={FaChartLine} color="blue.500" boxSize={6} />
                <Heading size="md" color={textColor}>Ranking Maintenance</Heading>
              </HStack>
              <Badge colorScheme="blue" variant="subtle">Monthly Tracking</Badge>
            </HStack>

            <Divider />

            {isLoading ? (
              <VStack py={8}>
                <Spinner size="lg" />
                <Text color={subtleTextColor}>Loading maintenance data...</Text>
              </VStack>
            ) : maintenanceData ? (
              <>
                {/* Current Status */}
                <VStack spacing={4} align="stretch">
                  <Heading size="sm" color={textColor}>Current Status</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Stat textAlign="center">
                      <StatLabel color={subtleTextColor}>Current Rank</StatLabel>
                      <StatNumber>
                        <Badge colorScheme={getRankColor(maintenanceData.currentStatus.currentRank)} fontSize="lg" p={2}>
                          {maintenanceData.currentStatus.currentRank}
                        </Badge>
                      </StatNumber>
                      <StatHelpText color={subtleTextColor}>
                        {maintenanceData.currentStatus.directReferrals} direct • Level {maintenanceData.currentStatus.maxLevel}
                      </StatHelpText>
                    </Stat>

                    <Stat textAlign="center">
                      <StatLabel color={subtleTextColor}>Qualification Rate</StatLabel>
                      <StatNumber color="blue.500" fontSize="2xl">
                        {maintenanceData.statistics.qualificationRate}%
                      </StatNumber>
                      <StatHelpText color={subtleTextColor}>
                        {maintenanceData.statistics.qualifiedMonths}/{maintenanceData.statistics.totalMonthsTracked} months
                      </StatHelpText>
                    </Stat>

                    <Stat textAlign="center">
                      <StatLabel color={subtleTextColor}>Rank Stability</StatLabel>
                      <StatNumber color="green.500" fontSize="2xl">
                        {maintenanceData.statistics.rankStability}
                      </StatNumber>
                      <StatHelpText color={subtleTextColor}>
                        months at current rank
                      </StatHelpText>
                    </Stat>
                  </SimpleGrid>

                  {/* Qualification Progress */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        Qualification Progress
                      </Text>
                      <Text fontSize="sm" color={subtleTextColor}>
                        {maintenanceData.statistics.qualificationRate}%
                      </Text>
                    </HStack>
                    <Progress 
                      value={parseFloat(maintenanceData.statistics.qualificationRate)} 
                      colorScheme="blue" 
                      size="lg" 
                      borderRadius="md"
                    />
                  </Box>

                  {/* Current Status Alert */}
                  {maintenanceData.currentStatus.qualifies ? (
                    <Alert status="success" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          ✅ Qualified for {maintenanceData.currentStatus.currentRank} rank bonus
                        </Text>
                        <Text fontSize="xs">
                          Monthly bonus: ${maintenanceData.currentStatus.monthlyBonus} 
                          ({maintenanceData.currentStatus.monthlyBonus / 2} TIC + {maintenanceData.currentStatus.monthlyBonus / 2} GIC)
                        </Text>
                      </VStack>
                    </Alert>
                  ) : (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          ⚠️ Not qualified for ranking bonus this month
                        </Text>
                        {maintenanceData.currentStatus.missingRequirements.length > 0 && (
                          <List spacing={1}>
                            {maintenanceData.currentStatus.missingRequirements.map((req, index) => (
                              <ListItem key={index} fontSize="xs">
                                <ListIcon as={FaExclamationTriangle} color="orange.500" />
                                {req}
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </VStack>
                    </Alert>
                  )}
                </VStack>

                <Divider />

                {/* Action Buttons */}
                <HStack spacing={3}>
                  <Button
                    colorScheme="blue"
                    leftIcon={<Icon as={FaCalendarAlt} />}
                    onClick={recordCurrentQualification}
                    isLoading={isRecording}
                    loadingText="Recording..."
                    flex={1}
                  >
                    Record This Month
                  </Button>
                  
                  <Button
                    variant="outline"
                    leftIcon={<Icon as={FaHistory} />}
                    onClick={onOpen}
                    flex={1}
                  >
                    View History
                  </Button>
                </HStack>

                {/* Statistics Summary */}
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Stat textAlign="center" size="sm">
                    <StatLabel fontSize="xs" color={subtleTextColor}>Total Bonuses</StatLabel>
                    <StatNumber fontSize="lg" color="green.500">
                      ${maintenanceData.statistics.totalBonusesEarned.toFixed(0)}
                    </StatNumber>
                  </Stat>

                  <Stat textAlign="center" size="sm">
                    <StatLabel fontSize="xs" color={subtleTextColor}>Bonuses Received</StatLabel>
                    <StatNumber fontSize="lg" color="blue.500">
                      {maintenanceData.statistics.bonusesDistributed}
                    </StatNumber>
                  </Stat>

                  <Stat textAlign="center" size="sm">
                    <StatLabel fontSize="xs" color={subtleTextColor}>Ranks Achieved</StatLabel>
                    <StatNumber fontSize="lg" color="purple.500">
                      {maintenanceData.statistics.uniqueRanksAchieved}
                    </StatNumber>
                  </Stat>

                  <Stat textAlign="center" size="sm">
                    <StatLabel fontSize="xs" color={subtleTextColor}>Months Tracked</StatLabel>
                    <StatNumber fontSize="lg" color="gray.500">
                      {maintenanceData.statistics.totalMonthsTracked}
                    </StatNumber>
                  </Stat>
                </SimpleGrid>
              </>
            ) : (
              <Alert status="warning">
                <AlertIcon />
                <Text>Unable to load ranking maintenance data</Text>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Maintenance History Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <HStack>
              <Icon as={FaHistory} color="blue.500" />
              <Text>Ranking Maintenance History</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {maintenanceData?.maintenanceHistory && maintenanceData.maintenanceHistory.length > 0 ? (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Month</Th>
                      <Th>Rank</Th>
                      <Th>Change</Th>
                      <Th>Qualified</Th>
                      <Th>Bonus</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {maintenanceData.maintenanceHistory.map((record, index) => (
                      <Tr key={index}>
                        <Td fontSize="sm">
                          {formatMonth(record.qualification_month)}
                        </Td>
                        <Td>
                          <Badge colorScheme={getRankColor(record.rank_achieved)} size="sm">
                            {record.rank_achieved}
                          </Badge>
                        </Td>
                        <Td>
                          <Tooltip label={record.rank_change_type}>
                            <Icon 
                              as={getRankChangeIcon(record.rank_change_type)} 
                              color={`${getRankChangeColor(record.rank_change_type)}.500`}
                            />
                          </Tooltip>
                        </Td>
                        <Td>
                          <Icon 
                            as={record.qualifies_for_bonus ? FaCheckCircle : FaExclamationTriangle} 
                            color={record.qualifies_for_bonus ? 'green.500' : 'orange.500'}
                          />
                        </Td>
                        <Td fontSize="sm" fontWeight="bold" color="green.500">
                          ${record.bonus_amount.toFixed(0)}
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={record.bonus_distributed ? 'green' : 'gray'} 
                            size="sm"
                          >
                            {record.bonus_distributed ? 'Paid' : 'Pending'}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Alert status="info">
                <AlertIcon />
                <VStack align="start">
                  <Text>No maintenance history found</Text>
                  <Text fontSize="sm">
                    Monthly qualification records will appear here as they are tracked
                  </Text>
                </VStack>
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
