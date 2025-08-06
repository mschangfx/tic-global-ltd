'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Center,
  VStack,
  Spinner,
  Text,
  useColorModeValue
} from '@chakra-ui/react';

export default function AdminRedirect() {
  const router = useRouter();
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    // Simple redirect to admin dashboard after a short delay
    const timer = setTimeout(() => {
      window.location.href = '/admin';
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <Center h="calc(100vh - 200px)">
        <VStack spacing={6}>
          <Spinner size="xl" color="red.500" thickness="4px" />
          <VStack spacing={2}>
            <Text fontSize="lg" fontWeight="bold">
              🛡️ Redirecting to Admin Dashboard
            </Text>
            <Text color="gray.500" fontSize="sm">
              Please wait while we redirect you...
            </Text>
          </VStack>
        </VStack>
      </Center>
    </Box>
  );
}
