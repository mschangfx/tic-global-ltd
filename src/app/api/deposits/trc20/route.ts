import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';

// TRC20 specific configuration
const TRC20_CONFIG = {
  network: 'TRC20',
  name: 'TRON Network',
  symbol: 'USDT',
  address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
  explorer: 'https://tronscan.org/#/address/',
  qrPrefix: 'tron:', // For wallet app compatibility
  validation: {
    pattern: /^T[A-Za-z1-9]{33}$/,
    length: 34
  }
};

// GET - Generate QR code for TRC20 deposit address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || TRC20_CONFIG.address;
    const amount = searchParams.get('amount');
    const size = parseInt(searchParams.get('size') || '300');
    const format = searchParams.get('format') || 'png';
    const includeAmount = searchParams.get('includeAmount') === 'true';

    // Validate TRC20 address format
    if (!TRC20_CONFIG.validation.pattern.test(address)) {
      return NextResponse.json(
        { error: 'Invalid TRC20 address format' },
        { status: 400 }
      );
    }

    // Create QR code content
    let qrContent = address;
    
    // For wallet app compatibility, use TRON URI scheme
    if (includeAmount && amount) {
      const amountValue = parseFloat(amount);
      if (!isNaN(amountValue) && amountValue > 0) {
        qrContent = `${TRC20_CONFIG.qrPrefix}${address}?amount=${amountValue}&token=USDT`;
      }
    } else {
      qrContent = `${TRC20_CONFIG.qrPrefix}${address}`;
    }

    // QR code generation options
    const options = {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const,
      type: format === 'svg' ? 'svg' as const : 'png' as const
    };

    if (format === 'svg') {
      // Generate SVG QR code
      const qrCodeSVG = await QRCode.toString(qrContent, {
        ...options,
        type: 'svg'
      });

      return new NextResponse(qrCodeSVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
          'X-QR-Content': qrContent,
          'X-Network': TRC20_CONFIG.network
        }
      });
    } else {
      // Generate PNG QR code (default)
      const qrCodeBuffer = await QRCode.toBuffer(qrContent, {
        ...options,
        type: 'png'
      });

      return new NextResponse(qrCodeBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'X-QR-Content': qrContent,
          'X-Network': TRC20_CONFIG.network
        }
      });
    }

  } catch (error) {
    console.error('Error generating TRC20 QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

// POST - Generate QR code with custom parameters and return data URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      address = TRC20_CONFIG.address,
      amount,
      size = 300,
      format = 'dataurl',
      includeAmount = false,
      customLabel,
      userEmail
    } = body;

    // Validate TRC20 address
    if (!TRC20_CONFIG.validation.pattern.test(address)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid TRC20 address format',
          expectedFormat: 'T + 33 alphanumeric characters'
        },
        { status: 400 }
      );
    }

    // Validate amount if provided
    let validAmount = null;
    if (amount) {
      validAmount = parseFloat(amount);
      if (isNaN(validAmount) || validAmount <= 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid amount. Must be a positive number'
          },
          { status: 400 }
        );
      }
    }

    // Create QR content with TRON URI scheme for wallet compatibility
    let qrContent = address;
    if (includeAmount && validAmount) {
      qrContent = `${TRC20_CONFIG.qrPrefix}${address}?amount=${validAmount}&token=USDT`;
    } else {
      qrContent = `${TRC20_CONFIG.qrPrefix}${address}`;
    }

    // QR code options
    const options = {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const
    };

    let qrResult;
    
    if (format === 'dataurl') {
      // Generate data URL for embedding
      qrResult = await QRCode.toDataURL(qrContent, {
        ...options,
        type: 'image/png'
      });
    } else if (format === 'svg') {
      // Generate SVG string
      qrResult = await QRCode.toString(qrContent, {
        ...options,
        type: 'svg'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unsupported format. Use "dataurl" or "svg"'
        },
        { status: 400 }
      );
    }

    // Log QR generation for analytics (optional)
    if (userEmail) {
      try {
        const supabase = createClient();
        await supabase
          .from('qr_generations')
          .insert({
            user_email: userEmail,
            network: TRC20_CONFIG.network,
            address: address,
            amount: validAmount,
            qr_content: qrContent,
            format: format,
            size: size,
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log QR generation:', logError);
        // Don't fail the main request if logging fails
      }
    }

    return NextResponse.json({
      success: true,
      qrCode: qrResult,
      format: format,
      network: TRC20_CONFIG.network,
      address: address,
      amount: validAmount,
      qrContent: qrContent,
      metadata: {
        size: size,
        errorCorrectionLevel: 'M',
        timestamp: new Date().toISOString(),
        explorerUrl: `${TRC20_CONFIG.explorer}${address}`
      }
    });

  } catch (error) {
    console.error('Error generating TRC20 QR code:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate QR code'
      },
      { status: 500 }
    );
  }
}

// PUT - Validate TRC20 address and return address info
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Address is required'
        },
        { status: 400 }
      );
    }

    // Validate TRC20 address format
    const isValid = TRC20_CONFIG.validation.pattern.test(address);

    return NextResponse.json({
      valid: isValid,
      address: address,
      network: TRC20_CONFIG.network,
      networkName: TRC20_CONFIG.name,
      symbol: TRC20_CONFIG.symbol,
      explorerUrl: isValid ? `${TRC20_CONFIG.explorer}${address}` : null,
      message: isValid 
        ? `Valid ${TRC20_CONFIG.name} address` 
        : `Invalid ${TRC20_CONFIG.name} address format`,
      expectedFormat: 'T + 33 alphanumeric characters',
      examples: [
        'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ',
        'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
      ]
    });

  } catch (error) {
    console.error('Error validating TRC20 address:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
