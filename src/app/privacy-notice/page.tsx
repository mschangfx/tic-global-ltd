'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

export default function PrivacyNoticePage() {
  const bg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  return (
    <Box bg={bg} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          <Box bg={cardBg} p={8} borderRadius="xl" boxShadow="lg">
            <VStack spacing={6} align="start">
              <Heading as="h1" size="xl" color="black">
                Privacy Notice
              </Heading>
              
              <Text fontSize="sm" color="gray.600">
                Last updated: {new Date().toLocaleDateString()}
              </Text>

              <VStack spacing={4} align="start">
                <Heading as="h2" size="md" color="black">
                  1. Information We Collect
                </Heading>
                <Text color="black" lineHeight="1.6">
                  We collect personal information that you provide to us, including:
                </Text>
                <Text color="black" lineHeight="1.6" pl={4}>
                  • Personal identification information (name, email, phone number)
                  • Identity verification documents and biometric data
                  • Address and location information
                  • Financial and transaction information
                </Text>

                <Heading as="h2" size="md" color="black">
                  2. How We Use Your Information
                </Heading>
                <Text color="black" lineHeight="1.6">
                  We use your personal information to:
                </Text>
                <Text color="black" lineHeight="1.6" pl={4}>
                  • Verify your identity and comply with regulatory requirements
                  • Process transactions and provide our services
                  • Communicate with you about your account
                  • Prevent fraud and ensure platform security
                </Text>

                <Heading as="h2" size="md" color="black">
                  3. Biometric Data Processing
                </Heading>
                <Text color="black" lineHeight="1.6">
                  We may collect and process biometric data from identity documents for verification purposes. This includes facial recognition data from government-issued IDs. This data is processed securely and in compliance with applicable privacy laws.
                </Text>

                <Heading as="h2" size="md" color="black">
                  4. Data Security
                </Heading>
                <Text color="black" lineHeight="1.6">
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                </Text>

                <Heading as="h2" size="md" color="black">
                  5. Your Rights
                </Heading>
                <Text color="black" lineHeight="1.6">
                  You have the right to access, update, or delete your personal information. You may also withdraw your consent for data processing at any time, subject to legal and contractual restrictions.
                </Text>

                <Heading as="h2" size="md" color="black">
                  6. Contact Us
                </Heading>
                <Text color="black" lineHeight="1.6">
                  If you have any questions about this Privacy Notice, please contact us at privacy@ticgloballtd.com
                </Text>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
