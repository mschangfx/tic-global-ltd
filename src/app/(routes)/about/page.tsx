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
        bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
        color="white"
        py={20}
      >
        <Container maxW="container.xl">
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
            <Heading as="h1" size="3xl" fontWeight="bold">
              About TIC GLOBAL
            </Heading>
            <Text fontSize="xl" maxW="3xl" opacity={0.9}>
              Revolutionary blockchain gaming and entertainment ecosystem powered by
              TIC and GIC tokens, connecting players and investors worldwide
            </Text>
          </VStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={20}>
        <VStack spacing={20}>
          {/* Company Story */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={12} alignItems="center">
            <VStack spacing={6} align="flex-start">
              <Heading as="h2" size="xl" color="gray.800">
                Our Mission
              </Heading>
              <Text fontSize="lg" color="gray.600" lineHeight="1.8">
                TIC GLOBAL is pioneering the future of blockchain gaming and entertainment.
                We've created a comprehensive ecosystem where gaming meets investment,
                offering unprecedented opportunities for players and investors alike.
              </Text>
              <Text fontSize="lg" color="gray.600" lineHeight="1.8">
                Through our innovative TIC and GIC token system, we're building a sustainable
                economy that rewards participation, skill, and community engagement across
                gaming, e-sports, casino, and entertainment verticals.
              </Text>
              <HStack spacing={4} flexWrap="wrap">
                <Badge colorScheme="blue" variant="solid" px={3} py={1}>
                  TIC Token
                </Badge>
                <Badge colorScheme="purple" variant="solid" px={3} py={1}>
                  GIC Token
                </Badge>
                <Badge colorScheme="green" variant="solid" px={3} py={1}>
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
                <Heading as="h3" size="lg" textAlign="center">
                  Investment Opportunities
                </Heading>
                <Text textAlign="center" color="gray.600">
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
              <Heading as="h2" size="xl" textAlign="center" color="gray.800">
                TIC GLOBAL by the Numbers
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8} w="full">
                {BUSINESS_STATS.map((stat) => (
                  <Stat key={stat.label} textAlign="center">
                    <StatLabel fontSize="sm" color="gray.600">
                      {stat.label}
                    </StatLabel>
                    <StatNumber fontSize="3xl" color="blue.500" fontWeight="bold">
                      {stat.number}
                    </StatNumber>
                    <StatHelpText fontSize="xs" color="gray.500">
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
                <Heading as="h2" size="xl" color="gray.800">
                  Our Core Values
                </Heading>
                <Text fontSize="lg" color="gray.600" maxW="3xl">
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
                        <Heading as="h3" size="md" color="gray.800">
                          {value.title}
                        </Heading>
                        <Text color="gray.600" fontSize="sm" lineHeight="1.6">
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
                <Heading as="h2" size="xl" color="gray.800">
                  Our Business Verticals
                </Heading>
                <Text fontSize="lg" color="gray.600" maxW="3xl">
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
                          <Heading as="h3" size="lg" color="gray.800">
                            {vertical.title}
                          </Heading>
                        </HStack>
                        
                        <Text color="gray.600" lineHeight="1.6">
                          {vertical.description}
                        </Text>
                        
                        <Divider />
                        
                        <VStack spacing={2} align="flex-start" w="full">
                          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                            Key Features:
                          </Text>
                          {vertical.features.map((feature) => (
                            <HStack key={feature} spacing={2}>
                              <Box w={2} h={2} bg="blue.500" borderRadius="full" />
                              <Text fontSize="sm" color="gray.600">
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

          {/* Call to Action */}
          <Box
            w="full"
            bg="blue.500"
            color="white"
            p={12}
            borderRadius="2xl"
            textAlign="center"
          >
            <VStack spacing={6}>
              <Heading as="h2" size="xl">
                Join the TIC GLOBAL Revolution
              </Heading>
              <Text fontSize="lg" maxW="3xl" opacity={0.9}>
                Be part of the future of blockchain gaming and entertainment.
                Start your journey with our investment packages and experience
                the power of the TIC ecosystem.
              </Text>
              <HStack spacing={4} flexWrap="wrap" justify="center">
                <Badge
                  colorScheme="whiteAlpha"
                  variant="solid"
                  px={4}
                  py={2}
                  borderRadius="full"
                >
                  🚀 Starter Plan: $10
                </Badge>
                <Badge
                  colorScheme="whiteAlpha"
                  variant="solid"
                  px={4}
                  py={2}
                  borderRadius="full"
                >
                  💎 VIP Plan: $138
                </Badge>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
