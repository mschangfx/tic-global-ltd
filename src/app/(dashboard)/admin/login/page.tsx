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
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Badge
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaShieldAlt, FaLock, FaUser } from 'react-icons/fa';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Login Successful',
          description: 'Welcome to the admin dashboard!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Redirect to admin dashboard with a slight delay and force reload
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@ticgloballtd.com');
    setPassword('admin1223!');
  };

  return (
    <Box p={{ base: 4, md: 6 }} bg={bgColor} minH="calc(100vh - 60px)">
      <VStack spacing={6} align="stretch" maxW="md" mx="auto" mt={10}>
        {/* Header */}
        <Card bg={cardBgColor} shadow="lg">
          <CardHeader textAlign="center">
            <VStack spacing={3}>
              <Box
                p={4}
                borderRadius="full"
                bg="red.500"
                color="white"
                fontSize="2xl"
              >
                <FaShieldAlt />
              </Box>
              <Heading as="h1" size="lg" color={textColor}>
                🛡️ Admin Login
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Access the TIC Global admin dashboard
              </Text>
              <Badge colorScheme="red" variant="subtle">
                Restricted Access
              </Badge>
            </VStack>
          </CardHeader>
        </Card>

        {/* Login Form */}
        <Card bg={cardBgColor} shadow="lg">
          <CardBody>
            <form onSubmit={handleLogin}>
              <VStack spacing={4}>
                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <AlertTitle>Login Failed!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <FormControl isRequired>
                  <FormLabel>
                    <HStack>
                      <FaUser />
                      <Text>Admin Email</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@ticgloballtd.com"
                    size="lg"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>
                    <HStack>
                      <FaLock />
                      <Text>Password</Text>
                    </HStack>
                  </FormLabel>
                  <InputGroup size="lg">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="red"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  loadingText="Logging in..."
                  leftIcon={<FaShieldAlt />}
                >
                  Login to Admin Dashboard
                </Button>

                <Divider />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fillDemoCredentials}
                  colorScheme="blue"
                >
                  Fill Demo Credentials
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>

        {/* Info */}
        <Card bg={cardBgColor} shadow="sm">
          <CardBody>
            <VStack spacing={3} align="start">
              <Heading as="h3" size="sm" color={textColor}>
                📝 Admin Access Information
              </Heading>
              <VStack align="start" spacing={1} fontSize="sm">
                <Text>• Only authorized administrators can access this system</Text>
                <Text>• Use the provided admin credentials to login</Text>
                <Text>• Session expires after 24 hours for security</Text>
                <Text>• All admin actions are logged and monitored</Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
