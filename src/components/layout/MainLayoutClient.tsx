'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
// Removed unused Chakra UI imports
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Providers from '@/app/providers'

export default function MainLayoutClient({
  children,
  interClassName
}: {
  children: React.ReactNode
  interClassName: string
}) {
  const pathname = usePathname();
  // No longer relying on isClient for the navbar/footer logic directly,
  // as usePathname() is a client hook and will provide the path on client render.
  // useEffect for isClient can remain if other logic depends on client-only mount.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // More detailed logging:
  if (isClient) { // Only log on client side after pathname is definitely available
    console.log('[MainLayoutClient] Current Pathname:', `"${pathname}"`); // Log with quotes to see whitespace
    const loginCheck = pathname === '/login';
    const registerCheck = pathname === '/register';
    const dashboardCheck = pathname ? pathname.startsWith('/dashboard') : false;
    console.log('[MainLayoutClient] isLoginPage:', loginCheck);
    console.log('[MainLayoutClient] isRegisterPage:', registerCheck);
    console.log('[MainLayoutClient] isDashboardPage (pathname.startsWith("/dashboard")):', dashboardCheck);
    
    const finalShouldShowPublicNavbar = !loginCheck && !registerCheck && !dashboardCheck;
    console.log('[MainLayoutClient] shouldShowPublicNavbar (calculated):', finalShouldShowPublicNavbar);
  }

  const isRegisterPage = pathname === '/register';
  const isJoinPage = pathname === '/join';
  const isAuthPage = pathname === '/forgot-password' || pathname === '/reset-password';

  // Comprehensive check for dashboard pages and all dashboard-related routes
  const isDashboardPage = pathname ? (
    pathname.startsWith('/dashboard') ||
    pathname === '/my-dashboard' ||
    pathname.startsWith('/my-accounts') ||
    pathname === '/wallet' ||
    pathname.startsWith('/wallet/') ||
    pathname.startsWith('/games') ||
    pathname.startsWith('/packages') ||
    pathname.startsWith('/news') ||
    pathname.startsWith('/referrals') ||
    pathname.startsWith('/support-hub')
  ) : false;

  const shouldShowPublicNavbar = !isRegisterPage && !isDashboardPage && !isJoinPage && !isAuthPage;
  const shouldShowFooter = !isRegisterPage && !isDashboardPage && !isJoinPage && !isAuthPage;

  return (
    <body className={interClassName}>
      <Providers>
        {shouldShowPublicNavbar && (
          <>
            <Navbar />
          </>
        )}
        <main style={{ paddingTop: shouldShowPublicNavbar ? '80px' : '0px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        {shouldShowFooter && <Footer />}
      </Providers>
    </body>
  )
}
