'use client'

import { Box, Heading, Text, Link as ChakraLink, VStack, Icon, useColorModeValue, HStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FaArrowRight, FaGift, FaChartLine, FaTasks, FaGamepad } from 'react-icons/fa'; // Add all icons used in config

// Map string icon names to actual icon components
const iconMap: { [key: string]: React.ElementType } = {
  FaGift,
  FaChartLine,
  FaTasks,
  FaGamepad,
  // Add other icons here if needed
};

interface InfoCardWidgetProps {
  title: string;
  data: {
    icon?: string;
    description: string;
    link: string;
    bgColor?: string;
  };
}

export default function InfoCardWidget({ title, data }: InfoCardWidgetProps) {
  const cardBg = useColorModeValue('white', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.600');
  const iconColor = data.bgColor ? 'white' : useColorModeValue('blue.500', 'blue.300');
  const ActualIcon = data.icon ? iconMap[data.icon] : null;

  return (
    <NextLink href={data.link} passHref legacyBehavior>
      <ChakraLink _hover={{ textDecoration: 'none' }}>
        <Box
          p={6}
          bg={cardBg}
          borderRadius="lg"
          boxShadow="md"
          transition="all 0.2s ease-in-out"
          _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg', bg: hoverBg }}
          h="100%" // Ensure cards in a row have same height
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
        >
          <VStack align="flex-start" spacing={3}>
            {ActualIcon && (
              <Box
                p={3}
                bg={data.bgColor || useColorModeValue('blue.50', 'blue.900')}
                borderRadius="md"
                display="inline-block"
              >
                <Icon as={ActualIcon} w={6} h={6} color={iconColor} />
              </Box>
            )}
            <Heading size="md" fontFamily="var(--font-headings)">{title}</Heading>
            <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>{data.description}</Text>
          </VStack>
          <HStack justify="flex-end" w="full" mt={4}>
            <Icon as={FaArrowRight} color={useColorModeValue('blue.500', 'blue.300')} />
          </HStack>
        </Box>
      </ChakraLink>
    </NextLink>
  );
}