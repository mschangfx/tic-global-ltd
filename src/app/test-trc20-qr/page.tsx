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
  useToast,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Image,
  FormControl,
  FormLabel,
  Switch
} from '@chakra-ui/react';
import TRC20QRCode from '@/components/TRC20QRCode';

export default function TestTRC20QRPage() {
  const [testAddress, setTestAddress] = useState('TKDpaQGG9AWMpEaH6g73hPt5MekQ3abpHZ');
  const [testAmount, setTestAmount] = useState('100');
  const [includeAmount, setIncludeAmount] = useState(false);
  const [qrSize, setQrSize] = useState('300');
  
  const [qrResult, setQrResult] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const toast = useToast();

  const testDirectAPI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deposits/trc20', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testAddress,
          amount: includeAmount ? parseFloat(testAmount) : undefined,
          size: parseInt(qrSize),
          format: 'dataurl',
          includeAmount: includeAmount
        })
      });

      const data = await response.json();
      setQrResult(data);
      
      toast({
        title: data.success ? "QR Generated" : "Generation Failed",
        description: data.success ? "QR code generated successfully" : data.error,
        status: data.success ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
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

  const testValidation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/deposits/trc20', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: testAddress
        })
      });

      const data = await response.json();
      setValidationResult(data);
      
      toast({
        title: data.valid ? "Valid Address" : "Invalid Address",
        description: data.message,
        status: data.valid ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to validate address",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrResult?.qrCode) return;

    const link = document.createElement('a');
    link.href = qrResult.qrCode;
    link.download = `TRC20-Test-QR-${testAddress.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Downloaded!',
      description: 'QR code saved to your device',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          TRC20 QR Code Test
        </Heading>
        
        <Alert status="info">
          <AlertIcon />
          Test the TRC20 QR code generation functionality for wallet address: TKDpaQGG9AWMpEaH6g73hPt5MekQ3abpHZ
        </Alert>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Test Configuration */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Configuration</Heading>
                
                <FormControl>
                  <FormLabel>TRC20 Address:</FormLabel>
                  <Input
                    value={testAddress}
                    onChange={(e) => setTestAddress(e.target.value)}
                    placeholder="Enter TRC20 address"
                    fontFamily="monospace"
                    fontSize="sm"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Amount (USDT):</FormLabel>
                  <Input
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="Enter amount"
                    type="number"
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="include-amount" mb="0">
                    Include Amount in QR:
                  </FormLabel>
                  <Switch 
                    id="include-amount" 
                    isChecked={includeAmount}
                    onChange={(e) => setIncludeAmount(e.target.checked)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>QR Size (px):</FormLabel>
                  <Input
                    value={qrSize}
                    onChange={(e) => setQrSize(e.target.value)}
                    placeholder="Enter size"
                    type="number"
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Test Actions */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">Test Actions</Heading>
                
                <Button 
                  onClick={testValidation} 
                  isLoading={isLoading}
                  colorScheme="blue"
                  size="sm"
                >
                  Validate TRC20 Address
                </Button>
                
                <Button 
                  onClick={testDirectAPI} 
                  isLoading={isLoading}
                  colorScheme="green"
                  size="sm"
                >
                  Generate QR Code (API)
                </Button>
                
                <Divider />
                
                <Text fontSize="sm" fontWeight="bold">Component Test:</Text>
                <TRC20QRCode
                  address={testAddress}
                  amount={includeAmount ? parseFloat(testAmount) : undefined}
                  size={parseInt(qrSize)}
                  includeAmount={includeAmount}
                  buttonText="Test Component QR"
                />
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Validation Results */}
        {validationResult && (
          <Card>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Heading as="h3" size="md">Address Validation Result</Heading>
                <HStack>
                  <Text fontWeight="bold">Valid:</Text>
                  <Badge colorScheme={validationResult.valid ? "green" : "red"}>
                    {validationResult.valid ? 'Yes' : 'No'}
                  </Badge>
                </HStack>
                <Text><strong>Message:</strong> {validationResult.message}</Text>
                <Text><strong>Network:</strong> {validationResult.networkName}</Text>
                <Text><strong>Symbol:</strong> {validationResult.symbol}</Text>
                {validationResult.explorerUrl && (
                  <Text>
                    <strong>Explorer:</strong>{' '}
                    <a href={validationResult.explorerUrl} target="_blank" rel="noopener noreferrer">
                      View on Explorer
                    </a>
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* QR Generation Results */}
        {qrResult && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading as="h3" size="md">QR Generation Result</Heading>
                
                <HStack>
                  <Text fontWeight="bold">Success:</Text>
                  <Badge colorScheme={qrResult.success ? "green" : "red"}>
                    {qrResult.success ? 'Yes' : 'No'}
                  </Badge>
                </HStack>

                {qrResult.success ? (
                  <>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Generated QR Code:</Text>
                        <Image 
                          src={qrResult.qrCode} 
                          alt="Generated QR Code"
                          maxW="250px"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          p={2}
                          bg="white"
                        />
                        <Button
                          size="sm"
                          mt={2}
                          onClick={downloadQR}
                          colorScheme="blue"
                        >
                          Download QR
                        </Button>
                      </Box>
                      
                      <VStack align="start" spacing={2}>
                        <Text><strong>Network:</strong> {qrResult.network}</Text>
                        <Text><strong>Address:</strong></Text>
                        <Code fontSize="xs" p={2} borderRadius="md" wordBreak="break-all">
                          {qrResult.address}
                        </Code>
                        {qrResult.amount && (
                          <Text><strong>Amount:</strong> ${qrResult.amount} USDT</Text>
                        )}
                        <Text><strong>QR Content:</strong></Text>
                        <Code fontSize="xs" p={2} borderRadius="md" wordBreak="break-all">
                          {qrResult.qrContent}
                        </Code>
                        {qrResult.metadata && (
                          <>
                            <Text><strong>Size:</strong> {qrResult.metadata.size}px</Text>
                            <Text><strong>Generated:</strong> {new Date(qrResult.metadata.timestamp).toLocaleString()}</Text>
                          </>
                        )}
                      </VStack>
                    </SimpleGrid>
                  </>
                ) : (
                  <Alert status="error">
                    <AlertIcon />
                    <Text>{qrResult.error}</Text>
                  </Alert>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Divider />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" color="gray.600">
            <strong>How to test:</strong><br />
            1. Configure the TRC20 address and parameters above<br />
            2. Click "Validate TRC20 Address" to check address format<br />
            3. Click "Generate QR Code (API)" to test direct API call<br />
            4. Click "Test Component QR" to test the React component<br />
            5. Download and scan QR codes to verify functionality<br />
            6. Check browser console for detailed logs
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
