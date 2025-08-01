'use client'

import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  Image,
  VStack,
  useColorModeValue,
  Button,
  Icon,
} from '@chakra-ui/react'
import { FaDice, FaRegCreditCard, FaChartLine, FaTrophy } from 'react-icons/fa'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

const CASINO_FEATURES = [
  {
    title: 'Live Casino',
    description: 'Experience real-time casino games with professional dealers',
    icon: FaRegCreditCard,
  },
  {
    title: 'Slot Games',
    description: 'Explore hundreds of exciting slot machines and progressive jackpots',
    icon: FaDice,
  },
  {
    title: 'Trading Platform',
    description: 'Advanced trading platform with real-time market data',
    icon: FaChartLine,
  },
  {
    title: 'Tournaments',
    description: 'Compete in daily and weekly tournaments with big prizes',
    icon: FaTrophy,
  },
]

export default function CasinoPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} minH="calc(100vh - 64px)" py={10}>
      <Container maxW="container.xl">
        <VStack spacing={8} as="section" textAlign="center" mb={12}>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, purple.400, pink.500)"
            backgroundClip="text"
          >
            TIC GLOBAL Casino
          </Heading>
          <Text fontSize="xl" color="gray.600" maxW="3xl">
            Step into the world of premium online casino gaming and trading
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8} mb={16}>
          {CASINO_FEATURES.map((feature) => (
            <Box
              key={feature.title}
              bg={cardBg}
              p={8}
              rounded="xl"
              shadow="lg"
              textAlign="center"
              transition="transform 0.2s"
              _hover={{ transform: 'translateY(-5px)' }}
            >
              <Icon as={feature.icon} w={10} h={10} color="purple.500" mb={4} />
              <Heading as="h3" size="md" mb={2}>
                {feature.title}
              </Heading>
              <Text color="gray.600">{feature.description}</Text>
            </Box>
          ))}
        </SimpleGrid>

        <Box 
          bg={cardBg} 
          p={8} 
          rounded="xl" 
          shadow="xl"
          bgImage="url('/casino/banner.jpg')"
          bgSize="cover"
          bgPosition="center"
          position="relative"
          overflow="hidden"
          mb={16}
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.600"
          />
          <VStack
            spacing={4}
            position="relative"
            zIndex={1}
            color="white"
            textAlign="center"
            py={12}
          >
            <Heading size="xl">Start Your Journey Today</Heading>
            <Text fontSize="lg" maxW="2xl">
              Join millions of players worldwide in the most trusted online casino platform
            </Text>
            <Button
              size="lg"
              colorScheme="purple"
              _hover={{ transform: 'scale(1.05)' }}
              transition="transform 0.2s"
            >
              Get Started
            </Button>
          </VStack>
        </Box>
      </Container>

      {/* Call to Action Banner */}
      <CallToActionBanner
        title="Ready to Win Big?"
        description="Experience the thrill of TIC GLOBAL Casino with provably fair games, instant payouts, and exclusive VIP rewards. Your fortune awaits!"
      />
    </Box>
  )
}
