'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  Flex,
  Image,
  Badge,
  Stack,
} from '@chakra-ui/react'
import {
  FaWallet,
  FaChartLine,
  FaShieldAlt,
  FaGamepad,
  FaCoins,
  FaUsers,
  FaRocket,
  FaTrophy,
  FaLock,
  FaGlobe
} from 'react-icons/fa'
import Link from 'next/link'
import VideoBackground from '@/components/ui/VideoBackground'

const FEATURES = [
  {
    icon: FaShieldAlt,
    title: 'Anonymity and Privacy',
    description: 'Your investments are protected with enterprise-grade security and complete privacy',
    color: '#14c3cb',
    bgColor: '#f0fdfe',
  },
  {
    icon: FaRocket,
    title: 'Fast and Secure Transactions',
    description: 'Lightning-fast blockchain transactions with military-grade security protocols',
    color: '#ffd700',
    bgColor: '#fffef0',
  },
  {
    icon: FaCoins,
    title: 'Multi-Token Support',
    description: 'Invest with TIC and GIC tokens across our gaming and entertainment ecosystem',
    color: '#14c3cb',
    bgColor: '#f0fdfe',
  },
  {
    icon: FaChartLine,
    title: 'Low Fees and Transparent Pricing',
    description: 'Competitive fees with full transparency - no hidden costs or surprise charges',
    color: '#0c151e',
    bgColor: '#f8fafc',
  },
  {
    icon: FaGamepad,
    title: 'Gaming-Friendly Interface',
    description: 'Intuitive platform designed for gamers and entertainment enthusiasts',
    color: '#ffd700',
    bgColor: '#fffef0',
  },
  {
    icon: FaUsers,
    title: '24/7 Community Support',
    description: 'Round-the-clock support from our dedicated community and technical team',
    color: '#14c3cb',
    bgColor: '#f0fdfe',
  },
]

const INVESTMENT_TIERS = [
  {
    name: 'Starter Plan',
    price: '$10',
    description: 'Perfect for beginners entering the TIC ecosystem',
    features: ['TIC Token Access', 'Basic Gaming Features', 'Community Access'],
    color: 'teal',
    brandColor: '#14c3cb',
  },
  {
    name: 'VIP Plan',
    price: '$138',
    description: 'Premium experience with enhanced earning potential',
    features: ['TIC & GIC Tokens', 'Premium Gaming Access', 'VIP Support', 'Higher Returns'],
    color: 'yellow',
    brandColor: '#ffd700',
    popular: true,
  },
]

export default function Home() {
  const cardBg = useColorModeValue('white', 'gray.800')
  const sectionBg = useColorModeValue('gray.50', 'gray.900')

  return (
    <Box>
      {/* Hero Section - TIC GLOBAL Brand */}
      <Box
        minH="100vh"
        position="relative"
        overflow="hidden"
      >
        {/* Video Background */}
        <VideoBackground
          src="/head.mp4"
          fallbackBg="linear-gradient(135deg, #0c151e 0%, #14c3cb 50%, #ffd700 100%)"
        />
        
        {/* Video Overlay for better text readability */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.400"
          zIndex={1}
        />
        
        {/* Background Pattern (optional, can be removed if video provides enough texture) */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity="0.05"
          bgImage="radial-gradient(circle at 25% 25%, white 2px, transparent 2px)"
          bgSize="60px 60px"
          zIndex={1}
        />
        
        <Container maxW="container.xl" position="relative" zIndex={2}>
          <Flex
            minH="100vh"
            align="center"
            justify="space-between"
            direction={{ base: 'column', lg: 'row' }}
            py={20}
          >
            <VStack
              spacing={8}
              align={{ base: 'center', lg: 'flex-start' }}
              textAlign={{ base: 'center', lg: 'left' }}
              maxW={{ base: '100%', lg: '50%' }}
            >
              <Badge
                colorScheme="whiteAlpha"
                variant="solid"
                px={4}
                py={2}
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
              >
                🚀 Blockchain Gaming & Entertainment
              </Badge>
              
              <Heading
                as="h1"
                size="4xl"
                color="white"
                fontFamily="var(--font-titles)" /* Montserrat */
                fontWeight="700" /* Bold */
                lineHeight="1.1"
              >
                Redefining Entertainment. Empowering Wealth.
              </Heading>
              
              <Image
                src="/letters.png"
                alt="TIC GLOBAL Ltd."
                height={24}
                width="auto"
                fallback={
                  <Image
                    src="/letters.png"
                    alt="TIC GLOBAL Ltd."
                    height={24}
                    width="auto"
                    objectFit="contain"
                  />
                }
              />
              
              <Text
                fontSize="xl"
                color="whiteAlpha.800"
                maxW="2xl"
                lineHeight="1.6"
              >
                Dive into a revolutionary world of gaming, e-sports, and crypto-powered opportunities. Seamlessly earn beyond borders through cutting-edge innovation and a thriving global community. This is more than a platform — it's your gateway to limitless digital wealth.
              </Text>
              
              <HStack spacing={4} flexWrap="wrap">
                <Button
                  size="lg"
                  bg="#14c3cb"
                  color="white"
                  _hover={{
                    bg: '#0ea5ad',
                    transform: 'translateY(-2px)',
                  }}
                  transition="all 0.2s"
                  px={8}
                  fontWeight="bold"
                >
                  Register
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  colorScheme="whiteAlpha"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{
                    bg: 'whiteAlpha.200',
                    borderColor: 'whiteAlpha.500',
                    transform: 'translateY(-2px)',
                  }}
                  transition="all 0.2s"
                  px={8}
                  fontWeight="bold"
                >
                  LogIn
                </Button>
                <Link href="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    colorScheme="whiteAlpha"
                    color="white"
                    borderColor="whiteAlpha.300"
                    _hover={{
                      bg: 'whiteAlpha.200',
                      borderColor: 'whiteAlpha.500',
                    }}
                  >
                    Learn More
                  </Button>
                </Link>
              </HStack>
            </VStack>
            
            {/* Hero Image/3D Element Placeholder */}
            <Box
              maxW={{ base: '100%', lg: '45%' }}
              mt={{ base: 12, lg: 0 }}
            >
              <Box
                w="400px"
                h="400px"
                mx="auto"
                borderRadius="full"
                bgGradient="radial(circle, whiteAlpha.200, transparent)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
              >
                {/* Icons removed as requested */}
              </Box>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Features Section - Inspired by winwinpay.co grid layout */}
      <Box bg={sectionBg} py={20}>
        <Container maxW="container.xl">
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center">
              <Heading
                as="h3"
                size="2xl"
                color="#0c151e"
                fontFamily="var(--font-titles)" /* Montserrat */
                fontWeight="700" /* Bold */
              >
                Why TIC GLOBAL?
              </Heading>
              <Text
                fontSize="xl"
                color="#475569"
                maxW="3xl"
                fontFamily="var(--font-headings)" /* Raleway */
                fontWeight="600" /* SemiBold */
              >
                Experience the next generation of blockchain gaming and investment
                with our comprehensive ecosystem designed for maximum returns and entertainment.
              </Text>
            </VStack>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} w="full">
              {FEATURES.map((feature) => (
                <Card
                  key={feature.title}
                  bg="white"
                  shadow="md"
                  borderRadius="2xl"
                  border="1px"
                  borderColor="#e2e8f0"
                  transition="all 0.3s"
                  _hover={{
                    transform: 'translateY(-8px)',
                    shadow: 'xl',
                    borderColor: feature.color,
                  }}
                  h="full"
                >
                  <CardBody p={8}>
                    <VStack spacing={6} align="flex-start" h="full">
                      <Box
                        p={4}
                        borderRadius="xl"
                        bg={feature.bgColor}
                        color={feature.color}
                      >
                        <Icon as={feature.icon} boxSize={8} />
                      </Box>
                      <VStack spacing={3} align="flex-start" flex={1}>
                        <Heading
                          as="h4"
                          size="md"
                          color="#0c151e"
                          fontFamily="var(--font-titles)" /* Montserrat */
                          fontWeight="700" /* Bold */
                        >
                          {feature.title}
                        </Heading>
                        <Text
                          color="#64748b"
                          fontSize="sm"
                          lineHeight="1.6"
                          fontFamily="var(--font-body-text)" /* Open Sans */
                        >
                          {feature.description}
                        </Text>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Investment Packages Section */}
      <Box py={20}>
        <Container maxW="container.xl">
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center">
              <Heading
                as="h3"
                size="2xl"
                color="#0c151e"
                fontFamily="var(--font-titles)" /* Montserrat */
                fontWeight="700" /* Bold */
              >
                Gaming Business Plan
              </Heading>
              <Text
                fontSize="xl"
                color="#475569"
                maxW="3xl"
                fontFamily="var(--font-headings)" /* Raleway */
                fontWeight="600" /* SemiBold */
              >
                Choose your entry point into the TIC GLOBAL ecosystem.
                Start small or go premium for enhanced earning potential.
              </Text>
            </VStack>
            
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} maxW="4xl">
              {INVESTMENT_TIERS.map((tier) => (
                <Card
                  key={tier.name}
                  bg={cardBg}
                  shadow="xl"
                  borderRadius="2xl"
                  border="2px"
                  borderColor={tier.popular ? tier.brandColor : '#e2e8f0'}
                  position="relative"
                  transition="all 0.3s"
                  _hover={{
                    transform: 'scale(1.02)',
                    shadow: '2xl',
                  }}
                >
                  {tier.popular && (
                    <Badge
                      position="absolute"
                      top="-12px"
                      left="50%"
                      transform="translateX(-50%)"
                      colorScheme={tier.color}
                      variant="solid"
                      px={4}
                      py={2}
                      borderRadius="full"
                      fontSize="sm"
                      fontWeight="bold"
                    >
                      🔥 Most Popular
                    </Badge>
                  )}
                  
                  <CardBody p={8}>
                    <VStack spacing={6} align="flex-start">
                      <VStack spacing={2} align="flex-start">
                        <Heading
                          as="h4"
                          size="lg"
                          color="#0c151e"
                          fontFamily="var(--font-titles)" /* Montserrat */
                          fontWeight="700" /* Bold */
                        >
                          {tier.name}
                        </Heading>
                        <Text
                          fontSize="3xl"
                          fontWeight="bold"
                          color={tier.brandColor}
                          fontFamily="var(--font-titles)" /* Montserrat */
                        >
                          {tier.price}
                        </Text>
                        <Text color="gray.600" fontSize="sm">
                          {tier.description}
                        </Text>
                      </VStack>
                      
                      <VStack spacing={3} align="flex-start" w="full">
                        {tier.features.map((feature) => (
                          <HStack key={feature} spacing={3}>
                            <Icon as={FaLock} color={`${tier.color}.500`} boxSize={4} />
                            <Text fontSize="sm" color="gray.700">
                              {feature}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                      
                      <Link href="/packages" style={{ width: '100%' }}>
                        <Button
                          w="full"
                          size="lg"
                          colorScheme={tier.color}
                          bgGradient={`linear(to-r, ${tier.color}.400, ${tier.color}.600)`}
                          _hover={{
                            bgGradient: `linear(to-r, ${tier.color}.500, ${tier.color}.700)`,
                            transform: 'translateY(-2px)',
                          }}
                          transition="all 0.2s"
                        >
                          Get Started
                        </Button>
                      </Link>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section with Background Image */}
      <Box
        bgImage="url('/new.png')"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity="0.1"
          bgImage="radial-gradient(circle at 25% 25%, white 2px, transparent 2px)"
          bgSize="50px 50px"
        />
        
        <Container maxW="container.xl" position="relative" zIndex={1} py={20}>
          <VStack spacing={8} textAlign="center">
            <Heading as="h3" size="2xl" color="white">
              Ready to Join the Revolution?
            </Heading>
            <Text fontSize="xl" color="whiteAlpha.900" maxW="3xl" lineHeight="1.6">
              Join thousands of gamers and investors who are already earning through our
              blockchain gaming ecosystem. Connect your wallet and start your journey today.
            </Text>
            <HStack spacing={4} flexWrap="wrap">
              <Link href="/packages">
                <Button
                  size="xl"
                  bg="white"
                  color="purple.600"
                  _hover={{
                    bg: 'gray.100',
                    transform: 'scale(1.05)',
                  }}
                  transition="all 0.2s"
                  px={8}
                  py={6}
                  fontSize="lg"
                  fontWeight="bold"
                >
                  Start Investing Now
                </Button>
              </Link>
              <Link href="/gaming">
                <Button
                  size="xl"
                  variant="outline"
                  colorScheme="whiteAlpha"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{
                    bg: 'whiteAlpha.200',
                    borderColor: 'whiteAlpha.500',
                  }}
                  px={8}
                  py={6}
                  fontSize="lg"
                >
                  Explore Gaming
                </Button>
              </Link>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </Box>
  )
}
