import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Mark all notifications as read for the current user
export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mark all notifications as read for this user
    const admin = supabaseAdmin;
    const { data, error } = await admin
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_email', user.email)
      .eq('is_read', false) // Only update unread notifications
      .select('id');

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      );
    }

    const updatedCount = data?.length || 0;

    return NextResponse.json({
      success: true,
      message: `${updatedCount} notifications marked as read`,
      updated_count: updatedCount
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
