'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { FaWallet, FaPlus } from 'react-icons/fa'
import Link from 'next/link'
import EarningsChart from '@/components/dashboard/EarningsChart'
import WalletConnect from '@/components/auth/WalletConnect'

interface User {
  walletAddress: string
  isConnected: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, purple.50)',
    'linear(to-br, gray.900, purple.900)'
  )

  // Mock earnings data
  const mockEarningsData = {
    totalInvested: 5000,
    totalEarnings: 750,
    activeInvestments: 3,
    portfolioValue: 5750,
    dailyEarnings: 25.50,
    monthlyGrowth: 15.2,
  }

  useEffect(() => {
    // Simulate checking for existing wallet connection
    const checkWalletConnection = async () => {
      setIsLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check if user has a connected wallet (mock)
      const savedWallet = localStorage.getItem('connectedWallet')
      if (savedWallet) {
        setUser({
          walletAddress: savedWallet,
          isConnected: true,
        })
      }
      setIsLoading(false)
    }

    checkWalletConnection()
  }, [])

  const handleWalletConnect = (address: string) => {
    setUser({
      walletAddress: address,
      isConnected: true,
    })
    localStorage.setItem('connectedWallet', address)
  }

  const handleDisconnect = () => {
    setUser(null)
    localStorage.removeItem('connectedWallet')
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isLoading) {
    return (
      <Box bg={bgGradient} minH="calc(100vh - 64px)" py={10}>
        <Container maxW="container.xl">
          <VStack spacing={8} justify="center" minH="400px">
            <Text>Loading dashboard...</Text>
          </VStack>
        </Container>
      </Box>
    )
  }

  if (!user?.isConnected) {
    return (
      <Box bg={bgGradient} minH="calc(100vh - 64px)" py={10}>
        <Container maxW="container.xl">
          <VStack spacing={8} textAlign="center" py={20}>
            <Heading as="h1" size="2xl">
              Welcome to TIC GLOBAL Dashboard
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="2xl">
              Connect your wallet to access your investment portfolio and start earning with our cryptocurrency investment packages.
            </Text>
            
            <Alert status="info" maxW="md" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Wallet Required!</AlertTitle>
                <AlertDescription>
                  Please connect your cryptocurrency wallet to access the dashboard.
                </AlertDescription>
              </Box>
            </Alert>

            <WalletConnect onConnect={handleWalletConnect} />
          </VStack>
        </Container>
      </Box>
    )
  }

  return (
    <Box bg={bgGradient} minH="calc(100vh - 64px)" py={10}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <VStack align="flex-start" spacing={1}>
              <Heading as="h1" size="xl">
                Investment Dashboard
              </Heading>
              <HStack spacing={2}>
                <FaWallet color="green" />
                <Text color="gray.600">
                  Connected: {formatAddress(user.walletAddress)}
                </Text>
                <Button size="xs" variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </HStack>
            </VStack>
            
            <HStack spacing={4}>
              <Link href="/packages">
                <Button
                  leftIcon={<FaPlus />}
                  colorScheme="blue"
                  bgGradient="linear(to-r, blue.400, purple.500)"
                  _hover={{
                    bgGradient: 'linear(to-r, blue.500, purple.600)',
                  }}
                >
                  New Investment
                </Button>
              </Link>
            </HStack>
          </HStack>

          {/* Earnings Chart */}
          <EarningsChart data={mockEarningsData} />

          {/* Quick Actions */}
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Portfolio Performance</AlertTitle>
              <AlertDescription>
                Your investments are performing well! Consider adding more funds to maximize your returns.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      </Container>
    </Box>
  )
}