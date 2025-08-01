'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Icon,
  useColorModeValue,
  Image,
  HStack,
  Badge,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
} from '@chakra-ui/react'
import CallToActionBanner from '@/components/ui/CallToActionBanner'
import {
  FaGamepad,
  FaTrophy,
  FaGlobe,
  FaHandshake,
  FaCoins,
  FaUsers,
  FaRocket,
  FaShieldAlt,
  FaChartLine,
  FaLightbulb
} from 'react-icons/fa'

const COMPANY_VALUES = [
  {
    title: 'Blockchain Innovation',
    description: 'Pioneering the future of gaming with TIC and GIC token ecosystems',
    icon: FaRocket,
    color: 'blue.500',
  },
  {
    title: 'Gaming Excellence',
    description: 'Delivering world-class gaming experiences across multiple platforms',
    icon: FaGamepad,
    color: 'purple.500',
  },
  {
    title: 'Global Community',
    description: 'Connecting players and investors across continents',
    icon: FaGlobe,
    color: 'green.500',
  },
  {
    title: 'Transparent Trust',
    description: 'Building lasting relationships through transparency and security',
    icon: FaShieldAlt,
    color: 'orange.500',
  },
]

const BUSINESS_STATS = [
  {
    label: 'Gaming Business Plans',
    number: '2',
    helpText: 'Starter Plan ($10) & VIP Plan ($138)',
  },
  {
    label: 'Token Ecosystem',
    number: '2',
    helpText: 'TIC & GIC Tokens',
  },
  {
    label: 'Business Verticals',
    number: '4',
    helpText: 'Gaming, E-sports, Casino, Entertainment',
  },
  {
    label: 'Global Reach',
    number: '24/7',
    helpText: 'Worldwide Operations',
  },
]

const BUSINESS_VERTICALS = [
  {
    title: 'Gaming',
    description: 'Immersive gaming experiences with blockchain integration and token rewards',
    icon: FaGamepad,
    features: ['Token-based rewards', 'Competitive gaming', 'Community tournaments'],
  },
  {
    title: 'E-Sports',
    description: 'Professional competitive gaming with substantial prize pools and sponsorships',
    icon: FaTrophy,
    features: ['Professional tournaments', 'Streaming platforms', 'Player development'],
  },
  {
    title: 'Casino',
    description: 'Secure and fair online casino experiences with cryptocurrency integration',
    icon: FaCoins,
    features: ['Provably fair games', 'Crypto payments', 'VIP experiences'],
  },
  {
    title: 'Entertainment',
    description: 'Diverse entertainment content and experiences for our global community',
    icon: FaLightbulb,
    features: ['Content creation', 'Live events', 'Interactive experiences'],
  },
]

export default function AboutPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const sectionBg = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} minH="calc(100vh - 80px)">
      {/* Hero Section */}
      <Box
        bgImage="url('/building.png')"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
        color="white" // Keep text color white for contrast
        py={20}
        position="relative" // Add relative positioning for a potential overlay
      >
        {/* Optional: Add an overlay for better text readability if the image is too busy */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.500" // Adjust opacity as needed (e.g., blackAlpha.400, blackAlpha.600)
          zIndex={1}
        />
        <Container maxW="container.xl" position="relative" zIndex={2}> {/* Ensure content is above overlay */}
          <VStack spacing={6} textAlign="center">
            <Badge
              colorScheme="whiteAlpha"
              variant="solid"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
            >
              🌟 Blockchain Gaming Pioneer
            </Badge>
            <Heading as="h1" size="3xl" fontWeight="bold" color="white">
              About TIC GLOBAL
            </Heading>
            <Text fontSize="xl" maxW="3xl" opacity={0.9} color="white">
              Revolutionary blockchain gaming and entertainment ecosystem powered by
              TIC and GIC tokens, connecting players and investors worldwide
            </Text>
          </VStack>
        </Container>
        {/* The Container and VStack were moved into the REPLACE block above to be under the overlay */}
      </Box>

      <Container maxW="container.xl" py={20}>
        <VStack spacing={20}>
          {/* Company Story */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={12} alignItems="center">
            <VStack spacing={6} align="flex-start">
              <Heading as="h2" size="xl" color="black">
                Our Mission
              </Heading>
              <Text fontSize="lg" lineHeight="1.8">
                TIC GLOBAL is pioneering the future of blockchain gaming and entertainment.
                We've created a comprehensive ecosystem where gaming meets investment,
                offering unprecedented opportunities for players and investors alike.
              </Text>
              <Text fontSize="lg" lineHeight="1.8">
                Through our innovative TIC and GIC token system, we're building a sustainable
                economy that rewards participation, skill, and community engagement across
                gaming, e-sports, casino, and entertainment verticals.
              </Text>
              <HStack spacing={4} flexWrap="wrap">
                <Badge colorScheme="blue" variant="solid" px={3} py={1}>
                  TIC Token
                </Badge>
                <Badge bg="#E0B528" color="white" variant="solid" px={3} py={1}> {/* Gold Dust background, ensure text is readable */}
                  GIC Token
                </Badge>
                <Badge bg="#2c3e50" color="white" variant="solid" px={3} py={1}> {/* Dark blue-gray background, ensure text is readable */}
                  Global Ecosystem
                </Badge>
              </HStack>
            </VStack>
            
            <Box
              bg={cardBg}
              p={8}
              borderRadius="2xl"
              shadow="xl"
              border="1px"
              borderColor="gray.100"
            >
              <VStack spacing={6}>
                <Icon as={FaChartLine} boxSize={16} color="blue.500" />
                <Heading as="h3" size="lg" textAlign="center" color="black">
                  Investment Opportunities
                </Heading>
                <Text textAlign="center">
                  Start with our Starter Plan at $10 or unlock premium features
                  with our VIP Plan at $138. Both plans offer unique benefits
                  and earning potential within our ecosystem.
                </Text>
              </VStack>
            </Box>
          </SimpleGrid>

          {/* Business Statistics */}
          <Box w="full" bg={sectionBg} p={10} borderRadius="2xl" shadow="lg">
            <VStack spacing={8}>
              <Heading as="h2" size="xl" textAlign="center" color="black">
                TIC GLOBAL by the Numbers
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8} w="full">
                {BUSINESS_STATS.map((stat) => (
                  <Stat key={stat.label} textAlign="center">
                    <StatLabel fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                      {stat.label}
                    </StatLabel>
                    <StatNumber fontSize="3xl" color="blue.500" fontWeight="bold">
                      {stat.number}
                    </StatNumber>
                    <StatHelpText fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')}>
                      {stat.helpText}
                    </StatHelpText>
                  </Stat>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>

          {/* Company Values */}
          <Box w="full">
            <VStack spacing={12}>
              <VStack spacing={4} textAlign="center">
                <Heading as="h2" size="xl" color="black">
                  Our Core Values
                </Heading>
                <Text fontSize="lg" maxW="3xl">
                  The principles that guide our mission to revolutionize blockchain gaming
                </Text>
              </VStack>
              
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
                {COMPANY_VALUES.map((value) => (
                  <Card
                    key={value.title}
                    bg={cardBg}
                    shadow="lg"
                    borderRadius="xl"
                    border="1px"
                    borderColor="gray.100"
                    transition="all 0.3s"
                    _hover={{
                      transform: 'translateY(-5px)',
                      shadow: 'xl',
                      borderColor: value.color,
                    }}
                    h="full"
                  >
                    <CardBody p={8} textAlign="center">
                      <VStack spacing={4}>
                        <Icon as={value.icon} boxSize={12} color={value.color} />
                        <Heading as="h3" size="md" color="black">
                          {value.title}
                        </Heading>
                        <Text fontSize="sm" lineHeight="1.6">
                          {value.description}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>

          {/* Business Verticals */}
          <Box w="full">
            <VStack spacing={12}>
              <VStack spacing={4} textAlign="center">
                <Heading as="h2" size="xl" color="black">
                  Our Business Verticals
                </Heading>
                <Text fontSize="lg" maxW="3xl">
                  Four interconnected pillars driving the TIC GLOBAL ecosystem
                </Text>
              </VStack>
              
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
                {BUSINESS_VERTICALS.map((vertical) => (
                  <Card
                    key={vertical.title}
                    bg={cardBg}
                    shadow="lg"
                    borderRadius="xl"
                    border="1px"
                    borderColor="gray.100"
                    transition="all 0.3s"
                    _hover={{
                      transform: 'translateY(-3px)',
                      shadow: 'xl',
                    }}
                  >
                    <CardBody p={8}>
                      <VStack spacing={6} align="flex-start">
                        <HStack spacing={4}>
                          <Icon as={vertical.icon} boxSize={8} color="blue.500" />
                          <Heading as="h3" size="lg" color="black">
                            {vertical.title}
                          </Heading>
                        </HStack>
                        
                        <Text lineHeight="1.6">
                          {vertical.description}
                        </Text>
                        
                        <Divider />
                        
                        <VStack spacing={2} align="flex-start" w="full">
                          <Text fontSize="sm" fontWeight="semibold">
                            Key Features:
                          </Text>
                          {vertical.features.map((feature) => (
                            <HStack key={feature} spacing={2}>
                              <Box w={2} h={2} bg="blue.500" borderRadius="full" />
                              <Text fontSize="sm">
                                {feature}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>

        </VStack>
      </Container>

      {/* Call to Action Banner */}
      <CallToActionBanner />
    </Box>
  )
}
