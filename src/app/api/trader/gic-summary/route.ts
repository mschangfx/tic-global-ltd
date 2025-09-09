import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Get user's GIC trading summary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('Getting GIC summary for:', userEmail);

    // Call the database function to get GIC summary
    const { data, error } = await supabaseAdmin
      .rpc('get_user_gic_summary', {
        user_email_param: userEmail
      });

    if (error) {
      console.error('Error getting GIC summary:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to get GIC summary',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: data
    });

  } catch (error) {
    console.error('Error in GIC summary API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
