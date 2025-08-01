'use client'

import { Box, Container, Heading, Text, VStack, Divider, useColorModeValue } from '@chakra-ui/react'

export default function PrivacyPolicyPage() {
  const headingColor = useColorModeValue('gray.700', 'whiteAlpha.900');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const sectionBg = useColorModeValue('white', 'gray.800');
  const pageBg = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box bg={pageBg} py={{ base: 10, md: 16 }}>
      <Container maxW="container.lg">
        <Box bg={sectionBg} p={{ base: 6, md: 10 }} borderRadius="lg" shadow="lg">
          <VStack spacing={6} align="stretch">
            <Heading as="h1" size="2xl" textAlign="center" color={headingColor} fontFamily="var(--font-titles)">
              Privacy Policy
            </Heading>
            <Text color={textColor} fontSize="md" textAlign="center">
              This Privacy Policy outlines how TIC GLOBAL Ltd. (“TIC GLOBAL”, “we”, “our”, or “us”) collects, uses, and safeguards the personal data of our website visitors, app users, community members, traders, affiliates, suppliers, and partners (collectively, “you”). It also describes your rights related to that data.
            </Text>
            <Divider />

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              What is Personal Data?
            </Heading>
            <Text color={textColor}>
              Personal data refers to any information that identifies you or could be used to identify you—such as your name, address, email, wallet ID, IP address, or government-issued documents.
            </Text>
            <Text color={textColor}>
              Please read this notice carefully.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Types of Personal Data We Collect
            </Heading>
            <Text color={textColor}>
              We may collect and process the following categories of data:
            </Text>
            <VStack spacing={2} align="stretch" pl={4}>
              <Text color={textColor}><Text as="span" fontWeight="semibold">Information You Provide:</Text> Email address and contact details (e.g. via subscription forms, sign-ups, referrals); KYC documentation (e.g. ID, proof of address); Preferences for marketing and communication; Responses to surveys or support requests.</Text>
              <Text color={textColor}><Text as="span" fontWeight="semibold">Information We Generate:</Text> Unique referral IDs or partner codes; Affiliate earnings, trader performance, and rank history; Profile verification and reward qualifications.</Text>
              <Text color={textColor}><Text as="span" fontWeight="semibold">Automatically Collected Data:</Text> Device/browser info, IP address, and geolocation; Usage logs (e.g. login dates, session duration, page views); App or wallet interactions. We use cookies and similar tech to improve user experience (see section below on Cookies).</Text>
            </VStack>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Legal Basis for Processing
            </Heading>
            <Text color={textColor}>
              We process personal data on the following grounds: To fulfill contracts (e.g., activating your account or package); To meet legal obligations (e.g., AML/KYC checks, fraud monitoring); For legitimate business interests (e.g., user experience, system security); Based on your consent, where legally required (e.g., for email marketing). You can withdraw consent at any time without affecting prior processing.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              How We Use Your Data
            </Heading>
            <Text color={textColor}>
              Provide and manage your TIC GLOBAL account or subscription; Verify your identity during onboarding and payout; Improve our platform through analytics and feedback; Send email updates and promotions (with your permission); Detect fraud and comply with financial regulations.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Cookies and Tracking Technologies
            </Heading>
            <Text color={textColor}>
              We use cookies and similar tools to: Remember preferences and login sessions; Track performance of referral programs; Analyze how users interact with the site. You can control cookie settings via your browser. See our full [Cookie Policy] (the user should replace this with an actual link or page).
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Sharing of Personal Data
            </Heading>
            <Text color={textColor}>
              We share your information only where necessary and only with trusted parties: Service providers: email delivery, identity verification, hosting providers; Regulators or legal authorities, when required by law; Fraud prevention services to protect our users and platform; Payment gateways and partners, for reward disbursement. We do not sell your personal information or use it for third-party advertising.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Data Transfers & International Access
            </Heading>
            <Text color={textColor}>
              If we transfer your data outside your country, we will ensure protection through: Recognized adequacy decisions; Data Transfer Agreements or standard contractual clauses; Technical safeguards (encryption, access controls).
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Data Retention
            </Heading>
            <Text color={textColor}>
              We keep your personal data only as long as necessary: To fulfill service delivery and legal compliance; To resolve disputes and enforce contracts. Retention typically lasts up to 5 years after your last interaction, unless extended by law or audits.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Automated Decisions & Profiling
            </Heading>
            <Text color={textColor}>
              In certain cases, we use automated systems to: Monitor rank progress; Trigger bonuses; Assess eligibility for promotions. These systems are reviewed regularly for fairness and accuracy.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Your Data Protection Rights
            </Heading>
            <Text color={textColor}>
              You have the right to: Access your personal data; Correct or update any errors; Request deletion (“right to be forgotten”); Restrict or object to certain types of processing; Request data portability in a machine-readable format; Withdraw consent at any time (for marketing or optional features). To exercise these rights, email us at: privacy@ticglobal.com
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Right to Complain
            </Heading>
            <Text color={textColor}>
              If you're not satisfied with how your data is handled, you can file a complaint with your local data protection authority.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Changes to This Policy
            </Heading>
            <Text color={textColor}>
              We may update this Privacy Policy periodically. Any major updates will be posted on this page and communicated through appropriate channels.
            </Text>

            <Heading as="h2" size="lg" color={headingColor} fontFamily="var(--font-headings)" pt={4}>
              Contact Us
            </Heading>
            <Text color={textColor}>
              For questions, concerns, or data-related requests: 📧 privacy@ticglobal.com
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}