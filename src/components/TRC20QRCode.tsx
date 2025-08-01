'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Image,
  Text,
  VStack,
  HStack,
  Icon,

  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Center,
  Spinner,
  Code,
  Badge,
  Divider
} from '@chakra-ui/react';
import { FaQrcode, FaCopy, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import { useSafeToast } from '@/hooks/useSafeToast';

interface TRC20QRCodeProps {
  address?: string;
  amount?: number;
  size?: number;
  showButton?: boolean;
  buttonText?: string;
  includeAmount?: boolean;
}

const TRC20_CONFIG = {
  address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
  network: 'TRC20',
  symbol: 'USDT',
  explorer: 'https://tronscan.org/#/address/'
};

export default function TRC20QRCode({
  address = TRC20_CONFIG.address,
  amount,
  size = 300,
  showButton = true,
  buttonText = 'Show QR Code',
  includeAmount = false
}: TRC20QRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrMetadata, setQrMetadata] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useSafeToast();

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/deposits/trc20', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          amount: amount,
          size: size,
          format: 'dataurl',
          includeAmount: includeAmount && amount
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQrCodeDataUrl(data.qrCode);
          setQrMetadata(data.metadata);
          onOpen();
        } else {
          throw new Error(data.error || 'Failed to generate QR code');
        }
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: 'Address Copied!',
        description: 'TRC20 wallet address copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        
        toast({
          title: 'Address Copied!',
          description: 'TRC20 wallet address copied to clipboard',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } catch (fallbackErr) {
        toast({
          title: 'Failed to copy',
          description: 'Please copy the address manually',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const downloadQR = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `TRC20-USDT-Deposit-${address.slice(0, 8)}.png`;
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

  const openExplorer = () => {
    window.open(`${TRC20_CONFIG.explorer}${address}`, '_blank');
  };

  return (
    <>
      {showButton && (
        <Button
          leftIcon={<Icon as={FaQrcode} />}
          onClick={generateQRCode}
          isLoading={isLoading}
          loadingText="Generating..."
          colorScheme="green"
          variant="outline"
          size="sm"
        >
          {buttonText}
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack spacing={2} align="center">
              <HStack spacing={2}>
                <Icon as={FaQrcode} boxSize={6} color="green.500" />
                <Text>TRC20 Deposit QR Code</Text>
              </HStack>
              <Badge colorScheme="green" variant="subtle">
                {TRC20_CONFIG.symbol} - {TRC20_CONFIG.network}
              </Badge>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="center">
              {qrCodeDataUrl ? (
                <>
                  <Center>
                    <Image 
                      src={qrCodeDataUrl} 
                      alt="TRC20 Deposit QR Code"
                      maxW="300px"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={4}
                      bg="white"
                    />
                  </Center>
                  
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Scan this QR code to get the TRC20 deposit address
                  </Text>
                  
                  <Box w="full">
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Wallet Address:
                    </Text>
                    <Code 
                      fontSize="xs" 
                      p={2} 
                      borderRadius="md" 
                      wordBreak="break-all" 
                      textAlign="center"
                      w="full"
                      display="block"
                    >
                      {address}
                    </Code>
                  </Box>

                  {amount && (
                    <Box w="full">
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Amount:
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" textAlign="center" color="green.600">
                        ${amount} USDT
                      </Text>
                    </Box>
                  )}

                  <Divider />

                  <VStack spacing={2} w="full">
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Network: {TRC20_CONFIG.network} | Symbol: {TRC20_CONFIG.symbol}
                    </Text>
                    {qrMetadata && (
                      <Text fontSize="xs" color="gray.400" textAlign="center">
                        Generated: {new Date(qrMetadata.timestamp).toLocaleString()}
                      </Text>
                    )}
                  </VStack>
                </>
              ) : (
                <VStack spacing={4}>
                  <Spinner size="lg" color="green.500" />
                  <Text>Generating QR code...</Text>
                </VStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2} w="full" justify="center">
              <Button
                variant="outline"
                leftIcon={<Icon as={FaCopy} />}
                onClick={copyAddress}
                size="sm"
              >
                Copy Address
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<Icon as={FaDownload} />}
                onClick={downloadQR}
                isDisabled={!qrCodeDataUrl}
                size="sm"
              >
                Download
              </Button>
              <Button
                variant="outline"
                leftIcon={<Icon as={FaExternalLinkAlt} />}
                onClick={openExplorer}
                size="sm"
              >
                Explorer
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
