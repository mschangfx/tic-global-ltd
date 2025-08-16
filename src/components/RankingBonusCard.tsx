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
  SimpleGrid
} from '@chakra-ui/react';
import { FaTrophy, FaCoins, FaHistory, FaGift, FaCheck } from 'react-icons/fa';

interface RankingQualification {
  qualifies: boolean;
  currentRank: string;
  directReferrals: number;
  maxLevel: number;
  monthlyBonus: number;
  ticAmount: number;
  gicAmount: number;
}

interface BonusHistoryItem {
  transaction_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string;
  rank: string;
  token_type: string;
  created_at: string;
}

export default function RankingBonusCard() {
  const [qualification, setQualification] = useState<RankingQualification | null>(null);
  const [bonusHistory, setBonusHistory] = useState<BonusHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    loadRankingData();
  }, []);

  const loadRankingData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ranking-bonus/distribute');
      const data = await response.json();
      
      if (data.success) {
        setQualification(data.data.qualification);
        setBonusHistory(data.data.bonusHistory || []);
      } else {
        throw new Error(data.error || 'Failed to load ranking data');
      }
    } catch (error) {
      console.error('Error loading ranking data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ranking bonus data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBonusHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/ranking-bonus/history');
      const data = await response.json();
      
      if (data.success) {
        setBonusHistory(data.data.bonusHistory || []);
      } else {
        throw new Error(data.error || 'Failed to load bonus history');
      }
    } catch (error) {
      console.error('Error loading bonus history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bonus history',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDistributeBonus = async () => {
    if (!qualification?.qualifies) return;

    setIsDistributing(true);
    try {
      const response = await fetch('/api/ranking-bonus/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Bonus Distributed!',
          description: `${data.data.rank} rank bonus of $${data.data.totalBonus} distributed as ${data.data.ticAmount} TIC + ${data.data.gicAmount} GIC tokens`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        await loadRankingData(); // Refresh data
      } else {
        toast({
          title: 'Distribution Failed',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error distributing bonus:', error);
      toast({
        title: 'Distribution Error',
        description: 'An unexpected error occurred during bonus distribution',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDistributing(false);
    }
  };

  const handleViewHistory = () => {
    loadBonusHistory();
    onOpen();
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

  const formatTokenAmount = (amount: number, currency: string) => {
    if (currency === 'TIC') {
      return `${amount.toFixed(2)} ${currency}`; // Display TIC with 2 decimal places
    } else if (currency === 'GIC') {
      return `${amount.toFixed(2)} ${currency}`; // Display GIC with 2 decimal places
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <>
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
              <HStack>
                <Icon as={FaTrophy} color="gold" boxSize={6} />
                <Heading size="md" color={textColor}>Ranking Bonus System</Heading>
              </HStack>
              <Badge colorScheme="gold" variant="subtle">Monthly Rewards</Badge>
            </HStack>

            <Divider />

            {isLoading ? (
              <VStack py={8}>
                <Spinner size="lg" />
                <Text color={subtleTextColor}>Loading ranking data...</Text>
              </VStack>
            ) : qualification ? (
              <>
                {/* Current Rank Status */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Stat textAlign="center">
                    <StatLabel color={subtleTextColor}>Current Rank</StatLabel>
                    <StatNumber>
                      <Badge colorScheme={getRankColor(qualification.currentRank)} fontSize="lg" p={2}>
                        {qualification.currentRank}
                      </Badge>
                    </StatNumber>
                    <StatHelpText color={subtleTextColor}>
                      {qualification.directReferrals} direct • Level {qualification.maxLevel}
                    </StatHelpText>
                  </Stat>

                  <Stat textAlign="center">
                    <StatLabel color={subtleTextColor}>Monthly Bonus</StatLabel>
                    <StatNumber color="green.500" fontSize="2xl">
                      ${qualification.monthlyBonus.toFixed(2)}
                    </StatNumber>
                    <StatHelpText color={subtleTextColor}>
                      {qualification.ticAmount.toFixed(2)} TIC + {qualification.gicAmount.toFixed(2)} GIC
                    </StatHelpText>
                  </Stat>
                </SimpleGrid>

                <Divider />

                {/* Action Buttons */}
                <HStack spacing={3}>
                  <Button
                    colorScheme="gold"
                    leftIcon={<Icon as={FaGift} />}
                    onClick={handleDistributeBonus}
                    isLoading={isDistributing}
                    loadingText="Distributing..."
                    isDisabled={!qualification.qualifies}
                    flex={1}
                  >
                    {qualification.qualifies ? 'Claim Bonus' : 'Not Qualified'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    leftIcon={<Icon as={FaHistory} />}
                    onClick={handleViewHistory}
                    flex={1}
                  >
                    View History
                  </Button>
                </HStack>

                {/* Qualification Status */}
                {!qualification.qualifies && (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="medium">Qualification Requirements</Text>
                      <Text fontSize="xs">• Reach 10th unilevel (currently level {qualification.maxLevel})</Text>
                      <Text fontSize="xs">• Minimum 5 direct referrals (currently {qualification.directReferrals})</Text>
                      <Text fontSize="xs">• Higher ranks require more direct referrals</Text>
                    </VStack>
                  </Alert>
                )}
              </>
            ) : (
              <Alert status="warning">
                <AlertIcon />
                <Text>Unable to load ranking data</Text>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Bonus History Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <HStack>
              <Icon as={FaCoins} color="gold" />
              <Text>Ranking Bonus History</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isLoadingHistory ? (
              <VStack py={8}>
                <Spinner size="lg" />
                <Text color={subtleTextColor}>Loading bonus history...</Text>
              </VStack>
            ) : bonusHistory.length > 0 ? (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Rank</Th>
                      <Th>Token</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {bonusHistory.map((bonus) => (
                      <Tr key={bonus.transaction_id}>
                        <Td fontSize="sm">
                          {new Date(bonus.created_at).toLocaleDateString()}
                        </Td>
                        <Td>
                          <Badge colorScheme={getRankColor(bonus.rank)} size="sm">
                            {bonus.rank}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={bonus.token_type === 'TIC' ? 'blue' : 'green'} size="sm">
                            {bonus.token_type}
                          </Badge>
                        </Td>
                        <Td fontSize="sm" fontWeight="bold" color="green.500">
                          {formatTokenAmount(bonus.amount, bonus.currency)}
                        </Td>
                        <Td>
                          <Icon as={FaCheck} color="green.500" />
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
                  <Text>No ranking bonus history found</Text>
                  <Text fontSize="sm">
                    Ranking bonuses from your referral achievements will appear here
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
