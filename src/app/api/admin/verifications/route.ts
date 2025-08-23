import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// CORS headers for admin panel access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Admin authentication check
async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // For now, we'll use a simple admin key check
  // In production, you might want to use a more sophisticated auth system
  const adminKey = process.env.ADMIN_API_KEY || 'admin-key-2024';
  
  if (!authHeader || !authHeader.includes(adminKey)) {
    return false;
  }
  
  return true;
}

// GET - Fetch users pending verification
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    if (!await checkAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get users with uploaded documents and their document details
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        identity_documents!inner(
          id,
          document_type,
          verification_status,
          upload_date,
          file_name,
          file_url,
          rejection_reason,
          verified_at,
          verified_by
        )
      `)
      .eq('identity_document_uploaded', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users for verification:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verification data' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in verification GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH - Update verification status
export async function PATCH(request: NextRequest) {
  try {
    // Check admin authentication
    if (!await checkAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { email, status, reason } = body;

    if (!email || !status) {
      return NextResponse.json(
        { error: 'Email and status are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved, rejected, or pending' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update user verification status
    const updateData: any = {
      identity_verification_status: status,
      identity_verified_at: status === 'approved' ? new Date().toISOString() : null
    };

    // Add rejection reason if status is rejected
    if (status === 'rejected' && reason) {
      updateData.verification_rejection_reason = reason;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('email', email)
      .select();

    if (error) {
      console.error('Error updating user verification status:', error);
      return NextResponse.json(
        { error: 'Failed to update user verification status' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Also update the identity_documents table to keep them in sync
    const docUpdateData: any = {
      verification_status: status,
      verified_at: status === 'approved' ? new Date().toISOString() : null,
      verified_by: 'admin'
    };

    if (status === 'rejected' && reason) {
      docUpdateData.rejection_reason = reason;
    }

    const { error: docError } = await supabaseAdmin
      .from('identity_documents')
      .update(docUpdateData)
      .eq('email', email);

    if (docError) {
      console.warn('Warning: Failed to update identity_documents table:', docError);
      // Don't fail the request if document update fails, just log it
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Log the verification action
    console.log(`✅ Verification ${status} for user: ${email}`);

    // If approved, you might want to send a notification email here
    if (status === 'approved') {
      console.log(`🎉 User ${email} is now fully verified`);
      // TODO: Send approval notification email
    } else if (status === 'rejected') {
      console.log(`❌ User ${email} verification rejected: ${reason || 'No reason provided'}`);
      // TODO: Send rejection notification email
    }

    return NextResponse.json({
      success: true,
      message: `Verification ${status} successfully`,
      user: data[0]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in verification PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET verification statistics
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    if (!await checkAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get verification statistics
    const { data: stats, error } = await supabaseAdmin
      .from('users')
      .select('identity_verification_status, identity_document_uploaded, email_verified, profile_completed');

    if (error) {
      console.error('Error fetching verification stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verification statistics' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Calculate statistics
    const totalUsers = stats?.length || 0;
    const pendingVerifications = stats?.filter(u => 
      u.identity_document_uploaded && u.identity_verification_status === 'pending'
    ).length || 0;
    const approvedVerifications = stats?.filter(u => 
      u.identity_verification_status === 'approved'
    ).length || 0;
    const rejectedVerifications = stats?.filter(u => 
      u.identity_verification_status === 'rejected'
    ).length || 0;
    const emailVerified = stats?.filter(u => u.email_verified).length || 0;
    const profileCompleted = stats?.filter(u => u.profile_completed).length || 0;
    const documentsUploaded = stats?.filter(u => u.identity_document_uploaded).length || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        pendingVerifications,
        approvedVerifications,
        rejectedVerifications,
        emailVerified,
        profileCompleted,
        documentsUploaded
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in verification stats POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
