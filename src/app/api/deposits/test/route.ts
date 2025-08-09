import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Deposits API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    routes: {
      main: '/api/deposits',
      manual: '/api/deposits/manual',
      status: '/api/deposits/status',
      create: '/api/deposits/create'
    }
  });
}
