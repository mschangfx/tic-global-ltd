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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Spacer,
  IconButton,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import { FaEye, FaSync, FaSearch, FaUser, FaEnvelope, FaCalendar } from 'react-icons/fa';
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  last_login?: string;
  status: string;
  wallet_balance?: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'suspended': return 'red';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  const getVerificationColor = (verified: boolean) => {
    return verified ? 'green' : 'red';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Center h="calc(100vh - 200px)">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading users...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 80px)">
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <Card bg={cardBgColor} shadow="sm">
          <CardHeader>
            <Flex align="center">
              <VStack align="start" spacing={1}>
                <Heading as="h1" size="lg" color={textColor}>
                  👥 User Management
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  View and manage user accounts
                </Text>
              </VStack>
              <Spacer />
              <HStack spacing={3}>
                <InputGroup maxW="300px">
                  <InputLeftElement>
                    <FaSearch color="gray" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <Button
                  leftIcon={<FaSync />}
                  onClick={fetchUsers}
                  isLoading={isLoading}
                  colorScheme="blue"
                  variant="outline"
                >
                  Refresh
                </Button>
              </HStack>
            </Flex>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <HStack spacing={4}>
          <Card bg={cardBgColor} shadow="sm" flex="1">
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {users.length}
              </Text>
              <Text fontSize="sm" color="gray.500">Total Users</Text>
            </CardBody>
          </Card>
          <Card bg={cardBgColor} shadow="sm" flex="1">
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {users.filter(u => u.email_verified).length}
              </Text>
              <Text fontSize="sm" color="gray.500">Email Verified</Text>
            </CardBody>
          </Card>
          <Card bg={cardBgColor} shadow="sm" flex="1">
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                {users.filter(u => u.status === 'active').length}
              </Text>
              <Text fontSize="sm" color="gray.500">Active Users</Text>
            </CardBody>
          </Card>
        </HStack>

        {/* Users Table */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            {filteredUsers.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                <AlertTitle>No Users Found</AlertTitle>
                <AlertDescription>
                  {searchTerm ? 'No users match your search criteria.' : 'There are currently no users to display.'}
                </AlertDescription>
              </Alert>
            ) : (
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>User</Th>
                      <Th>Email Status</Th>
                      <Th>Account Status</Th>
                      <Th>Joined</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredUsers.map((user) => (
                      <Tr key={user.id}>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">
                              {user.full_name || 'No name provided'}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {user.email}
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Badge colorScheme={getVerificationColor(user.email_verified)}>
                              {user.email_verified ? 'Verified' : 'Unverified'}
                            </Badge>
                            {user.phone_verified && (
                              <Badge colorScheme="green" size="sm">
                                Phone ✓
                              </Badge>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(user.status)}>
                            {user.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm">{formatDate(user.created_at)}</Text>
                        </Td>
                        <Td>
                          <Tooltip label="View Details">
                            <IconButton
                              aria-label="View user details"
                              icon={<FaEye />}
                              size="sm"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => openUserModal(user)}
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

        {/* User Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>User Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedUser && (
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Full Name:</Text>
                    <Text>{selectedUser.full_name || 'Not provided'}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Email:</Text>
                    <Text>{selectedUser.email}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Phone:</Text>
                    <Text>{selectedUser.phone || 'Not provided'}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Email Verified:</Text>
                    <Badge colorScheme={getVerificationColor(selectedUser.email_verified)}>
                      {selectedUser.email_verified ? 'Yes' : 'No'}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Phone Verified:</Text>
                    <Badge colorScheme={getVerificationColor(selectedUser.phone_verified)}>
                      {selectedUser.phone_verified ? 'Yes' : 'No'}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Account Status:</Text>
                    <Badge colorScheme={getStatusColor(selectedUser.status)}>
                      {selectedUser.status.toUpperCase()}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Joined:</Text>
                    <Text>{formatDate(selectedUser.created_at)}</Text>
                  </HStack>
                  {selectedUser.last_login && (
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Last Login:</Text>
                      <Text>{formatDate(selectedUser.last_login)}</Text>
                    </HStack>
                  )}
                  {selectedUser.wallet_balance !== undefined && (
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Wallet Balance:</Text>
                      <Text fontWeight="bold" color="green.500">
                        ${selectedUser.wallet_balance.toLocaleString()}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
}
