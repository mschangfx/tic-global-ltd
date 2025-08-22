import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Admin test endpoint called');

    // Test 1: Check admin authentication
    const unauthorized = requireAdmin(req);
    if (unauthorized) {
      console.log('❌ Admin authentication failed');
      return unauthorized;
    }
    console.log('✅ Admin authentication passed');

    // Test 2: Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminToken = process.env.ADMIN_PANEL_TOKEN;

    console.log('🔍 Environment variables check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasAdminToken: !!adminToken,
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
      supabaseKeyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING',
      adminTokenValue: adminToken || 'MISSING'
    });

    // Test 3: Try to create Supabase client
    try {
      const { getSupabaseAdmin } = await import('../_lib/supabase');
      const supabase = getSupabaseAdmin();
      console.log('✅ Supabase client created successfully');

      // Test 4: Try a simple query
      try {
        const { data, error } = await supabase
          .from('deposits')
          .select('count(*)')
          .limit(1);

        if (error) {
          console.error('❌ Supabase query error:', error);
          return NextResponse.json({
            success: false,
            test_results: {
              admin_auth: 'passed',
              env_vars: 'present',
              supabase_client: 'created',
              supabase_query: 'failed',
              error: error.message
            }
          }, { status: 500 });
        }

        console.log('✅ Supabase query successful:', data);

        return NextResponse.json({
          success: true,
          test_results: {
            admin_auth: 'passed',
            env_vars: 'present',
            supabase_client: 'created',
            supabase_query: 'success',
            query_result: data
          }
        });

      } catch (queryError) {
        console.error('❌ Supabase query exception:', queryError);
        return NextResponse.json({
          success: false,
          test_results: {
            admin_auth: 'passed',
            env_vars: 'present',
            supabase_client: 'created',
            supabase_query: 'exception',
            error: queryError instanceof Error ? queryError.message : 'Unknown query error'
          }
        }, { status: 500 });
      }

    } catch (clientError) {
      console.error('❌ Supabase client creation failed:', clientError);
      return NextResponse.json({
        success: false,
        test_results: {
          admin_auth: 'passed',
          env_vars: 'present',
          supabase_client: 'failed',
          error: clientError instanceof Error ? clientError.message : 'Unknown client error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Admin test endpoint error:', error);
    return NextResponse.json({
      success: false,
      test_results: {
        general_error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}
