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
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Badge,
  useToast
} from '@chakra-ui/react';
import {
  FaArrowLeft,
  FaExchangeAlt,
  FaUser,
  FaUserFriends
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function TransferPage() {
  const router = useRouter();
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleBetweenAccounts = () => {
    router.push('/wallet/transfer/between-accounts');
  };

  const handleToAnotherUser = () => {
    router.push('/wallet/transfer/to-user');
  };

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack spacing={4}>
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            variant="ghost"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Heading as="h1" size="xl" color={textColor}>
            Transfer
          </Heading>
        </HStack>

        {/* Transfer Section */}
        <Box>
          <Heading as="h2" size="lg" color={textColor} mb={6}>
            Transfer
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {/* Between your accounts */}
            <Card
              bg={cardBg}
              border="1px"
              borderColor={borderColor}
              cursor="pointer"
              _hover={{
                borderColor: 'blue.400',
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
              onClick={handleBetweenAccounts}
            >
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Box
                      bg="black"
                      borderRadius="full"
                      p={2}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={FaExchangeAlt} color="white" boxSize={4} />
                    </Box>
                    <Heading as="h3" size="md" color={textColor}>
                      Between your accounts
                    </Heading>
                  </HStack>

                  <VStack spacing={1} align="start" fontSize="sm" color={subtleTextColor}>
                    <HStack>
                      <Text fontWeight="medium">Processing time</Text>
                      <Text>instant - 1 day</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Fee</Text>
                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                        0%
                      </Badge>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Limits</Text>
                      <Text>1 - 1,000,000 USD</Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* To another user */}
            <Card
              bg={cardBg}
              border="1px"
              borderColor={borderColor}
              cursor="pointer"
              _hover={{
                borderColor: 'blue.400',
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
              onClick={handleToAnotherUser}
            >
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Box
                      bg="orange.500"
                      borderRadius="full"
                      p={2}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={FaUserFriends} color="white" boxSize={4} />
                    </Box>
                    <Heading as="h3" size="md" color={textColor}>
                      To another user
                    </Heading>
                  </HStack>

                  <VStack spacing={1} align="start" fontSize="sm" color={subtleTextColor}>
                    <HStack>
                      <Text fontWeight="medium">Processing time</Text>
                      <Text>instant - 1 day</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Fee</Text>
                      <Badge colorScheme="green" variant="solid" fontSize="xs">
                        0%
                      </Badge>
                    </HStack>
                    <HStack>
                      <Text fontWeight="medium">Limits</Text>
                      <Text>1 - 1,000,000 USD</Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  );
}
