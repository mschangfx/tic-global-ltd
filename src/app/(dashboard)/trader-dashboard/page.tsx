'use client';

import {
  Box,
  useColorModeValue,
  Image
} from '@chakra-ui/react';

export default function TraderDashboard() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  return (
    <Box
      bg={bgColor}
      minH="calc(100vh - 60px)"
      w="100%"
      position="relative"
      overflow="hidden"
    >
      <Image
        src="/img/BT.png"
        alt="Become a Trader"
        w="100%"
        h="calc(100vh - 60px)"
        objectFit="cover"
        objectPosition="center"
      />
    </Box>
  );
}
