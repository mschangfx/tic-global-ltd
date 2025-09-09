import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check environment variables
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({
        error: "Missing environment variables",
        env_debug: {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          url_value: url,
          key_exists: !!key
        }
      }, { status: 500 });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const projectRef = url?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] || "unknown";

    const [{ data: reqRow, error: reqErr }, { data: wRow, error: wErr }] = await Promise.all([
      supabase.from("withdrawal_requests").select("id,status").eq("id", params.id).maybeSingle(),
      supabase.from("withdrawals").select("id,status").eq("id", params.id).maybeSingle(),
    ]);

    return NextResponse.json({
      serverSupabaseUrl: url,
      serverProjectRef: projectRef,
      withdrawal_requests: reqRow ?? null,
      withdrawals: wRow ?? null,
      errors: { withdrawal_requests: reqErr?.message ?? null, withdrawals: wErr?.message ?? null },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Debug route error",
      message: error instanceof Error ? (error as Error).message : "Unknown error",
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}
