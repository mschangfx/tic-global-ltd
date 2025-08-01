import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { subject, description, priority = 'medium' } = body;

    // Validate required fields
    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
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

    // Create the ticket
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert([
        {
          user_id: user.id,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          status: 'open'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      );
    }

    // Optional: Send notification email to support team
    // You can implement this based on your email service
    try {
      await sendTicketNotification(ticket, user);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      { 
        message: 'Ticket created successfully',
        ticket 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { ticketId, status, subject, description } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (status) {
      const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
      
      // Set timestamps based on status
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }
    }

    if (subject) updateData.subject = subject.trim();
    if (description) updateData.description = description.trim();

    // Update the ticket (only if user owns it)
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .eq('user_id', user.id) // Ensure user can only update their own tickets
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to send notification emails
async function sendTicketNotification(ticket: any, user: any) {
  // This is a placeholder for email notification functionality
  // You can implement this using your preferred email service (Resend, SendGrid, etc.)
  
  console.log(`New support ticket created:
    Ticket ID: ${ticket.id}
    User: ${user.email}
    Subject: ${ticket.subject}
    Priority: ${ticket.priority}
    Description: ${ticket.description}
  `);
  
  // Example implementation with Resend (if you have it configured):
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'support@ticgloballtd.com',
    to: 'support@ticgloballtd.com',
    subject: `New Support Ticket: ${ticket.subject}`,
    html: `
      <h2>New Support Ticket Created</h2>
      <p><strong>Ticket ID:</strong> ${ticket.id}</p>
      <p><strong>User:</strong> ${user.email}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Description:</strong></p>
      <p>${ticket.description}</p>
      <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
    `
  });
  */
}
