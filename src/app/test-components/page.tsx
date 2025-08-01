'use client';

import { Box, Container, VStack, Heading, Text, Divider } from '@chakra-ui/react';
import RankingBonusCard from '@/components/RankingBonusCard';
import RankingMaintenanceCard from '@/components/RankingMaintenanceCard';

export default function TestComponentsPage() {
  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={4}>🧪 Component Testing Page</Heading>
          <Text color="gray.600">
            Testing the Ranking Bonus and Maintenance components
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading size="lg" mb={4}>🏆 Ranking Bonus Card</Heading>
          <Text mb={4} color="gray.600">
            This component handles ranking bonus distribution and shows current qualification status.
            It connects to the Main Wallet (TIC/GIC tokens) system.
          </Text>
          <RankingBonusCard />
        </Box>

        <Divider />

        <Box>
          <Heading size="lg" mb={4}>🔄 Ranking Maintenance Card</Heading>
          <Text mb={4} color="gray.600">
            This component tracks monthly qualification maintenance and shows historical performance.
            It helps users understand their ranking stability over time.
          </Text>
          <RankingMaintenanceCard />
        </Box>

        <Divider />

        <Box textAlign="center" p={6} bg="green.50" borderRadius="lg">
          <Heading size="md" color="green.600" mb={2}>
            ✅ Wallet System Separation
          </Heading>
          <Text color="green.700">
            <strong>Partner Wallet:</strong> Handles daily referral commissions<br />
            <strong>Main Wallet:</strong> Handles TIC/GIC ranking bonuses (shown above)
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
