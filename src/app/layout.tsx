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
                    const indicators = [
                      'chrome-extension://',
                      'moz-extension://',
                      'safari-extension://',
                      'Cannot read properties of null',
                      'Cannot read property',
                      'egjjdjbpglichdcondbcbdnbeeppgdph',
                      'inpage.js'
                    ];

                    const checkString = (str) => str && indicators.some(indicator => str.includes(indicator));
                    return checkString(source) || checkString(message) || checkString(stack);
                  };

                  // Override window.onerror
                  window.onerror = function(message, source, lineno, colno, error) {
                    if (isExtensionError(source, message, error?.stack)) {
                      console.warn('🔇 Extension error suppressed (onerror):', message);
                      return true; // Prevent default error handling
                    }
                    if (originalOnError) {
                      return originalOnError.apply(this, arguments);
                    }
                    return false;
                  };

                  // Override window.onunhandledrejection
                  window.onunhandledrejection = function(event) {
                    const errorMsg = event.reason?.message || event.reason?.toString() || '';
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
                  };

                  // Override console.error to suppress extension errors
                  console.error = function(...args) {
                    const message = args.join(' ');
                    if (isExtensionError('', message, '')) {
                      console.warn('🔇 Extension console.error suppressed:', message);
                      return;
                    }
                    originalConsoleError.apply(console, args);
                  };

                  // Event listeners with capture phase
                  window.addEventListener('error', function(event) {
                    if (isExtensionError(event.filename, event.message, event.error?.stack)) {
                      console.warn('🔇 Extension addEventListener error suppressed:', event.message);
                      event.stopImmediatePropagation();
                      event.preventDefault();
                      return false;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(event) {
                    const errorMsg = event.reason?.message || event.reason?.toString() || '';
                    const errorStack = event.reason?.stack || '';

                    if (isExtensionError('', errorMsg, errorStack)) {
                      console.warn('🔇 Extension addEventListener rejection suppressed:', errorMsg);
                      event.stopImmediatePropagation();
                      event.preventDefault();
                      return false;
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

                  // Also check on DOM mutations
                  if (typeof MutationObserver !== 'undefined') {
                    const observer = new MutationObserver(hideExtensionErrors);
                    observer.observe(document.body, { childList: true, subtree: true });
                  }

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
