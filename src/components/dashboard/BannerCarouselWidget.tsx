'use client'

import { Box, Heading, Text, VStack, Button, useColorModeValue, HStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { BannerCarouselData } from '@/types/dashboard';

interface BannerCarouselWidgetProps {
  title?: string; // Optional title for the widget section itself
  data: BannerCarouselData;
}

export default function BannerCarouselWidget({ title, data }: BannerCarouselWidgetProps) {
  const cardBg = useColorModeValue('gray.700', 'gray.800'); // Fallback if no gradient/image
  const defaultTextColor = 'white';

  // For now, just display the first banner item. A full carousel needs more state/logic.
  const firstItem = data.items && data.items.length > 0 ? data.items[0] : null;

  if (!firstItem) {
    return <Box p={5} bg={cardBg} borderRadius="lg" boxShadow="md"><Text>No banner items to display.</Text></Box>;
  }

  const itemTextColor = firstItem.textColor || defaultTextColor;

  return (
    <Box
      p={{base: 6, md: 10}}
      bg={firstItem.bgGradient || firstItem.bgColor || cardBg}
      bgImage={firstItem.imageUrl ? `url(${firstItem.imageUrl})` : undefined}
      bgSize="cover"
      bgPosition="center"
      borderRadius="xl"
      boxShadow="lg"
      color={itemTextColor}
      minH={{ base: '250px', md: '300px' }}
      display="flex"
      alignItems="center"
      justifyContent="center" // Center content if it's text-based
      textAlign="center"
    >
      <VStack spacing={4} maxW="xl">
        {firstItem.title && (
          <Heading as="h2" size={{base: "lg", md: "xl"}} fontFamily="var(--font-titles)" textShadow="1px 1px 3px rgba(0,0,0,0.5)">
            {firstItem.title}
          </Heading>
        )}
        {firstItem.subtitle && (
          <Text fontSize={{base: "md", md: "lg"}} fontWeight="medium" textShadow="1px 1px 2px rgba(0,0,0,0.4)">
            {firstItem.subtitle}
          </Text>
        )}
        <HStack spacing={2} wrap="wrap" justifyContent="center">
          {firstItem.date && <Text fontSize="sm" fontWeight="semibold">{firstItem.date}</Text>}
          {firstItem.location && <Text fontSize="sm" fontWeight="semibold">📍 {firstItem.location}</Text>}
        </HStack>
        {firstItem.link && (
          <Button
            as={NextLink}
            href={firstItem.link}
            colorScheme="yellow"
            bgColor="yellow.400"
            color="black"
            _hover={{bgColor: "yellow.500", textDecoration: "none"}}
            size="md"
            mt={4}
            textDecoration="none"
          >
            {firstItem.linkText || 'Learn More'}
          </Button>
        )}
      </VStack>
    </Box>
  );
}