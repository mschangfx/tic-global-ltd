'use client';

import { Box, Heading, useColorModeValue } from '@chakra-ui/react';
import Image from 'next/image';

export default function TicGlobalGamesPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  return (
    <Box 
      position="relative" 
      w="full" 
      h="calc(100vh - 60px)" // Assuming 60px navbar height, adjust if different
      overflow="hidden" // Hide any overflow if image is larger
      bg={bgColor} // Fallback background color
    >
      <Image
        src="/img/games.png"
        alt="TIC Global Games Background"
        fill // Replaces layout="fill"
        style={{ objectFit: 'cover' }} // Replaces objectFit="cover"
        quality={100}
        priority
      />
      {/* You can overlay text or other elements here if needed */}
      {/* Example overlay:
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        textAlign="center"
        zIndex={1} // Ensure it's above the image
      >
        <Heading size="2xl" color="white" textShadow="2px 2px 4px rgba(0,0,0,0.7)">
          TIC Global Games
        </Heading>
      </Box>
      */}
    </Box>
  );
}