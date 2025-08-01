'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react'

export default function TermsAndConditions() {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('gray.800', 'white')
  const headingColor = useColorModeValue('gray.900', 'white')

  return (
    <Box minH="100vh" bg={bgColor} py={12}>
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          <Heading
            as="h1"
            size="2xl"
            textAlign="center"
            color={headingColor}
            mb={8}
          >
            Terms & Conditions
          </Heading>

          <VStack spacing={6} align="stretch">
            <Text color={textColor} fontSize="lg">
              Welcome to TIC GLOBAL Ltd. Before you create an account, please read the following Terms & Conditions carefully. By registering, you agree to be bound by these terms.
            </Text>

            <Divider />

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Eligibility
              </Heading>
              <Text color={textColor} mb={4}>
                To use our services, you must:
              </Text>
              <VStack spacing={2} align="start" pl={4}>
                <Text color={textColor}>• Be at least 18 years old or the legal age in your jurisdiction</Text>
                <Text color={textColor}>• Have the legal capacity to enter into a binding agreement</Text>
                <Text color={textColor}>• Provide accurate, complete, and up-to-date information when registering</Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Account Creation & Referral
              </Heading>
              <VStack spacing={3} align="start">
                <Text color={textColor}>
                  You must register using a valid email address, create a secure password, and provide a Referral ID if required.
                </Text>
                <Text color={textColor}>
                  Referral IDs are used to properly credit your sponsor and build structured network bonuses.
                </Text>
                <Text color={textColor}>
                  Multiple accounts created for abusive or exploitative purposes may be disabled or removed without notice.
                </Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Security of Your Account
              </Heading>
              <VStack spacing={3} align="start">
                <Text color={textColor}>
                  You are responsible for keeping your login credentials secure.
                </Text>
                <Text color={textColor}>
                  TIC GLOBAL Ltd. is not liable for any losses resulting from unauthorized access due to negligence.
                </Text>
                <Text color={textColor}>
                  If you suspect any suspicious activity on your account, notify us immediately.
                </Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Use of the Platform
              </Heading>
              <Text color={textColor} mb={4}>
                By creating an account, you agree to:
              </Text>
              <VStack spacing={2} align="start" pl={4}>
                <Text color={textColor}>• Use the platform only for lawful purposes</Text>
                <Text color={textColor}>• Abide by all local laws and platform rules</Text>
                <Text color={textColor}>• Not engage in fraud, abuse, or manipulation of the bonus system, tokens, or referral program</Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Tokens, Earnings & Plans
              </Heading>
              <VStack spacing={3} align="start">
                <Text color={textColor}>
                  TIC and GIC tokens are internal to our platform and follow the earnings structure published in our whitepaper.
                </Text>
                <Text color={textColor}>
                  Rewards, bonuses, and withdrawals are subject to verification and compliance with our policies.
                </Text>
                <Text color={textColor}>
                  TIC GLOBAL reserves the right to modify token pricing or payout structures in response to economic or platform changes.
                </Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Termination of Account
              </Heading>
              <Text color={textColor} mb={4}>
                TIC GLOBAL Ltd. reserves the right to suspend or terminate accounts that:
              </Text>
              <VStack spacing={2} align="start" pl={4}>
                <Text color={textColor}>• Violate these terms</Text>
                <Text color={textColor}>• Engage in fraudulent or abusive behavior</Text>
                <Text color={textColor}>• Compromise platform security or community trust</Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Limitation of Liability
              </Heading>
              <Text color={textColor} mb={4}>
                TIC GLOBAL Ltd. provides this platform "as is." We are not liable for:
              </Text>
              <VStack spacing={2} align="start" pl={4}>
                <Text color={textColor}>• Losses due to technical issues, network failures, or third-party providers</Text>
                <Text color={textColor}>• Decisions you make based on platform content, income estimates, or community advice</Text>
              </VStack>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Amendments
              </Heading>
              <Text color={textColor}>
                We may update these terms at any time. You will be notified of significant changes via email or platform notification. Continued use of the platform after changes constitutes acceptance.
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Governing Law
              </Heading>
              <Text color={textColor}>
                These Terms shall be governed by the laws of [Insert Governing Jurisdiction].
              </Text>
            </Box>

            <Box>
              <Heading as="h2" size="lg" color={headingColor} mb={4}>
                Contact
              </Heading>
              <Text color={textColor} mb={2}>
                For questions, support, or policy inquiries, contact us at:
              </Text>
              <VStack spacing={2} align="start" pl={4}>
                <Text color={textColor}>📧 support@ticglobal.com</Text>
                <Text color={textColor}>🌐 www.ticglobal.com</Text>
              </VStack>
            </Box>

            <Divider />

            <Text color={textColor} fontSize="sm" textAlign="center" fontStyle="italic">
              Last updated: {new Date().toLocaleDateString()}
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
