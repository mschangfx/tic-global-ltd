'use client'

import {
  Box,
  Container,
  Stack,
  Text,
  Link as ChakraLink,
  SimpleGrid,

  Input,
  Button,
  VStack,
  HStack,
  Image,
  useColorModeValue,
  Divider,

} from '@chakra-ui/react'
import Link from 'next/link'
// Removed social media icons import

const FOOTER_NAV_ITEMS = [
  { label: 'About Us', href: '/about' },
  { label: 'TIC & GIC Token', href: '/tic-token' },
  { label: 'Plans', href: '/plan' },
  { label: 'FAQ\'s', href: '/faqs' },
  { label: 'Contact Us', href: '/contact' },
  // { label: 'Whitepaper', href: '/whitepaper' }, // Example
];

// Removed social links array

export default function Footer() {
  const preFooterBg = useColorModeValue('blue.600', 'blue.800'); // Dark blue for pre-footer
  const footerBg = useColorModeValue('#2c3e50', '#2c3e50'); // Specific hex color for main footer
  const textColor = useColorModeValue('gray.400', 'gray.500');
  const headingColor = useColorModeValue('whiteAlpha.900', 'whiteAlpha.900');
  const inputBg = useColorModeValue('gray.700', 'gray.800');
  const inputBorder = useColorModeValue('gray.600', 'gray.700');

  return (
    <Box>
      {/* Main Footer Section */}
      <Box bg={footerBg} color={textColor} py={10}>
        <Container maxW="container.xl">
          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={{ base: 8, md: 16 }}
            justify="space-between"
            align={{ base: 'center', md: 'flex-start' }}
            textAlign={{ base: 'center', md: 'left' }}
          >
            <VStack spacing={4} align={{ base: 'center', md: 'flex-start' }}>
              <Text fontWeight="bold" color={headingColor} fontSize="lg">Navigation</Text>
              {FOOTER_NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} passHref legacyBehavior>
                  <ChakraLink _hover={{ color: 'white' }}>{item.label}</ChakraLink>
                </Link>
              ))}
            </VStack>

            <VStack spacing={4} align={{ base: 'center', md: 'flex-start' }} maxW="sm">
              <Text fontWeight="bold" color={headingColor} fontSize="lg">Subscribe to TIC GLOBAL</Text>
              <HStack as="form" onSubmit={(e) => e.preventDefault()} w="full"> {/* Visual form */}
                <Input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  bg={inputBg}
                  borderColor={inputBorder}
                  _placeholder={{ color: 'gray.500' }}
                  color="white"
                  aria-label="Email address for newsletter subscription"
                />
                <Button type="submit" colorScheme="blue" px={8}>
                  Subscribe
                </Button>
              </HStack>
              <Text fontSize="xs" color="white">
                By submitting this form, you agree to receive marketing and other communications from TIC GLOBAL. You can unsubscribe at any time. For more information on our privacy practices, please review our{' '}
                <Link href="/privacy-policy" passHref legacyBehavior><ChakraLink color="blue.400" _hover={{textDecoration: "underline"}}>Privacy Policy</ChakraLink></Link>.
              </Text>
            </VStack>


          </Stack>

          <Divider my={10} borderColor="gray.700" />

          <Text textAlign="center" fontSize="sm" color="whiteAlpha.800"> {/* Changed color to whiteAlpha.800 */}
            &copy; 2020-2025 TIC GLOBAL. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}