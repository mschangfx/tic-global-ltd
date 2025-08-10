import { NextRequest, NextResponse } from 'next/server';
import { DepositService } from '@/lib/services/depositService';

/**
 * Admin API to update deposit status
 * PUT /api/admin/deposits/[id]
 * 
 * Body: {
 *   status: 'completed' | 'rejected' | 'pending',
 *   adminEmail: string,
 *   adminNotes?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const depositId = params.id;
    
    if (!depositId) {
      return NextResponse.json(
        { error: 'Deposit ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, adminEmail, adminNotes } = body;

    // Validate required fields
    if (!status || !adminEmail) {
      return NextResponse.json(
        { error: 'Status and admin email are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'received', 'confirmed', 'completed', 'rejected', 'expired', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`🔄 Admin updating deposit ${depositId} to status: ${status}`);
    console.log(`👤 Admin: ${adminEmail}`);
    console.log(`📝 Notes: ${adminNotes || 'None'}`);

    // Update deposit status using DepositService
    const depositService = DepositService.getInstance();
    const updatedDeposit = await depositService.updateDepositStatus(
      depositId,
      status,
      adminEmail,
      adminNotes || `Updated to ${status} via admin panel`
    );

    console.log(`✅ Successfully updated deposit ${depositId} to ${status}`);

    console.log(`✅ Admin ${adminEmail} updated deposit ${depositId} to ${status}`);

    return NextResponse.json({
      success: true,
      message: `Deposit status updated to ${status}`,
      deposit: {
        id: updatedDeposit.id,
        status: updatedDeposit.status,
        amount: updatedDeposit.amount,
        final_amount: updatedDeposit.final_amount,
        user_email: updatedDeposit.user_email,
        admin_email: updatedDeposit.admin_email,
        admin_notes: updatedDeposit.admin_notes,
        approved_by: updatedDeposit.approved_by,
        approved_at: updatedDeposit.approved_at,
        rejected_by: updatedDeposit.rejected_by,
        rejected_at: updatedDeposit.rejected_at,
        updated_at: updatedDeposit.updated_at
      }
    });

  } catch (error: any) {
    console.error('Error updating deposit status:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update deposit status',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Admin API to get deposit details
 * GET /api/admin/deposits/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const depositId = params.id;
    
    if (!depositId) {
      return NextResponse.json(
        { error: 'Deposit ID is required' },
        { status: 400 }
      );
    }

    const depositService = DepositService.getInstance();
    const deposit = await depositService.getDepositById(depositId);

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        user_email: deposit.user_email,
        amount: deposit.amount,
        currency: deposit.currency,
        method_id: deposit.method_id,
        method_name: deposit.method_name,
        network: deposit.network,
        deposit_address: deposit.deposit_address,
        user_wallet_address: deposit.user_wallet_address,
        transaction_hash: deposit.transaction_hash,
        processing_fee: deposit.processing_fee,
        network_fee: deposit.network_fee,
        final_amount: deposit.final_amount,
        status: deposit.status,
        admin_notes: deposit.admin_notes,
        admin_email: deposit.admin_email,
        approved_by: deposit.approved_by,
        approved_at: deposit.approved_at,
        rejected_by: deposit.rejected_by,
        rejected_at: deposit.rejected_at,
        created_at: deposit.created_at,
        updated_at: deposit.updated_at,
        expires_at: deposit.expires_at
      }
    });

  } catch (error: any) {
    console.error('Error fetching deposit:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch deposit',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
