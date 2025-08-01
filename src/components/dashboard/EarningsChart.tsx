'use client'

import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react'
import { FaCoins, FaChartLine, FaWallet, FaClock } from 'react-icons/fa'
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext'

interface EarningsData {
  totalInvested: number
  totalEarnings: number
  activeInvestments: number
  portfolioValue: number
  dailyEarnings: number
  monthlyGrowth: number
}

interface EarningsChartProps {
  data: EarningsData
}

export default function EarningsChart({ data }: EarningsChartProps) {
  const cardBg = useColorModeValue('white', 'gray.800')
  const statBg = useColorModeValue('gray.50', 'gray.700')
  const { language } = useLanguage()

  // Use the global formatCurrency function instead of local one

  const calculateROI = () => {
    if (data.totalInvested === 0) return 0
    return ((data.totalEarnings / data.totalInvested) * 100).toFixed(2)
  }

  const stats = [
    {
      label: 'Total Invested',
      value: formatCurrency(data.totalInvested, language),
      icon: FaWallet,
      color: 'blue',
      helpText: 'Total amount invested',
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(data.totalEarnings, language),
      icon: FaCoins,
      color: 'green',
      helpText: `ROI: ${calculateROI()}%`,
      isIncrease: data.totalEarnings > 0,
    },
    {
      label: 'Portfolio Value',
      value: formatCurrency(data.portfolioValue, language),
      icon: FaChartLine,
      color: 'purple',
      helpText: 'Current total value',
    },
    {
      label: 'Active Investments',
      value: data.activeInvestments.toString(),
      icon: FaClock,
      color: 'orange',
      helpText: 'Currently running',
    },
  ]

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Card bg={cardBg} shadow="lg">
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Heading as="h2" size="lg">
              Portfolio Overview
            </Heading>
            <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full">
              Live
            </Badge>
          </HStack>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        {stats.map((stat, index) => (
          <Card key={index} bg={cardBg} shadow="md">
            <CardBody>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">
                  <HStack spacing={2}>
                    <Box as={stat.icon} color={`${stat.color}.500`} />
                    <Text>{stat.label}</Text>
                  </HStack>
                </StatLabel>
                <StatNumber fontSize="2xl" color={`${stat.color}.500`}>
                  {stat.value}
                </StatNumber>
                <StatHelpText>
                  {stat.isIncrease !== undefined && (
                    <StatArrow type={stat.isIncrease ? 'increase' : 'decrease'} />
                  )}
                  {stat.helpText}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Daily Earnings */}
      <Card bg={cardBg} shadow="lg">
        <CardHeader>
          <Heading as="h3" size="md">
            Recent Performance
          </Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box bg={statBg} p={6} borderRadius="lg">
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600" fontWeight="semibold">
                  Daily Earnings
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="green.500">
                  {formatCurrency(data.dailyEarnings, language)}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Last 24 hours
                </Text>
              </VStack>
            </Box>
            
            <Box bg={statBg} p={6} borderRadius="lg">
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600" fontWeight="semibold">
                  Monthly Growth
                </Text>
                <HStack>
                  <Text fontSize="3xl" fontWeight="bold" color="blue.500">
                    {data.monthlyGrowth > 0 ? '+' : ''}{data.monthlyGrowth.toFixed(2)}%
                  </Text>
                  <StatArrow type={data.monthlyGrowth > 0 ? 'increase' : 'decrease'} />
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  This month
                </Text>
              </VStack>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Chart Placeholder */}
      <Card bg={cardBg} shadow="lg">
        <CardHeader>
          <Heading as="h3" size="md">
            Earnings History
          </Heading>
        </CardHeader>
        <CardBody>
          <Box
            h="300px"
            bg={statBg}
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            border="2px dashed"
            borderColor="gray.300"
          >
            <VStack spacing={4}>
              <Box as={FaChartLine} size="48px" color="gray.400" />
              <Text color="gray.500" textAlign="center">
                Interactive earnings chart will be displayed here
                <br />
                <Text fontSize="sm">
                  (Chart library integration coming soon)
                </Text>
              </Text>
            </VStack>
          </Box>
        </CardBody>
      </Card>
    </VStack>
  )
}