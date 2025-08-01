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
  HStack,
  Badge,
} from '@chakra-ui/react'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

const UPCOMING_TOURNAMENTS = [
  {
    title: 'TIC GLOBAL Championship',
    game: 'League of Legends',
    date: 'June 15-20, 2025',
    prizePool: '$1,000,000',
    image: '/esports/lol-tournament.jpg',
  },
  {
    title: 'Pro Series Finals',
    game: 'DOTA 2',
    date: 'July 1-5, 2025',
    prizePool: '$500,000',
    image: '/esports/dota-tournament.jpg',
  },
  {
    title: 'Battle Royale Masters',
    game: 'PUBG',
    date: 'July 10-12, 2025',
    prizePool: '$250,000',
    image: '/esports/pubg-tournament.jpg',
  },
]

const FEATURED_TEAMS = [
  {
    name: 'TIC Dragons',
    game: 'League of Legends',
    image: '/esports/team1.jpg',
  },
  {
    name: 'Phoenix Squad',
    game: 'DOTA 2',
    image: '/esports/team2.jpg',
  },
  {
    name: 'Storm Raiders',
    game: 'PUBG',
    image: '/esports/team3.jpg',
  },
]

export default function EsportsPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} minH="calc(100vh - 64px)" py={10}>
      <Container maxW="container.xl">
        <VStack spacing={8} as="section" textAlign="center" mb={12}>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, green.400, blue.500)"
            backgroundClip="text"
          >
            TIC GLOBAL Esports
          </Heading>
          <Text fontSize="xl" color="gray.600" maxW="3xl">
            Where legends are made and champions rise
          </Text>
        </VStack>

        <Box mb={16}>
          <Heading size="xl" mb={8}>
            Upcoming Tournaments
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {UPCOMING_TOURNAMENTS.map((tournament) => (
              <Box
                key={tournament.title}
                bg={cardBg}
                rounded="lg"
                overflow="hidden"
                shadow="md"
                transition="transform 0.2s"
                _hover={{ transform: 'scale(1.02)' }}
              >
                <Image
                  src={tournament.image}
                  alt={tournament.title}
                  fallbackSrc="https://via.placeholder.com/400x200?text=Tournament"
                  h="200px"
                  w="100%"
                  objectFit="cover"
                />
                <VStack p={6} align="stretch" spacing={3}>
                  <Heading size="md">{tournament.title}</Heading>
                  <HStack>
                    <Badge colorScheme="green">{tournament.game}</Badge>
                    <Badge colorScheme="purple">{tournament.date}</Badge>
                  </HStack>
                  <Text color="green.500" fontWeight="bold">
                    Prize Pool: {tournament.prizePool}
                  </Text>
                  <Button colorScheme="blue" size="sm">
                    Learn More
                  </Button>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        <Box mb={16}>
          <Heading size="xl" mb={8}>
            Featured Teams
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {FEATURED_TEAMS.map((team) => (
              <Box
                key={team.name}
                bg={cardBg}
                p={6}
                rounded="lg"
                shadow="md"
                transition="transform 0.2s"
                _hover={{ transform: 'scale(1.02)' }}
              >
                <Image
                  src={team.image}
                  alt={team.name}
                  fallbackSrc="https://via.placeholder.com/150x150?text=Team"
                  borderRadius="full"
                  boxSize="150px"
                  mx="auto"
                  mb={4}
                />
                <VStack spacing={2}>
                  <Heading size="md">{team.name}</Heading>
                  <Badge colorScheme="blue">{team.game}</Badge>
                  <Button variant="outline" colorScheme="blue" size="sm">
                    View Team
                  </Button>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Container>

      {/* Call to Action Banner */}
      <CallToActionBanner
        title="Ready to Compete at the Highest Level?"
        description="Join the elite ranks of TIC GLOBAL esports athletes and compete for massive prize pools in the world's most prestigious tournaments."
      />
    </Box>
  )
}
