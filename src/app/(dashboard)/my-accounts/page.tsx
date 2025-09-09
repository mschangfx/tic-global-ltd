'use client';

import { useState, useEffect } from 'react'; // Added for plan selection and data fetching
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Icon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Select,
  IconButton,
  Spacer,
  useColorModeValue,
  SimpleGrid,
  Card, // Added
  CardBody, // Added
  Divider, // Added
  List, // Added
  ListItem, // Added
  ListIcon, // Added
  Badge as ChakraBadge, // Added & Aliased
  Link as ChakraLink, // Added
} from '@chakra-ui/react';
import { FaPlus, FaListUl, FaThLarge, FaBoxOpen, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaFire } from 'react-icons/fa'; // Added icons
import Link from 'next/link'; // Added
import { useRouter } from 'next/navigation'; // Added
import TokenDistributionCard from '@/components/TokenDistributionCard'; // Added
import AutomatedTicDistribution from '@/components/AutomatedTicDistribution'; // Added
import { useSession } from 'next-auth/react'; // Added

// Data for plans (copied from app/(routes)/plan/page.tsx)
const INVESTMENT_TIERS_DATA = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: '$10',
    description: 'Perfect for beginners entering the TIC ecosystem. Get essential access and start your journey.',
    featuresList: [ // Renamed from 'features' to avoid conflict if any, and for clarity
      '500 TIC Tokens',
      '1st Level Community Earnings',
      '$138 Daily Unilevel Potential',
    ],
    ticTokens: '500',
    communityEarnings: '1st Level',
    dailyUnilevel: '$138 Potential',
    gamingAccess: 'Basic',
    support: 'Standard',
    gicTokenAccess: false,
    earlyAccess: false,
    tournamentEntry: 'Select',
    monthlyGICAirdrop: false,
    colorScheme: 'teal',
    brandColor: '#14c3cb',
    ctaLink: '/dashboard/packages?plan=starter', // This link might need to change based on new flow
  },
  {
    id: 'vip',
    name: 'VIP Plan',
    price: '$138',
    description: 'Premium experience with enhanced earning potential and exclusive benefits.',
    featuresList: [
      '6900 TIC Tokens',
      '1st - 10th Level Community Earnings',
      '11th - 15th Level Community Earnings (Extended)',
      '$1380 Daily Unilevel Potential',
    ],
    ticTokens: '6900',
    communityEarnings: '1st - 15th Level',
    dailyUnilevel: '$1380 Potential',
    gamingAccess: 'Premium (All Titles)',
    support: 'Exclusive VIP Channel',
    gicTokenAccess: true,
    earlyAccess: true,
    tournamentEntry: 'All',
    monthlyGICAirdrop: true,
    colorScheme: 'yellow',
    brandColor: '#E0B528', // Updated gold
    popular: true,
    ctaLink: '/dashboard/packages?plan=vip', // This link might need to change
  },
];

// Copied PlanFeatureItem from app/(routes)/plan/page.tsx
const PlanFeatureItem = ({ label, value }: { label: string, value: string | boolean | undefined }) => {
  const itemTextColor = 'black'; // Changed to solid black
  const itemValueColor = 'black'; // Changed to solid black
 return (
    <HStack justifyContent="space-between" w="full">
      <Text fontSize="sm" color={itemTextColor}>{label}</Text>
      {typeof value === 'boolean' ? (
        value ? <Icon as={FaCheckCircle} color="green.500" /> : <Icon as={FaTimesCircle} color="red.500" />
      ) : (
        <Text fontSize="sm" fontWeight="medium" color={itemValueColor}>{value || '-'}</Text>
      )}
    </HStack>
  );
};

export default function MyAccountsPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const textColor = 'black'; // Changed to solid black
  const subtleTextColor = 'black'; // Changed to solid black
  const yellowButtonBg = useColorModeValue('yellow.400', 'yellow.500');
  const yellowButtonHoverBg = useColorModeValue('yellow.500', 'yellow.600');
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(INVESTMENT_TIERS_DATA[1].id); // Default to VIP
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const { data: session } = useSession();

  // Fetch user subscriptions on component mount
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch('/api/user/subscriptions');
        const data = await response.json();

        if (data.success) {
          setUserSubscriptions(data.active_subscriptions || []);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setIsLoadingSubscriptions(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleContinueToBilling = () => {
    if (selectedPlan) {
      // Navigate to billing page with selected plan
      router.push(`/my-accounts/billing?plan=${selectedPlan}`);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      {/* Main Content Area */}
      <VStack spacing={6} align="stretch">
        {/* Header: My Dashboard */}
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color={textColor}>
            My Dashboard
          </Heading>
        </Flex>

        {/* Tabs and Filters */}
        <Box bg={cardBgColor} p={6} borderRadius="lg" shadow="md">
          <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
            <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={4}>
              <TabList>
                <Tab>Plans</Tab>
              </TabList>
              <Spacer />
              <HStack spacing={2}>
                <Select placeholder="Sort by: Newest" size="sm" maxW="180px">
                  <option value="oldest">Oldest</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </Select>
              </HStack>
            </Flex>
            <TabPanels mt={4}>
              <TabPanel p={0}>
                {!showPlanSelection ? (
                  // Show user subscriptions if they exist, otherwise show empty state
                  isLoadingSubscriptions ? (
                    <VStack spacing={4} py={10} textAlign="center">
                      <Text color={textColor}>Loading your plans...</Text>
                    </VStack>
                  ) : userSubscriptions.length > 0 ? (
                    // Display user's active subscriptions in single consolidated cards
                    <VStack spacing={6} align="stretch">
                      {/* Automated TIC Distribution System */}
                      {session?.user?.email && (
                        <AutomatedTicDistribution
                          userEmail={session.user.email}
                          showAdminControls={false}
                        />
                      )}

                      {userSubscriptions.map((subscription) => (
                        <Card key={subscription.id} bg={cardBgColor} borderRadius="lg" shadow="md">
                          <CardBody p={6}>
                            {session?.user?.email ? (
                              <TokenDistributionCard
                                userEmail={session.user.email}
                                subscription={subscription}
                              />
                            ) : (
                              <VStack spacing={4} align="start">
                                <HStack justify="space-between" w="full">
                                  <Heading as="h3" size="md" color={textColor}>
                                    {subscription.plan_name}
                                  </Heading>
                                  <ChakraBadge colorScheme="green" variant="solid">
                                    Active
                                  </ChakraBadge>
                                </HStack>
                                <Text fontSize="sm" color={subtleTextColor}>
                                  Started: {new Date(subscription.start_date).toLocaleDateString()}
                                </Text>
                                <Text fontSize="sm" color={subtleTextColor}>
                                  Expires: {new Date(subscription.end_date).toLocaleDateString()}
                                </Text>
                              </VStack>
                            )}
                          </CardBody>
                        </Card>
                      ))}

                      {/* Add more plans button */}
                      <Card bg={cardBgColor} borderRadius="lg" shadow="md" borderStyle="dashed" borderWidth="2px" borderColor="gray.300">
                        <CardBody p={6} display="flex" alignItems="center" justifyContent="center">
                          <VStack spacing={3} textAlign="center">
                            <Icon as={FaPlus} boxSize={8} color="gray.400" />
                            <Text fontSize="sm" color={subtleTextColor}>Add More Plans</Text>
                            <Button
                              bg="#14c3cb"
                              color="white"
                              _hover={{ bg: "#0891b2" }}
                              size="sm"
                              onClick={() => setShowPlanSelection(true)}
                            >
                              Choose Plans
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    </VStack>
                  ) : (
                    // Empty state when no subscriptions
                    <VStack spacing={4} py={10} textAlign="center">
                      <Icon as={FaBoxOpen} boxSize={16} color={subtleTextColor} />
                      <Heading as="h4" size="md" color={textColor}>
                        You currently have no active plans.
                      </Heading>
                      <Text fontSize="sm" color={subtleTextColor}>
                        Explore our plans to get started.
                      </Text>
                      <Button
                        leftIcon={<Icon as={FaPlus} />}
                        bg="#14c3cb"
                        color="white"
                        _hover={{ bg: "#0891b2" }}
                        size="md"
                        onClick={() => setShowPlanSelection(true)}
                      >
                        Choose Plans
                      </Button>
                    </VStack>
                  )
                ) : (
                  // Integrated Plan Selection UI
                  <VStack spacing={8} align="stretch" py={6}>
                    <HStack spacing={3} cursor="pointer" onClick={() => setShowPlanSelection(false)} _hover={{ color: 'blue.500' }} alignSelf="flex-start">
                      <Icon as={FaArrowLeft} />
                      <Text fontWeight="medium">Back to My Dashboard Overview</Text> {/* Updated text */}
                    </HStack>
                    <Heading as="h2" size="lg" fontFamily="var(--font-titles)" color={textColor} textAlign="center">
                       Set up your account
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      {INVESTMENT_TIERS_DATA.map((tier) => (
                        <Card
                          key={tier.id}
                          bg={selectedPlan === tier.id ?
                            (tier.id === 'starter' ? 'rgba(20, 195, 203, 0.1)' : 'rgba(224, 181, 40, 0.1)') :
                            cardBgColor
                          } // Darker background when selected
                          borderRadius="lg"
                          border="2px"
                          borderColor={tier.brandColor} // Always show outline color
                          boxShadow={selectedPlan === tier.id ? `0 0 20px ${tier.brandColor}66` : 'md'} // Enhanced glow when selected
                          cursor="pointer"
                          onClick={() => setSelectedPlan(tier.id)} // Only one plan can be selected
                          transition="all 0.2s ease-in-out"
                          _hover={{
                            borderColor: tier.brandColor,
                            boxShadow: `0 0 15px ${tier.brandColor}55`,
                            transform: 'scale(1.02)' // Slight zoom on hover
                          }}
                          position="relative"
                          p={6}
                        >
                          {tier.popular && (
                            <ChakraBadge
                              position="absolute"
                              top="15px"
                              right="15px"
                              bg={tier.brandColor}
                              color={tier.id === 'vip' ? 'black' : 'white'}
                              px={3}
                              py={1}
                              borderRadius="full"
                              fontSize="xs"
                              fontWeight="bold"
                            >
                              <Icon as={FaFire} mr="0.5" /> RECOMMENDED
                            </ChakraBadge>
                          )}

                          <VStack spacing={4} align="start">
                            <HStack spacing={2} align="center">
                              {/* Selected Plan Indicator - moved next to plan name */}
                              {selectedPlan === tier.id && (
                                <Icon
                                  as={FaCheckCircle}
                                  color={tier.brandColor}
                                  boxSize={5}
                                  bg="white"
                                  borderRadius="full"
                                  p={0.5}
                                  boxShadow="0 0 0 2px white"
                                />
                              )}
                              <Heading as="h3" size="md" color={tier.brandColor} fontFamily="var(--font-headings)">
                                {tier.name}
                              </Heading>
                            </HStack>
                            <Text fontSize="sm" color={textColor} minH={{md: "3.6em"}}>
                              {tier.description}
                            </Text>
                            <Divider />
                            <PlanFeatureItem label="Minimum deposit" value={tier.price} />
                            <PlanFeatureItem label="TIC Tokens" value={tier.ticTokens} />
                            <PlanFeatureItem label="Community Earnings" value={tier.communityEarnings} />
                            <PlanFeatureItem label="Daily Unilevel Potential" value={tier.dailyUnilevel} />
                            <PlanFeatureItem label="Gaming Access" value={tier.gamingAccess} />
                            <PlanFeatureItem label="Support" value={tier.support} />
                            <PlanFeatureItem label="GIC Token Access" value={tier.gicTokenAccess} />
                          </VStack>
                        </Card>
                      ))}
                    </SimpleGrid>
                    <Button
                      size="lg"
                      bg="#14c3cb"
                      color="white"
                      _hover={{ bg: "#0891b2" }}
                      w={{ base: 'full', md: 'auto' }}
                      alignSelf="center"
                      mt={6}
                      onClick={handleContinueToBilling}
                      isDisabled={!selectedPlan}
                    >
                      Continue to Billing
                    </Button>
                    <Text fontSize="xs" color={subtleTextColor} textAlign="center" mt={4}>
                      Detailed information on our instruments and trading conditions can be found on the{' '}
                      <ChakraLink href="/contract-specifications" color="blue.500" isExternal>
                        Contract Specifications
                      </ChakraLink>{' '}
                      page.
                    </Text>
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Box>
  );
}