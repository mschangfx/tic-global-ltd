'use client'

import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  Divider,
  useColorModeValue,
  Icon,
  Flex,
} from '@chakra-ui/react'
import { FaCoins, FaClock, FaChartLine } from 'react-icons/fa'

export interface InvestmentPackage {
  id: string
  name: string
  description: string
  minInvestment: number
  maxInvestment?: number
  expectedReturnRate: number
  durationDays: number
  isPopular?: boolean
  features: string[]
}

interface PackageCardProps {
  package: InvestmentPackage
  onSelect: (packageId: string) => void
  isSelected?: boolean
}

export default function PackageCard({ package: pkg, onSelect, isSelected }: PackageCardProps) {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const selectedBorderColor = useColorModeValue('blue.400', 'blue.300')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateDailyReturn = () => {
    return ((pkg.expectedReturnRate / 100) / 365 * pkg.durationDays).toFixed(2)
  }

  return (
    <Card
      bg={cardBg}
      border="2px solid"
      borderColor={isSelected ? selectedBorderColor : borderColor}
      shadow={isSelected ? 'xl' : 'md'}
      transition="all 0.3s"
      _hover={{
        transform: 'translateY(-4px)', // Aligned with Plan page card hover
        shadow: '2xl', // Aligned with Plan page card hover (more pronounced)
        borderColor: selectedBorderColor,
      }}
      position="relative"
      overflow="hidden"
    >
      {pkg.isPopular && (
        <Box
          position="absolute"
          top={4}
          right={4}
          zIndex={1}
        >
          <Badge
            colorScheme="purple"
            variant="solid"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
          >
            POPULAR
          </Badge>
        </Box>
      )}

      <CardHeader pb={2}>
        <VStack align="flex-start" spacing={2}>
          <Heading as="h3" size="lg" color="blue.500">
            {pkg.name}
          </Heading>
          <Text color="gray.600" fontSize="sm">
            {pkg.description}
          </Text>
        </VStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={6} align="stretch">
          {/* Key Metrics */}
          <VStack spacing={4}>
            <HStack justify="space-between" w="full">
              <HStack>
                <Icon as={FaCoins} color="yellow.500" />
                <Text fontSize="sm" color="gray.600">Min Investment</Text>
              </HStack>
              <Text fontWeight="bold" color="green.500">
                {formatCurrency(pkg.minInvestment)}
              </Text>
            </HStack>

            <HStack justify="space-between" w="full">
              <HStack>
                <Icon as={FaChartLine} color="blue.500" />
                <Text fontSize="sm" color="gray.600">Expected Return</Text>
              </HStack>
              <Text fontWeight="bold" color="blue.500">
                {pkg.expectedReturnRate}% APY
              </Text>
            </HStack>

            <HStack justify="space-between" w="full">
              <HStack>
                <Icon as={FaClock} color="purple.500" />
                <Text fontSize="sm" color="gray.600">Duration</Text>
              </HStack>
              <Text fontWeight="bold">
                {pkg.durationDays} days
              </Text>
            </HStack>
          </VStack>

          <Divider />

          {/* Features */}
          <VStack align="flex-start" spacing={2}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
              Package Features:
            </Text>
            {pkg.features.map((feature, index) => (
              <HStack key={index} spacing={2}>
                <Box w={2} h={2} bg="green.400" borderRadius="full" />
                <Text fontSize="sm" color="gray.600">
                  {feature}
                </Text>
              </HStack>
            ))}
          </VStack>

          <Divider />

          {/* Projected Earnings */}
          <Box bg="gray.50" p={4} borderRadius="lg">
            <VStack spacing={2}>
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                Projected Total Return
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                +{calculateDailyReturn()}%
              </Text>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Based on {pkg.expectedReturnRate}% APY over {pkg.durationDays} days
              </Text>
            </VStack>
          </Box>

          {/* Action Button */}
          <Button
            colorScheme={isSelected ? 'green' : 'blue'}
            size="lg"
            onClick={() => onSelect(pkg.id)}
            bgGradient={
              isSelected 
                ? 'linear(to-r, green.400, teal.500)'
                : 'linear(to-r, blue.400, purple.500)'
            }
            _hover={{
              bgGradient: isSelected
                ? 'linear(to-r, green.500, teal.600)'
                : 'linear(to-r, blue.500, purple.600)',
              transform: 'translateY(-2px)', // Aligned with Plan page button hover
              opacity: 0.9, // Added subtle opacity change like Plan page
            }}
            transition="all 0.2s ease-in-out" // Ensured ease-in-out
          >
            {isSelected ? 'Selected' : 'Select Package'}
          </Button>
        </VStack>
      </CardBody>
    </Card>
  )
}