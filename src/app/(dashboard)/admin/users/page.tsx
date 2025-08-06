'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  useColorModeValue,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Flex,
  Spacer,
  IconButton,
  Tooltip,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  FormControl,
  FormLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid
} from '@chakra-ui/react';
import { FaEye, FaSync, FaSearch, FaUser, FaWallet, FaHistory } from 'react-icons/fa';
import { useState, useEffect } from 'react';

interface User {
  email: string;
  full_name?: string;
  phone_number?: string;
  created_at: string;
  last_login?: string;
  is_verified: boolean;
  total_balance?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  referral_code?: string;
}

interface UserStats {
  totalUsers: number;
  verifiedUsers: number;
  activeToday: number;
  newToday: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch users and stats
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        verification: verificationFilter
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || null);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open user details modal
  const openUserModal = (user: User) => {
    setSelectedUser(user);
    onOpen();
  };

  // Get verification badge color
  const getVerificationColor = (isVerified: boolean) => {
    return isVerified ? 'green' : 'orange';
  };

  useEffect(() => {
    fetchUsers();
  }, [verificationFilter, searchTerm]);

  if (isLoading) {
    return (
      <Center h="calc(100vh - 60px)">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading users...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  Admin - User Management
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Monitor and manage user accounts
                </Text>
              </VStack>
              <Spacer />
              <Button
                leftIcon={<FaSync />}
                onClick={fetchUsers}
                isLoading={isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Refresh
              </Button>
            </Flex>
          </CardHeader>
        </Card>

        {/* User Stats */}
        {stats && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="blue.400">
              <CardBody>
                <Stat>
                  <StatLabel>Total Users</StatLabel>
                  <StatNumber color="blue.400">{stats.totalUsers}</StatNumber>
                  <StatHelpText>Registered accounts</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="green.400">
              <CardBody>
                <Stat>
                  <StatLabel>Verified Users</StatLabel>
                  <StatNumber color="green.400">{stats.verifiedUsers}</StatNumber>
                  <StatHelpText>Email verified</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="orange.400">
              <CardBody>
                <Stat>
                  <StatLabel>Active Today</StatLabel>
                  <StatNumber color="orange.400">{stats.activeToday}</StatNumber>
                  <StatHelpText>Users online today</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBgColor} shadow="sm" borderLeft="4px solid" borderLeftColor="purple.400">
              <CardBody>
                <Stat>
                  <StatLabel>New Today</StatLabel>
                  <StatNumber color="purple.400">{stats.newToday}</StatNumber>
                  <StatHelpText>New registrations</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Filters */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Verification</FormLabel>
                <Select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  size="sm"
                >
                  <option value="all">All Users</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                </Select>
              </FormControl>

              <FormControl maxW="300px">
                <FormLabel fontSize="sm">Search User</FormLabel>
                <InputGroup size="sm">
                  <InputLeftElement>
                    <FaSearch color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </FormControl>
            </HStack>
          </CardBody>
        </Card>

        {/* Users Table */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <HStack>
              <Heading as="h2" size="md" color={textColor}>
                Users ({users.length})
              </Heading>
              <Spacer />
              <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                {verificationFilter === 'all' ? 'All' : verificationFilter.charAt(0).toUpperCase() + verificationFilter.slice(1)} Users
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            {users.length === 0 ? (
              <Center py={10}>
                <VStack spacing={4}>
                  <Text color="gray.500" fontSize="lg">
                    No users found
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Try adjusting your filters or check back later
                  </Text>
                </VStack>
              </Center>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>User</Th>
                      <Th>Verification</Th>
                      <Th>Balance</Th>
                      <Th>Joined</Th>
                      <Th>Last Login</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users.map((user) => (
                      <Tr key={user.email}>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm" fontWeight="medium">
                              {user.full_name || 'N/A'}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {user.email}
                            </Text>
                            {user.phone_number && (
                              <Text fontSize="xs" color="gray.400">
                                {user.phone_number}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          <Badge colorScheme={getVerificationColor(user.is_verified)}>
                            {user.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontWeight="bold" color="green.500">
                            ${(user.total_balance || 0).toLocaleString()}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color="gray.500">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Tooltip label="View Details">
                              <IconButton
                                aria-label="View details"
                                icon={<FaEye />}
                                size="sm"
                                variant="outline"
                                onClick={() => openUserModal(user)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* User Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="bold">Email:</Text>
                  <Text>{selectedUser.email}</Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Full Name:</Text>
                  <Text>{selectedUser.full_name || 'N/A'}</Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Phone:</Text>
                  <Text>{selectedUser.phone_number || 'N/A'}</Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Verification:</Text>
                  <Badge colorScheme={getVerificationColor(selectedUser.is_verified)}>
                    {selectedUser.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Balance:</Text>
                  <Text fontWeight="bold" color="green.500">
                    ${(selectedUser.total_balance || 0).toLocaleString()}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Total Deposits:</Text>
                  <Text color="blue.500">
                    ${(selectedUser.total_deposits || 0).toLocaleString()}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Total Withdrawals:</Text>
                  <Text color="red.500">
                    ${(selectedUser.total_withdrawals || 0).toLocaleString()}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Referral Code:</Text>
                  <Text fontFamily="mono" fontSize="sm">
                    {selectedUser.referral_code || 'N/A'}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Joined:</Text>
                  <Text>{new Date(selectedUser.created_at).toLocaleString()}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="bold">Last Login:</Text>
                  <Text>
                    {selectedUser.last_login 
                      ? new Date(selectedUser.last_login).toLocaleString()
                      : 'Never'
                    }
                  </Text>
                </HStack>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
