'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  Button,
  HStack,
  List,
  ListItem,
  ListIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge, // Added for "MOST POPULAR" in table header
} from '@chakra-ui/react'
import { FaCheckCircle, FaFire, FaTimesCircle } from 'react-icons/fa' // Added FaTimesCircle
import Link from 'next/link'
import CallToActionBanner from '@/components/ui/CallToActionBanner'

const INVESTMENT_TIERS_DATA = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: '$10',
    priceDetail: '/ one-time',
    description: 'Perfect for beginners entering the TIC ecosystem. Get essential access and start your journey.',
    features: [
      '500 TIC Tokens',
      '1st Level Community Earnings',
      '$138 Daily Unilevel Potential',
    ],
    colorScheme: 'blue',
    brandColor: '#14c3cb',
    buttonTextColor: 'blue.500',
    buttonBgColor: 'white',
    buttonBorderColor: 'blue.500',
    ctaLink: '/dashboard/packages?plan=starter',
    popular: false,
    // For comparison table
    tablePrice: '$10',
    tableTicTokens: '500',
    tableCommunityEarnings: '1st Level',
    tableDailyUnilevel: '$138 Potential',
    tableGamingAccess: 'Basic',
    tableSupport: 'Standard',
    tableGicTokenAccess: false,
    tableEarlyAccess: false,
    tableTournamentEntry: 'Select',
    tableMonthlyGICAirdrop: false,
  },
  {
    id: 'vip',
    name: 'VIP Plan',
    price: '$138',
    priceDetail: '/ one-time',
    description: 'Premium experience with enhanced earning potential and exclusive benefits.',
    features: [
      '6900 TIC Tokens',
      '10% Monthly Income',
      '1st - 10th Level Community Earnings',
      '11th - 15th Level Community Earnings (Extended)',
      '$1380 Daily Unilevel Potential',
    ],
    colorScheme: 'yellow',
    brandColor: '#E0B528', // Updated gold
    buttonTextColor: 'black',
    buttonBgColor: '#E0B528', // Updated gold
    buttonBorderColor: '#E0B528', // Updated gold
    ctaLink: '/dashboard/packages?plan=vip',
    popular: true,
    // For comparison table
    tablePrice: '$138',
    tableTicTokens: '6900',
    tableCommunityEarnings: '1st - 15th Level',
    tableDailyUnilevel: '$1380 Potential',
    tableGamingAccess: 'Premium (All Titles)',
    tableSupport: 'Exclusive VIP Channel',
    tableGicTokenAccess: true,
    tableEarlyAccess: true,
    tableTournamentEntry: 'All',
    tableMonthlyGICAirdrop: true,
  },
];

interface ComparisonFeature {
  featureName: string;
  starterValue: string | boolean;
  vipValue: string | boolean;
}

const comparisonFeaturesData: ComparisonFeature[] = [
    { featureName: 'Price', starterValue: INVESTMENT_TIERS_DATA[0].tablePrice, vipValue: INVESTMENT_TIERS_DATA[1].tablePrice },
    { featureName: 'TIC Tokens', starterValue: INVESTMENT_TIERS_DATA[0].tableTicTokens, vipValue: INVESTMENT_TIERS_DATA[1].tableTicTokens },
    { featureName: 'Community Earnings', starterValue: INVESTMENT_TIERS_DATA[0].tableCommunityEarnings, vipValue: INVESTMENT_TIERS_DATA[1].tableCommunityEarnings },
    { featureName: 'Daily Unilevel Potential', starterValue: INVESTMENT_TIERS_DATA[0].tableDailyUnilevel, vipValue: INVESTMENT_TIERS_DATA[1].tableDailyUnilevel },
    { featureName: 'Gaming Access', starterValue: INVESTMENT_TIERS_DATA[0].tableGamingAccess, vipValue: INVESTMENT_TIERS_DATA[1].tableGamingAccess },
    { featureName: 'Support', starterValue: INVESTMENT_TIERS_DATA[0].tableSupport, vipValue: INVESTMENT_TIERS_DATA[1].tableSupport },
    { featureName: 'GIC Token Access', starterValue: INVESTMENT_TIERS_DATA[0].tableGicTokenAccess, vipValue: INVESTMENT_TIERS_DATA[1].tableGicTokenAccess },
    { featureName: 'Early Access to New Features', starterValue: INVESTMENT_TIERS_DATA[0].tableEarlyAccess, vipValue: INVESTMENT_TIERS_DATA[1].tableEarlyAccess },
    { featureName: 'Tournament Entry', starterValue: INVESTMENT_TIERS_DATA[0].tableTournamentEntry, vipValue: INVESTMENT_TIERS_DATA[1].tableTournamentEntry },
    { featureName: 'Monthly GIC Airdrop', starterValue: INVESTMENT_TIERS_DATA[0].tableMonthlyGICAirdrop, vipValue: INVESTMENT_TIERS_DATA[1].tableMonthlyGICAirdrop },
];


export default function PlanPage() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const headingColor = useColorModeValue('gray.700', 'whiteAlpha.900');
  const textColor = useColorModeValue('gray.700', 'gray.500');
  const tableHeaderBg = useColorModeValue('gray.100', 'gray.700');
  const tableCellBorder = useColorModeValue('gray.200', 'gray.700');
  const highlightedRowBg = useColorModeValue('gray.100', 'gray.700'); // Adjusted for subtle highlight
  const hoverRowBg = useColorModeValue('gray.300', 'gray.700'); // Made hover darker

  return (
    <>
    <Box py={{ base: 10, md: 16 }} bg="transparent">
      <Container maxW="container.xl"> {/* Changed to container.xl for more space for table */}
        <VStack spacing={10} align="stretch">
          <Heading as="h1" size="2xl" textAlign="center" color="black" fontFamily="var(--font-titles)">
            Select from the Industry's Best Plans
          </Heading>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="stretch">
            {INVESTMENT_TIERS_DATA.map((tier) => (
              <Card
                key={tier.id}
                bg={cardBg}
                borderRadius="xl"
                border="1px"
                borderColor={tier.popular ? tier.brandColor : useColorModeValue('gray.200', 'gray.600')}
                boxShadow={tier.popular ? `0 10px 15px -3px ${tier.brandColor}40, 0 4px 6px -2px ${tier.brandColor}20` : 'xl'}
                overflow="visible"
                transition="all 0.3s ease-in-out"
                _hover={{
                  transform: 'translateY(-4px)',
                  boxShadow: tier.popular ? `0 12px 20px -3px ${tier.brandColor}50, 0 6px 10px -2px ${tier.brandColor}30` : '2xl',
                  bg: tier.popular
                    ? useColorModeValue(`${tier.colorScheme}.100`, `${tier.colorScheme}.700`) // Lighter brand color for popular
                    : useColorModeValue('gray.100', 'gray.700'), // Light gray for non-popular
                  borderColor: tier.brandColor, // Emphasize with brand color for all on hover
                }}
                display="flex"
                flexDirection="column"
                position="relative"
                p={0}
              >
                {tier.popular && (
                  <Box
                    position="absolute"
                    top="-1px"
                    right="-1px"
                    bg={tier.brandColor}
                    color={tier.buttonTextColor}
                    px={4}
                    py={1.5}
                    fontSize="xs"
                    fontWeight="bold"
                    borderTopRightRadius="xl"
                    borderBottomLeftRadius="lg"
                    zIndex={1}
                  >
                    <HStack spacing={1.5}>
                      <Icon as={FaFire} />
                      <Text>MOST POPULAR</Text>
                    </HStack>
                  </Box>
                )}
                <CardBody p={{base:6, md:8}} display="flex" flexDirection="column" flexGrow={1} justifyContent="space-between">
                  <VStack spacing={4} align="start" w="full">
                    <Heading as="h3" size="lg" color={tier.popular ? tier.brandColor : tier.buttonTextColor } fontFamily="var(--font-headings)">
                      {tier.name}
                    </Heading>
                    <HStack alignItems="baseline">
                      <Text fontSize={{base: "3xl", md: "4xl"}} fontWeight="bold" color="black">
                        {tier.price}
                      </Text>
                      <Text fontSize="md" color={textColor} transform="translateY(-2px)">
                        {tier.priceDetail}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color={textColor} pb={2} minH="3.6em">
                      {tier.description}
                    </Text>
                    <List spacing={2.5} pt={2} w="full">
                      {tier.features.map((feature, index) => (
                        <ListItem key={index} display="flex" alignItems="center">
                          <ListIcon as={FaCheckCircle} color="green.500" boxSize={5}/>
                          <Text fontSize="sm" color={textColor}>{feature}</Text>
                        </ListItem>
                      ))}
                    </List>
                  </VStack>
                  <Button
                    as={Link}
                    href={tier.ctaLink}
                    mt={8}
                    w="full"
                    size="lg"
                    py={7}
                    bg={tier.popular ? tier.buttonBgColor : 'transparent'}
                    color={tier.popular ? tier.buttonTextColor : tier.buttonTextColor}
                    borderColor={tier.buttonBorderColor}
                    borderWidth="2px"
                    variant={tier.popular ? 'solid' : 'outline'}
                    _hover={
                      tier.popular
                        ? { bg: useColorModeValue('yellow.500', 'yellow.300'), opacity: 0.9, transform: 'translateY(-2px)' }
                        : { bg: useColorModeValue('blue.100', 'blue.800'), borderColor: useColorModeValue('blue.700', 'blue.200'), transform: 'translateY(-2px)' }
                    }
                    transition="all 0.2s ease-in-out" // Added transition to button
                    fontWeight="bold"
                    fontFamily="var(--font-titles)"
                  >
                    Get Started with {tier.name}
                  </Button>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Compare Our Plans Table Section */}
          <VStack spacing={6} align="stretch" pt={10}>
            <Heading as="h2" size="xl" textAlign="center" color="black" fontFamily="var(--font-titles)">
              Compare Our Plans
            </Heading>
            <TableContainer bg={cardBg} borderRadius="xl" boxShadow="lg" border="1px" borderColor="#2c3e50">
              <Table variant="simple">
                <Thead bg="#2c3e50">
                  <Tr>
                    <Th fontSize="sm" fontWeight="bold" color="white" textTransform="uppercase" py={4} px={6} borderBottomWidth="1px" borderColor={tableCellBorder}>Feature</Th>
                    <Th fontSize="sm" fontWeight="bold" color={useColorModeValue('blue.300', 'blue.200')} textTransform="uppercase" textAlign="center" py={4} px={6} borderBottomWidth="1px" borderColor={tableCellBorder}>{INVESTMENT_TIERS_DATA[0].name}</Th>
                    <Th fontSize="sm" fontWeight="bold" textTransform="uppercase" textAlign="center" py={4} px={6} borderBottomWidth="1px" borderColor={tableCellBorder}>
                      <HStack justify="center" spacing={2}>
                        <Text color={INVESTMENT_TIERS_DATA[1].brandColor}>{INVESTMENT_TIERS_DATA[1].name}</Text>
                        <Badge bg="orange.400" color="white" px={2} py={0.5} borderRadius="md" fontSize="0.7em">MOST POPULAR</Badge>
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {comparisonFeaturesData.map((item, index) => (
                    <Tr
                      key={item.featureName}
                      _hover={{ bg: hoverRowBg }}
                      transition="background-color 0.2s ease-in-out"
                    >
                      <Td fontWeight="medium" color={textColor} borderColor={tableCellBorder} py={3.5} px={6}>{item.featureName}</Td>
                      <Td textAlign="center" color={textColor} borderColor={tableCellBorder} py={3.5} px={6}>
                        {typeof item.starterValue === 'boolean' ? (
                          item.starterValue ? <Icon as={FaCheckCircle} color="green.500" boxSize={5} /> : <Icon as={FaTimesCircle} color="red.400" boxSize={5} />
                        ) : (
                          item.starterValue
                        )}
                      </Td>
                      <Td textAlign="center" color={textColor} borderColor={tableCellBorder} py={3.5} px={6}>
                        {typeof item.vipValue === 'boolean' ? (
                          item.vipValue ? <Icon as={FaCheckCircle} color="green.500" boxSize={5} /> : <Icon as={FaTimesCircle} color="red.400" boxSize={5} />
                        ) : (
                          item.vipValue
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </VStack>
{/* Unlimited Plan Activation Section */}
          <VStack spacing={6} align="stretch" pt={10} pb={10}>
            <Heading as="h2" size="xl" textAlign="center" color="black" fontFamily="var(--font-titles)">
              Unlimited Plan Activation
            </Heading>
            <Text fontSize="lg" textAlign="center" color={useColorModeValue('gray.800', 'gray.600')} maxW="3xl" mx="auto">
              More Plans, More Power — Stack and Scale Freely
            </Text>
            <Text fontSize="md" color={useColorModeValue('gray.800', 'gray.600')} lineHeight="1.7" textAlign="center" maxW="2xl" mx="auto">
              At TIC GLOBAL Ltd., we believe in giving you full freedom over your income potential. That’s why we allow you to:
            </Text>
            <List spacing={3} maxW="sm" mx="auto" pt={4}> {/* Changed maxW to sm */}
              <ListItem display="flex" alignItems="flex-start">
                <ListIcon as={FaCheckCircle} color="green.500" mt={1} />
                <Text as="span" color={useColorModeValue('gray.800', 'gray.600')}>Activate multiple plans at any time</Text>
              </ListItem>
              <ListItem display="flex" alignItems="flex-start"> {/* Changed to flex-start */}
                <ListIcon as={FaCheckCircle} color="green.500" mt={1} /> {/* Added margin top */}
                <Text as="span" color={useColorModeValue('gray.800', 'gray.600')}>Combine Starter and VIP Packages freely</Text>
              </ListItem>
              <ListItem display="flex" alignItems="flex-start"> {/* Changed to flex-start */}
                <ListIcon as={FaCheckCircle} color="green.500" mt={1} /> {/* Added margin top */}
                <Text as="span" color={useColorModeValue('gray.800', 'gray.600')}>Scale up your staking, bonuses, and rewards without limits</Text>
              </ListItem>
            </List>
            <Text fontSize="md" color={useColorModeValue('gray.800', 'gray.600')} lineHeight="1.7" textAlign="center" maxW="2xl" mx="auto" pt={4}>
              Whether you're growing your daily returns, boosting team commissions, or building for long-term passive income—there’s no cap on how many plans you can own.
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="black" textAlign="center" pt={2}>
              No restrictions. No limits. Just growth on your terms.
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>

    {/* Call to Action Banner */}
    <CallToActionBanner
      title="Ready to Choose Your Plan?"
      description="Select the perfect TIC GLOBAL plan for your investment goals and start earning with our proven gaming and crypto ecosystem today."
    />
    </>
  );
}