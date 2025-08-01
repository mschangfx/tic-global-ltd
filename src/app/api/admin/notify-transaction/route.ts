import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_EMAIL || 'contact@ticgloballtd.com',
    pass: process.env.SMTP_PASSWORD || 'contact1223!',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { transaction } = await request.json();

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction data is required' },
        { status: 400 }
      );
    }

    // Admin email addresses (you can store these in environment variables)
    const adminEmails = [
      'admin@ticgloballtd.com',
      // Add more admin emails as needed
    ];

    // Create email content based on transaction type
    const isDeposit = transaction.transaction_type === 'deposit';
    const subject = `🚨 New ${isDeposit ? 'Deposit' : 'Withdrawal'} Request - TIC GLOBAL`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transaction Notification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14c3cb, #E0B528); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .transaction-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${isDeposit ? '#10B981' : '#F59E0B'}; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .amount { font-size: 24px; font-weight: bold; color: ${isDeposit ? '#10B981' : '#F59E0B'}; }
            .status { padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .status-pending { background: #FEF3C7; color: #D97706; }
            .urgent { background: #FEE2E2; color: #DC2626; padding: 10px; border-radius: 8px; margin: 15px 0; }
            .action-buttons { text-align: center; margin: 20px 0; }
            .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .btn-approve { background: #10B981; color: white; }
            .btn-reject { background: #EF4444; color: white; }
            .footer { text-align: center; margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏦 TIC GLOBAL Ltd.</h1>
                <h2>${isDeposit ? '💰 New Deposit Request' : '💸 New Withdrawal Request'}</h2>
            </div>
            
            <div class="content">
                ${!isDeposit ? '<div class="urgent">⚠️ <strong>URGENT:</strong> Withdrawal requests require immediate attention to prevent delays.</div>' : ''}
                
                <div class="transaction-details">
                    <h3>${isDeposit ? 'Deposit' : 'Withdrawal'} Transaction Details</h3>
                    
                    <div class="detail-row">
                        <span class="detail-label">Transaction ID:</span>
                        <span class="detail-value">${transaction.id}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">User Email:</span>
                        <span class="detail-value">${transaction.user_email}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value amount">$${parseFloat(transaction.amount).toFixed(2)} ${transaction.currency}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Network:</span>
                        <span class="detail-value">${transaction.network}</span>
                    </div>
                    
                    ${transaction.user_wallet_address ? `
                    <div class="detail-row">
                        <span class="detail-label">Destination Address:</span>
                        <span class="detail-value" style="word-break: break-all;">${transaction.user_wallet_address}</span>
                    </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value"><span class="status status-pending">${transaction.status}</span></span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Request Time:</span>
                        <span class="detail-value">${new Date(transaction.created_at).toLocaleString()}</span>
                    </div>
                    
                    ${transaction.processing_fee > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">Processing Fee:</span>
                        <span class="detail-value">$${parseFloat(transaction.processing_fee).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    
                    ${transaction.network_fee > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">Network Fee:</span>
                        <span class="detail-value">$${parseFloat(transaction.network_fee).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    
                    ${transaction.final_amount ? `
                    <div class="detail-row">
                        <span class="detail-label">Final Amount:</span>
                        <span class="detail-value amount">$${parseFloat(transaction.final_amount).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="action-buttons">
                    <p><strong>Action Required:</strong> Please review and ${isDeposit ? 'approve this deposit' : 'process this withdrawal'} request.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/admin/transactions" class="btn btn-approve">
                        📋 Review in Admin Panel
                    </a>
                </div>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h4>📋 Next Steps:</h4>
                    <ol>
                        <li>Log into the admin panel</li>
                        <li>Verify the transaction details</li>
                        <li>${isDeposit ? 'Confirm payment received and approve' : 'Process the withdrawal and update status'}</li>
                        <li>Add any necessary notes for the user</li>
                    </ol>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>TIC GLOBAL Ltd.</strong><br>
                Naga world samdech techo hun Sen park<br>
                Phnom Penh 120101, Cambodia<br>
                <a href="mailto:contact@ticgloballtd.com">contact@ticgloballtd.com</a></p>
                
                <p style="margin-top: 10px; font-size: 11px;">
                    This is an automated notification. Please do not reply to this email.<br>
                    For support, contact: <a href="mailto:contact@ticgloballtd.com">contact@ticgloballtd.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Send email to all admin addresses
    const emailPromises = adminEmails.map(adminEmail => 
      transporter.sendMail({
        from: `"TIC GLOBAL Notifications" <${process.env.SMTP_EMAIL}>`,
        to: adminEmail,
        subject: subject,
        html: emailHtml,
        priority: isDeposit ? 'normal' : 'high', // Withdrawals are high priority
      })
    );

    await Promise.all(emailPromises);

    return NextResponse.json({ 
      success: true, 
      message: 'Admin notification sent successfully' 
    });

  } catch (error) {
    console.error('Error sending admin notification:', error);
    return NextResponse.json(
      { error: 'Failed to send admin notification' },
      { status: 500 }
    );
  }
}
