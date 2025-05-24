import { Box, Container, Heading, Text } from '@chakra-ui/react'

export default function PlanPage() {
  return (
    <Box>
      <Container maxW="container.xl" py={20}>
        <Heading as="h1" size="2xl" mb={8} textAlign="center" fontFamily="var(--font-titles)">
          Our Plan
        </Heading>
        <Text fontSize="lg" textAlign="center" fontFamily="var(--font-body-text)">
          Detailed information about our plans will be available here soon.
        </Text>
      </Container>
    </Box>
  )
}