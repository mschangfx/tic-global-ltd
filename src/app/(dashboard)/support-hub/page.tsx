'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Button,
  Card,
  CardBody,
  useColorModeValue,
  Icon,
  useToast,
  FormControl,
  FormLabel,
  Textarea,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  FaSearch,
  FaQuestionCircle,
  FaLightbulb,
  FaEnvelope,
  FaMapMarkerAlt,
} from 'react-icons/fa';

// FAQ Data
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'What is TIC GLOBAL Ltd.?',
    answer: 'TIC GLOBAL Ltd. is a blockchain-powered platform that combines gaming, e-casino, and e-sports with decentralized finance, allowing users to play, earn, and invest through tokenized systems.',
    category: 'General',
    keywords: ['tic global', 'platform', 'blockchain', 'gaming', 'defi', 'what is']
  },
  {
    id: '2',
    question: 'What are TIC and GIC tokens?',
    answer: 'TIC Token (launch value $0.02) is used for subscriptions, staking, in-game bonuses, and community rewards with a total supply capped at 1 billion tokens. GIC Token (buy price $63 USD, sell price $60 USD) is a non-public internal business token exclusively for traders who have activated 25 accounts, used for premium earning programs and encoded packages.',
    category: 'Tokens',
    keywords: ['tic token', 'gic token', 'tokens', 'cryptocurrency', 'staking', 'rewards', 'price', 'trader']
  },
  {
    id: '3',
    question: 'What are the available packages and their prices?',
    answer: 'We offer two packages: Starter Plan ($10) includes 500 TIC tokens, 1st level community earnings, and $138 daily unilevel potential. VIP Plan ($138) includes 6,900 TIC tokens, 1st-15th level community earnings, $1,380 daily unilevel potential, premium gaming access, and exclusive VIP support.',
    category: 'Packages',
    keywords: ['packages', 'starter', 'vip', 'pricing', '$10', '$138', 'tic tokens', 'benefits']
  },
  {
    id: '4',
    question: 'How do I earn money on the platform?',
    answer: 'You can earn through: Passive Gaming Bonus, Direct Gaming Bonus, Gaming Community Bonus (up to 15 levels for VIP), and Rank-Up Rewards & Incentives. The ranking system includes Starter, Bronze, Silver, Gold, Platinum, and Diamond levels with monthly rewards ranging from $138 to $14,904.',
    category: 'Earnings',
    keywords: ['earn money', 'earnings', 'bonus', 'rewards', 'passive income', 'gaming bonus', 'ranking']
  },
  {
    id: '5',
    question: 'How does the referral system work?',
    answer: 'Invite friends using your unique referral link and code. Earn 10% commission on Level 1 direct referrals and 5% on Level 2 referrals from both Starter and VIP packages. VIP members can earn community bonuses up to 15 levels deep with decreasing rates. Achievements include First Referral ($50), Bronze Achiever ($100), Silver Leader ($250), Gold Champion ($500), Platinum Elite ($1,000), and Diamond Master ($2,500).',
    category: 'Referrals',
    keywords: ['referral', 'invite friends', 'commission', 'referral link', 'community bonus', '10%', '5%', 'achievements', 'level 1', 'level 2']
  },
  {
    id: '6',
    question: 'How do I verify my account?',
    answer: 'Account verification involves 4 steps: Email verification (30-minute code expiry), Phone verification (SMS to 190+ countries), Profile completion (Asian countries only), and Identity verification (upload passport/ID, max 10MB). Complete all steps to unlock full platform features.',
    category: 'Verification',
    keywords: ['verification', 'verify account', 'kyc', 'identity', 'email verification', 'phone verification', 'sms']
  },
  {
    id: '7',
    question: 'What payment methods are supported?',
    answer: 'We support USDT on TRC20 (Tron) and BEP20 (Binance Smart Chain) networks for deposits and withdrawals. All transactions are processed through your wallet balance with fast confirmation times and low fees.',
    category: 'Payments',
    keywords: ['payment methods', 'cryptocurrency', 'usdt', 'trc20', 'bep20', 'tron', 'binance smart chain', 'crypto payments', 'wallet']
  },
  {
    id: '8',
    question: 'How do I make deposits and withdrawals?',
    answer: 'Go to your Wallet section in the dashboard. For deposits: click Deposit, select your cryptocurrency, enter amount, and follow instructions. For withdrawals: click Withdrawal, enter your external wallet address, specify amount, and submit your request. All transactions are processed through your wallet balance.',
    category: 'Wallet',
    keywords: ['deposit', 'withdrawal', 'wallet', 'cryptocurrency', 'external wallet', 'balance']
  },
  {
    id: '9',
    question: 'Is my data secure?',
    answer: 'Absolutely. We use encrypted systems, audited smart contracts, and industry-standard compliance (KYC/AML for business packages). Your personal and financial data is protected with bank-level security. Our company is located at Naga world samdech techo hun Sen park, Phnom Penh 120101, Cambodia.',
    category: 'Security',
    keywords: ['security', 'data protection', 'encryption', 'kyc', 'aml', 'safe', 'secure', 'cambodia']
  },
  {
    id: '10',
    question: 'Are TIC and GIC tokens available on public exchanges?',
    answer: 'TIC tokens will be listed on major exchanges as part of our Phase 3 roadmap to increase liquidity and visibility. GIC tokens are non-public internal business tokens used exclusively within the TIC GLOBAL platform for premium features and encoded packages.',
    category: 'Tokens',
    keywords: ['exchanges', 'trading', 'liquidity', 'public', 'phase 3', 'roadmap', 'listing']
  },
  {
    id: '11',
    question: 'What is the minimum amount to start?',
    answer: 'You can start with as little as $10 through our Starter Package, which gives you 500 TIC tokens, access to 1st level community earnings, and $138 daily unilevel potential.',
    category: 'Getting Started',
    keywords: ['minimum', 'start', '$10', 'starter package', 'beginner', 'entry level']
  },
  {
    id: '12',
    question: 'How can I contact support?',
    answer: 'You can contact us at contact@ticgloballtd.com or through our support form. VIP members get access to exclusive VIP support channels. Our company address is Naga world samdech techo hun Sen park, Phnom Penh 120101, Cambodia.',
    category: 'Support',
    keywords: ['contact', 'support', 'email', 'help', 'vip support', 'customer service']
  },
  {
    id: '13',
    question: 'Why was my deposit rejected?',
    answer: 'Deposits may be rejected for several reasons: incorrect amount sent, wrong network used (e.g., sending ERC20 instead of TRC20), insufficient network fees, or payment not received within the specified timeframe. Please save your transaction ID and contact support with the details for assistance.',
    category: 'Deposits',
    keywords: ['deposit rejected', 'rejected deposit', 'deposit failed', 'transaction rejected', 'deposit issues', 'payment failed']
  },
  {
    id: '14',
    question: 'Why was my withdrawal rejected?',
    answer: 'Withdrawals may be rejected due to: insufficient account balance, incorrect destination wallet address, unverified account status, or security concerns. Please ensure your account is fully verified and the withdrawal address is correct. Save your transaction ID and contact support for specific details.',
    category: 'Withdrawals',
    keywords: ['withdrawal rejected', 'rejected withdrawal', 'withdrawal failed', 'withdrawal issues', 'payout rejected']
  },
  {
    id: '15',
    question: 'How long do deposits and withdrawals take?',
    answer: 'Deposits are typically processed within 15 minutes to 1 hour after blockchain confirmation. Withdrawals are reviewed by our admin team and usually processed within 24 hours. Processing times may vary depending on network congestion and verification requirements.',
    category: 'Processing Times',
    keywords: ['processing time', 'deposit time', 'withdrawal time', 'how long', 'transaction time', 'confirmation time']
  },
  {
    id: '16',
    question: 'What should I do if my transaction is stuck or pending?',
    answer: 'If your transaction has been pending for more than the expected processing time, please save your transaction ID and contact support. Provide details including the transaction amount, method used, and timestamp. Our team will investigate and provide updates on the status.',
    category: 'Transaction Issues',
    keywords: ['stuck transaction', 'pending transaction', 'transaction stuck', 'transaction pending', 'transaction issues', 'transaction help']
  },
  {
    id: '17',
    question: 'How do I become a trader?',
    answer: 'To become a trader, you must activate exactly 25 accounts at $138 each (total cost: $3,450). Once you meet this requirement, your trader status will be automatically activated. Traders gain exclusive access to GIC token trading at $63 buy/$60 sell prices, unlimited account creation, and enhanced community bonuses.',
    category: 'Trader',
    keywords: ['become trader', 'trader requirements', '25 accounts', '$138', '$3450', 'trader status', 'gic trading']
  },
  {
    id: '18',
    question: 'What are the benefits of being a trader?',
    answer: 'Traders enjoy exclusive benefits: GIC token trading access (buy at $63, sell at $60), unlimited account creation with Starter & VIP plans, enhanced community bonuses, rank-up rewards, and access to premium trading features. Traders can mix and match plan options for maximum earning potential.',
    category: 'Trader',
    keywords: ['trader benefits', 'gic trading', 'unlimited accounts', 'premium features', 'enhanced bonuses', 'trading access']
  },
  {
    id: '19',
    question: 'What is the difference between TIC tokens and GIC tokens?',
    answer: 'TIC tokens ($0.02 each) are public tokens for general platform use, staking, gaming bonuses, and community rewards. GIC tokens ($63 buy/$60 sell) are exclusive internal business tokens only available to traders who have activated 25 accounts, used for premium earning programs and encoded packages.',
    category: 'Tokens',
    keywords: ['tic vs gic', 'token difference', 'public vs private', 'trader exclusive', 'token comparison', 'business tokens']
  },
  {
    id: '20',
    question: 'How do withdrawal fees work?',
    answer: 'All withdrawals have a 10% processing fee. This fee covers network costs, security verification, and platform maintenance. Portions of the deducted amount are used for stake rewards and cashback programs after minor operational fees. Withdrawals also require user verification to be completed.',
    category: 'Withdrawals',
    keywords: ['withdrawal fees', '10% fee', 'processing fee', 'verification required', 'network costs', 'security fee']
  },
  {
    id: '21',
    question: 'What are the ranking levels and their rewards?',
    answer: 'The ranking system includes: Starter (entry level), Bronze, Silver, Gold, Platinum, and Diamond (highest tier). Monthly rewards range from $138 for lower ranks to $14,904 for Diamond level. Rankings are based on your referral network size, community activity, and total earnings. Higher ranks unlock better bonuses and exclusive features.',
    category: 'Rankings',
    keywords: ['ranking system', 'ranks', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'monthly rewards', 'rank rewards']
  },
  {
    id: '22',
    question: 'What countries are supported for phone verification?',
    answer: 'Phone verification via SMS is supported in 190+ countries worldwide, including Philippines, Singapore, Malaysia, Thailand, Indonesia, Vietnam, China, India, Japan, South Korea, and many more. The verification code expires in 30 minutes and is required for account security.',
    category: 'Verification',
    keywords: ['phone verification', 'sms verification', 'countries supported', '190 countries', 'international', 'verification code']
  }
];

function SupportHubPageContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FAQItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const toast = useToast();

  // Initialize form with URL parameters for transaction support
  useEffect(() => {
    const transactionId = searchParams?.get('transactionId');
    const issueType = searchParams?.get('issueType');
    const amount = searchParams?.get('amount');

    if (transactionId) {
      let subject = '';
      let message = '';

      if (issueType === 'deposit-rejected') {
        subject = 'Deposit Rejection Support Request';
        message = `Hello,\n\nI need assistance with my rejected deposit.\n\nTransaction ID: ${transactionId}\nAmount: $${amount || 'N/A'}\n\nPlease help me understand why my deposit was rejected and what steps I need to take to resolve this issue.\n\nThank you for your assistance.`;
      } else if (issueType === 'withdrawal-rejected') {
        subject = 'Withdrawal Rejection Support Request';
        message = `Hello,\n\nI need assistance with my rejected withdrawal.\n\nTransaction ID: ${transactionId}\nAmount: $${amount || 'N/A'}\n\nPlease help me understand why my withdrawal was rejected and what steps I need to take to resolve this issue.\n\nThank you for your assistance.`;
      } else {
        subject = 'Transaction Support Request';
        message = `Hello,\n\nI need assistance with my transaction.\n\nTransaction ID: ${transactionId}\nAmount: $${amount || 'N/A'}\n\nPlease provide support for this transaction.\n\nThank you for your assistance.`;
      }

      setContactForm(prev => ({
        ...prev,
        subject,
        message
      }));
    }
  }, [searchParams]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const searchBg = useColorModeValue('white', 'gray.700');

  // Search functionality
  const searchFAQs = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchTerm = query.toLowerCase().trim();

    const results = faqData.filter(faq => {
      // Search in question
      const questionMatch = faq.question.toLowerCase().includes(searchTerm);

      // Search in answer
      const answerMatch = faq.answer.toLowerCase().includes(searchTerm);

      // Search in keywords
      const keywordMatch = faq.keywords.some(keyword =>
        keyword.toLowerCase().includes(searchTerm)
      );

      return questionMatch || answerMatch || keywordMatch;
    });

    // Sort results by relevance (question matches first, then answer, then keywords)
    results.sort((a, b) => {
      const aQuestionMatch = a.question.toLowerCase().includes(searchTerm);
      const bQuestionMatch = b.question.toLowerCase().includes(searchTerm);

      if (aQuestionMatch && !bQuestionMatch) return -1;
      if (!aQuestionMatch && bQuestionMatch) return 1;

      return 0;
    });

    setSearchResults(results);
    setIsSearching(false);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Set searching state immediately
    setIsSearching(true);

    // Debounce search
    const newTimeout = setTimeout(() => {
      searchFAQs(query);
    }, 300);

    setSearchTimeout(newTimeout);
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setIsSearching(true);
    searchFAQs(searchQuery);
  };



  const handleContactSubmit = async () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim() ||
        !contactForm.email.trim() || !contactForm.subject.trim() ||
        !contactForm.message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setContactSubmitting(true);

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      toast({
        title: 'Message Sent Successfully!',
        description: "Thanks for reaching out. We'll get back to you soon.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setContactForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setContactSubmitting(false);
    }
  };



  return (
    <Box bg={bgColor} minH="100vh" p={{ base: 4, md: 6 }}>
      <Container maxW="7xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading as="h1" size="xl" color="black" mb={2}>
              Support Hub
            </Heading>
            <Text color="black" fontSize="lg">
              Your one-stop solution for all your needs. Find answers, troubleshoot issues, and explore guides.
            </Text>
          </Box>

          {/* Search Section */}
          <Card bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Heading as="h2" size="lg" color="black" mb={4}>
                How can we help you?
              </Heading>
              <Text color="black" mb={6}>
                Your one-stop solution for all your needs. Find answers, troubleshoot issues, and explore guides.
              </Text>

              <VStack spacing={4}>
                <InputGroup size="lg">
                  <Input
                    placeholder="Please enter your question or keyword..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    bg={searchBg}
                    border="1px solid"
                    borderColor={borderColor}
                    _focus={{
                      borderColor: 'yellow.400',
                      boxShadow: '0 0 0 1px #E0B528',
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchClick();
                      }
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Search"
                      icon={<Icon as={FaSearch} />}
                      bg="yellow.400"
                      color="black"
                      _hover={{ bg: 'yellow.500' }}
                      size="md"
                      onClick={handleSearchClick}
                    />
                  </InputRightElement>
                </InputGroup>

                {/* Search Results */}
                {searchQuery && (
                  <Box w="full" mt={6}>
                    {isSearching ? (
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <AlertTitle>Searching...</AlertTitle>
                        <AlertDescription>Looking for answers to your question.</AlertDescription>
                      </Alert>
                    ) : searchResults.length > 0 ? (
                      <Box>
                        <HStack mb={4} justify="space-between" align="center">
                          <HStack>
                            <Icon as={FaLightbulb} color="yellow.500" />
                            <Text fontWeight="bold" color={textColor}>
                              Found {searchResults.length} answer{searchResults.length !== 1 ? 's' : ''}
                            </Text>
                          </HStack>
                          <Badge colorScheme="green" variant="subtle">
                            FAQ Results
                          </Badge>
                        </HStack>

                        <Accordion allowMultiple allowToggle>
                          {searchResults.map((faq) => (
                            <AccordionItem key={faq.id} borderBottomWidth="1px" borderColor={borderColor}>
                              <h2>
                                <AccordionButton
                                  py={4}
                                  _expanded={{
                                    bg: useColorModeValue('blue.50', 'blue.900'),
                                    color: useColorModeValue('blue.600', 'blue.200')
                                  }}
                                  _hover={{
                                    transform: 'scale(1.02)',
                                    bg: useColorModeValue('gray.100', 'gray.700')
                                  }}
                                  transition="transform 0.2s ease-in-out, background-color 0.2s ease-in-out"
                                >
                                  <Box flex="1" textAlign="left">
                                    <HStack justify="space-between" w="full">
                                      <VStack align="start" spacing={1}>
                                        <Text fontWeight="semibold" color={textColor}>
                                          {faq.question}
                                        </Text>
                                        <HStack>
                                          <Badge size="sm" colorScheme="blue" variant="outline">
                                            {faq.category}
                                          </Badge>
                                          <Icon as={FaQuestionCircle} boxSize={3} color="gray.500" />
                                        </HStack>
                                      </VStack>
                                    </HStack>
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4} color={textColor} bg={useColorModeValue('white', 'gray.800')}>
                                <Text lineHeight="1.6">
                                  {faq.answer}
                                </Text>
                                <Divider my={3} />
                                <HStack spacing={2} flexWrap="wrap">
                                  <Text fontSize="sm" color="gray.500">Keywords:</Text>
                                  {faq.keywords.slice(0, 3).map((keyword, index) => (
                                    <Badge key={index} size="sm" colorScheme="gray" variant="subtle">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </HStack>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </Box>
                    ) : (
                      <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <AlertTitle>No results found</AlertTitle>
                        <AlertDescription>
                          Try different keywords or contact our support team for personalized help.
                        </AlertDescription>
                      </Alert>
                    )}
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Contact Form Section */}
          <Card bg="#2D3748" shadow="lg">
            <CardBody p={8}>
              <HStack spacing={8} align="flex-start">
                {/* Left Side - Contact Info */}
                <VStack align="flex-start" spacing={6} flex="1">
                  <Box>
                    <Heading as="h2" size="xl" color="white" mb={2}>
                      CONTACT US
                    </Heading>
                    <Heading as="h3" size="lg" color="white" mb={4}>
                      Let's Talk
                    </Heading>
                    <Text color="white" fontSize="md" maxW="md">
                      Have questions or need more info about TIC GLOBAL Ltd.? Reach out to us at contact@ticgloballtd.com
                    </Text>
                  </Box>

                  <VStack align="flex-start" spacing={3}>
                    <HStack>
                      <Icon as={FaEnvelope} color="white" />
                      <Text color="white">contact@ticgloballtd.com</Text>
                    </HStack>
                    <HStack align="flex-start">
                      <Icon as={FaMapMarkerAlt} color="white" mt={1} />
                      <Text color="white">
                        Naga world samdech techo hun Sen park, Phnom Penh 120101, Cambodia
                      </Text>
                    </HStack>
                  </VStack>
                </VStack>

                {/* Right Side - Contact Form */}
                <Box flex="1" bg="white" p={6} borderRadius="lg">
                  <VStack spacing={4}>
                    {/* Name Fields */}
                    <HStack spacing={4} w="full">
                      <FormControl isRequired>
                        <FormLabel color="black" fontSize="sm">First Name *</FormLabel>
                        <Input
                          placeholder="John"
                          value={contactForm.firstName}
                          onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                          bg="white"
                          border="1px solid"
                          borderColor="gray.300"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="black" fontSize="sm">Last Name *</FormLabel>
                        <Input
                          placeholder="Doe"
                          value={contactForm.lastName}
                          onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                          bg="white"
                          border="1px solid"
                          borderColor="gray.300"
                        />
                      </FormControl>
                    </HStack>

                    {/* Email */}
                    <FormControl isRequired>
                      <FormLabel color="black" fontSize="sm">Email Address *</FormLabel>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.300"
                      />
                    </FormControl>

                    {/* Phone */}
                    <FormControl>
                      <FormLabel color="black" fontSize="sm">Phone Number (Optional)</FormLabel>
                      <Input
                        placeholder="+1 234 567 8900"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.300"
                      />
                    </FormControl>

                    {/* Subject */}
                    <FormControl isRequired>
                      <FormLabel htmlFor="contact-subject" color="black" fontSize="sm">Subject *</FormLabel>
                      <Input
                        id="contact-subject"
                        name="subject"
                        placeholder="Inquiry about TIC Token"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.300"
                      />
                    </FormControl>

                    {/* Message */}
                    <FormControl isRequired>
                      <FormLabel htmlFor="contact-message" color="black" fontSize="sm">Comment / Message *</FormLabel>
                      <Textarea
                        id="contact-message"
                        name="message"
                        placeholder="Your message here..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.300"
                        rows={4}
                      />
                    </FormControl>

                    {/* Submit Button */}
                    <Button
                      w="full"
                      bg="#14c3cb"
                      color="white"
                      _hover={{ bg: "#0ea5e9" }}
                      size="lg"
                      onClick={handleContactSubmit}
                      isLoading={contactSubmitting}
                      loadingText="Sending..."
                    >
                      Send Message
                    </Button>
                  </VStack>
                </Box>
              </HStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>


    </Box>
  );
}

export default function SupportHubPage() {
  return (
    <Suspense fallback={<Box p={8}><Text>Loading...</Text></Box>}>
      <SupportHubPageContent />
    </Suspense>
  );
}
