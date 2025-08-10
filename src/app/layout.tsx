// app/layout.tsx (Server Component)

import type { Metadata, Viewport } from 'next';
import { Montserrat, DM_Sans, Playfair_Display } from 'next/font/google'; // Updated font imports
import AppClientLayout from '@/components/layout/AppClientLayout'; // Client component for dynamic layout parts
import Providers from './providers'; // Assuming this is your main Providers wrapper
import './globals.css';

// Removed Inter and Poppins

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat', // Primary Font
  weight: ['400', '500', '600', '700', '800', '900'], // Added more weights if needed for "Bold", "Semi-Bold"
});

const dmSans = DM_Sans({ // Secondary Font
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '700'], // Light, Regular, Medium, Bold
});

const playfairDisplay = Playfair_Display({ // Accent Font
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
  weight: ['400', '700'], // Regular, Bold
});

// Static metadata - this is allowed in Server Components
export const metadata: Metadata = {
  title: 'TIC GLOBAL - Blockchain Gaming & Entertainment Investment Platform',
  description: 'Join the revolutionary blockchain gaming ecosystem. Invest in TIC and GIC tokens, participate in gaming tournaments, and earn through our entertainment platform.',
  keywords: ['cryptocurrency', 'investment', 'blockchain', 'gaming', 'entertainment', 'TIC token', 'GIC token', 'esports', 'casino'],
  authors: [{ name: 'TIC GLOBAL Ltd.' }],
  openGraph: {
    title: 'TIC GLOBAL - Blockchain Gaming & Entertainment',
    description: 'Revolutionary blockchain gaming ecosystem with TIC and GIC tokens',
    url: 'https://ticglobal.com', // Replace with your actual domain
    siteName: 'TIC GLOBAL',
    images: [
      {
        url: '/tic.png', // Ensure this image is in /public/tic.png
        width: 1200,
        height: 630,
        alt: 'TIC GLOBAL - Blockchain Gaming Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TIC GLOBAL - Blockchain Gaming & Entertainment',
    description: 'Revolutionary blockchain gaming ecosystem with TIC and GIC tokens',
    images: ['/tic.png'], // Ensure this image is in /public/tic.png
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Static viewport configuration
export const viewport: Viewport = {
  themeColor: '#14c3cb', // Example theme color
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontClassNames = `${montserrat.variable} ${dmSans.variable} ${playfairDisplay.variable}`;

  return (
    <html lang="en" className={fontClassNames}>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* Ultra-aggressive extension error suppression */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Ultra-aggressive browser extension error suppression
              (function() {
                if (typeof window !== 'undefined') {
                  // Store original handlers
                  const originalOnError = window.onerror;
                  const originalOnUnhandledRejection = window.onunhandledrejection;
                  const originalConsoleError = console.error;

                  // Function to check if error is from extension
                  const isExtensionError = (source, message, stack) => {
                    try {
                      // Convert all inputs to safe strings
                      const safeSource = source ? String(source) : '';
                      const safeMessage = message ? String(message) : '';
                      const safeStack = stack ? String(stack) : '';

                      // Only check for very specific extension indicators
                      const extensionIndicators = [
                        'chrome-extension://',
                        'moz-extension://',
                        'safari-extension://',
                        'egjjdjbpglichdcondbcbdnbeeppgdph',
                        'inpage.js'
                      ];

                      // Check for extension URLs first (most reliable)
                      const hasExtensionUrl = extensionIndicators.some(indicator =>
                        safeSource.includes(indicator) || safeMessage.includes(indicator) || safeStack.includes(indicator)
                      );

                      if (hasExtensionUrl) return true;

                      // Only suppress specific null property errors if they seem extension-related
                      if ((safeMessage.includes('Cannot read properties of null') || safeMessage.includes('Cannot read property')) &&
                          (safeMessage.includes('type') || safeStack.includes('extension') || safeStack.includes('inpage'))) {
                        return true;
                      }

                      return false;
                    } catch (error) {
                      // If there's an error in the error checking function, don't assume it's an extension error
                      return false;
                    }
                  };

                  // Override window.onerror
                  window.onerror = function(message, source, lineno, colno, error) {
                    try {
                      const safeMessage = message || '';
                      const safeSource = source || '';
                      const safeStack = error?.stack || '';

                      if (isExtensionError(safeSource, safeMessage, safeStack)) {
                        console.warn('🔇 Extension error suppressed (onerror):', safeMessage);
                        return true; // Prevent default error handling
                      }
                      if (originalOnError) {
                        return originalOnError.apply(this, arguments);
                      }
                      return false;
                    } catch (err) {
                      // Fallback to original handler if our handler fails
                      if (originalOnError) {
                        return originalOnError.apply(this, arguments);
                      }
                      return false;
                    }
                  };

                  // Override window.onunhandledrejection
                  window.onunhandledrejection = function(event) {
                    try {
                      const errorMsg = event.reason?.message || event.reason?.toString?.() || String(event.reason) || '';
                      const errorStack = event.reason?.stack || '';

                      if (isExtensionError('', errorMsg, errorStack)) {
                        console.warn('🔇 Extension promise rejection suppressed (onunhandledrejection):', errorMsg);
                        event.preventDefault();
                        return true;
                      }

                      if (originalOnUnhandledRejection) {
                        return originalOnUnhandledRejection.apply(this, arguments);
                      }
                      return false;
                    } catch (err) {
                      // Fallback to original handler if our handler fails
                      if (originalOnUnhandledRejection) {
                        return originalOnUnhandledRejection.apply(this, arguments);
                      }
                      return false;
                    }
                  };

                  // Override console.error to suppress extension errors
                  console.error = function(...args) {
                    try {
                      const message = args.map(arg => {
                        try {
                          return String(arg);
                        } catch (e) {
                          return '[object]';
                        }
                      }).join(' ');

                      // Only suppress if it's clearly from an extension
                      if (isExtensionError('', message, '')) {
                        console.warn('🔇 Extension console.error suppressed:', message);
                        return;
                      }

                      // Let all other errors through
                      originalConsoleError.apply(console, args);
                    } catch (err) {
                      // If our handler fails, fall back to original console.error
                      originalConsoleError.apply(console, args);
                    }
                  };

                  // Event listeners with capture phase
                  window.addEventListener('error', function(event) {
                    try {
                      const filename = event.filename || '';
                      const message = event.message || '';
                      const stack = event.error?.stack || '';

                      if (isExtensionError(filename, message, stack)) {
                        console.warn('🔇 Extension addEventListener error suppressed:', message);
                        event.stopImmediatePropagation();
                        event.preventDefault();
                        return false;
                      }
                    } catch (error) {
                      // Ignore errors in error handler to prevent infinite loops
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(event) {
                    try {
                      const errorMsg = event.reason?.message || event.reason?.toString?.() || String(event.reason) || '';
                      const errorStack = event.reason?.stack || '';

                      if (isExtensionError('', errorMsg, errorStack)) {
                        console.warn('🔇 Extension addEventListener rejection suppressed:', errorMsg);
                        event.stopImmediatePropagation();
                        event.preventDefault();
                        return false;
                      }
                    } catch (error) {
                      // Ignore errors in error handler to prevent infinite loops
                    }
                  }, true);

                  // Aggressive Next.js error overlay suppression
                  const hideExtensionErrors = () => {
                    // Hide error overlays
                    const overlays = document.querySelectorAll('[data-nextjs-dialog-overlay], [data-nextjs-dialog], .nextjs-container-errors');
                    overlays.forEach(overlay => {
                      const errorText = overlay.textContent || '';
                      if (isExtensionError('', errorText, '')) {
                        overlay.style.display = 'none !important';
                        overlay.style.visibility = 'hidden !important';
                        overlay.style.opacity = '0 !important';
                        overlay.remove();
                        console.warn('🔇 Extension error overlay removed');
                      }
                    });

                    // Hide any error dialogs
                    const errorDialogs = document.querySelectorAll('div[role="dialog"]');
                    errorDialogs.forEach(dialog => {
                      const errorText = dialog.textContent || '';
                      if (errorText.includes('Unhandled Runtime Error') && isExtensionError('', errorText, '')) {
                        dialog.style.display = 'none !important';
                        dialog.remove();
                        console.warn('🔇 Extension error dialog removed');
                      }
                    });
                  };

                  // Check for error overlays very frequently
                  setInterval(hideExtensionErrors, 100);

                  // Also check on DOM mutations - with safety checks
                  if (typeof MutationObserver !== 'undefined' && document.body) {
                    try {
                      const observer = new MutationObserver(hideExtensionErrors);
                      observer.observe(document.body, { childList: true, subtree: true });
                    } catch (error) {
                      console.warn('MutationObserver setup failed:', error);
                    }
                  }



                  // Add a final catch-all error handler for warnings
                  const originalConsoleWarn = console.warn;
                  console.warn = function(...args) {
                    try {
                      const message = args.map(arg => {
                        try {
                          return String(arg);
                        } catch (e) {
                          return '[object]';
                        }
                      }).join(' ');

                      // Only suppress if it's clearly from an extension
                      if (isExtensionError('', message, '')) {
                        // Silently suppress extension warnings
                        return;
                      }

                      // Let all other warnings through
                      originalConsoleWarn.apply(console, args);
                    } catch (err) {
                      // Fall back to original console.warn
                      originalConsoleWarn.apply(console, args);
                    }
                  };

                  console.log('🛡️ Ultra-aggressive extension error suppression activated');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {/* Temporarily disabled error suppression for debugging */}

        {/* Providers wraps AppClientLayout, which handles the rest of the dynamic layout */}
        <Providers>
          <AppClientLayout>{children}</AppClientLayout>
        </Providers>
      </body>
    </html>
  );
}
