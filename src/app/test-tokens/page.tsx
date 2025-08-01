'use client';

import {
  Box,
  Container,
  Heading,
  VStack,
  Button,
  Text,
  Card,
  CardBody,
  useToast,
  HStack,
  Badge,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

export default function TestTokensPage() {
  const [isDistributing, setIsDistributing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user subscriptions
      const subsResponse = await fetch('/api/user/subscriptions');
      const subsData = await subsResponse.json();
      
      if (subsData.success) {
        setSubscriptions(subsData.active_subscriptions || []);
      }

      // Fetch token distributions for the test user
      const distResponse = await fetch('/api/tokens/distribute?userEmail=mschangfx@gmail.com&limit=10');
      const distData = await distResponse.json();
      
      if (distData.success) {
        setDistributions(distData.distributions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributeTokens = async () => {
    setIsDistributing(true);
    try {
      const response = await fetch('/api/admin/distribute-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'admin123'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Token Distribution Successful! 🎉',
          description: `Distributed tokens to ${data.distribution_result?.distributions_processed || 0} users`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Refresh data
        await fetchData();
      } else {
        toast({
          title: 'Token Distribution Failed',
          description: data.error || 'Unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to distribute tokens',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDistributing(false);
    }
  };

  const calculateDailyTokens = (planId: string) => {
    const allocations = { 'vip': 6900, 'starter': 500 };
    const yearly = allocations[planId as keyof typeof allocations] || 0;
    return Math.round((yearly / 365) * 100) / 100;
  };

  if (isLoading) {
    return (
      <Box py={8} bg="gray.50" minH="100vh">
        <Container maxW="6xl">
          <Text textAlign="center">Loading...</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box py={8} bg="gray.50" minH="100vh">
      <Container maxW="6xl">
        <VStack spacing={8} align="stretch">
          <Heading as="h1" size="xl" textAlign="center" color="gray.800">
            Token Distribution Test
          </Heading>

          {/* Distribution Button */}
          <Card>
            <CardBody>
              <VStack spacing={4}>
                <Text fontSize="lg" fontWeight="medium" color="gray.700">
                  Test Daily Token Distribution
                </Text>
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleDistributeTokens}
                  isLoading={isDistributing}
                  loadingText="Distributing..."
                >
                  Distribute Today's Tokens
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Active Subscriptions */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md" color="gray.700">
                  Active Subscriptions ({subscriptions.length})
                </Heading>
                <Divider />
                {subscriptions.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {subscriptions.map((sub) => (
                      <Box key={sub.id} p={4} bg="gray.50" borderRadius="md">
                        <VStack spacing={2} align="start">
                          <HStack justify="space-between" w="full">
                            <Text fontWeight="medium">{sub.plan_name}</Text>
                            <Badge colorScheme="green">Active</Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            Daily Tokens: {calculateDailyTokens(sub.plan_id)} TIC
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            Expires: {new Date(sub.end_date).toLocaleDateString()}
                          </Text>
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text color="gray.600">No active subscriptions found</Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Token Distribution History */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md" color="gray.700">
                  Recent Token Distributions ({distributions.length})
                </Heading>
                <Divider />
                {distributions.length > 0 ? (
                  <VStack spacing={2} align="stretch">
                    {distributions.map((dist) => (
                      <HStack key={dist.id} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                        <VStack spacing={1} align="start">
                          <Text fontSize="sm" fontWeight="medium">{dist.plan_name}</Text>
                          <Text fontSize="xs" color="gray.600">
                            {new Date(dist.distribution_date).toLocaleDateString()}
                          </Text>
                        </VStack>
                        <VStack spacing={1} align="end">
                          <Text fontSize="sm" fontWeight="medium" color="green.600">
                            +{dist.token_amount} TIC
                          </Text>
                          <Badge size="sm" colorScheme={dist.status === 'completed' ? 'green' : 'red'}>
                            {dist.status}
                          </Badge>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                ) : (
                  <Text color="gray.600">No token distributions found</Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Token Allocation Info */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md" color="gray.700">
                  Token Allocation Information
                </Heading>
                <Divider />
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Stat>
                    <StatLabel>VIP Plan (1 Year)</StatLabel>
                    <StatNumber>6,900 TIC</StatNumber>
                    <StatHelpText>18.9 TIC per day for 365 days</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Starter Plan (1 Year)</StatLabel>
                    <StatNumber>500 TIC</StatNumber>
                    <StatHelpText>1.37 TIC per day for 365 days</StatHelpText>
                  </Stat>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}
