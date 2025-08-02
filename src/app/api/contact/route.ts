import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();
    const { firstName, lastName, email, phone, subject, message } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if email credentials are configured
    const isEmailConfigured = process.env.SMTP_EMAIL &&
                              process.env.SMTP_PASSWORD &&
                              process.env.SMTP_EMAIL !== 'your-email@gmail.com' &&
                              process.env.SMTP_PASSWORD !== 'your-app-password' &&
                              process.env.SMTP_EMAIL.includes('@') &&
                              process.env.SMTP_PASSWORD.length > 5;

    console.log('Email configuration check:', {
      hasEmail: !!process.env.SMTP_EMAIL,
      hasPassword: !!process.env.SMTP_PASSWORD,
      emailValue: process.env.SMTP_EMAIL,
      isConfigured: isEmailConfigured
    });

    // Log the contact form submission (always works)
    const submissionData = {
      timestamp: new Date().toISOString(),
      firstName,
      lastName,
      email,
      phone: phone || 'Not provided',
      subject,
      message,
      userAgent: request.headers.get('user-agent') || 'Unknown',
      ip: request.headers.get('x-forwarded-for') || 'Unknown'
    };

    // Log to console (you can see this in your terminal/server logs)
    console.log('=== NEW CONTACT FORM SUBMISSION ===');
    console.log('Timestamp:', submissionData.timestamp);
    console.log('Name:', `${firstName} ${lastName}`);
    console.log('Email:', email);
    console.log('Phone:', phone || 'Not provided');
    console.log('Subject:', subject);
    console.log('Message:', message);
    console.log('=====================================');

    // Also save to file (backup logging)
    try {
      const logDir = path.join(process.cwd(), 'contact-submissions');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, `contact-${new Date().toISOString().split('T')[0]}.json`);
      let existingData = [];

      if (fs.existsSync(logFile)) {
        const fileContent = fs.readFileSync(logFile, 'utf8');
        existingData = JSON.parse(fileContent);
      }

      existingData.push(submissionData);
      fs.writeFileSync(logFile, JSON.stringify(existingData, null, 2));
    } catch (fileError) {
      console.error('Failed to save to file:', fileError);
    }

    if (isEmailConfigured) {
      try {
        // Create transporter (using Gmail SMTP as an example)
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD, // Use App Password for Gmail
          },
        });

    // Company email address
    const companyEmail = 'contact@ticgloballtd.com';

    // Email content for the company
    const companyEmailContent = {
      from: process.env.SMTP_EMAIL,
      to: companyEmail,
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D3748; margin-bottom: 10px;">New Contact Form Submission</h1>
            <p style="color: #666; font-size: 16px;">TIC GLOBAL Website Contact Form</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2D3748; margin-bottom: 15px; border-bottom: 2px solid #14c3cb; padding-bottom: 5px;">Contact Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2D3748; width: 120px;">Name:</td>
                <td style="padding: 8px 0; color: #666;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2D3748;">Email:</td>
                <td style="padding: 8px 0; color: #666;"><a href="mailto:${email}" style="color: #14c3cb; text-decoration: none;">${email}</a></td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2D3748;">Phone:</td>
                <td style="padding: 8px 0; color: #666;">${phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2D3748;">Subject:</td>
                <td style="padding: 8px 0; color: #666;">${subject}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #2D3748; margin-bottom: 15px; border-bottom: 2px solid #14c3cb; padding-bottom: 5px;">Message</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              This email was sent from the TIC GLOBAL website contact form.<br>
              Received on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
    };

    // Auto-reply email for the user
    const autoReplyContent = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: 'Thank you for contacting TIC GLOBAL - We received your message',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D3748; margin-bottom: 10px;">Thank You for Contacting TIC GLOBAL</h1>
            <p style="color: #666; font-size: 16px;">We've received your message and will get back to you soon!</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #14c3cb; margin-bottom: 20px;">
            <h2 style="color: #2D3748; margin-bottom: 15px;">Hello ${firstName},</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for reaching out to TIC GLOBAL Ltd. We have successfully received your message regarding "<strong>${subject}</strong>" and our team will review it promptly.
            </p>
            <p style="color: #666; line-height: 1.6;">
              We typically respond to inquiries within 24-48 hours during business days. If your matter is urgent, please don't hesitate to contact us directly at <a href="mailto:contact@ticgloballtd.com" style="color: #14c3cb; text-decoration: none;">contact@ticgloballtd.com</a>.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2D3748; margin-bottom: 15px;">Your Message Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2D3748; width: 100px;">Subject:</td>
                <td style="padding: 8px 0; color: #666;">${subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2D3748;">Submitted:</td>
                <td style="padding: 8px 0; color: #666;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #666; margin-bottom: 15px;">
              <strong>TIC GLOBAL Ltd.</strong><br>
              Naga world samdech techo hun Sen park<br>
              Phnom Penh 120101, Cambodia
            </p>
            <p style="color: #999; font-size: 14px; margin: 0;">
              This is an automated response. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

        // Send both emails
        await Promise.all([
          transporter.sendMail(companyEmailContent),
          transporter.sendMail(autoReplyContent),
        ]);

        return NextResponse.json(
          {
            message: 'Message sent successfully via email',
            emailSent: true
          },
          { status: 200 }
        );

      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // If email fails, still return success but indicate email issue
        return NextResponse.json(
          {
            message: 'Message received and logged. Email delivery failed but your message has been saved.',
            emailSent: false,
            logged: true
          },
          { status: 200 }
        );
      }
    } else {
      // Email not configured - just log the submission
      return NextResponse.json(
        {
          message: 'Message received and logged successfully. Email configuration needed for automatic delivery.',
          emailSent: false,
          note: 'Contact form submission has been logged. Please check server logs or configure email settings.'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Contact form error:', error);

    // If email fails, still log the submission
    console.log('=== EMAIL FAILED - SUBMISSION LOGGED ===');
    console.log('Error:', error);
    console.log('========================================');

    return NextResponse.json(
      {
        error: 'Email delivery failed, but your message has been logged. Please try again later or contact us directly.',
        logged: true
      },
      { status: 500 }
    );
  }
}
