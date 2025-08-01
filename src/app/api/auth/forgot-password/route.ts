import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import * as nodemailer from 'nodemailer';
import crypto from 'crypto';

// Temporary in-memory storage for reset tokens (until database is updated)
// In production, this should be stored in Redis or database
declare global {
  var resetTokens: Map<string, { email: string; userId: string; expiry: Date }> | undefined;
}

// Initialize global storage if it doesn't exist
if (!global.resetTokens) {
  global.resetTokens = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // For security, we don't reveal if the email exists or not
      // Always return success to prevent email enumeration
      console.log('User not found for email:', email, 'Error:', userError?.message);
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Try to store reset token in database (this might fail if columns don't exist)
    try {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error storing reset token (columns might not exist):', updateError);
        // Continue anyway - we'll store the token in memory/logs for now
      }
    } catch (dbError) {
      console.error('Database update failed (columns might not exist):', dbError);
      // Continue anyway - we'll store the token in memory/logs for now
    }

    // Store token in memory as fallback
    global.resetTokens?.set(resetToken, {
      email: user.email,
      userId: user.id,
      expiry: resetTokenExpiry
    });

    // Check if email is configured
    const isEmailConfigured = process.env.SMTP_EMAIL &&
                              process.env.SMTP_PASSWORD &&
                              process.env.SMTP_EMAIL !== 'your-email@gmail.com' &&
                              process.env.SMTP_PASSWORD !== 'your-app-password' &&
                              process.env.SMTP_EMAIL.includes('@') &&
                              process.env.SMTP_PASSWORD.length > 5;

    console.log('Email configuration check:', {
      hasEmail: !!process.env.SMTP_EMAIL,
      emailValue: process.env.SMTP_EMAIL,
      hasPassword: !!process.env.SMTP_PASSWORD,
      passwordLength: process.env.SMTP_PASSWORD?.length,
      isConfigured: isEmailConfigured
    });

    if (isEmailConfigured) {
      try {
        // Determine email service based on email domain
        const emailDomain = process.env.SMTP_EMAIL?.split('@')[1]?.toLowerCase();
        let transporterConfig: any = {
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        };

        // Configure based on email provider
        if (emailDomain?.includes('gmail')) {
          transporterConfig.service = 'gmail';
        } else if (emailDomain?.includes('outlook') || emailDomain?.includes('hotmail') || emailDomain?.includes('live')) {
          transporterConfig.service = 'hotmail';
        } else if (emailDomain?.includes('yahoo')) {
          transporterConfig.service = 'yahoo';
        } else {
          // Custom SMTP configuration for company domains
          const smtpHost = process.env.SMTP_HOST;
          const smtpPort = process.env.SMTP_PORT;
          const smtpSecure = process.env.SMTP_SECURE;

          if (smtpHost) {
            // Use custom SMTP settings
            transporterConfig = {
              host: smtpHost,
              port: parseInt(smtpPort || '587'),
              secure: smtpSecure === 'true', // true for 465, false for other ports
              auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
              },
              // Add additional options for better compatibility
              tls: {
                rejectUnauthorized: false // Allow self-signed certificates
              }
            };
          } else {
            // Fallback to generic SMTP
            transporterConfig = {
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
              },
            };
          }
        }

        console.log('Creating email transporter for:', emailDomain, 'Config:', {
          ...transporterConfig,
          auth: { user: transporterConfig.auth.user, pass: '[HIDDEN]' }
        });

        // Create transporter
        const transporter = nodemailer.createTransport(transporterConfig);

        // Create reset URL
        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/reset-password?token=${resetToken}`;

        // Email content
        const emailContent = {
          from: process.env.SMTP_EMAIL,
          to: email,
          subject: 'Reset Your TIC GLOBAL Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2D3748; margin-bottom: 10px;">Password Reset Request</h1>
                <p style="color: #666; font-size: 16px;">TIC GLOBAL Account Security</p>
              </div>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #14c3cb; margin-bottom: 20px;">
                <h2 style="color: #2D3748; margin-bottom: 15px;">Hello ${user.name || 'User'},</h2>
                <p style="color: #666; line-height: 1.6;">
                  We received a request to reset the password for your TIC GLOBAL account associated with this email address.
                </p>
                <p style="color: #666; line-height: 1.6;">
                  If you made this request, click the button below to reset your password:
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #14c3cb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #2D3748; margin-bottom: 15px;">Security Information</h3>
                <ul style="color: #666; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li>This link will expire in 24 hours</li>
                  <li>If you didn't request this reset, you can safely ignore this email</li>
                  <li>Your password won't change until you create a new one</li>
                </ul>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br>
                  <span style="word-break: break-all;">${resetUrl}</span>
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #666; margin-bottom: 15px;">
                  <strong>TIC GLOBAL Ltd.</strong><br>
                  Naga world samdech techo hun Sen park<br>
                  Phnom Penh 120101, Cambodia
                </p>
                <p style="color: #999; font-size: 14px; margin: 0;">
                  This is an automated security email. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        };

        // Verify transporter configuration
        console.log('Verifying email transporter...');
        await transporter.verify();
        console.log('Email transporter verified successfully');

        // Send email
        console.log(`Sending password reset email to: ${email}`);
        const info = await transporter.sendMail(emailContent);

        console.log('Email sent successfully:', {
          messageId: info.messageId,
          response: info.response,
          to: email
        });

      } catch (emailError: any) {
        console.error('Failed to send password reset email:', {
          error: emailError.message,
          code: emailError.code,
          command: emailError.command,
          to: email,
          emailConfig: process.env.SMTP_EMAIL
        });

        // Log specific error types
        if (emailError.code === 'EAUTH') {
          console.error('❌ EMAIL AUTH ERROR: Invalid email credentials');
          console.error('💡 SOLUTION: Check your email and password in .env.local');
          console.error('💡 For Gmail: Use App Password, not regular password');
        } else if (emailError.code === 'ENOTFOUND') {
          console.error('❌ EMAIL SERVER ERROR: Cannot connect to email server');
          console.error('💡 SOLUTION: Check your internet connection and SMTP settings');
        }

        // Don't fail the request if email fails, token is still stored
        // But log the error for debugging
      }
    } else {
      // Log the reset request when email is not configured
      console.log('=== PASSWORD RESET REQUEST ===');
      console.log('Email:', email);
      console.log('Reset Token:', resetToken);
      console.log('Reset URL:', `${process.env.NEXTAUTH_URL || 'http://localhost:8000'}/reset-password?token=${resetToken}`);
      console.log('Expires:', resetTokenExpiry.toISOString());
      console.log('===============================');
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, we have sent a password reset link.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
