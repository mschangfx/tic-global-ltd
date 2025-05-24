import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIC GLOBAL - Blockchain Gaming & Entertainment Investment Platform',
  description: 'Join the revolutionary blockchain gaming ecosystem. Invest in TIC and GIC tokens, participate in gaming tournaments, and earn through our entertainment platform with transparent, secure, and profitable opportunities.',
  keywords: [
    'blockchain gaming',
    'cryptocurrency investment',
    'TIC token',
    'GIC token',
    'gaming tournaments',
    'entertainment platform',
    'blockchain investment',
    'crypto gaming',
    'decentralized gaming',
    'gaming ecosystem',
    'fintech',
    'digital assets',
    'gaming finance'
  ],
  authors: [{ name: 'TIC GLOBAL Team' }],
  creator: 'TIC GLOBAL',
  publisher: 'TIC GLOBAL',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ticglobal.com',
    siteName: 'TIC GLOBAL',
    title: 'TIC GLOBAL - Blockchain Gaming & Entertainment Investment Platform',
    description: 'Join the revolutionary blockchain gaming ecosystem. Invest in TIC and GIC tokens, participate in gaming tournaments, and earn through our entertainment platform.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'TIC GLOBAL - Blockchain Gaming & Entertainment',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TIC GLOBAL - Blockchain Gaming & Entertainment Investment Platform',
    description: 'Join the revolutionary blockchain gaming ecosystem. Invest in TIC and GIC tokens, participate in gaming tournaments, and earn through our entertainment platform.',
    images: ['/logo.png'],
    creator: '@ticglobal',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'technology',
}
