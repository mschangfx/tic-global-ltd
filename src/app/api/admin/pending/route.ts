import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../_lib/supabase";
import { requireAdmin } from "../_lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();

  const [dep, wit] = await Promise.all([
    supabase.from("deposits").select("*").eq("status", "pending"),
    supabase.from("withdrawal_requests").select("*").eq("status", "pending"),
  ]);

  if (dep.error) return NextResponse.json({ success: false, message: dep.error.message }, { status: 500 });
  if (wit.error) return NextResponse.json({ success: false, message: wit.error.message }, { status: 500 });

  const deposits = (dep.data ?? []).map((d: any) => ({ ...d, type: "deposit" }));
  const withdrawals = (wit.data ?? []).map((w: any) => ({ ...w, type: "withdrawal" }));

  const transactions = [...deposits, ...withdrawals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ success: true, transactions });
}
