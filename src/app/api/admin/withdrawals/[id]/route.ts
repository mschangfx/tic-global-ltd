import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/supabase";
import { requireAdmin } from "../../_lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { success: false, message: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY" },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const id = params.id;
    const body = await req.json().catch(() => ({} as any));
    const { action, transaction_hash, admin_notes } = body as {
      action: "approve"|"reject"; transaction_hash?: string; admin_notes?: string;
    };

    if (!["approve","reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    // load
    const { data: rows, error: readErr } = await supabase
      .from("withdrawal_requests").select("*").eq("id", id).limit(1);
    if (readErr) {
      console.error("WITHDRAWALS: read error:", readErr);
      return NextResponse.json({ success: false, message: readErr.message }, { status: 500 });
    }
    const w = rows?.[0];
    if (!w) return NextResponse.json({ success: false, message: "Withdrawal not found" }, { status: 404 });

    const now = new Date().toISOString();
    const adminEmail = "admin@ticgloballtd.com";

    if (action === "approve") {
      const tx = transaction_hash || "PENDING_TX";
      const { error: upErr } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "completed",
          transaction_hash: tx,
          approved_by: adminEmail,
          approved_at: now,
          updated_at: now,
          admin_notes: admin_notes || "Approved via admin API",
        })
        .eq("id", id);

      if (upErr) {
        console.error("WITHDRAWALS: approve update error:", upErr);
        return NextResponse.json({ success: false, message: upErr.message }, { status: 500 });
      }

      await supabase.from("admin_audit_logs").insert({
        action: "withdrawal_approve",
        target_table: "withdrawal_requests",
        target_id: id,
        admin_email: adminEmail,
        notes: admin_notes || null,
        created_at: now,
      });

      return NextResponse.json({ success: true });
    }

    // reject: mark rejected then refund via RPC
    const { error: rejErr } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "rejected",
        rejected_by: adminEmail,
        rejected_at: now,
        updated_at: now,
        admin_notes: admin_notes || "Rejected via admin API - funds refunded to wallet",
      })
      .eq("id", id);

    if (rejErr) {
      console.error("WITHDRAWALS: reject update error:", rejErr);
      return NextResponse.json({ success: false, message: rejErr.message }, { status: 500 });
    }

    // refund via RPC (implement this function in DB)
    const { data: refundData, error: refundErr } = await supabase
      .rpc("refund_withdrawal_amount", { withdrawal_id_param: id });

    if (refundErr) {
      console.error("WITHDRAWALS: refund error:", refundErr);
      return NextResponse.json({ success: false, message: refundErr.message }, { status: 500 });
    }

    await supabase.from("admin_audit_logs").insert({
      action: "withdrawal_reject",
      target_table: "withdrawal_requests",
      target_id: id,
      admin_email: adminEmail,
      notes: admin_notes || null,
      created_at: now,
    });

    return NextResponse.json({ success: true, refunded: refundData?.refunded ?? null });
  } catch (err: any) {
    console.error("WITHDRAWALS route uncaught error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Unknown server error in /withdrawals" },
      { status: 500 }
    );
  }
}
