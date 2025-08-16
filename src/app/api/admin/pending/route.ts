import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../_lib/supabase";
import { requireAdmin } from "../_lib/auth";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Admin pending endpoint called');

    const unauthorized = requireAdmin(req);
    if (unauthorized) return unauthorized;

    console.log('✅ Admin authentication passed');

    const supabase = getSupabaseAdmin();
    console.log('✅ Supabase admin client obtained');

    console.log('🔍 Fetching pending transactions...');
    const [dep, wit] = await Promise.all([
      supabase.from("deposits").select("*").eq("status", "pending"),
      supabase.from("withdrawal_requests").select("*").eq("status", "pending"),
    ]);

    console.log('🔍 Database query results:', {
      depositsError: dep.error?.message,
      depositsCount: dep.data?.length || 0,
      withdrawalsError: wit.error?.message,
      withdrawalsCount: wit.data?.length || 0
    });

    if (dep.error) {
      console.error('❌ Deposits query error:', dep.error);
      return NextResponse.json({
        success: false,
        message: `Deposits query failed: ${dep.error.message}`
      }, { status: 500 });
    }

    if (wit.error) {
      console.error('❌ Withdrawals query error:', wit.error);
      return NextResponse.json({
        success: false,
        message: `Withdrawals query failed: ${wit.error.message}`
      }, { status: 500 });
    }

    const deposits = (dep.data ?? []).map((d: any) => ({ ...d, type: "deposit" }));
    const withdrawals = (wit.data ?? []).map((w: any) => ({ ...w, type: "withdrawal" }));

    const transactions = [...deposits, ...withdrawals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log('✅ Successfully fetched pending transactions:', {
      totalTransactions: transactions.length,
      deposits: deposits.length,
      withdrawals: withdrawals.length
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('❌ Admin pending endpoint error:', error);
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
