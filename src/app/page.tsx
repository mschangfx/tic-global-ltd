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
  // Image, // Commenting out Chakra Image, will use NextImage
  Badge,
  Stack,
  Link as ChakraLink, // Keep ChakraLink if used elsewhere, though not for these direct Button wraps
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
import NextImage from 'next/image' // Import Next.js Image
import VideoBackground from '@/components/ui/VideoBackground'
import DebugVideoBackground from '@/components/ui/DebugVideoBackground'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

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
    color: '#E0B528', // Updated gold
    bgColor: '#fcf6e4', // Adjusted bgColor to complement new gold
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
    color: '#E0B528', // Updated gold
    bgColor: '#fcf6e4', // Adjusted bgColor to complement new gold
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
    brandColor: '#E0B528', // Updated gold
    popular: true,
  },
]

export default function Home() {
  const cardBg = useColorModeValue('white', 'gray.800')
  const sectionBg = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('black', 'white') // Dynamic text color
  const headingColor = useColorModeValue('#0c151e', 'white') // Dynamic heading color
  const subTextColor = useColorModeValue('#475569', 'gray.300') // Dynamic subtext color

  return (
    <Box w="full" maxW="100%" overflowX="hidden">
      {/* Hero Section - TIC GLOBAL Brand */}
      <Box
        minH="100vh"
        position="relative"
        overflow="hidden"
        w="full"
        maxW="100%"
      >
        {/* Try direct HTML5 video element */}
        <Box
          as="video"
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          zIndex={0}
          objectFit="cover"
          autoPlay
          loop
          muted
          playsInline
          poster="/head.png"
          onError={(e: any) => {
            console.error('Video error:', e);
            // Fallback to background image
            e.target.style.display = 'none';
          }}
          onLoadStart={() => console.log('Video load started')}
          onCanPlay={() => console.log('Video can play')}
          onPlaying={() => console.log('Video is playing')}
        >
          <source src="/head.mp4" type="video/mp4" />
        </Box>

        {/* Fallback background image */}
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          zIndex={-1}
          bgImage="url('/head.png')"
          bgSize="cover"
          bgPosition="center"
          bgRepeat="no-repeat"
        />
        
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.400"
          zIndex={1}
        />
        
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
        
        <Container maxW="container.xl" position="relative" zIndex={2} px={{ base: 4, md: 6 }}>
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
                fontFamily="var(--font-titles)"
                fontWeight="700"
                lineHeight="1.1"
              >
                Redefining Entertainment. Empowering Wealth.
              </Heading>
              
              <Box
                width={{ base: '200px', md: '300px' }}
                height={{ base: '48px', md: '72px'}}
                position="relative"
                maxW="100%"
                overflow="hidden"
              > {/* Wrapper for NextImage with fill */}
                <NextImage
                  src="/letters.png"
                  alt="TIC GLOBAL Ltd."
                  fill
                  sizes="(max-width: 768px) 200px, 300px"
                  style={{ objectFit: 'contain' }}
                  priority // Assuming this is important for LCP
                />
              </Box>
              
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
                  as="a"
                  href="/join"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  variant="ctaPrimary" // Use the new theme variant
                  px={8} // Keep custom padding if needed, or remove if variant handles it
                  fontWeight="bold" // Keep custom weight if needed
                >
                  Get Started
                </Button>
                <Link href="/about" passHref legacyBehavior>
                  <a style={{ textDecoration: 'none' }}>
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
                  </a>
                </Link>
              </HStack>
            </VStack>
            
            <Box
              maxW={{ base: '100%', lg: '45%' }}
              mt={{ base: 12, lg: 0 }}
            >
              <Box
                w={{ base: '280px', sm: '320px', md: '400px' }}
                h={{ base: '280px', sm: '320px', md: '400px' }}
                maxW="100%"
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

      {/* Features Section */}
      <Box bg={sectionBg} py={20}>
        <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center">
              <Heading
                as="h3"
                size="2xl"
                color={headingColor}
                fontFamily="var(--font-titles)"
                fontWeight="700"
              >
                Why TIC GLOBAL?
              </Heading>
              <Text
                fontSize="xl"
                color={subTextColor}
                maxW="3xl"
                fontFamily="var(--font-headings)"
                fontWeight="600"
              >
                Experience the next generation of blockchain gaming and investment
                with our comprehensive ecosystem designed for maximum returns and entertainment.
              </Text>
            </VStack>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} w="full">
              {FEATURES.map((feature) => (
                <Card
                  key={feature.title}
                  bg={cardBg}
                  shadow="md"
                  borderRadius="2xl"
                  border="1px"
                  borderColor={useColorModeValue('#e2e8f0', 'gray.600')}
                  transition="all 0.3s"
                  _hover={{
                    transform: 'translateY(-8px)',
                    shadow: 'xl',
                    borderColor: feature.color,
                    bg: useColorModeValue('gray.50', 'gray.700'), // Dynamic hover background
                  }}
                  h="full"
                >
                  <CardBody p={8}>
                    <VStack spacing={6} align="flex-start" h="full">
                      <Box
                        className="glass-icon-container"
                        p={4}
                        color={feature.color}
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon as={feature.icon} boxSize={8} />
                      </Box>
                      <VStack spacing={3} align="flex-start" flex={1}>
                        <Heading
                          as="h4"
                          size="md"
                          color={headingColor}
                          fontFamily="var(--font-titles)"
                          fontWeight="700"
                        >
                          {feature.title}
                        </Heading>
                        <Text
                          color={subTextColor}
                          fontSize="sm"
                          lineHeight="1.6"
                          fontFamily="var(--font-body-text)"
                        >
                          {feature.description}
                        </Text>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
            <Button
              as="a"
              href="/join"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              variant="ctaPrimary" // Use the new theme variant
              px={10} // Keep custom padding
              py={6}  // Keep custom padding
              fontWeight="bold" // Keep custom weight
              mt={8}
            >
              Get Started
            </Button>
          </VStack>
        </Container>
      </Box>

      {/* Investment Packages Section */}
      <Box py={20}>
        <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center">
              <Heading
                as="h3"
                size="2xl"
                color="#0c151e"
                fontFamily="var(--font-titles)"
                fontWeight="700"
              >
                Gaming Business Plan
              </Heading>
              <Text
                fontSize="xl"
                color="#475569"
                maxW="3xl"
                fontFamily="var(--font-headings)"
                fontWeight="600"
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
                  borderColor={tier.brandColor} // Always use brandColor for border
                  position="relative"
                  transition="all 0.3s"
                  _hover={{
                    transform: 'scale(1.02)',
                    shadow: '2xl',
                    // To make the background a light shade of the brandColor,
                    // we can use the brandColor with some opacity.
                    // Chakra UI allows functional values for some props, but for bg with hex,
                    // we might need to convert hex to rgba or use a pre-defined light shade if available.
                    // For simplicity, let's use a common light shade from the theme if the tier.color matches,
                    // or a generic light version of the brandColor.
                    // A more robust way would be to generate light shades in the theme for each brand color.
                    // As a quick approach, we'll use a light shade from the colorScheme if it's teal or yellow.
                    bg: tier.color === 'teal' ? 'teal.50' : tier.color === 'yellow' ? 'yellow.50' : useColorModeValue('gray.50', 'gray.700'),
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
                          fontFamily="var(--font-titles)"
                          fontWeight="700"
                        >
                          {tier.name}
                        </Heading>
                        <Text
                          fontSize="3xl"
                          fontWeight="bold"
                          color={tier.brandColor}
                          fontFamily="var(--font-titles)"
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
                      
                      <Link href="/packages" passHref legacyBehavior>
                        <a style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
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
                            animation={tier.color === 'yellow' ? "pulseButtonGoldShadow 2s infinite" : undefined} // Apply gold pulse to VIP
                          >
                            Get Started
                          </Button>
                        </a>
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
      <CallToActionBanner />
    </Box>
  )
}
