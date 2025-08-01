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
  Icon,
  HStack,
} from '@chakra-ui/react'
import { FaTheaterMasks, FaMusic, FaFilm, FaGamepad } from 'react-icons/fa'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

const ENTERTAINMENT_SECTIONS = [
  {
    title: 'Live Events',
    description: 'Experience unforgettable live performances and shows',
    icon: FaTheaterMasks,
  },
  {
    title: 'Music',
    description: 'Discover the latest hits and exclusive music content',
    icon: FaMusic,
  },
  {
    title: 'Movies & Series',
    description: 'Stream premium movies and exclusive series',
    icon: FaFilm,
  },
  {
    title: 'Interactive Content',
    description: 'Engage with unique interactive entertainment experiences',
    icon: FaGamepad,
  },
]

export default function EntertainmentPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} minH="calc(100vh - 64px)" py={10}>
      <Container maxW="container.xl">
        <VStack spacing={8} as="section" textAlign="center" mb={12}>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, red.400, purple.500)"
            backgroundClip="text"
          >
            Entertainment Hub
          </Heading>
          <Text fontSize="xl" color="gray.600" maxW="3xl">
            Your gateway to premium entertainment experiences across multiple platforms
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
          {ENTERTAINMENT_SECTIONS.map((section) => (
            <Box
              key={section.title}
              bg={cardBg}
              rounded="xl"
              shadow="lg"
              p={6}
              textAlign="center"
              transition="transform 0.2s"
              _hover={{ transform: 'translateY(-5px)' }}
            >
              <VStack spacing={4}>
                <Icon as={section.icon} w={12} h={12} color="purple.500" />
                <Heading as="h3" size="md">
                  {section.title}
                </Heading>
                <Text color="gray.600">{section.description}</Text>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        <Box mt={20}>
          <Heading
            as="h2"
            size="xl"
            textAlign="center"
            mb={8}
            color={useColorModeValue('gray.700', 'white')}
          >
            Featured Content
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <Box
              bg={cardBg}
              rounded="lg"
              overflow="hidden"
              shadow="md"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
            >
              <Image
                src="/entertainment/featured-1.jpg"
                alt="Featured Entertainment"
                fallbackSrc="https://via.placeholder.com/400x250?text=Entertainment"
                objectFit="cover"
                h="250px"
                w="100%"
              />
              <Box p={5}>
                <Heading as="h4" size="md" mb={2}>
                  Live Concerts
                </Heading>
                <Text color="gray.600">
                  Experience live music events from top artists around the world
                </Text>
              </Box>
            </Box>

            <Box
              bg={cardBg}
              rounded="lg"
              overflow="hidden"
              shadow="md"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
            >
              <Image
                src="/entertainment/featured-2.jpg"
                alt="Featured Entertainment"
                fallbackSrc="https://via.placeholder.com/400x250?text=Entertainment"
                objectFit="cover"
                h="250px"
                w="100%"
              />
              <Box p={5}>
                <Heading as="h4" size="md" mb={2}>
                  Movie Premieres
                </Heading>
                <Text color="gray.600">
                  Watch the latest blockbusters and exclusive premieres
                </Text>
              </Box>
            </Box>

            <Box
              bg={cardBg}
              rounded="lg"
              overflow="hidden"
              shadow="md"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
            >
              <Image
                src="/entertainment/featured-3.jpg"
                alt="Featured Entertainment"
                fallbackSrc="https://via.placeholder.com/400x250?text=Entertainment"
                objectFit="cover"
                h="250px"
                w="100%"
              />
              <Box p={5}>
                <Heading as="h4" size="md" mb={2}>
                  Interactive Shows
                </Heading>
                <Text color="gray.600">
                  Participate in interactive shows and live streaming events
                </Text>
              </Box>
            </Box>
          </SimpleGrid>
        </Box>
      </Container>

      {/* Call to Action Banner */}
      <CallToActionBanner
        title="Ready for Endless Entertainment?"
        description="Dive into the TIC GLOBAL entertainment universe with exclusive content, live events, and interactive experiences that redefine digital entertainment."
      />
    </Box>
  )
}
