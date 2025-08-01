'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

export default function NotificationProcessingPage() {
  const bg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  return (
    <Box bg={bg} minH="100vh" py={8}>
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          <Box bg={cardBg} p={8} borderRadius="xl" boxShadow="lg">
            <VStack spacing={6} align="start">
              <Heading as="h1" size="xl" color="black">
                Notification to Processing of Personal Data
              </Heading>
              
              <Text fontSize="sm" color="gray.600">
                Last updated: {new Date().toLocaleDateString()}
              </Text>

              <VStack spacing={4} align="start">
                <Heading as="h2" size="md" color="black">
                  Purpose of Data Processing
                </Heading>
                <Text color="black" lineHeight="1.6">
                  TIC GLOBAL Ltd. processes your personal data, including biometric information, for the following purposes:
                </Text>
                <Text color="black" lineHeight="1.6" pl={4}>
                  • Identity verification and Know Your Customer (KYC) compliance
                  • Anti-money laundering (AML) and fraud prevention
                  • Regulatory compliance and reporting requirements
                  • Account security and access control
                </Text>

                <Heading as="h2" size="md" color="black">
                  Legal Basis for Processing
                </Heading>
                <Text color="black" lineHeight="1.6">
                  We process your personal data based on:
                </Text>
                <Text color="black" lineHeight="1.6" pl={4}>
                  • Your explicit consent for biometric data processing
                  • Legal obligations under financial services regulations
                  • Legitimate interests in preventing fraud and ensuring platform security
                  • Contractual necessity to provide our services
                </Text>

                <Heading as="h2" size="md" color="black">
                  Biometric Data Processing
                </Heading>
                <Text color="black" lineHeight="1.6">
                  By providing your consent, you acknowledge that we may:
                </Text>
                <Text color="black" lineHeight="1.6" pl={4}>
                  • Extract facial biometric templates from your identity documents
                  • Compare biometric data for identity verification
                  • Store biometric data securely for compliance purposes
                  • Share biometric data with authorized third-party verification services
                </Text>

                <Heading as="h2" size="md" color="black">
                  Data Retention
                </Heading>
                <Text color="black" lineHeight="1.6">
                  We retain your personal data, including biometric information, for as long as necessary to fulfill the purposes outlined above and to comply with legal obligations. Biometric data is typically retained for the duration of your account relationship and for a period thereafter as required by law.
                </Text>

                <Heading as="h2" size="md" color="black">
                  Your Rights
                </Heading>
                <Text color="black" lineHeight="1.6">
                  You have the right to:
                </Text>
                <Text color="black" lineHeight="1.6" pl={4}>
                  • Withdraw your consent at any time (subject to legal requirements)
                  • Access your personal data and biometric information
                  • Request correction of inaccurate data
                  • Request deletion of your data (subject to legal obligations)
                  • Object to processing in certain circumstances
                </Text>

                <Heading as="h2" size="md" color="black">
                  Contact Information
                </Heading>
                <Text color="black" lineHeight="1.6">
                  For questions about data processing or to exercise your rights, contact our Data Protection Officer at dpo@ticgloballtd.com
                </Text>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
