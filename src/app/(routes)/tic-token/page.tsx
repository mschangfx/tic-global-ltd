'use client'

import { Box, Container, Heading, Text, VStack, Divider, SimpleGrid, Card, CardBody, Icon, HStack } from '@chakra-ui/react' // Added HStack
import { FaChartLine, FaShieldAlt, FaGamepad, FaExchangeAlt, FaUsers, FaTrophy } from 'react-icons/fa' // Removed FaCoins
import CallToActionBanner from '@/components/ui/CallToActionBanner'
import Image from 'next/image'

// Updated data based on user input
const tokenDetails = {
  name: 'TIC & GIC TOKEN',
  tagline: 'Redefining Entertainment. Empowering Wealth.',
  purpose: 'TIC GLOBAL Ltd. operates on a dual-token economy designed to support both community engagement and business scalability within its gaming and crypto-earning ecosystem. The two native tokens—TIC and GIC—serve distinct but complementary purposes, creating a balanced and sustainable token structure.',
  // Removed unused tokenomic fields from here as they will be directly in the JSX
};

const tokenFeatures = [
  {
    icon: FaGamepad,
    title: 'In-Game Utility',
    text: 'Use TIC Tokens for in-game purchases, accessing exclusive content, and participating in special events across all our gaming titles.',
  },
  {
    icon: FaTrophy, // Assuming FaTrophy is available or replace with another
    title: 'Staking & Rewards',
    text: 'Stake your TIC Tokens to earn passive rewards and contribute to the network\'s security and stability.',
  },
  {
    icon: FaUsers,
    title: 'Community Governance',
    text: 'TIC Token holders can participate in governance decisions, shaping the future development of the TIC GLOBAL platform.',
  },
  {
    icon: FaExchangeAlt,
    title: 'Exchange & Trading',
    text: 'TIC Tokens will be listed on major exchanges, providing liquidity and opportunities for traders and investors.',
  },
  {
    icon: FaShieldAlt,
    title: 'Secure & Transparent',
    text: 'Built on a secure blockchain with transparent transaction history, ensuring trust and reliability.',
  },
  {
    icon: FaChartLine,
    title: 'Ecosystem Growth',
    text: 'A portion of platform revenues will be used to buy back and burn TIC tokens, promoting deflationary pressure and value growth.',
  },
];

export default function TICTokenPage() {
  return (
    <>
    <Box py={10} bg="transparent">
      <Container maxW="container.lg">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center" py={10} bg="white" shadow="xl" borderRadius="lg">
            <VStack spacing={5}>
              <Box mb={2} className="floating-coins">
                <Image
                  src="/coins.png"
                  alt="TIC GIC Tokens"
                  width={150}
                  height={150}
                  style={{ objectFit: 'contain' }}
                  onLoad={() => console.log('Image loaded successfully from root')}
                  onError={(e) => {
                    console.error('Image failed to load from root, trying img folder:', e);
                  }}
                />
              </Box>
              <Heading as="h1" size="3xl" fontFamily="var(--font-titles)" color="black">
                {tokenDetails.name}
              </Heading>
              <Heading as="h2" size="lg" fontFamily="var(--font-headings)" fontWeight="medium"> {/* Removed color="gray.700" */}
                {tokenDetails.tagline}
              </Heading>
            </VStack>
          </Box>

          {/* "What is TIC & GIC Token?" Section */}
          <Card shadow="lg" borderRadius="lg">
            <CardBody p={8}>
              <Heading size="xl" mb={4} fontFamily="var(--font-headings)" color="black">
                Overview
              </Heading>
              <Text fontSize="lg" lineHeight="1.7"> {/* Removed color="gray.700" */}
                TIC GLOBAL Ltd. operates on a dual-token economy designed to support both community engagement and business scalability within its gaming and crypto-earning ecosystem. The two native tokens—TIC and GIC—serve distinct but complementary purposes, creating a balanced and sustainable token structure.
              </Text>
            </CardBody>
          </Card>

          <Card shadow="lg" borderRadius="lg">
            <CardBody p={8}>
              <Heading size="lg" mb={6} fontFamily="var(--font-headings)" color="black">Tokenomics</Heading>
              <VStack spacing={8} align="stretch">
                {/* TIC Token Section */}
                <Box>
                  <Heading size="md" mb={3} color="blue.600">TIC Token</Heading>
                  <Text fontSize="md" mb={3}> {/* Removed color="gray.700" */}
                    The TIC token is the core utility token of the platform. It is designed to reward activity, drive user engagement, and facilitate micro-transactions throughout the ecosystem.
                  </Text>
                  <VStack spacing={1} align="stretch" fontSize="sm">
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Launch Value:</Text>
                      <Text>$0.02 USD</Text> {/* Removed color="gray.600" */}
                    </HStack>
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Token Supply:</Text>
                      <Text>Part of the 1 billion total supply</Text> {/* Removed color="gray.600" */}
                    </HStack>
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Distribution:</Text>
                      <Text>Released monthly at 8% per month</Text> {/* Removed color="gray.600" */}
                    </HStack>
                  </VStack>

                  {/* Supply Mechanism Section */}
                  <Box mt={4} p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.500">
                    <Heading size="sm" mb={2} color="blue.700">Supply Mechanism:</Heading>
                    <Text fontSize="sm" lineHeight="1.6">
                      The total supply of TIC Tokens is capped at 1 billion tokens, distributed strategically over a 5-year period to support sustainable growth, user engagement, and ecosystem development.
                    </Text>
                  </Box>
                </Box>

                <Divider />

                {/* GIC Token Section */}
                <Box>
                  <Heading size="md" mb={3} color="yellow.500">GIC Token</Heading>
                  <Text fontSize="md" mb={3}> {/* Removed color="gray.700" */}
                    The GIC token is a non-public, internal business token that unlocks access to TIC GLOBAL’s premium earning programs, encoded packages, and advanced earning tiers.
                  </Text>
                  <VStack spacing={1} align="stretch" fontSize="sm">
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Buy Price:</Text>
                      <Text>$63 USD</Text> {/* Removed color="gray.600" */}
                    </HStack>
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Sell Price:</Text>
                      <Text>$60 USD</Text> {/* Removed color="gray.600" */}
                    </HStack>
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Trading Status:</Text>
                      <Text>Not publicly tradable—platform use only</Text> {/* Removed color="gray.600" */}
                    </HStack>
                  </VStack>

                  {/* Supply Mechanism Section */}
                  <Box mt={4} p={4} bg="yellow.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="yellow.500">
                    <Heading size="sm" mb={2} color="yellow.700">Supply Mechanism:</Heading>
                    <Text fontSize="sm" lineHeight="1.6">
                      Distributed based on business package purchases and referrals
                    </Text>
                  </Box>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          <Box>
            <Heading size="xl" textAlign="center" mb={10} fontFamily="var(--font-headings)" color="black">
              Key Features & Utility
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              {tokenFeatures.map((feature) => (
                <Card key={feature.title} shadow="md" borderRadius="lg" _hover={{ shadow: 'xl', transform: 'translateY(-5px)'}} transition="all 0.2s">
                  <CardBody p={6}>
                    <VStack spacing={4} align="flex-start">
                      <Icon as={feature.icon} w={10} h={10} color="blue.500" />
                      <Heading size="md" fontFamily="var(--font-headings)" color="black">{feature.title}</Heading>
                      <Text>{feature.text}</Text> {/* Removed color="gray.700" */}
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>

          <Divider my={10} />

          <Box textAlign="center">
            <Heading size="lg" mb={4} fontFamily="var(--font-headings)" color="black">How to Acquire TIC Tokens?</Heading>
            <Text fontSize="md" mb={6}> {/* Removed color="gray.600" */}
              Information on token sales, exchange listings, and airdrops will be announced soon. Stay tuned to our official channels.
            </Text>
            {/* Add links to whitepaper, exchanges, etc. when available */}
          </Box>
        </VStack>
      </Container>
    </Box>

    {/* Call to Action Banner */}
    <CallToActionBanner
      title="Ready to Own TIC & GIC Tokens?"
      description="Join the TIC GLOBAL token economy and unlock exclusive earning opportunities, governance rights, and premium platform benefits."
    />
    </>
  );
}