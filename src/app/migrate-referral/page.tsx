'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  useToast,
  Code,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';

export default function MigrateReferralPage() {
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadMigrationStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      const response = await fetch('/api/migrate-referral-data');
      const data = await response.json();
      setMigrationStatus(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load migration status',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const runMigration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate-referral-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate-existing-users',
          dryRun
        })
      });

      const data = await response.json();
      setMigrationResult(data);

      if (response.ok) {
        toast({
          title: dryRun ? 'Dry Run Completed' : 'Migration Completed',
          description: `Processed ${data.usersProcessed} users, updated ${data.usersUpdated}`,
          status: 'success',
          duration: 5000,
        });

        // Reload status after successful migration
        if (!dryRun) {
          setTimeout(loadMigrationStatus, 1000);
        }
      } else {
        toast({
          title: 'Migration Failed',
          description: data.error || 'Unknown error occurred',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run migration',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={4}>
            Referral System Migration
          </Heading>
          <Text color="gray.600">
            Migrate existing users to the new referral system
          </Text>
        </Box>

        {migrationStatus && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h2" size="md">
                  Current System Status
                </Heading>
                
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                  <Stat>
                    <StatLabel>Users with Referral Codes</StatLabel>
                    <StatNumber>{migrationStatus.statistics?.usersWithReferralCodes || 0}</StatNumber>
                    <StatHelpText>Ready to share links</StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Users without Codes</StatLabel>
                    <StatNumber color="orange.500">
                      {migrationStatus.statistics?.usersWithoutReferralCodes || 0}
                    </StatNumber>
                    <StatHelpText>Need migration</StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Referral Relationships</StatLabel>
                    <StatNumber>{migrationStatus.statistics?.referralRelationships || 0}</StatNumber>
                    <StatHelpText>Total connections</StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Broken Relationships</StatLabel>
                    <StatNumber color="red.500">
                      {migrationStatus.statistics?.relationshipsWithoutCodes || 0}
                    </StatNumber>
                    <StatHelpText>Need fixing</StatHelpText>
                  </Stat>
                </SimpleGrid>

                {migrationStatus.statistics?.needsMigration && (
                  <Alert status="warning">
                    <AlertIcon />
                    Migration is needed to fix existing users' referral data
                  </Alert>
                )}

                {!migrationStatus.statistics?.needsMigration && (
                  <Alert status="success">
                    <AlertIcon />
                    All users have been migrated successfully
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="md">
                Run Migration
              </Heading>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="dry-run" mb="0">
                  Dry Run Mode
                </FormLabel>
                <Switch
                  id="dry-run"
                  isChecked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                {dryRun 
                  ? "Dry run will show what changes would be made without actually modifying data"
                  : "⚠️ This will modify your database. Make sure you have a backup!"
                }
              </Text>

              <Button
                colorScheme={dryRun ? "blue" : "red"}
                onClick={runMigration}
                isLoading={isLoading}
                loadingText={dryRun ? "Running Dry Run..." : "Migrating..."}
                size="lg"
              >
                {dryRun ? "Run Dry Run" : "Run Migration"}
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {migrationResult && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading as="h2" size="md">
                    Migration Results
                  </Heading>
                  <Badge colorScheme={migrationResult.dryRun ? "blue" : "green"}>
                    {migrationResult.dryRun ? "DRY RUN" : "LIVE RUN"}
                  </Badge>
                </HStack>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Stat>
                    <StatLabel>Users Processed</StatLabel>
                    <StatNumber>{migrationResult.usersProcessed}</StatNumber>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Users Updated</StatLabel>
                    <StatNumber color="green.500">{migrationResult.usersUpdated}</StatNumber>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Codes Generated</StatLabel>
                    <StatNumber color="blue.500">{migrationResult.referralCodesGenerated}</StatNumber>
                  </Stat>
                </SimpleGrid>

                {migrationResult.errors && migrationResult.errors.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" color="red.500" mb={2}>
                      Errors ({migrationResult.errors.length}):
                    </Text>
                    <VStack align="start" spacing={1}>
                      {migrationResult.errors.map((error: string, index: number) => (
                        <Text key={index} fontSize="sm" color="red.500">
                          • {error}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Text fontWeight="bold" mb={2}>Detailed Results:</Text>
                  <Code p={4} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" maxH="400px" overflowY="auto">
                    {JSON.stringify(migrationResult, null, 2)}
                  </Code>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="md">
                What This Migration Does
              </Heading>
              
              <VStack align="start" spacing={2}>
                <Text>✅ <strong>Generates referral codes</strong> for existing users who don't have them</Text>
                <Text>✅ <strong>Updates users table</strong> with referral_code field</Text>
                <Text>✅ <strong>Creates user_referral_codes entries</strong> for consistency</Text>
                <Text>✅ <strong>Fixes broken referral relationships</strong> missing referral codes</Text>
                <Text>✅ <strong>Ensures all users can share referral links</strong> and track their community</Text>
                <Text>✅ <strong>Makes the system work for existing users</strong> who already shared links</Text>
              </VStack>

              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Safe Migration Process</Text>
                  <Text fontSize="sm">
                    This migration is designed to be safe and non-destructive. It only adds missing data 
                    and doesn't modify existing referral relationships.
                  </Text>
                </Box>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}
