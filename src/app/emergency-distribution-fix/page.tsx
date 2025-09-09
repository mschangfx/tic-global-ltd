'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Spinner,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Code,
  useToast,
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaTools, FaCheckCircle, FaSync } from 'react-icons/fa';

interface FixResult {
  success: boolean;
  message: string;
  summary: {
    total_distributions_analyzed: number;
    wrong_amounts_found: number;
    duplicates_found: number;
    total_deleted: number;
    distributions_recreated: number;
  };
  token_allocations: {
    vip_daily: number;
    starter_daily: number;
  };
}

interface StatusResult {
  success: boolean;
  analysis: {
    total_distributions: number;
    unique_users: number;
    wrong_amounts: number;
    duplicates: number;
    needs_fix: boolean;
  };
  token_allocations: {
    vip_daily: number;
    starter_daily: number;
  };
}

const EmergencyDistributionFixPage: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/emergency-fix-all-distributions');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
        toast({
          title: 'Status Check Complete',
          description: `Found ${data.analysis.wrong_amounts + data.analysis.duplicates} issues`,
          status: data.analysis.needs_fix ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(data.details || 'Status check failed');
      }
    } catch (error) {
      console.error('Status check failed:', error);
      toast({
        title: 'Status Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const runEmergencyFix = async () => {
    setIsFixing(true);
    try {
      const response = await fetch('/api/emergency-fix-all-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFixResult(data);
        toast({
          title: 'Emergency Fix Complete!',
          description: `Fixed ${data.summary.total_deleted} issues and recreated ${data.summary.distributions_recreated} distributions`,
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
        
        // Refresh status after fix
        setTimeout(() => {
          checkStatus();
        }, 2000);
      } else {
        throw new Error(data.details || 'Emergency fix failed');
      }
    } catch (error) {
      console.error('Emergency fix failed:', error);
      toast({
        title: 'Emergency Fix Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 10000,
        isClosable: true,
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        
        {/* Header */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
          <CardHeader>
            <HStack spacing={3}>
              <FaExclamationTriangle color="orange" size={24} />
              <VStack align="start" spacing={0}>
                <Heading size="lg" color={textColor}>
                  Emergency Distribution Fix
                </Heading>
                <Text fontSize="sm" color={subtleTextColor}>
                  Fix duplicate distributions and wrong TIC amounts
                </Text>
              </VStack>
            </HStack>
          </CardHeader>
        </Card>

        {/* Problem Description */}
        <Alert status="warning" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Distribution Issues Detected!</AlertTitle>
            <AlertDescription>
              <strong>Problems:</strong>
              <br />• Duplicate distributions for the same date/user
              <br />• Wrong TIC amounts (810 TIC instead of 18.90 TIC for VIP)
              <br />• Multiple entries showing for same dates
              <br /><br />
              <strong>This tool will:</strong>
              <br />• Analyze all distributions from the last 60 days
              <br />• Delete duplicate and wrong distributions
              <br />• Recreate correct distributions for the last 7 days
              <br />• Ensure VIP gets 18.90 TIC/day and Starter gets 1.37 TIC/day
            </AlertDescription>
          </Box>
        </Alert>

        {/* Action Buttons */}
        <HStack spacing={4}>
          <Button
            leftIcon={<FaSync />}
            colorScheme="blue"
            variant="outline"
            onClick={checkStatus}
            isLoading={isChecking}
            loadingText="Checking..."
          >
            Check Current Status
          </Button>
          
          <Button
            leftIcon={<FaTools />}
            colorScheme="red"
            onClick={runEmergencyFix}
            isLoading={isFixing}
            loadingText="Fixing..."
            isDisabled={!status || !status.analysis.needs_fix}
          >
            🚨 Run Emergency Fix
          </Button>
        </HStack>

        {/* Current Status */}
        {status && (
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md" color={textColor}>Current Status</Heading>
                <Badge
                  colorScheme={status.analysis.needs_fix ? 'red' : 'green'}
                  variant="solid"
                  px={3}
                  py={1}
                >
                  {status.analysis.needs_fix ? 'Issues Found' : 'All Good'}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
                <Stat>
                  <StatLabel fontSize="xs">Total Distributions</StatLabel>
                  <StatNumber fontSize="lg">{status.analysis.total_distributions}</StatNumber>
                  <StatHelpText fontSize="xs">Today</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Unique Users</StatLabel>
                  <StatNumber fontSize="lg">{status.analysis.unique_users}</StatNumber>
                  <StatHelpText fontSize="xs">With distributions</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Wrong Amounts</StatLabel>
                  <StatNumber fontSize="lg" color="red.500">{status.analysis.wrong_amounts}</StatNumber>
                  <StatHelpText fontSize="xs">Need fixing</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Duplicates</StatLabel>
                  <StatNumber fontSize="lg" color="orange.500">{status.analysis.duplicates}</StatNumber>
                  <StatHelpText fontSize="xs">Need removal</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Divider mb={4} />

              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  Correct Daily Amounts:
                </Text>
                <HStack spacing={4}>
                  <Code colorScheme="purple">
                    VIP: {status.token_allocations.vip_daily.toFixed(2)} TIC/day
                  </Code>
                  <Code colorScheme="blue">
                    Starter: {status.token_allocations.starter_daily.toFixed(2)} TIC/day
                  </Code>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Fix Results */}
        {fixResult && (
          <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
            <CardHeader>
              <HStack spacing={3}>
                <FaCheckCircle color="green" size={20} />
                <Heading size="md" color={textColor}>Fix Results</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <Alert status="success" variant="subtle" mb={4}>
                <AlertIcon />
                <AlertDescription>
                  {fixResult.message}
                </AlertDescription>
              </Alert>

              <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                <Stat>
                  <StatLabel fontSize="xs">Analyzed</StatLabel>
                  <StatNumber fontSize="lg">{fixResult.summary.total_distributions_analyzed}</StatNumber>
                  <StatHelpText fontSize="xs">Distributions</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Wrong Amounts</StatLabel>
                  <StatNumber fontSize="lg" color="red.500">{fixResult.summary.wrong_amounts_found}</StatNumber>
                  <StatHelpText fontSize="xs">Found</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Duplicates</StatLabel>
                  <StatNumber fontSize="lg" color="orange.500">{fixResult.summary.duplicates_found}</StatNumber>
                  <StatHelpText fontSize="xs">Found</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Deleted</StatLabel>
                  <StatNumber fontSize="lg" color="red.600">{fixResult.summary.total_deleted}</StatNumber>
                  <StatHelpText fontSize="xs">Bad records</StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel fontSize="xs">Recreated</StatLabel>
                  <StatNumber fontSize="lg" color="green.500">{fixResult.summary.distributions_recreated}</StatNumber>
                  <StatHelpText fontSize="xs">Correct ones</StatHelpText>
                </Stat>
              </SimpleGrid>
            </CardBody>
          </Card>
        )}

        {/* Instructions */}
        <Alert status="info" variant="subtle">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            <strong>After running the fix:</strong>
            <br />1. Check your dashboard to verify distributions show correct amounts
            <br />2. VIP users should see +18.90 TIC per day (not +810 TIC)
            <br />3. No duplicate entries should appear for the same date
            <br />4. Recent distributions (last 7 days) will be recreated with correct amounts
          </AlertDescription>
        </Alert>

      </VStack>
    </Box>
  );
};

export default EmergencyDistributionFixPage;
