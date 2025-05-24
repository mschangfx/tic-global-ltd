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
} from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  { label: 'FAQ\'s', href: '/faqs' },
  { label: 'Contact Us', href: '/contact' },
]

export default function Navbar() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const pathname = usePathname()
  const navBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(26, 32, 44, 0.95)')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
      bg={navBg}
      backdropFilter="blur(10px)"
      borderBottom="1px"
      borderColor={borderColor}
      boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    >
      <Container maxW="container.xl">
        <Flex h={24} alignItems="center" justifyContent="space-between">
          {/* Mobile menu button */}
          <IconButton
            size="md"
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label="Open Menu"
            display={{ lg: 'none' }}
            onClick={isOpen ? onClose : onOpen}
            variant="ghost"
            color="blue.500"
          />

          {/* Logo */}
          <Link href="/">
            <HStack cursor="pointer" spacing={4}>
              <Box>
                <Image
                  src="/logo.png"
                  alt="TIC GLOBAL Logo"
                  height={20}
                  width="auto"
                  objectFit="contain"
                  loading="eager"
                  fallback={
                    <Box
                      w={20}
                      h={20}
                      bg="#14c3cb"
                      borderRadius="md"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="white" fontWeight="700" fontSize="xl" fontFamily="var(--font-titles)">
                        TIC
                      </Text>
                    </Box>
                  }
                />
              </Box>
              <Box display={{ base: 'none', sm: 'block' }}>
                <Image
                  src="/letters.png"
                  alt="TIC GLOBAL Letters"
                  height={20}
                  width="auto"
                  objectFit="contain"
                  loading="eager"
                  fallback={
                    <Image
                      src="/letters.png"
                      alt="TIC GLOBAL Letters"
                      height={20}
                      width="auto"
                      objectFit="contain"
                    />
                  }
                />
              </Box>
            </HStack>
          </Link>

          {/* Desktop Navigation */}
          <HStack as="nav" spacing={1} display={{ base: 'none', lg: 'flex' }}>
            {NAV_ITEMS.map((navItem) => (
              <Link key={navItem.label} href={navItem.href}>
                <Button
                  variant="ghost"
                  size="md"
                  position="relative"
                  color={pathname === navItem.href ? '#14c3cb' : '#0c151e'}
                  bg={pathname === navItem.href ? '#f0fdfe' : 'transparent'}
                  _hover={{
                    color: '#14c3cb',
                    bg: '#f0fdfe',
                    transform: 'translateY(-1px)',
                  }}
                  transition="all 0.2s"
                  fontWeight={pathname === navItem.href ? 'semibold' : 'medium'}
                  px={4}
                  py={2}
                  borderRadius="lg"
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
              </Link>
            ))}
          </HStack>

          {/* Auth Buttons */}
          <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
            <Button
              variant="outline"
              size="md"
              colorScheme="blue"
              borderColor="#14c3cb"
              color="#14c3cb"
              _hover={{
                bg: '#14c3cb',
                color: 'white',
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s"
              fontWeight="medium"
              px={6}
              borderRadius="lg"
            >
              LogIn
            </Button>
            <Button
              size="md"
              bg="#14c3cb"
              color="white"
              _hover={{
                bg: '#0ea5ad',
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s"
              fontWeight="medium"
              px={6}
              borderRadius="lg"
            >
              Register
            </Button>
          </HStack>
        </Flex>

        {/* Mobile Navigation */}
        {isOpen && (
          <Box pb={6} display={{ lg: 'none' }}>
            <Stack as="nav" spacing={2}>
              {NAV_ITEMS.map((navItem) => (
                <Link key={navItem.label} href={navItem.href}>
                  <Button
                    w="full"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={pathname === navItem.href ? 'blue.500' : 'gray.600'}
                    bg={pathname === navItem.href ? 'blue.50' : 'transparent'}
                    _hover={{
                      color: 'blue.500',
                      bg: 'blue.50',
                    }}
                    fontWeight={pathname === navItem.href ? 'semibold' : 'medium'}
                    onClick={onClose}
                    position="relative"
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
                </Link>
              ))}
              <VStack spacing={3} pt={4} w="full">
                <Button
                  w="full"
                  variant="outline"
                  colorScheme="blue"
                  borderColor="#14c3cb"
                  color="#14c3cb"
                  _hover={{
                    bg: '#14c3cb',
                    color: 'white',
                  }}
                  onClick={onClose}
                >
                  LogIn
                </Button>
                <Button
                  w="full"
                  bg="#14c3cb"
                  color="white"
                  _hover={{
                    bg: '#0ea5ad',
                  }}
                  onClick={onClose}
                >
                  Register
                </Button>
              </VStack>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  )
}
