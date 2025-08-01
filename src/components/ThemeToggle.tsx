'use client';

import { 
  IconButton, 
  useColorMode, 
  useColorModeValue,
  Tooltip,
  HStack,
  Text,
  Switch,
  Box
} from '@chakra-ui/react';
import { FaSun, FaMoon } from 'react-icons/fa';

interface ThemeToggleProps {
  variant?: 'icon' | 'switch';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ 
  variant = 'icon', 
  showLabel = false,
  size = 'md' 
}: ThemeToggleProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  // Icon variant
  if (variant === 'icon') {
    return (
      <Tooltip 
        label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} 
        placement="bottom"
      >
        <IconButton
          aria-label="Toggle theme"
          icon={isDark ? <FaSun /> : <FaMoon />}
          onClick={toggleColorMode}
          variant="ghost"
          size={size}
          color={useColorModeValue('gray.600', 'gray.300')}
          _hover={{
            bg: useColorModeValue('gray.100', 'gray.700'),
            color: useColorModeValue('gray.800', 'white')
          }}
        />
      </Tooltip>
    );
  }

  // Switch variant
  return (
    <HStack spacing={3}>
      {showLabel && (
        <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
          {isDark ? 'Dark' : 'Light'} Mode
        </Text>
      )}
      <HStack spacing={2}>
        <Box color={useColorModeValue('gray.400', 'gray.500')}>
          <FaSun size={14} />
        </Box>
        <Switch
          isChecked={isDark}
          onChange={toggleColorMode}
          colorScheme="blue"
          size={size}
        />
        <Box color={useColorModeValue('gray.400', 'gray.500')}>
          <FaMoon size={14} />
        </Box>
      </HStack>
    </HStack>
  );
}
