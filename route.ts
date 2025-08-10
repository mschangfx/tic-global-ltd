// app/api/deposits/manual/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}


