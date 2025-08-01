import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          isValid: false, 
          message: 'Invalid email format' 
        },
        { status: 200 }
      );
    }

    // Extract domain from email
    const domain = email.split('@')[1].toLowerCase();

    // Check for common disposable/temporary email domains
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
      'throwaway.email',
      'getnada.com',
      'maildrop.cc',
      'sharklasers.com'
    ];

    if (disposableDomains.includes(domain)) {
      return NextResponse.json(
        { 
          isValid: false, 
          message: 'Temporary or disposable email addresses are not allowed' 
        },
        { status: 200 }
      );
    }

    // Check for common valid email providers
    const validProviders = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'live.com',
      'msn.com',
      'aol.com',
      'icloud.com',
      'me.com',
      'mac.com',
      'protonmail.com',
      'zoho.com',
      'yandex.com',
      'mail.ru',
      'qq.com',
      '163.com',
      '126.com',
      'sina.com',
      'sohu.com',
      'naver.com',
      'daum.net',
      'hanmail.net'
    ];

    // Enhanced format validation and basic checks
    try {
      // Check for common valid email providers
      const validProviders = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'live.com',
        'msn.com',
        'aol.com',
        'icloud.com',
        'me.com',
        'mac.com',
        'protonmail.com',
        'zoho.com',
        'yandex.com',
        'mail.ru',
        'qq.com',
        '163.com',
        '126.com',
        'sina.com',
        'sohu.com',
        'naver.com',
        'daum.net',
        'hanmail.net'
      ];

      const isKnownProvider = validProviders.includes(domain);
      const isDomainValid = validateDomainFormat(domain);

      if (isKnownProvider) {
        return NextResponse.json(
          {
            isValid: true,
            message: 'Valid email address ✓'
          },
          { status: 200 }
        );
      } else if (isDomainValid) {
        return NextResponse.json(
          {
            isValid: true,
            message: 'Valid email format ✓'
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            isValid: false,
            message: 'Please enter a valid email address'
          },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('Email validation error:', error);

      return NextResponse.json(
        {
          isValid: false,
          message: 'Email validation failed. Please try again.'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Email verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple domain format validation
function validateDomainFormat(domain: string): boolean {
  try {
    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  } catch (error) {
    return false;
  }
}

/*
EMAIL VALIDATION APPROACH:

This system uses format validation and trusted provider checking.
For real email existence verification, paid services would be required.

Current validation includes:
- Proper email format (user@domain.com)
- Domain format validation
- Known email provider recognition
- Disposable email blocking

This is the standard approach used by most websites.
*/
