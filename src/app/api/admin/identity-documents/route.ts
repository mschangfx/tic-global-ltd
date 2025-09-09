import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Admin identity documents request started');

    // Check admin authentication
    if (!await checkAdminAuth(request)) {
      console.log('❌ Admin auth failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Admin authenticated');

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log('📋 Query params:', { status, limit, offset });

    // Build query
    let query = supabaseAdmin
      .from('identity_documents')
      .select(`
        *,
        users!inner(
          email,
          first_name,
          last_name,
          phone_number,
          country_of_birth,
          country_of_residence,
          date_of_birth,
          gender,
          address,
          email_verified,
          profile_completed,
          identity_document_uploaded,
          created_at
        )
      `)
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('verification_status', status);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch identity documents' },
        { status: 500 }
      );
    }

    console.log(`✅ Retrieved ${documents?.length || 0} identity documents`);

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('identity_documents')
      .select('id', { count: 'exact', head: true });

    if (status !== 'all') {
      countQuery = countQuery.eq('verification_status', status);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      documents: documents || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error fetching identity documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 Admin identity document update started');

    // Check admin authentication
    if (!await checkAdminAuth(request)) {
      console.log('❌ Admin auth failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Admin authenticated');

    const body = await request.json();
    const { documentId, action, rejectionReason } = body;

    console.log('📋 Update request:', { documentId, action, rejectionReason });

    if (!documentId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId and action' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting documents' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get the document first to get user email
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('identity_documents')
      .select('*, users!inner(email)')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      console.error('❌ Document not found:', fetchError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('📄 Found document for user:', document.users.email);

    // Update the document
    const updateData = {
      verification_status: action === 'approve' ? 'approved' : 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: 'admin@system',
      rejection_reason: action === 'reject' ? rejectionReason : null,
      updated_at: new Date().toISOString()
    };

    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('identity_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update document:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    console.log('✅ Document updated successfully');

    // Update user verification status
    const userUpdateData = {
      identity_verification_status: action === 'approve' ? 'verified' : 'rejected',
      identity_verification_completed_at: action === 'approve' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update(userUpdateData)
      .eq('email', document.users.email);

    if (userUpdateError) {
      console.error('❌ Failed to update user status:', userUpdateError);
      // Don't return error as document was updated successfully
    } else {
      console.log('✅ User verification status updated');
    }

    return NextResponse.json({
      success: true,
      message: `Document ${action}d successfully`,
      document: updatedDoc
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error updating identity document:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
