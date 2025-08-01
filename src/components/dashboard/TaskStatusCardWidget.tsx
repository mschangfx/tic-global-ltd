'use client'

import { Box, Heading, Text, Link as ChakraLink, VStack, HStack, Icon, useColorModeValue, Tag, Image } from '@chakra-ui/react';
import NextLink from 'next/link';
import { TaskStatusData } from '@/types/dashboard';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';

interface TaskStatusCardWidgetProps {
  title?: string; // Title of the card itself, e.g., "Daily Task"
  data: TaskStatusData;
}

export default function TaskStatusCardWidget({ title, data }: TaskStatusCardWidgetProps) {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  let statusIcon;
  let statusColorScheme;

  switch (data.status) {
    case 'Completed':
      statusIcon = FaCheckCircle;
      statusColorScheme = 'green';
      break;
    case 'Not Completed':
      statusIcon = FaTimesCircle;
      statusColorScheme = 'red';
      break;
    case 'Pending':
      statusIcon = FaHourglassHalf;
      statusColorScheme = 'yellow';
      break;
    default:
      statusIcon = FaHourglassHalf;
      statusColorScheme = 'gray';
  }

  return (
    <Box
      p={6}
      bg={cardBg}
      borderRadius="lg"
      boxShadow="md"
      h="100%" // Ensure cards in a row have same height
    >
      <VStack spacing={4} align="stretch">
        {title && <Heading size="md" fontFamily="var(--font-headings)">{title}</Heading>}
        <HStack justifyContent="space-between">
          <Text fontWeight="bold" fontSize="lg">{data.taskName}</Text>
          {data.historyLink && (
            <NextLink href={data.historyLink} passHref legacyBehavior>
              <ChakraLink fontSize="sm" color="blue.500">History</ChakraLink>
            </NextLink>
          )}
        </HStack>
        <HStack>
          <Icon as={statusIcon} color={`${statusColorScheme}.500`} />
          <Tag size="sm" colorScheme={statusColorScheme} variant="solid">
            {data.status}
          </Tag>
        </HStack>
        <Text fontSize="sm" color={textColor}>{data.description}</Text>
        {/* Task completion visual indicator */}
        {data.status === 'Not Completed' && (
            <Box mt={3} textAlign="center">
                <Box
                    bg="gray.100"
                    borderRadius="md"
                    p={4}
                    mx="auto"
                    w="200px"
                    h="100px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Text fontSize="sm" color="gray.500">Task Pending</Text>
                </Box>
            </Box>
        )}
      </VStack>
    </Box>
  );
}