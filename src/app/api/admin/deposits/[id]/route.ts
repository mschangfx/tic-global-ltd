import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/supabase";
import { requireAdmin } from "../../_lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();
  const id = params.id;
  const body = await req.json().catch(() => ({} as any));
  const { action, admin_notes } = body as { action: "approve"|"reject"; admin_notes?: string };

  if (!["approve","reject"].includes(action)) {
    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  }

  // load
  const { data: rows, error: readErr } = await supabase.from("deposits").select("*").eq("id", id).limit(1);
  if (readErr) return NextResponse.json({ success: false, message: readErr.message }, { status: 500 });
  const deposit = rows?.[0];
  if (!deposit) return NextResponse.json({ success: false, message: "Deposit not found" }, { status: 404 });

  const now = new Date().toISOString();
  const adminEmail = "admin@ticgloballtd.com";

  const changes: any = {
    updated_at: now,
    admin_email: adminEmail,
    admin_notes: admin_notes || `${action} via admin API`,
  };

  if (action === "approve") {
    changes.status = "completed";
    changes.approved_by = adminEmail;
    changes.approved_at = now;
  } else {
    changes.status = "rejected";
    changes.rejected_by = adminEmail;
    changes.rejected_at = now;
  }

  const { error: upErr } = await supabase.from("deposits").update(changes).eq("id", id);
  if (upErr) return NextResponse.json({ success: false, message: upErr.message }, { status: 500 });

  // audit
  await supabase.from("admin_audit_logs").insert({
    action: `deposit_${action}`,
    target_table: "deposits",
    target_id: id,
    admin_email: adminEmail,
    notes: admin_notes || null,
    created_at: now
  });

  return NextResponse.json({ success: true });
}


