import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Dynamically import admin client to avoid client-side issues
let supabaseAdmin: any = null;
const getSupabaseAdmin = async () => {
  if (!supabaseAdmin) {
    try {
      const { supabaseAdmin: admin } = await import('@/lib/supabase/admin');
      supabaseAdmin = admin;
    } catch (error) {
      console.error('Failed to load Supabase admin client:', error);
      throw new Error('Admin client not available');
    }
  }
  return supabaseAdmin;
};

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const countOnly = searchParams.get('count_only') === 'true';

    // Get user from request headers or session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if admin client is available
    try {
      await getSupabaseAdmin();
    } catch (adminError) {
      console.error('Admin client not available:', adminError);
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // If only count is requested
    if (countOnly) {
      const admin = await getSupabaseAdmin();
      let query = admin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', user.email);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching notification count:', error);
        return NextResponse.json(
          { error: 'Failed to fetch notification count' },
          { status: 500 }
        );
      }

      return NextResponse.json({ count: count || 0 });
    }

    // Fetch notifications
    const admin = await getSupabaseAdmin();
    let query = admin
      .from('notifications')
      .select('*')
      .eq('user_email', user.email)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: notifications?.length || 0
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_email,
      title,
      message,
      type,
      priority = 'medium',
      action_url,
      metadata,
      expires_at
    } = body;

    // Validate required fields
    if (!user_email || !title || !message || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, title, message, type' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['transaction', 'deposit', 'withdrawal', 'payment', 'reward', 'referral', 'rank_change', 'verification', 'security', 'system'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    // Create notification
    const admin = await getSupabaseAdmin();
    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_email,
        title,
        message,
        type,
        priority,
        action_url,
        metadata,
        expires_at
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: data
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update notification (mark as read, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id, is_read, action } = body;

    if (!notification_id) {
      return NextResponse.json(
        { error: 'notification_id is required' },
        { status: 400 }
      );
    }

    // Get user from session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let updateData: any = {};

    if (action === 'mark_all_read') {
      // Mark all notifications as read for the user
      const admin = await getSupabaseAdmin();
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_email', user.email)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    // Update specific notification
    if (typeof is_read === 'boolean') {
      updateData.is_read = is_read;
    }

    const admin = await getSupabaseAdmin();
    const { data, error } = await admin
      .from('notifications')
      .update(updateData)
      .eq('id', notification_id)
      .eq('user_email', user.email)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: data
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notification id is required' },
        { status: 400 }
      );
    }

    // Get user from session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = await getSupabaseAdmin();
    const { error } = await admin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_email', user.email);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Notification deleted' });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
