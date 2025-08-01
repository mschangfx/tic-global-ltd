'use client'

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Link as ChakraLink,
  useToast,
} from '@chakra-ui/react'
import { FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'
import { useState } from 'react'
import VideoBackground from '@/components/ui/VideoBackground' // Import VideoBackground
import CallToActionBanner from '@/components/ui/CallToActionBanner'

export default function ContactPage() {
  const headingColor = useColorModeValue('gray.700', 'whiteAlpha.900');
  const cardBg = useColorModeValue('white', 'gray.700');
  const toast = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '', // Optional phone field
    subject: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation (excluding optional phone)
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill out all required fields in the contact form.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Handle different success scenarios
      if (result.emailSent) {
        toast({
          title: 'Message Sent Successfully!',
          description: "Thanks for reaching out. We'll get back to you soon. Check your email for confirmation.",
          status: 'success',
          duration: 7000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Message Received!',
          description: "Thanks for reaching out. Your message has been logged and we'll get back to you soon.",
          status: 'success',
          duration: 7000,
          isClosable: true,
        });
      }

      // Clear form on success
      setFormData({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });

    } catch (error: any) {
      console.error('Contact form error:', error);
      toast({
        title: 'Failed to Send Message',
        description: error.message || 'Something went wrong. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Box>
      {/* Hero Section with Background Image */}
      <Box
        // bgImage="url('/buildings.svg')" // Changed to buildings.svg from public folder
        // bgSize="cover"
        // bgPosition="center"
        minH="70vh" // Ensure the Box has enough height for the video
        py={{ base: 20, md: 28 }}
        color="white"
        textAlign={{ base: 'center', md: 'left' }}
        position="relative"
        overflow="hidden" // Important for VideoBackground
      >
        <VideoBackground
          src="/img/gwapa.mp4" // Corrected video source path
          poster="/img/gwapa-poster.jpg" // Corrected suggested poster image path
          fallbackBg="linear-gradient(135deg, #0c151e 0%, #14c3cb 50%, #E0B528 100%)" // Updated gold
        />
        <Box position="absolute" top="0" left="0" right="0" bottom="0" bg="blackAlpha.600" zIndex={1} /> {/* Overlay */}
        <Container maxW="container.xl" position="relative" zIndex={2}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
            <VStack spacing={4} align={{ base: 'center', md: 'flex-start' }}>
              <Heading as="h1" size="3xl" fontFamily="var(--font-titles)" textTransform="uppercase" color="white">
                CONTACT US
              </Heading>
              <Heading as="h2" size="xl" fontFamily="var(--font-headings)" fontWeight="normal" color="white">
                Let's Talk
              </Heading>
              <Text fontSize="lg" maxW="md" color="white">
                Have questions or need more info about TIC GLOBAL Ltd.? Reach out to us at contact@ticgloballtd.com
              </Text>
              <VStack spacing={3} align={{ base: 'center', md: 'flex-start' }} pt={4}>
                <HStack>
                  <Icon as={FaEnvelope} mr={2}/>
                  <ChakraLink href="mailto:contact@ticgloballtd.com" color="whiteAlpha.800" _hover={{color: "white"}}>
                    contact@ticgloballtd.com
                  </ChakraLink>
                </HStack>
                <HStack>
                  <Icon as={FaMapMarkerAlt} mr={2}/>
                  <Text color="white">Naga world samdech techo hun Sen park , phnom penh 120101 Cambodia</Text>
                </HStack>
                {/* Add Phone if you have one */}
                 {/* <HStack> <Icon as={FaPhone} /> <Text>[Your Phone Number]</Text> </HStack> */}
              </VStack>
            </VStack>
            
            {/* Contact Form on the right for md and up */}
            <Box bg={cardBg} p={8} borderRadius="lg" shadow="xl" color={headingColor}>
              <form onSubmit={handleSubmit}>
                <VStack spacing={5}>
                  <HStack w="full" spacing={4}>
                    <FormControl isRequired>
                      <FormLabel color="black">First Name</FormLabel>
                      <Input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" bg={useColorModeValue('white', 'gray.800')} />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel color="black">Last Name</FormLabel>
                      <Input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" bg={useColorModeValue('white', 'gray.800')} />
                    </FormControl>
                  </HStack>
                  <FormControl isRequired>
                    <FormLabel color="black">Email Address</FormLabel>
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" bg={useColorModeValue('white', 'gray.800')} />
                  </FormControl>
                  <FormControl> {/* Phone is optional */}
                    <FormLabel color="black">Phone Number (Optional)</FormLabel>
                    <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" bg={useColorModeValue('white', 'gray.800')} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="black">Subject</FormLabel>
                    <Input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Inquiry about TIC Token" bg={useColorModeValue('white', 'gray.800')} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="black">Comment / Message</FormLabel>
                    <Textarea name="message" value={formData.message} onChange={handleChange} placeholder="Your message here..." rows={5} bg={useColorModeValue('white', 'gray.800')} />
                  </FormControl>
                  <Button
                    type="submit"
                    colorScheme="cyan"
                    bgColor="cyan.400"
                    color="white"
                    _hover={{bgColor: "cyan.500"}}
                    size="lg"
                    w="full"
                    fontFamily="var(--font-titles)"
                    fontWeight="bold"
                    isLoading={isSubmitting}
                    loadingText="Sending..."
                    disabled={isSubmitting}
                  >
                    Send Message
                  </Button>
                </VStack>
              </form>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* You can add other sections below the hero/contact form area if needed */}
      {/* For example, a map section, or links to social media */}
      <Container maxW="container.lg" py={10}>
      </Container>
    </Box>

    {/* Call to Action Banner */}
    <CallToActionBanner
      title="Ready to Get Started?"
      description="Have more questions? Join the TIC GLOBAL community and connect with our support team and fellow members for instant assistance."
    />
    </>
  );
}