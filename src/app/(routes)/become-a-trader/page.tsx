'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  List,
  ListItem,
  ListIcon,
  Divider,
  Card,
  CardBody,
  useColorModeValue,
  Icon,
  Button,
} from '@chakra-ui/react'
import {
  FaCheckCircle,
  FaKey,
  FaRocket,
  FaUsers,
  FaBrain,
  FaBriefcase,
  FaHammer,
  FaBitcoin,
  FaNetworkWired,
} from 'react-icons/fa'
import Link from 'next/link'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

export default function BecomeATraderPage() {
  const bgColor = useColorModeValue('#f8f9fa', 'gray.900')
  const cardBg = useColorModeValue('#2C3E50', '#34495E')
  const textColor = 'black'
  const subtleTextColor = 'black'
  const primaryColor = '#00FFFF'
  const dividerColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Hero Banner Section */}
      <Box
        bgImage="url('/img/kuan.png')"
        bgSize="contain"
        bgPosition="center center"
        bgRepeat="no-repeat"
        bgColor="gray.900"
        color="white"
        py={20}
        position="relative"
        minH="600px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {/* Dark overlay for text readability */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.3)"
          zIndex={1}
        />
        <Container maxW="1200px" mx="auto" position="relative" zIndex={2}>
          <VStack spacing={6} textAlign="center">
            <Heading
              as="h1"
              fontSize={{ base: '4xl', md: '6xl' }}
              fontWeight="bold"
              color="white"
              textAlign="center"
            >
              Become a Trader at TIC GLOBAL Ltd.
            </Heading>
            <Text fontSize={{ base: 'xl', md: '2xl' }} color="white" opacity={0.9}>
              Unlock Your Earning Power. Lead with Confidence.
            </Text>
          </VStack>
        </Container>
      </Box>

      <Container maxW="1200px" mx="auto" py={16} px={5}>
        <VStack spacing={16}>

          <Divider borderColor={dividerColor} />

          {/* Minimum Requirement Section */}
          <VStack spacing={6} textAlign="center" w="full">
            <Heading
              as="h2"
              fontSize="3xl"
              color={textColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              <Icon as={FaKey} color={primaryColor} boxSize={12} />
              Minimum Requirement to Become a Trader
            </Heading>
            <Text maxW="700px" color={subtleTextColor} fontSize="xl">
              To activate your trader status, you must:
            </Text>
            
            <Card
              bg={cardBg}
              shadow="lg"
              borderRadius="xl"
              border="1px"
              borderColor={useColorModeValue('gray.200', 'gray.600')}
              maxW="800px"
              w="full"
            >
              <CardBody p={8}>
                <VStack spacing={4}>
                  <Heading
                    as="h3"
                    fontSize="2xl"
                    color={primaryColor}
                    display="flex"
                    alignItems="center"
                    gap={2}
                  >
                    <Icon as={FaCheckCircle} boxSize={8} />
                    Avail 25 Accounts (₱138 each)
                  </Heading>
                  <Text color="white" textAlign="center" fontSize="lg">
                    Use them for yourself, share with your team, or deploy strategically.
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </VStack>

          <Divider borderColor={dividerColor} />

          {/* After Qualification Section */}
          <VStack spacing={6} textAlign="center" w="full">
            <Heading
              as="h2"
              fontSize="3xl"
              color={textColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              <Icon as={FaRocket} color={primaryColor} boxSize={12} />
              What Happens After You Qualify?
            </Heading>
            
            <List spacing={4} maxW="800px" textAlign="left">
              <ListItem display="flex" alignItems="center" gap={3}>
                <ListIcon as={FaCheckCircle} color={primaryColor} boxSize={6} />
                <Text color={textColor} fontSize="lg">
                  Avail <Text as="span" fontWeight="bold" color="black">unlimited new accounts</Text> anytime
                </Text>
              </ListItem>
              <ListItem display="flex" alignItems="center" gap={3}>
                <ListIcon as={FaCheckCircle} color={primaryColor} boxSize={6} />
                <Text color={textColor} fontSize="lg">Mix and match Starter & VIP Plans</Text>
              </ListItem>
              <ListItem display="flex" alignItems="center" gap={3}>
                <ListIcon as={FaCheckCircle} color={primaryColor} boxSize={6} />
                <Text color={textColor} fontSize="lg">Unlock deeper community bonuses</Text>
              </ListItem>
              <ListItem display="flex" alignItems="center" gap={3}>
                <ListIcon as={FaCheckCircle} color={primaryColor} boxSize={6} />
                <Text color={textColor} fontSize="lg">Access rank-up rewards and scaling income</Text>
              </ListItem>
            </List>

            <Box
              as="blockquote"
              fontStyle="italic"
              color={subtleTextColor}
              mt={6}
              p={6}
              bg={useColorModeValue('gray.50', 'gray.700')}
              borderRadius="md"
              maxW="800px"
            >
              "Trader status isn't just a title. It's your full gateway to the platform's highest income potential."
            </Box>
          </VStack>

          <Divider borderColor={dividerColor} />

          {/* Who it's for Section */}
          <VStack spacing={6} textAlign="center" w="full">
            <Heading
              as="h2"
              fontSize="3xl"
              color={textColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              <Icon as={FaUsers} color={primaryColor} boxSize={12} />
              Who Is This For?
            </Heading>

            <Box w="full" display="flex" flexDirection={{ base: "column", md: "row" }} gap={4} justifyContent="center" alignItems="stretch">
              <Card
                bg={cardBg}
                shadow="md"
                borderRadius="lg"
                border="1px"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                flex="1"
                maxW="300px"
              >
                <CardBody p={6}>
                  <VStack spacing={3}>
                    <Icon as={FaHammer} color={primaryColor} boxSize={12} />
                    <Text color="white" textAlign="center" fontWeight="medium" fontSize="lg">
                      Builders and affiliates ready to scale
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card
                bg={cardBg}
                shadow="md"
                borderRadius="lg"
                border="1px"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                flex="1"
                maxW="300px"
              >
                <CardBody p={6}>
                  <VStack spacing={3}>
                    <Icon as={FaBitcoin} color={primaryColor} boxSize={12} />
                    <Text color="white" textAlign="center" fontWeight="medium" fontSize="lg">
                      Crypto earners seeking systemized income
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card
                bg={cardBg}
                shadow="md"
                borderRadius="lg"
                border="1px"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                flex="1"
                maxW="300px"
              >
                <CardBody p={6}>
                  <VStack spacing={3}>
                    <Icon as={FaNetworkWired} color={primaryColor} boxSize={12} />
                    <Text color="white" textAlign="center" fontWeight="medium" fontSize="lg">
                      Ambitious individuals leveraging a full referral structure
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </Box>
          </VStack>

          <Divider borderColor={dividerColor} />

          {/* Final Motivation Section */}
          <VStack spacing={6} textAlign="center" maxW="800px">
            <Heading
              as="h2"
              fontSize="3xl"
              color={textColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
            >
              <Icon as={FaBrain} color={primaryColor} boxSize={12} />
              Not Just Playing—You're Leading.
            </Heading>
            <VStack spacing={4}>
              <Text color={textColor} fontSize="lg">
                25 VIP accounts is just your foundation. What you build next is entirely up to you.
              </Text>
              <Text color={textColor} fontSize="lg">
                Let's turn your crypto activity into{' '}
                <Text as="span" fontWeight="bold" color={primaryColor}>
                  real digital business.
                </Text>
              </Text>
            </VStack>

            <Button
              as="a"
              href="/join"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              variant="ctaPrimary"
              px={12}
              py={7}
              fontSize="xl"
              fontWeight="bold"
              boxShadow="lg"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
              }}
              transition="all 0.2s"
              mt={8}
            >
              Get Started
            </Button>
          </VStack>
        </VStack>
      </Container>

      {/* Call to Action Banner */}
      <CallToActionBanner />
    </Box>
  )
}
