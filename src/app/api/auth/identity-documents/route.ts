import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('user_document_verification_status')
      .select('*')
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (status && status !== 'all') {
      query = query.eq('verification_status', status);
    }

    if (email) {
      query = query.eq('email', email);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching identity documents:', error);
      return NextResponse.json(
        { message: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('user_document_verification_status')
      .select('*', { count: 'exact', head: true });

    if (status && status !== 'all') {
      countQuery = countQuery.eq('verification_status', status);
    }

    if (email) {
      countQuery = countQuery.eq('email', email);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      documents: data || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Error in identity documents API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, status, rejectionReason, verifiedBy } = body;

    if (!email || !status) {
      return NextResponse.json(
        { message: 'Email and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status. Must be approved, rejected, or pending' },
        { status: 400 }
      );
    }

    // Update document status
    const updateData: any = {
      verification_status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.verified_at = new Date().toISOString();
      updateData.verified_by = verifiedBy || 'admin';
      updateData.rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejectionReason || 'Document rejected';
      updateData.verified_at = null;
      updateData.verified_by = null;
    }

    const { error: docError } = await supabaseAdmin
      .from('identity_documents')
      .update(updateData)
      .eq('email', email);

    if (docError) {
      console.error('Error updating document:', docError);
      return NextResponse.json(
        { message: 'Failed to update document status' },
        { status: 500 }
      );
    }

    // Update user verification status
    const userUpdateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      userUpdateData.identity_verification_status = 'approved';
      userUpdateData.identity_verified_at = new Date().toISOString();
    } else if (status === 'rejected') {
      userUpdateData.identity_verification_status = 'rejected';
      userUpdateData.identity_verified_at = null;
    } else {
      userUpdateData.identity_verification_status = 'pending';
    }

    const { error: userError } = await supabaseAdmin
      .from('users')
      .update(userUpdateData)
      .eq('email', email);

    if (userError) {
      console.error('Error updating user verification status:', userError);
      // Don't return error here as document was updated successfully
    }

    return NextResponse.json({
      message: `Document ${status} successfully`,
      email,
      status
    });

  } catch (error) {
    console.error('Error updating document status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
