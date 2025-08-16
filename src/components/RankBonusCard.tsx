'use client';

import {
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Heading,
  Divider,
  Button,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
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
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { FaTrophy, FaCoins, FaHistory, FaGem } from 'react-icons/fa';
import { useState, useEffect } from 'react';

interface RankBonusData {
  history: any[];
  summary: {
    totalBonusReceived: number;
    totalTicReceived: number;
    totalGicReceived: number;
    totalDistributions: number;
    lastDistribution: any;
  };
  currentStatus: {
    rank: string;
    totalReferrals: number;
    monthlyBonusAmount: number;
    nextBonusEligible: boolean;
    ticPerMonth: number;
    gicPerMonth: number;
  };
}

export default function RankBonusCard() {
  const [bonusData, setBonusData] = useState<RankBonusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    fetchBonusData();
  }, []);

  const fetchBonusData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rank-bonus/history');
      const data = await response.json();

      if (data.success) {
        setBonusData(data.data);
      } else {
        setError(data.error || 'Failed to fetch bonus data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching bonus data:', err);
    } finally {
      setIsLoading(false);
    }
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

  const getRankIcon = (rank: string) => {
    switch (rank.toLowerCase()) {
      case 'diamond': return FaGem;
      case 'platinum': case 'gold': return FaTrophy;
      default: return FaCoins;
    }
  };

  if (isLoading) {
    return (
      <Card bg={cardBg} borderWidth={1} borderColor={borderColor}>
        <CardBody>
          <VStack spacing={4}>
            <Spinner size="lg" color="blue.500" />
            <Text color={subtleTextColor}>Loading rank bonus data...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card bg={cardBg} borderWidth={1} borderColor={borderColor}>
        <CardBody>
          <Alert status="error">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  if (!bonusData) return null;

  const { currentStatus, summary } = bonusData;

  return (
    <>
      <Card bg={cardBg} borderWidth={1} borderColor={borderColor}>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
              <HStack>
                <Icon as={getRankIcon(currentStatus.rank)} color={`${getRankColor(currentStatus.rank)}.500`} boxSize={6} />
                <Heading size="md" color={textColor}>Rank Bonuses</Heading>
              </HStack>
              <Badge colorScheme={getRankColor(currentStatus.rank)} fontSize="sm" p={2}>
                {currentStatus.rank.toUpperCase()}
              </Badge>
            </HStack>

            {/* Current Status */}
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>Monthly Bonus:</Text>
                <Text fontWeight="bold" color={currentStatus.monthlyBonusAmount > 0 ? 'green.500' : 'gray.500'}>
                  ${currentStatus.monthlyBonusAmount.toLocaleString()}/month
                </Text>
              </HStack>

              {currentStatus.monthlyBonusAmount > 0 && (
                <>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={subtleTextColor}>TIC Tokens:</Text>
                    <Text fontWeight="bold" color="orange.500">
                      {currentStatus.ticPerMonth.toLocaleString()} TIC/month
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={subtleTextColor}>GIC Tokens:</Text>
                    <Text fontWeight="bold" color="purple.500">
                      {currentStatus.gicPerMonth.toLocaleString()} GIC/month
                    </Text>
                  </HStack>
                </>
              )}

              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>Total Referrals:</Text>
                <Text fontWeight="bold">{currentStatus.totalReferrals}</Text>
              </HStack>
            </VStack>

            <Divider />

            {/* Summary Stats */}
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="bold" color={textColor}>Total Received:</Text>
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>Bonus Amount:</Text>
                <Text fontWeight="bold" color="green.500">
                  ${summary.totalBonusReceived.toFixed(2)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>TIC Tokens:</Text>
                <Text fontWeight="bold" color="orange.500">
                  {summary.totalTicReceived.toFixed(2)} TIC
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={subtleTextColor}>GIC Tokens:</Text>
                <Text fontWeight="bold" color="purple.500">
                  {summary.totalGicReceived.toFixed(2)} GIC
                </Text>
              </HStack>
            </VStack>

            {/* Action Button */}
            <Button
              leftIcon={<FaHistory />}
              onClick={onOpen}
              colorScheme="blue"
              variant="outline"
              size="sm"
            >
              View History
            </Button>

            {/* Status Alert */}
            {currentStatus.monthlyBonusAmount === 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="bold">No Monthly Bonus</Text>
                  <Text fontSize="xs">
                    Reach Bronze rank (11+ referrals) to start earning monthly bonuses!
                  </Text>
                </VStack>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* History Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rank Bonus History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {bonusData.history.length > 0 ? (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Month</Th>
                      <Th>Rank</Th>
                      <Th>Bonus</Th>
                      <Th>TIC</Th>
                      <Th>GIC</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {bonusData.history.map((item, index) => (
                      <Tr key={index}>
                        <Td>{item.month_display}</Td>
                        <Td>
                          <Badge colorScheme={getRankColor(item.rank)} size="sm">
                            {item.rank}
                          </Badge>
                        </Td>
                        <Td>${parseFloat(item.bonus_amount).toFixed(2)}</Td>
                        <Td>{parseFloat(item.tic_amount).toFixed(2)} TIC</Td>
                        <Td>{parseFloat(item.gic_amount).toFixed(2)} GIC</Td>
                        <Td>
                          <Badge 
                            colorScheme={item.status === 'completed' ? 'green' : 'yellow'} 
                            size="sm"
                          >
                            {item.status_display}
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
                <Text>No rank bonus history yet. Achieve Bronze rank or higher to start earning monthly bonuses!</Text>
              </Alert>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
