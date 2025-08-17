export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Only show this in development or with a special debug header
  const debugHeader = req.headers.get("x-debug-admin");
  if (debugHeader !== "show-env-debug") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return NextResponse.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasAdminToken: !!process.env.ADMIN_PANEL_TOKEN,
    supabaseUrlLength: process.env.SUPABASE_URL?.length || 0,
    supabaseKeyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0,
    adminTokenLength: process.env.ADMIN_PANEL_TOKEN?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
