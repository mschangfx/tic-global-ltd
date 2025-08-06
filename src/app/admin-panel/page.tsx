'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Icon,
  Badge,
  Flex,
  Spacer,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { 
  FaArrowDown, 
  FaArrowUp, 
  FaUsers, 
  FaCheckCircle, 
  FaClock,
  FaChartLine
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 80px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  🛡️ Admin Control Panel
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Manage deposits, withdrawals, and user accounts
                </Text>
              </VStack>
              <Spacer />
              <Badge colorScheme="green" fontSize="md" px={4} py={2}>
                ✅ ACTIVE
              </Badge>
            </Flex>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="orange.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaArrowDown} color="orange.400" />
                    <Text>Pending Deposits</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="orange.400">--</StatNumber>
                <StatHelpText>Click "Manage Deposits" to view</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="red.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaArrowUp} color="red.400" />
                    <Text>Pending Withdrawals</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="red.400">--</StatNumber>
                <StatHelpText>Click "Manage Withdrawals" to view</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="green.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.400" />
                    <Text>Total Users</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="green.400">--</StatNumber>
                <StatHelpText>Click "Manage Users" to view</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="blue.400">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaChartLine} color="blue.400" />
                    <Text>System Status</Text>
                  </HStack>
                </StatLabel>
                <StatNumber color="blue.400">ONLINE</StatNumber>
                <StatHelpText>All systems operational</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Main Actions */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Heading as="h2" size="md" color={textColor}>
              🚀 Admin Actions
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {/* Manage Deposits */}
              <Card bg="orange.50" borderColor="orange.200" borderWidth="1px">
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Icon as={FaArrowDown} fontSize="3xl" color="orange.500" />
                    <VStack spacing={2}>
                      <Heading as="h3" size="md" color="orange.700">
                        Manage Deposits
                      </Heading>
                      <Text fontSize="sm" color="orange.600">
                        Review and approve pending deposit requests
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="orange"
                      size="lg"
                      width="full"
                      onClick={() => handleNavigation('/admin-panel/deposits')}
                    >
                      View Deposits
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Manage Withdrawals */}
              <Card bg="red.50" borderColor="red.200" borderWidth="1px">
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Icon as={FaArrowUp} fontSize="3xl" color="red.500" />
                    <VStack spacing={2}>
                      <Heading as="h3" size="md" color="red.700">
                        Manage Withdrawals
                      </Heading>
                      <Text fontSize="sm" color="red.600">
                        Process withdrawal requests and refunds
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="red"
                      size="lg"
                      width="full"
                      onClick={() => handleNavigation('/admin-panel/withdrawals')}
                    >
                      View Withdrawals
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Manage Users */}
              <Card bg="blue.50" borderColor="blue.200" borderWidth="1px">
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Icon as={FaUsers} fontSize="3xl" color="blue.500" />
                    <VStack spacing={2}>
                      <Heading as="h3" size="md" color="blue.700">
                        Manage Users
                      </Heading>
                      <Text fontSize="sm" color="blue.600">
                        View user accounts and verification status
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="blue"
                      size="lg"
                      width="full"
                      onClick={() => handleNavigation('/admin-panel/users')}
                    >
                      View Users
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Alert status="info">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <AlertTitle>Welcome to the Admin Dashboard!</AlertTitle>
            <AlertDescription>
              Use the buttons above to manage deposits, withdrawals, and users. 
              This dashboard provides full control over all user transactions and account management.
            </AlertDescription>
          </VStack>
        </Alert>
      </VStack>
    </Box>
  );
}
