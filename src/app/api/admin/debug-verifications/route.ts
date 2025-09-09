import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug verification data request started');

    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY || 'admin-key-2024';

    if (!authHeader || !authHeader.includes(adminKey)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get users with identity document info
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        email,
        first_name,
        last_name,
        identity_document_uploaded,
        identity_verification_status,
        verification_updated_at,
        created_at
      `)
      .eq('identity_document_uploaded', true)
      .order('created_at', { ascending: false });

    console.log('👥 Users with documents:', users?.length || 0);

    // Get identity documents
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('identity_documents')
      .select(`
        id,
        user_id,
        document_type,
        verification_status,
        upload_date,
        verified_at,
        users!inner(
          email,
          first_name,
          last_name
        )
      `)
      .order('upload_date', { ascending: false });

    console.log('📄 Identity documents:', documents?.length || 0);

    // Get verification stats from users table
    const { data: allUsers, error: statsError } = await supabaseAdmin
      .from('users')
      .select('identity_verification_status, identity_document_uploaded');

    const stats = {
      totalUsers: allUsers?.length || 0,
      documentsUploaded: allUsers?.filter(u => u.identity_document_uploaded).length || 0,
      pendingVerifications: allUsers?.filter(u => 
        u.identity_document_uploaded && u.identity_verification_status === 'pending'
      ).length || 0,
      approvedVerifications: allUsers?.filter(u => 
        u.identity_verification_status === 'approved'
      ).length || 0,
      rejectedVerifications: allUsers?.filter(u => 
        u.identity_verification_status === 'rejected'
      ).length || 0,
    };

    // Get document stats
    const docStats = {
      totalDocuments: documents?.length || 0,
      pendingDocuments: documents?.filter(d => d.verification_status === 'pending').length || 0,
      approvedDocuments: documents?.filter(d => d.verification_status === 'approved').length || 0,
      rejectedDocuments: documents?.filter(d => d.verification_status === 'rejected').length || 0,
    };

    return NextResponse.json({
      success: true,
      debug: {
        usersWithDocuments: users || [],
        identityDocuments: documents || [],
        userStats: stats,
        documentStats: docStats,
        errors: {
          usersError: usersError?.message || null,
          docsError: docsError?.message || null,
          statsError: statsError?.message || null
        }
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error in debug verifications:', error);
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
