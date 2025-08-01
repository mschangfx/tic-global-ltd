'use client'

import {
  Box,
  Flex,
  HStack,
  VStack,
  IconButton,
  Button,
  useDisclosure,
  useColorModeValue,
  Stack,
  Image,
  Text,
  Container,
  Badge,
  // Link as ChakraLink, // Not needed if <a> is direct child of NextLink for Buttons
} from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

interface NavItem {
  label: string
  href: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'TIC Token', href: '/tic-token' },
  { label: 'Plan', href: '/plan' },
  { label: 'Become a Trader', href: '/become-a-trader' },
  { label: 'FAQ\'s', href: '/faqs' },
  { label: 'Contact Us', href: '/contact' },
]

export default function Navbar() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const pathname = usePathname()
  const navBg = '#2D3748'; // Forced dark background
  const borderColor = useColorModeValue('gray.700', 'gray.700') // Consistent border for dark bg

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      w="full"
      maxW="100%"
      overflowX="hidden"
      zIndex={1000}
      bg={navBg}
      backdropFilter="blur(10px)" // Keep if you like the effect
      borderBottom="1px"
      borderColor={borderColor}
      boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)" // Subtle shadow
    >
      <Container maxW="container.xl" px={0}>
        <Flex h={28} alignItems="center" w="full" px={{ base: 4, md: 6 }}>
          {/* Left side - Logo (Far Left) */}
          <Flex alignItems="center" flex="0 0 auto">
            <IconButton
              size="md"
              icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
              aria-label="Open Menu"
              display={{ lg: 'none' }}
              onClick={isOpen ? onClose : onOpen}
              variant="ghost"
              color="white"
              _hover={{ bg: 'whiteAlpha.200'}}
              mr={4}
            />

            <Link href="/">
              <HStack cursor="pointer" spacing={{base: 2, sm: 4}}>
                <Box>
                  <Image
                    src="/logo.png"
                    alt="TIC GLOBAL Logo"
                    height={{ base: 16, md: 24 }}
                    width="auto"
                    objectFit="contain"
                    loading="eager"
                    fallback={
                      <Box w={{ base: 12, md: 16 }} h={{ base: 12, md: 16 }} bg="#14c3cb" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                        <Text color="white" fontWeight="bold" fontSize={{base: "lg", md: "xl"}}>TIC</Text>
                      </Box>
                    }
                  />
                </Box>
                <Box display={{ base: 'none', sm: 'block' }}>
                   <Image
                    src="/letters.png"
                    alt="TIC GLOBAL Letters"
                    height={{ base: 16, md: 24 }}
                    width="auto"
                    objectFit="contain"
                    loading="eager"
                    fallback={
                      <Image src="/letters.png" alt="TIC GLOBAL Letters" height={{ base: 16, md: 24 }} width="auto" objectFit="contain" />
                    }
                  />
                </Box>
              </HStack>
            </Link>
          </Flex>

          {/* Center - Desktop Navigation */}
          <Flex flex="1" justifyContent="center" display={{ base: 'none', lg: 'flex' }} ml={8}>
            <HStack as="nav" spacing={1}>
              {NAV_ITEMS.map((navItem) => (
                <Button
                  key={navItem.label}
                  as={Link}
                  href={navItem.href}
                  variant="ghost"
                  size="lg"
                  position="relative"
                  color={pathname === navItem.href ? '#14c3cb' : 'white'}
                  bg={pathname === navItem.href ? 'rgba(20, 195, 203, 0.1)' : 'transparent'}
                  _hover={{
                    color: '#14c3cb',
                    bg: 'rgba(20, 195, 203, 0.05)',
                    transform: 'translateY(-1px)',
                    textDecoration: 'none',
                  }}
                  transition="all 0.2s"
                  fontWeight={pathname === navItem.href ? 'semibold' : 'medium'}
                  fontSize="lg"
                  px={4}
                  py={3}
                  borderRadius="lg"
                  textDecoration="none"
                >
                  {navItem.label}
                  {navItem.badge && (
                    <Badge
                      position="absolute"
                      top="-2px"
                      right="-2px"
                      colorScheme="orange"
                      variant="solid"
                      fontSize="xs"
                      borderRadius="full"
                      px={2}
                      py={1}
                    >
                      {navItem.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </HStack>
          </Flex>

          {/* Right side - Theme Toggle & Auth Buttons */}
          <Flex flex="0 0 auto" ml={8}>
            <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
              <ThemeToggle variant="icon" size="md" />
              <Button
                as="a"
                href="/join"
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                variant="ctaPrimary"
                px={8}
                py={4}
                fontSize="lg"
              >
                Get Started
              </Button>
            </HStack>
          </Flex>
        </Flex>

        {/* Mobile Navigation */}
        {isOpen && (
          <Box pb={6} display={{ lg: 'none' }} bg={navBg}> 
            <Stack as="nav" spacing={2}>
              {NAV_ITEMS.map((navItem) => (
                <Button
                  key={navItem.label}
                  as={Link}
                  href={navItem.href}
                  w="full"
                  variant="ghost"
                  justifyContent="flex-start"
                  color={pathname === navItem.href ? '#14c3cb' : 'white'}
                  bg={pathname === navItem.href ? 'rgba(20, 195, 203, 0.1)' : 'transparent'}
                  _hover={{
                    color: '#14c3cb',
                    bg: 'rgba(20, 195, 203, 0.05)',
                    textDecoration: 'none',
                  }}
                  fontWeight={pathname === navItem.href ? 'semibold' : 'medium'}
                  position="relative"
                  px={4}
                  py={2}
                  textDecoration="none"
                  onClick={onClose}
                >
                  {navItem.label}
                  {navItem.badge && (
                    <Badge
                      ml={2}
                      colorScheme="orange"
                      variant="solid"
                      fontSize="xs"
                      borderRadius="full"
                    >
                      {navItem.badge}
                    </Badge>
                  )}
                </Button>
              ))}
              <VStack spacing={3} pt={4} w="full">
                <Box w="full" display="flex" justifyContent="center" py={2}>
                  <ThemeToggle variant="switch" showLabel={true} size="md" />
                </Box>
                <Button
                  as="a"
                  href="/join"
                  target="_blank"
                  rel="noopener noreferrer"
                  w="full"
                  bg="#14c3cb"
                  color="white"
                  _hover={{
                    bg: '#0ea5ad',
                  }}
                  onClick={onClose}
                >
                  Get Started
                </Button>
              </VStack>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  )
}
