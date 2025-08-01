'use client';

import { useToast } from '@chakra-ui/react';
import { useCallback } from 'react';

interface ToastOptions {
  title?: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isClosable?: boolean;
  position?: 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';
}

/**
 * A safe wrapper around Chakra UI's useToast hook that handles cases
 * where the toast might not be available yet (e.g., during SSR or before providers are initialized)
 */
export function useSafeToast() {
  const toast = useToast();

  const safeToast = useCallback((options: ToastOptions) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn('Toast called during SSR, skipping');
        return;
      }

      // Add a small delay to ensure ChakraProvider is fully initialized
      setTimeout(() => {
        try {
          // Check if toast function is available and properly initialized
          if (!toast || typeof toast !== 'function') {
            console.warn('Toast not available yet, skipping');
            return;
          }

          // Additional check for ChakraProvider context
          if (typeof document !== 'undefined' && !document.querySelector('[data-chakra-ui]')) {
            console.warn('ChakraProvider not ready yet, skipping toast');
            return;
          }

          // Call the toast with the provided options
          toast(options);
        } catch (innerError) {
          console.warn('Toast inner error:', innerError);
          // Fallback to console logging
          const level = options.status === 'error' ? 'error' :
                       options.status === 'warning' ? 'warn' : 'log';
          console[level](`Toast: ${options.title}${options.description ? ` - ${options.description}` : ''}`);
        }
      }, 10); // Small delay to ensure providers are ready
    } catch (error) {
      console.warn('Toast error:', error);
      // Fallback to console logging in case of errors
      const level = options.status === 'error' ? 'error' :
                   options.status === 'warning' ? 'warn' : 'log';
      console[level](`Toast: ${options.title}${options.description ? ` - ${options.description}` : ''}`);
    }
  }, [toast]);

  return safeToast;
}
