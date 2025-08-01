'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast
} from '@chakra-ui/react';

export default function TestReferralsPage() {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testCode, setTestCode] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [kitData, setKitData] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const testGenerateCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/referrals/kit?email=${encodeURIComponent(testEmail)}`);
      const data = await response.json();
      setKitData(data);
      setTestCode(data.referralCode);
      toast({
        title: "Success",
        description: "Referral code generated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to generate code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testValidateCode = async () => {
    if (!testCode) {
      toast({
        title: "Error",
        description: "Please generate a code first",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/referrals/validate?code=${encodeURIComponent(testCode)}`);
      const data = await response.json();
      setValidationResult(data);
      toast({
        title: data.isValid ? "Valid Code" : "Invalid Code",
        description: data.message,
        status: data.isValid ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to validate code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testRegenerateCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_code',
          userEmail: testEmail
        }),
      });
      const data = await response.json();
      if (data.success) {
        setTestCode(data.code);
        setKitData({ ...kitData, referralCode: data.code, referralLink: data.link });
        toast({
          title: "Success",
          description: "New referral code generated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testQRCode = async () => {
    if (!kitData?.referralLink) {
      toast({
        title: "Error",
        description: "Please generate a referral link first",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: kitData.referralLink,
          size: 200,
          format: 'dataurl'
        }),
      });
      const data = await response.json();
      if (data.success) {
        setQrCodeData(data);
        toast({
          title: "Success",
          description: "QR code generated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          Referral System Test
        </Heading>
        
        <Alert status="info">
          <AlertIcon />
          This page is for testing the referral system functionality.
        </Alert>

        <Box p={6} border="1px" borderColor="gray.200" borderRadius="md">
          <VStack spacing={4} align="stretch">
            <Heading as="h3" size="md">Test Email</Heading>
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email"
            />
            
            <HStack spacing={4} wrap="wrap">
              <Button
                onClick={testGenerateCode}
                isLoading={isLoading}
                colorScheme="blue"
              >
                Generate Code
              </Button>
              <Button
                onClick={testRegenerateCode}
                isLoading={isLoading}
                colorScheme="orange"
                isDisabled={!testCode}
              >
                Regenerate Code
              </Button>
              <Button
                onClick={testValidateCode}
                isLoading={isLoading}
                colorScheme="green"
                isDisabled={!testCode}
              >
                Validate Code
              </Button>
              <Button
                onClick={testQRCode}
                isLoading={isLoading}
                colorScheme="purple"
                isDisabled={!kitData?.referralLink}
              >
                Generate QR Code
              </Button>
            </HStack>
          </VStack>
        </Box>

        {kitData && (
          <Box p={6} border="1px" borderColor="green.200" borderRadius="md" bg="green.50">
            <VStack spacing={3} align="stretch">
              <Heading as="h3" size="md">Generated Kit Data</Heading>
              <Text><strong>Referral Code:</strong> <Code>{kitData.referralCode}</Code></Text>
              <Text><strong>Referral Link:</strong> <Code fontSize="sm">{kitData.referralLink}</Code></Text>
              <Text><strong>Total Referrals:</strong> {kitData.totalReferrals}</Text>
              <Text><strong>Active Referrals:</strong> {kitData.activeReferrals}</Text>
              <Text><strong>Total Earnings:</strong> ${kitData.totalEarnings}</Text>
              <Text><strong>Monthly Earnings:</strong> ${kitData.monthlyEarnings}</Text>
            </VStack>
          </Box>
        )}

        {validationResult && (
          <Box p={6} border="1px" borderColor={validationResult.isValid ? "green.200" : "red.200"} borderRadius="md" bg={validationResult.isValid ? "green.50" : "red.50"}>
            <VStack spacing={3} align="stretch">
              <Heading as="h3" size="md">Validation Result</Heading>
              <Text><strong>Valid:</strong> {validationResult.isValid ? 'Yes' : 'No'}</Text>
              <Text><strong>Message:</strong> {validationResult.message}</Text>
              {validationResult.referrer && (
                <Text><strong>Referrer:</strong> {validationResult.referrer.email}</Text>
              )}
            </VStack>
          </Box>
        )}

        {qrCodeData && (
          <Box p={6} border="1px" borderColor="purple.200" borderRadius="md" bg="purple.50">
            <VStack spacing={3} align="stretch">
              <Heading as="h3" size="md">QR Code Result</Heading>
              <Text><strong>Format:</strong> {qrCodeData.format}</Text>
              <Text><strong>Success:</strong> {qrCodeData.success ? 'Yes' : 'No'}</Text>
              {qrCodeData.qrCode && (
                <Box textAlign="center">
                  <img
                    src={qrCodeData.qrCode}
                    alt="Generated QR Code"
                    style={{
                      maxWidth: '200px',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      margin: '0 auto'
                    }}
                  />
                </Box>
              )}
            </VStack>
          </Box>
        )}

        <Divider />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" color="gray.600">
            <strong>How to test:</strong><br />
            1. Enter a test email address<br />
            2. Click "Generate Code" to create a referral code<br />
            3. Click "Validate Code" to verify the code works<br />
            4. Click "Regenerate Code" to create a new unique code<br />
            5. Click "Generate QR Code" to create a QR code for the referral link<br />
            6. Check the console for detailed logs
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
