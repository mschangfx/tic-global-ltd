'use client';

import { 
  Container, 
  VStack, 
  Heading, 
  Text, 
  Button, 
  Box,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DepositSuccess() {
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    // Auto redirect to dashboard after 10 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container maxW="2xl" py={8}>
      <Box
        bg={bgColor}
        border="1px"
        borderColor={borderColor}
        borderRadius="xl"
        p={8}
        textAlign="center"
      >
        <VStack spacing={6}>
          <Icon 
            as={CheckCircleIcon} 
            w={16} 
            h={16} 
            color="green.500"
          />
          
          <Heading size="lg" color="green.500">
            Deposit Request Submitted Successfully!
          </Heading>
          
          <Text fontSize="lg" color="gray.600">
            Your deposit request has been submitted and is being processed.
          </Text>
          
          <Box
            bg="green.50"
            border="1px"
            borderColor="green.200"
            borderRadius="lg"
            p={4}
            w="full"
          >
            <Text fontSize="sm" color="green.700">
              <strong>What happens next:</strong>
            </Text>
            <VStack align="start" spacing={2} mt={2}>
              <Text fontSize="sm" color="green.600">
                • Your deposit will be reviewed by our admin team
              </Text>
              <Text fontSize="sm" color="green.600">
                • You'll receive a notification once it's approved
              </Text>
              <Text fontSize="sm" color="green.600">
                • Funds will be added to your wallet balance
              </Text>
            </VStack>
          </Box>
          
          <VStack spacing={3} w="full">
            <Button
              colorScheme="blue"
              size="lg"
              onClick={() => router.push('/dashboard')}
              w="full"
            >
              Go to Dashboard
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/wallet')}
              w="full"
            >
              View Wallet
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/deposit')}
            >
              Make Another Deposit
            </Button>
          </VStack>
          
          <Text fontSize="xs" color="gray.500">
            You will be automatically redirected to the dashboard in 10 seconds.
          </Text>
        </VStack>
      </Box>
    </Container>
  );
}
