import twilio from 'twilio';
import { isFirebaseConfigured } from './firebase';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface SMSResult {
  success: boolean;
  messageId?: string;
  verificationId?: string; // For Firebase
  error?: string;
  method?: 'firebase' | 'twilio' | 'development';
}

/**
 * Send SMS using Twilio
 * @param to - Phone number to send SMS to (with country code)
 * @param message - Message content to send
 * @returns Promise<SMSResult>
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  try {
    // Validate environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment variables.');
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    // Send SMS via Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log(`SMS sent successfully to ${to}. Message SID: ${twilioMessage.sid}`);

    return {
      success: true,
      messageId: twilioMessage.sid
    };

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    
    // Handle specific Twilio errors
    let errorMessage = 'Failed to send SMS';
    
    if (error.code === 21211) {
      errorMessage = 'Invalid phone number format';
    } else if (error.code === 21408) {
      errorMessage = 'Permission denied to send SMS to this number';
    } else if (error.code === 21610) {
      errorMessage = 'Phone number is not verified for trial account';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send phone verification code via SMS
 * @param phoneNumber - Phone number to send verification code to
 * @param verificationCode - 6-digit verification code
 * @returns Promise<SMSResult>
 */
export async function sendPhoneVerificationCode(
  phoneNumber: string, 
  verificationCode: string
): Promise<SMSResult> {
  const message = `Your TIC GLOBAL verification code is: ${verificationCode}. This code will expire in 30 minutes. Do not share this code with anyone.`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Validate phone number format
 * @param phoneNumber - Phone number to validate
 * @returns boolean
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Remove all spaces and special characters except +
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check if it starts with + and has 10-15 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  
  return phoneRegex.test(cleanNumber);
}

/**
 * Format phone number for display
 * @param phoneNumber - Phone number to format
 * @returns string
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Check if we should use mock SMS (only when no real SMS service is configured)
 * @returns boolean
 */
export function isDevelopmentMode(): boolean {
  // Only use development mode if neither Firebase nor Twilio is configured
  return !isFirebaseConfigured() && !process.env.TWILIO_ACCOUNT_SID;
}

/**
 * Get the preferred SMS method based on configuration
 * @returns 'firebase' | 'twilio' | 'development'
 */
export function getPreferredSMSMethod(): 'firebase' | 'twilio' | 'development' {
  if (isDevelopmentMode()) {
    return 'development';
  }

  // Prefer Firebase over Twilio
  if (isFirebaseConfigured()) {
    return 'firebase';
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return 'twilio';
  }

  return 'development';
}

/**
 * Send SMS with Firebase primary, Twilio fallback, development mode as last resort
 * @param phoneNumber - Phone number to send SMS to
 * @param verificationCode - 6-digit verification code
 * @returns Promise<SMSResult & { devCode?: string }>
 */
export async function sendVerificationSMS(
  phoneNumber: string,
  verificationCode: string
): Promise<SMSResult & { devCode?: string }> {

  // Validate phone number format
  if (!isValidPhoneNumber(phoneNumber)) {
    return {
      success: false,
      error: 'Invalid phone number format. Please include country code (e.g., +1234567890)'
    };
  }

  // Format phone number
  const formattedNumber = formatPhoneNumber(phoneNumber);
  const method = getPreferredSMSMethod();

  switch (method) {
    case 'firebase':
      // Firebase will be handled on the client side
      return {
        success: true,
        method: 'firebase',
        messageId: `firebase_${Date.now()}`
      };

    case 'twilio':
      // Use Twilio for SMS
      const twilioResult = await sendPhoneVerificationCode(formattedNumber, verificationCode);
      return {
        ...twilioResult,
        method: 'twilio'
      };

    case 'development':
    default:
      // Development mode
      console.log(`📱 [DEV MODE] SMS to ${formattedNumber}: Your TIC GLOBAL verification code is: ${verificationCode}`);

      return {
        success: true,
        messageId: `dev_${Date.now()}`,
        method: 'development',
        devCode: verificationCode
      };
  }
}
