'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  Image, // Added Image import
} from '@chakra-ui/react'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'What is TIC GLOBAL Ltd.?',
    answer:
      'TIC GLOBAL Ltd. is a blockchain-powered platform that combines gaming, e-casino, and e-sports with decentralized finance, allowing users to play, earn, and invest through tokenized systems.',
  },
  {
    question: 'What are TIC and GIC tokens?',
    answer:
      'TIC Token is used for subscriptions, staking, in-game bonuses, and community rewards. GIC Token is used for business packages, encoding access, and P2P transactions.',
  },
  {
    question: 'How do I earn money on the platform?',
    answer:
      'You can earn in four main ways: Passive Gaming Bonus, Direct Gaming Bonus, Gaming Community Bonus (up to 15 levels), Rank-Up Rewards & Incentives.',
  },
  {
    question: 'What’s the minimum amount to start?',
    answer:
      'You can start with as little as $10 through our Starter Package, which gives you access to TIC tokens and community bonuses.',
  },
  {
    question: 'What’s included in the VIP Package?',
    answer:
      'The $138 VIP Package includes: 6,900 TIC tokens, 10% gaming bonus, Access to 15-level community earnings, Rank-up & passive game bonuses.',
  },
  {
    question: 'Is there a limit to how much I can earn?',
    answer:
      'No. Your earnings scale with your participation, network growth, and token value. Bonuses increase with higher ranks and referrals.',
  },
  {
    question: 'How do I withdraw my earnings?',
    answer:
      'Earnings in TIC and GIC tokens can be withdrawn via your digital wallet and exchanged or used for in-platform services.',
  },
  {
    question: 'Are the tokens available on public exchanges?',
    answer:
      'We plan to list TIC and GIC tokens on major exchanges as part of our Phase 3 roadmap, increasing liquidity and visibility.',
  },
  {
    question: 'Is this available worldwide?',
    answer:
      'Yes. TIC GLOBAL Ltd. is a borderless platform. Anyone with internet access and a wallet can participate and earn.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use encrypted systems, audited smart contracts, and industry-standard compliance (KYC/AML for business packages).',
  },
];

export default function FAQsPage() {
  const headingColor = useColorModeValue('gray.800', 'gray.200'); // Updated to match theme
  const textColor = useColorModeValue('gray.700', 'gray.300'); // Updated to match theme
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <>
    <Box py={10} bg="transparent" minH="calc(100vh - 80px)">
      <Container maxW="container.md">
        <VStack spacing={8} mb={12} textAlign="center">
          <Heading as="h1" size="2xl" fontFamily="var(--font-titles)" color="black">
            Frequently Asked Questions
          </Heading>
          <Text fontSize="lg" color={textColor}>
            Find answers to common questions about TIC GLOBAL, our tokens, and investment plans.
          </Text>
        </VStack>

        <Accordion allowMultiple allowToggle>
          {faqData.map((faq, index) => (
            <AccordionItem key={index} borderBottomWidth="1px" borderColor={borderColor}>
              <h2>
                <AccordionButton
                  py={4}
                  _expanded={{ bg: useColorModeValue('blue.50', 'blue.900'), color: useColorModeValue('blue.600', 'blue.200') }}
                  _hover={{ transform: 'scale(1.02)', bg: useColorModeValue('gray.100', 'gray.700') }}
                  transition="transform 0.2s ease-in-out, background-color 0.2s ease-in-out"
                >
                  <Box flex="1" textAlign="left" fontWeight="semibold" fontFamily="var(--font-headings)">
                    {faq.question}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4} color={textColor} bg={useColorModeValue('white', 'gray.800')}>
                {faq.answer}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        <Box mt={12} textAlign="center">
          <Text fontSize="lg" color={textColor}>
            Can't find the answer you're looking for?
          </Text>
          <Text>
            Please{' '}
            <Text as="a" href="/contact" color="blue.500" _hover={{ textDecoration: 'underline' }}>
              contact our support team
            </Text>
            .
          </Text>
        </Box>
      </Container>
    </Box>

    {/* Call to Action Banner */}
    <CallToActionBanner
      title="Still Have Questions?"
      description="Join the TIC GLOBAL community and get instant answers from our support team and experienced members. Your success is our priority!"
    />
    </>
  );
}