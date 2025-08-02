import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in development or for debugging
  const isDev = process.env.NODE_ENV === 'development'
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    debug: isDev,
    envVars: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set (hidden)' : 'Not set',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set (hidden)' : 'Not set',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set (hidden)' : 'Not set',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (hidden)' : 'Not set',
    },
    timestamp: new Date().toISOString()
  })
}
