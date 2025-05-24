'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  SimpleGrid,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import Link from 'next/link'
import PackageCard, { InvestmentPackage } from '@/components/investment/PackageCard'

const INVESTMENT_PACKAGES: InvestmentPackage[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    description: 'Perfect for beginners looking to start their crypto investment journey',
    minInvestment: 100,
    maxInvestment: 1000,
    expectedReturnRate: 8,
    durationDays: 30,
    features: [
      'Low risk investment',
      'Daily earnings tracking',
      'Email notifications',
      'Basic support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    description: 'Balanced risk and reward for steady portfolio growth',
    minInvestment: 500,
    maxInvestment: 5000,
    expectedReturnRate: 12,
    durationDays: 60,
    isPopular: true,
    features: [
      'Medium risk investment',
      'Real-time analytics',
      'Priority support',
      'Compound interest',
      'Mobile app access'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    description: 'High-yield investment for experienced crypto investors',
    minInvestment: 2000,
    maxInvestment: 20000,
    expectedReturnRate: 18,
    durationDays: 90,
    features: [
      'High yield potential',
      'Advanced analytics',
      'Dedicated account manager',
      'Early withdrawal options',
      'VIP support',
      'Exclusive market insights'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Institutional-grade investment solution for serious investors',
    minInvestment: 10000,
    expectedReturnRate: 25,
    durationDays: 180,
    features: [
      'Maximum returns',
      'Custom investment terms',
      'White-glove service',
      'Risk management tools',
      'Portfolio diversification',
      'Quarterly reviews',
      'Tax optimization'
    ]
  }
]

export default function PackagesPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [investmentAmount, setInvestmentAmount] = useState<number>(0)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, purple.50)',
    'linear(to-br, gray.900, purple.900)'
  )

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId)
    const pkg = INVESTMENT_PACKAGES.find(p => p.id === packageId)
    if (pkg) {
      setInvestmentAmount(pkg.minInvestment)
      onOpen()
    }
  }

  const handleInvestment = async () => {
    if (!selectedPackage || investmentAmount <= 0) return

    const pkg = INVESTMENT_PACKAGES.find(p => p.id === selectedPackage)
    if (!pkg) return

    if (investmentAmount < pkg.minInvestment) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum investment for this package is $${pkg.minInvestment}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (pkg.maxInvestment && investmentAmount > pkg.maxInvestment) {
      toast({
        title: 'Invalid Amount',
        description: `Maximum investment for this package is $${pkg.maxInvestment}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      // Simulate investment process
      toast({
        title: 'Processing Investment',
        description: 'Please confirm the transaction in your wallet...',
        status: 'info',
        duration: 2000,
        isClosable: true,
      })

      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 3000))

      toast({
        title: 'Investment Successful!',
        description: `Successfully invested $${investmentAmount} in ${pkg.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      onClose()
      setSelectedPackage(null)
      setInvestmentAmount(0)
    } catch (error) {
      toast({
        title: 'Investment Failed',
        description: 'Transaction was rejected or failed. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const selectedPkg = INVESTMENT_PACKAGES.find(p => p.id === selectedPackage)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateProjectedReturn = () => {
    if (!selectedPkg || investmentAmount <= 0) return 0
    return (investmentAmount * (selectedPkg.expectedReturnRate / 100) * (selectedPkg.durationDays / 365))
  }

  return (
    <Box bg={bgGradient} minH="calc(100vh - 64px)" py={10}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack spacing={4}>
            <Link href="/dashboard">
              <Button leftIcon={<FaArrowLeft />} variant="ghost">
                Back to Dashboard
              </Button>
            </Link>
            <VStack align="flex-start" spacing={1}>
              <Heading as="h1" size="xl">
                Gaming Business Plans
              </Heading>
              <Text color="gray.600">
                Choose the perfect gaming business plan for your goals
              </Text>
            </VStack>
          </HStack>

          {/* Info Alert */}
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Secure Investments</AlertTitle>
              <AlertDescription>
                All investments are secured by smart contracts on the blockchain. 
                Your funds are protected and earnings are automatically distributed.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Packages Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={6}>
            {INVESTMENT_PACKAGES.map((pkg) => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                onSelect={handlePackageSelect}
                isSelected={selectedPackage === pkg.id}
              />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>

      {/* Investment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>
            Invest in {selectedPkg?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6}>
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>Investment Confirmation</AlertTitle>
                  <AlertDescription>
                    Please review your investment details carefully before proceeding.
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl>
                <FormLabel>Investment Amount (USD)</FormLabel>
                <NumberInput
                  value={investmentAmount}
                  onChange={(_, value) => setInvestmentAmount(value || 0)}
                  min={selectedPkg?.minInvestment || 0}
                  max={selectedPkg?.maxInvestment}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="sm" color="gray.500" mt={2}>
                  Min: {formatCurrency(selectedPkg?.minInvestment || 0)}
                  {selectedPkg?.maxInvestment && ` | Max: ${formatCurrency(selectedPkg.maxInvestment)}`}
                </Text>
              </FormControl>

              {investmentAmount > 0 && selectedPkg && (
                <Box w="full" bg="gray.50" p={4} borderRadius="lg">
                  <VStack spacing={2}>
                    <HStack justify="space-between" w="full">
                      <Text>Investment Amount:</Text>
                      <Text fontWeight="bold">{formatCurrency(investmentAmount)}</Text>
                    </HStack>
                    <HStack justify="space-between" w="full">
                      <Text>Expected Return:</Text>
                      <Text fontWeight="bold" color="green.500">
                        {formatCurrency(calculateProjectedReturn())}
                      </Text>
                    </HStack>
                    <HStack justify="space-between" w="full">
                      <Text>Total Value:</Text>
                      <Text fontWeight="bold" color="blue.500">
                        {formatCurrency(investmentAmount + calculateProjectedReturn())}
                      </Text>
                    </HStack>
                    <HStack justify="space-between" w="full">
                      <Text>Duration:</Text>
                      <Text fontWeight="bold">{selectedPkg.durationDays} days</Text>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleInvestment}
              isDisabled={investmentAmount < (selectedPkg?.minInvestment || 0)}
              bgGradient="linear(to-r, blue.400, purple.500)"
              _hover={{
                bgGradient: 'linear(to-r, blue.500, purple.600)',
              }}
            >
              Confirm Investment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}