'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
} from '@chakra-ui/react'

interface CallToActionBannerProps {
  title?: string
  description?: string
  buttonText?: string
  buttonLink?: string
  backgroundImage?: string
  showButton?: boolean
}

export default function CallToActionBanner({
  title = "Ready to Join the Revolution?",
  description = "Become part of the TIC GLOBAL community today and unlock a new era of gaming, entertainment, and financial empowerment. Your journey to limitless possibilities starts now.",
  buttonText = "Get Started",
  buttonLink = "/join",
  backgroundImage = "/new.png",
  showButton = true
}: CallToActionBannerProps) {
  return (
    <Box
      bgImage={`url('${backgroundImage}')`}
      bgSize="cover"
      bgPosition="center"
      bgRepeat="no-repeat"
      position="relative"
      overflow="hidden"
    >
      {/* Dark overlay for text readability */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(12, 21, 30, 0.7)" // Dark overlay with TIC brand color
        zIndex={0}
      />
      
      {/* Dotted pattern overlay */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.1"
        bgImage="radial-gradient(circle at 25% 25%, white 2px, transparent 2px)"
        bgSize="50px 50px"
        zIndex={0}
      />

      <Container maxW="container.lg" position="relative" zIndex={1} py={20} px={{ base: 4, md: 6 }}>
        <Box textAlign="center">
          <Heading 
            as="h2" 
            size="3xl" 
            color="white" 
            fontFamily="var(--font-titles)" 
            fontWeight="bold"
            mb={6}
          >
            {title}
          </Heading>
          <Text 
            fontSize="xl" 
            color="whiteAlpha.900" 
            maxW="3xl" 
            lineHeight="1.6"
            mx="auto"
            mb={8}
          >
            {description}
          </Text>
          {showButton && (
            <HStack spacing={4} justifyContent="center">
              <Button
                as="a"
                href={buttonLink}
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
              >
                {buttonText}
              </Button>
            </HStack>
          )}
        </Box>
      </Container>
    </Box>
  )
}
