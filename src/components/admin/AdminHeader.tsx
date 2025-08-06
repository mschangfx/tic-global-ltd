'use client';

import {
  Box,
  Flex,
  HStack,
  Text,
  useColorModeValue,
  Image
} from '@chakra-ui/react';

export default function AdminHeader() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  return (
    <Box
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={6}
      py={4}
      shadow="sm"
    >
      <Flex align="center" justify="center" maxW="full">
        {/* Logo and Admin Title Only */}
        <HStack spacing={4}>
          <Image
            src="/logo.png"
            alt="TIC Global"
            height="40px"
            width="auto"
            fallback={
              <Box
                bg="teal.500"
                color="white"
                px={3}
                py={2}
                borderRadius="md"
                fontWeight="bold"
                fontSize="sm"
              >
                TIC
              </Box>
            }
          />
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={textColor}
            letterSpacing="tight"
          >
            ADMIN PAGE
          </Text>
        </HStack>
      </Flex>
    </Box>
  );
}
