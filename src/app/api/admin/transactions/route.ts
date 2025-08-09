import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  'https://clsowgswufspftizyjlc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsc293Z3N3dWZzcGZ0aXp5amxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY5NDE4MCwiZXhwIjoyMDY0MjcwMTgwfQ.ZryoITxcPfjWYWXQfou8ymnafpT7EZc7B4Rr0YsGEK8'
);

// GET - Fetch pending transactions
export async function GET() {
  try {
    // Get pending deposits
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (depositsError) {
      console.error('Error fetching deposits:', depositsError);
    }

    // Get pending withdrawals
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
    }

    // Combine and format transactions
    const transactions = [
      ...(deposits || []).map(d => ({ ...d, type: 'deposit' })),
      ...(withdrawals || []).map(w => ({ ...w, type: 'withdrawal' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Error in GET /api/admin/transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST - Approve or reject transactions
export async function POST(request: NextRequest) {
  try {
    const { id, action, type } = await request.json();

    if (!id || !action || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action, type' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "deposit" or "withdrawal"' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const adminEmail = 'admin@ticgloballtd.com';

    let result;

    if (type === 'deposit') {
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: `${action === 'approve' ? 'Approved' : 'Rejected'} via admin panel at ${timestamp}`,
        updated_at: timestamp,
        ...(action === 'approve' ? {
          approved_by: adminEmail,
          approved_at: timestamp
        } : {
          rejected_by: adminEmail,
          rejected_at: timestamp
        })
      };

      const { data, error } = await supabase
        .from('deposits')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;

    } else if (type === 'withdrawal') {
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: `${action === 'approve' ? 'Approved' : 'Rejected'} via admin panel at ${timestamp}`,
        processed_by: adminEmail,
        processed_at: timestamp
      };

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: `Transaction ${action}d successfully`,
      transaction: result
    });

  } catch (error) {
    console.error('Error in POST /api/admin/transactions:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
