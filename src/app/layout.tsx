import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from './providers'
import Navbar from '@/components/layout/Navbar'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TIC GLOBAL - Blockchain Gaming & Entertainment Investment Platform',
  description: 'Join the revolutionary blockchain gaming ecosystem. Invest in TIC and GIC tokens, participate in gaming tournaments, and earn through our entertainment platform.',
  keywords: ['cryptocurrency', 'investment', 'blockchain', 'gaming', 'entertainment', 'TIC token', 'GIC token', 'esports', 'casino'],
  authors: [{ name: 'TIC GLOBAL Ltd.' }],
  openGraph: {
    title: 'TIC GLOBAL - Blockchain Gaming & Entertainment',
    description: 'Revolutionary blockchain gaming ecosystem with TIC and GIC tokens',
    url: 'https://ticglobal.com',
    siteName: 'TIC GLOBAL',
    images: [
      {
        url: '/tic.png',
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
    images: ['/tic.png'],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#14c3cb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="prefetch" href="/head.mp4" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main style={{ paddingTop: '80px' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
