'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import React from 'react';

export default function AppClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage = pathname?.startsWith('/register') || pathname?.startsWith('/join') || pathname?.startsWith('/forgot-password') || pathname?.startsWith('/reset-password');
  const isDashboardPage = pathname?.startsWith('/dashboard') ||
                          pathname === '/my-dashboard' ||
                          pathname?.startsWith('/my-accounts') ||
                          pathname === '/wallet' ||
                          pathname?.startsWith('/wallet/') ||
                          pathname?.startsWith('/games') ||
                          pathname?.startsWith('/packages') ||
                          pathname?.startsWith('/news') ||
                          pathname?.startsWith('/referrals') ||
                          pathname?.startsWith('/support-hub') ||
                          pathname === '/profile' ||
                          pathname?.startsWith('/profile/') ||
                          pathname === '/settings' ||
                          pathname?.startsWith('/settings/') ||
                          pathname?.startsWith('/trader-dashboard') ||
                          pathname?.startsWith('/trader-payment');
  
  const shouldShowMainNavbarAndFooter = !isAuthPage && !isDashboardPage;

  // Optional Debug Pathname Display (uncomment to use):
  /*
  const debugPathInfo = (
    <p style={{ position: 'fixed', top: 0, right: 0, color: 'red', backgroundColor: 'white', padding: '5px', zIndex: 9999, fontSize: '12px', border: '1px solid red', whiteSpace: 'nowrap' }}>
      PATH: {pathname ?? 'nullish'} |
      isAuth: {String(isAuthPage)} |
      isDash: {String(isDashboardPage)} |
      showNav: {String(shouldShowMainNavbarAndFooter)}
    </p>
  );
  */

  return (
    <> {/* Returns a fragment, as <html>, <body>, and <Providers> are in app/layout.tsx */}
      {/* {debugPathInfo} */}
      {shouldShowMainNavbarAndFooter && <Navbar />}
      <main style={{
        paddingTop: shouldShowMainNavbarAndFooter ? '112px' : '0px', // Adjusted to Navbar's h={28} -> 112px
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: `calc(100vh - ${shouldShowMainNavbarAndFooter ? '112px' : '0px'} - ${shouldShowMainNavbarAndFooter && pathname !== '/' ? '70px' : '0px'})`, // Adjusted for Navbar height
        overflowX: 'hidden', // Prevent horizontal overflow for the main content area
        maxWidth: '100%',    // Ensure it doesn't exceed viewport width
      }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      {shouldShowMainNavbarAndFooter && <Footer />}
    </>
  );
}