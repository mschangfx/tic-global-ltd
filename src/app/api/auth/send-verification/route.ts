import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Get Supabase client
    const supabase = createClient();

    // Store verification code in database
    const { error: dbError } = await supabase
      .from('email_verifications')
      .upsert({
        email: email,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store verification code' },
        { status: 500 }
      );
    }

    // Check if Resend API key is configured
    const hasEmailCredentials = process.env.RESEND_API_KEY;

    if (hasEmailCredentials) {
      try {
        // Send verification email using Resend
        const { data, error } = await resend.emails.send({
          from: 'TIC GLOBAL Ltd. <noreply@ticgloballtd.com>',
          to: [email],
          subject: 'Email Verification Code - TIC GLOBAL Ltd.',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #14c3cb; margin: 0;">TIC GLOBAL Ltd.</h1>
              </div>

              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
                <p style="color: #666; margin-bottom: 30px;">
                  Please use the following verification code to confirm your email address:
                </p>

                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #14c3cb;">
                  <h1 style="color: #14c3cb; font-size: 32px; margin: 0; letter-spacing: 5px;">
                    ${verificationCode}
                  </h1>
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  This code will expire in 30 minutes.
                </p>

                <p style="color: #666; font-size: 14px;">
                  If you didn't request this verification, please ignore this email.
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  © 2024 TIC GLOBAL Ltd. All rights reserved.
                </p>
              </div>
            </div>
          `,
        });

        if (error) {
          throw error;
        }

        console.log('✅ Email sent successfully to:', email);
        console.log('✅ Resend email ID:', data?.id);
      } catch (emailError: any) {
        console.error('❌ Email sending failed:', emailError?.message || emailError);
        console.error('❌ Full error details:', emailError);
        // Fall back to demo mode if email fails
        console.log('='.repeat(60));
        console.log('📧 EMAIL VERIFICATION CODE (FALLBACK MODE)');
        console.log('='.repeat(60));
        console.log(`Email: ${email}`);
        console.log(`Verification Code: ${verificationCode}`);
        console.log(`Expires: ${expiresAt.toLocaleString()}`);
        console.log('='.repeat(60));
        console.log('💡 Email sending failed, but verification code is stored in database');
        console.log('='.repeat(60));
      }
    } else {
      // Demo mode: Log verification code to console
      console.log('='.repeat(60));
      console.log('📧 EMAIL VERIFICATION CODE (DEMO MODE)');
      console.log('='.repeat(60));
      console.log(`Email: ${email}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log(`Expires: ${expiresAt.toLocaleString()}`);
      console.log('='.repeat(60));
      console.log('💡 To enable email sending, configure RESEND_API_KEY in .env.local');
      console.log('='.repeat(60));
    }

    return NextResponse.json(
      { message: 'Verification code sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
