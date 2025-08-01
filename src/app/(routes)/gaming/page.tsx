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
} from '@chakra-ui/react'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

// Dynamically import the Scene component with SSR turned off
const Scene = dynamic(() => import('@/components/three/Scene').then(mod => mod.Scene), {
  ssr: false,
  loading: () => <Box w="100%" h="300px" display="flex" alignItems="center" justifyContent="center"><Text>Loading 3D Experience...</Text></Box>
})

const GAMING_FEATURES = [
  {
    title: 'PC Gaming',
    description: 'Experience high-end PC gaming with cutting-edge graphics and performance',
    image: '/gaming/pc-gaming.jpg',
  },
  {
    title: 'Console Gaming',
    description: 'Dive into the world of console gaming across multiple platforms',
    image: '/gaming/console-gaming.jpg',
  },
  {
    title: 'Mobile Gaming',
    description: 'Take your gaming experience on the go with mobile optimization',
    image: '/gaming/mobile-gaming.jpg',
  },
  {
    title: 'VR Gaming',
    description: 'Step into immersive virtual reality gaming experiences',
    image: '/gaming/vr-gaming.jpg',
  },
]

export default function GamingPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} minH="calc(100vh - 64px)" py={10}>
      <Container maxW="container.xl">
        <VStack spacing={8} as="section" textAlign="center" mb={12}>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, blue.400, purple.500)"
            backgroundClip="text"
          >
            Gaming at TIC GLOBAL
          </Heading>
          <Text fontSize="xl" color="gray.600" maxW="3xl">
            Discover the future of gaming with our cutting-edge technology and immersive experiences
          </Text>
          <Box w="100%" h="300px" position="relative" bg="gray.900" rounded="lg" overflow="hidden">
            <Suspense fallback={<Box w="100%" h="300px" display="flex" alignItems="center" justifyContent="center"><Text>Initializing Scene...</Text></Box>}>
              <Scene />
            </Suspense>
          </Box>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {GAMING_FEATURES.map((feature) => (
            <Box
              key={feature.title}
              bg={cardBg}
              rounded="lg"
              shadow="md"
              overflow="hidden"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
            >
              <Image
                src={feature.image}
                alt={feature.title}
                fallbackSrc="https://via.placeholder.com/600x400?text=Gaming"
                objectFit="cover"
                h="250px"
                w="100%"
              />
              <VStack p={6} spacing={3} align="flex-start">
                <Heading as="h3" size="lg">
                  {feature.title}
                </Heading>
                <Text color="gray.600">{feature.description}</Text>
                <Button colorScheme="blue" size="sm">
                  Learn More
                </Button>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </Container>

      {/* Call to Action Banner */}
      <CallToActionBanner
        title="Ready to Level Up Your Gaming?"
        description="Join the TIC GLOBAL gaming community and experience the future of blockchain-powered gaming with exclusive rewards and tournaments."
      />
    </Box>
  )
}
