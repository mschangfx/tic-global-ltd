import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const size = parseInt(searchParams.get('size') || '200');
    const format = searchParams.get('format') || 'png';

    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    // Generate QR code options
    const options = {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const
    };

    if (format === 'svg') {
      // Generate SVG QR code
      const qrCodeSVG = await QRCode.toString(text, {
        ...options,
        type: 'svg'
      });

      return new NextResponse(qrCodeSVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } else {
      // Generate PNG QR code (default)
      const qrCodeBuffer = await QRCode.toBuffer(text, {
        ...options,
        type: 'png'
      });

      return new NextResponse(qrCodeBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, size = 200, format = 'dataurl' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    // Generate QR code options
    const options = {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const
    };

    if (format === 'dataurl') {
      // Generate data URL for embedding in HTML
      const qrCodeDataURL = await QRCode.toDataURL(text, {
        ...options,
        type: 'image/png'
      });

      return NextResponse.json({
        success: true,
        qrCode: qrCodeDataURL,
        format: 'dataurl'
      });
    } else if (format === 'svg') {
      // Generate SVG string
      const qrCodeSVG = await QRCode.toString(text, {
        ...options,
        type: 'svg'
      });

      return NextResponse.json({
        success: true,
        qrCode: qrCodeSVG,
        format: 'svg'
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use "dataurl" or "svg"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
