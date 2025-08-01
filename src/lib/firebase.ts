import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { auth };

export interface PhoneVerificationResult {
  success: boolean;
  verificationId?: string;
  error?: string;
}

export interface PhoneVerificationConfirmResult {
  success: boolean;
  error?: string;
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  console.log('🔥 Firebase Configuration Check:', {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
    isConfigured
  });

  return isConfigured;
}

/**
 * Initialize reCAPTCHA verifier for phone authentication
 * This should be called on the client side only
 */
export function initializeRecaptcha(containerId: string): RecaptchaVerifier | null {
  try {
    console.log('🔥 Initializing reCAPTCHA for container:', containerId);

    if (typeof window === 'undefined') {
      console.warn('❌ RecaptchaVerifier can only be initialized on the client side');
      return null;
    }

    // Clear any existing reCAPTCHA
    const existingRecaptcha = (window as any).recaptchaVerifier;
    if (existingRecaptcha) {
      console.log('🔄 Clearing existing reCAPTCHA');
      existingRecaptcha.clear();
    }

    console.log('🔥 Creating new RecaptchaVerifier with auth:', auth);
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response: any) => {
        console.log('✅ reCAPTCHA solved:', response);
      },
      'expired-callback': () => {
        console.log('⏰ reCAPTCHA expired');
      },
      // Force production mode for real SMS delivery
      'hl': 'en'
    });

    (window as any).recaptchaVerifier = recaptchaVerifier;
    console.log('✅ reCAPTCHA initialized successfully');
    return recaptchaVerifier;
  } catch (error) {
    console.error('❌ Error initializing reCAPTCHA:', error);
    return null;
  }
}

/**
 * Send SMS verification code using Firebase Auth
 */
export async function sendFirebasePhoneVerification(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<PhoneVerificationResult> {
  try {
    console.log('🔥 Starting Firebase phone verification for:', phoneNumber);

    if (!isFirebaseConfigured()) {
      console.error('❌ Firebase is not configured');
      return {
        success: false,
        error: 'Firebase is not configured. Please set up Firebase credentials.'
      };
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      console.error('❌ Invalid phone number format:', phoneNumber);
      return {
        success: false,
        error: 'Phone number must include country code (e.g., +1234567890)'
      };
    }

    console.log('🔥 Calling signInWithPhoneNumber with:', { phoneNumber, auth, recaptchaVerifier });
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);

    console.log('✅ SMS sent successfully via Firebase. Verification ID:', confirmationResult.verificationId);

    return {
      success: true,
      verificationId: confirmationResult.verificationId
    };

  } catch (error: any) {
    console.error('❌ Error sending SMS via Firebase:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);

    let errorMessage = 'Failed to send verification code';

    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMessage = 'SMS quota exceeded. Please try again later.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'reCAPTCHA verification failed. Please try again.';
    } else if (error.code === 'auth/invalid-app-credential') {
      errorMessage = 'Invalid Firebase configuration. Please check your credentials.';
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
 * Verify the SMS code using Firebase Auth
 */
export async function verifyFirebasePhoneCode(
  verificationId: string,
  verificationCode: string
): Promise<PhoneVerificationConfirmResult> {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const result = await signInWithCredential(auth, credential);
    
    console.log('Phone number verified successfully via Firebase');
    
    // Sign out immediately as we only want to verify the phone number
    await auth.signOut();
    
    return {
      success: true
    };

  } catch (error: any) {
    console.error('Error verifying phone code via Firebase:', error);
    
    let errorMessage = 'Invalid verification code';
    
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'Verification code has expired';
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
 * Clean up reCAPTCHA verifier
 */
export function cleanupRecaptcha(): void {
  try {
    const recaptchaVerifier = (window as any).recaptchaVerifier;
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      (window as any).recaptchaVerifier = null;
    }
  } catch (error) {
    console.error('Error cleaning up reCAPTCHA:', error);
  }
}

export default app;
