// app/api/admin/withdrawals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { missingEnv: true, info: { hasUrl: !!url, hasKey: !!key, availableUrl: process.env.NEXT_PUBLIC_SUPABASE_URL } } as any;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  let body: any = {};
  try { body = await req.json(); } catch (e: any) {
    return NextResponse.json({ error: "Invalid JSON", details: String(e) }, { status: 400, headers: corsHeaders });
  }

  const { action, reason, tx_hash } = body || {};
  if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400, headers: corsHeaders });

  // env check
  const cli: any = admin();
  if ((cli as any).missingEnv) {
    return NextResponse.json({ error: "ENV_MISSING", details: (cli as any).info }, { status: 500, headers: corsHeaders });
  }
  const supabase = cli as ReturnType<typeof createClient>;
  const projectRef = process.env.SUPABASE_URL?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];

  // v2 API supports schema scoping:
  const db = (supabase as any).schema ? (supabase as any).schema('public') : supabase;

  // READ by id only
  const read = await db.from("withdrawal_requests")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (read.error) {
    return NextResponse.json({ error: "READ_ERROR", projectRef, details: read.error }, { status: 500, headers: corsHeaders });
  }
  if (!read.data) {
    return NextResponse.json({ error: "Withdrawal not found", projectRef }, { status: 404, headers: corsHeaders });
  }
  if (read.data.status !== "pending") {
    return NextResponse.json({ error: "Already processed", status: read.data.status, projectRef }, { status: 409, headers: corsHeaders });
  }

  // Build patch
  const patch: Record<string, any> = { processed_at: new Date().toISOString() };
  if (action === "reject") {
    patch.status = "rejected";
    patch.reject_reason = reason ?? null;
  } else if (action === "approve") {
    patch.status = "approved";
    patch.tx_hash = tx_hash ?? null; // harmless even if null
  } else {
    return NextResponse.json({ error: "Invalid action", projectRef }, { status: 400, headers: corsHeaders });
  }

  // UPDATE with race guard
  const upd = await db.from("withdrawal_requests")
    .update(patch)
    .eq("id", id)
    .eq("status", "pending")
    .select("id,status,processed_at,reject_reason,tx_hash")
    .maybeSingle();

  if (upd.error) {
    return NextResponse.json({ error: "UPDATE_ERROR", projectRef, patch, details: upd.error }, { status: 500, headers: corsHeaders });
  }
  if (!upd.data) {
    return NextResponse.json({ error: "Already processed", projectRef }, { status: 409, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true, projectRef, ...upd.data }, { headers: corsHeaders });
}

// GET - Fetch withdrawal details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const supabase = admin();

  const { data: withdrawal, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json({ success: true, withdrawal }, { headers: corsHeaders });
}
