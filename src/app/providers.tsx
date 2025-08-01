'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import SessionProvider from '@/components/providers/SessionProvider'
import { LanguageProvider } from '@/contexts/LanguageContext'

// Define Brand Colors
const brandColors = {
  brandTeal: '#14c3cb',
  brandDarkBlue: '#0c151e',
  brandSilver: '#c0c0c0',
  brandGold: '#E0B528', // Updated to Gold Dust
  brandWhite: '#ffffff',
};

// Create a custom theme
const theme = extendTheme({
  fonts: {
    heading: 'var(--font-montserrat), sans-serif',
    body: 'var(--font-dm-sans), sans-serif',
    accent: 'var(--font-playfair-display), serif', // For special callouts
  },
  colors: {
    brand: brandColors,
    primary: { // Example mapping: Teal as primary
      50: '#e0f7f8',
      100: '#b3eff2',
      200: '#80e7eb',
      300: '#4ddfe5',
      400: '#21d7de',
      500: brandColors.brandTeal, // #14c3cb
      600: '#11b0b8',
      700: '#0e9da1',
      800: '#0a8a8b',
      900: '#076d6e',
    },
    secondary: { // Example mapping: Dark Blue as secondary
      50: '#e1e3e6',
      100: '#b5bac1',
      200: '#8a919c',
      300: '#5e6877',
      400: '#333f52',
      500: brandColors.brandDarkBlue, // #0c151e
      600: '#0a121a',
      700: '#080e15',
      800: '#050b11',
      900: '#03070c',
    },
    accent: { // Gold Dust as accent
        50: '#fcf6e4',
        100: '#f8e8ba',
        200: '#f3da8f',
        300: '#efcd65',
        400: '#ebc03a',
        500: brandColors.brandGold, // #E0B528
        600: '#c9a224',
        700: '#b28f20',
        800: '#9c7b1c',
        900: '#866818',
    },
    gray: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: brandColors.brandSilver, // #c0c0c0
      600: '#718096', // Default Chakra gray.600
      700: '#4A5568', // Default Chakra gray.700
      800: '#2D3748', // Default Chakra gray.800
      900: '#1A202C', // Default Chakra gray.900
    },
    // Text and Heading components are already defaulted to 'black' in light mode via their baseStyle.
    // This might require more complex color mode logic if gray is used extensively for text.
    // For now, the Text and Heading components default to whiteAlpha.900 in dark mode.
    yellow: { // Replacing default yellow with Gold Dust based shades
      50: '#fcf6e4',
      100: '#f8e8ba',
      200: '#f3da8f',
      300: '#efcd65',
      400: '#ebc03a',
      500: brandColors.brandGold, // #E0B528
      600: '#c9a224',
      700: '#b28f20',
      800: '#9c7b1c',
      900: '#866818',
    },
    // You can also directly use theme.colors.brand.brandTeal etc. in components
  },
  components: {
    Heading: {
      baseStyle: (props: any) => ({
        fontFamily: 'heading', // Uses var(--font-montserrat)
        color: props.colorMode === 'dark' ? 'gray.200' : 'gray.800', // Darker default heading
      }),
    },
    Text: {
      baseStyle: (props: any) => ({
        fontFamily: 'body', // Uses var(--font-dm-sans)
        color: props.colorMode === 'dark' ? 'gray.300' : 'gray.700', // Darker default text
      }),
    },
    Button: {
      baseStyle: (props: any) => ({ // Make baseStyle a function
        fontFamily: 'body', // DM Sans for buttons as per summary
        // fontWeight: 'medium', // Default is usually good, can adjust
        borderRadius: 'lg', // Default border radius for buttons
        transition: 'all 0.2s ease-in-out', // Default transition
        // Default button text color (can be overridden by colorScheme or variant)
        // color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'black',
      }),
      variants: {
        ctaPrimary: { // New variant for "Get Started" style buttons
          bg: 'primary.600', // Darker shade of brandTeal
          color: 'white',
          fontWeight: 'medium', // As per Navbar button
          px: 6, // As per Navbar button
          _hover: {
            bg: 'primary.700', // Even darker on hover
            transform: 'translateY(-1px) scale(1.02)', // Slight scale on hover
          },
          animation: 'pulseButtonShadow 2s infinite', // Pulsing shadow animation
        },
        // Add other button variants here if needed (e.g., ctaSecondary for gold buttons)
      },
      // defaultProps: { // Example: if you want all buttons to have a default colorScheme
      //   colorScheme: 'primary',
      // },
    },
    Card: {
      baseStyle: (props: any) => ({ // baseStyle can be a function to access colorMode
        // Apply a default transition to all cards for smooth hover
        transition: 'all 0.2s ease-in-out',
        _hover: {
          bg: props.colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.50', // Keep subtle bg change
          transform: 'translateY(-3px)', // Add a slight lift
          boxShadow: 'lg', // Add a slightly more pronounced shadow
        },
      }),
      // You can define variants here if needed
    },
    Box: {
      baseStyle: {
        // Attempt to globally constrain Box components to prevent overflow
        // This is a broad approach; specific Box instances might need individual review
        // if this doesn't solve the issue or causes other layout problems.
        // maxWidth: '100%', // Already applied to html, body, and main wrapper
        // overflowX: 'hidden', // Already applied to html, body, and main wrapper
      },
    },
    // You can add more component default overrides here
  },
  // Other theme customizations (breakpoints, spacing, etc.) can go here
});

// Toast will be handled by ChakraProvider automatically

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CacheProvider>
        <ChakraProvider theme={theme} resetCSS>
          <Global
            styles={`
              /* CUSTOM SCROLLBAR STYLING - TIC GLOBAL THEME */

              /* Webkit browsers (Chrome, Safari, Edge) */
              html::-webkit-scrollbar {
                width: 14px;
              }

              html::-webkit-scrollbar-track {
                background: #0c151e; /* Dark background matching your theme */
                border-radius: 0;
              }

              html::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #14c3cb 0%, #E0B528 100%);
                border-radius: 7px;
                border: 2px solid #0c151e;
                transition: all 0.3s ease;
              }

              html::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #0ea5e9 0%, #f59e0b 100%);
                transform: scale(1.1);
              }

              html::-webkit-scrollbar-corner {
                background: #0c151e;
              }

              /* Firefox */
              html {
                scrollbar-width: thin;
                scrollbar-color: #14c3cb #0c151e;
              }

              /* Ensure smooth scrolling */
              html {
                scroll-behavior: smooth;
              }

              /* Basic overflow protection */
              html, body {
                overflow-x: hidden;
                max-width: 100%;
              }

              /* Ensure all containers respect viewport width */
              .chakra-container {
                max-width: 100%;
              }

              /* Fix for any remaining problematic elements */
              * {
                max-width: 100%;
                box-sizing: border-box;
              }
            `}
          />
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ChakraProvider>
      </CacheProvider>
    </SessionProvider>
  )
}
