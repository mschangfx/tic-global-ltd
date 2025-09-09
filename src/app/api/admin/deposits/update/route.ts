import { NextRequest, NextResponse } from 'next/server';
import TransactionService from '@/lib/services/transactionService';

// POST - Update individual deposit status (approve/reject)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, status, adminEmail, adminNotes } = body;

    if (!transactionId || !status || !adminEmail) {
      return NextResponse.json(
        { error: 'Transaction ID, status, and admin email are required' },
        { status: 400 }
      );
    }

    // Map frontend status to backend status
    const statusMap: { [key: string]: string } = {
      'completed': 'completed',
      'rejected': 'rejected',
      'approved': 'completed' // Treat approved as completed
    };

    const finalStatus = statusMap[status] || status;
    
    if (!['completed', 'rejected'].includes(finalStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "completed" or "rejected"' },
        { status: 400 }
      );
    }

    const transactionService = TransactionService.getInstance();
    
    // Update transaction status
    const success = await transactionService.updateTransactionStatus(
      transactionId,
      finalStatus as 'completed' | 'rejected',
      adminEmail,
      adminNotes || `Deposit ${status} by admin`
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update transaction status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deposit ${status} successfully`,
      transactionId: transactionId,
      newStatus: finalStatus
    });

  } catch (error) {
    console.error('Error updating deposit status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update deposit status',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
