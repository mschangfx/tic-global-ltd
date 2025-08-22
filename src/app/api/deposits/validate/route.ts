import { NextRequest, NextResponse } from 'next/server';

// Validation rules for different networks - BEP20 and TRC20 only
const NETWORK_VALIDATION = {
  TRC20: {
    addressPattern: /^T[A-Za-z1-9]{33}$/,
    name: 'TRON (TRC20)',
    examples: ['TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ', 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE']
  },
  BEP20: {
    addressPattern: /^0x[a-fA-F0-9]{40}$/,
    name: 'Binance Smart Chain (BEP20)',
    examples: ['0x233824f4b3fae83f59841369c59490a1750658b1']
  }
};

// GET - Validate deposit address format
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const network = searchParams.get('network');

    if (!address) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Address parameter is required' 
        },
        { status: 400 }
      );
    }

    if (!network) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Network parameter is required' 
        },
        { status: 400 }
      );
    }

    const networkValidation = NETWORK_VALIDATION[network as keyof typeof NETWORK_VALIDATION];
    if (!networkValidation) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Unsupported network',
          supportedNetworks: Object.keys(NETWORK_VALIDATION)
        },
        { status: 400 }
      );
    }

    // Validate address format
    const isValid = networkValidation.addressPattern.test(address);

    return NextResponse.json({
      valid: isValid,
      address: address,
      network: network,
      networkName: networkValidation.name,
      message: isValid 
        ? `Valid ${networkValidation.name} address` 
        : `Invalid ${networkValidation.name} address format`,
      examples: networkValidation.examples
    });

  } catch (error) {
    console.error('Error validating address:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// POST - Validate deposit transaction details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, network, amount, methodId } = body;

    const validationResults = {
      address: { valid: false, message: '' },
      network: { valid: false, message: '' },
      amount: { valid: false, message: '' },
      overall: { valid: false, message: '' }
    };

    // Validate address
    if (!address) {
      validationResults.address = { valid: false, message: 'Address is required' };
    } else {
      const networkValidation = NETWORK_VALIDATION[network as keyof typeof NETWORK_VALIDATION];
      if (!networkValidation) {
        validationResults.address = { valid: false, message: 'Unsupported network' };
      } else {
        const isValidAddress = networkValidation.addressPattern.test(address);
        validationResults.address = {
          valid: isValidAddress,
          message: isValidAddress 
            ? `Valid ${networkValidation.name} address` 
            : `Invalid ${networkValidation.name} address format`
        };
      }
    }

    // Validate network
    if (!network) {
      validationResults.network = { valid: false, message: 'Network is required' };
    } else if (!NETWORK_VALIDATION[network as keyof typeof NETWORK_VALIDATION]) {
      validationResults.network = { 
        valid: false, 
        message: `Unsupported network. Supported: ${Object.keys(NETWORK_VALIDATION).join(', ')}` 
      };
    } else {
      validationResults.network = { valid: true, message: 'Network is supported' };
    }

    // Validate amount
    if (!amount) {
      validationResults.amount = { valid: false, message: 'Amount is required' };
    } else {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        validationResults.amount = { valid: false, message: 'Amount must be a positive number' };
      } else if (numAmount < 1) {
        validationResults.amount = { valid: false, message: 'Minimum deposit amount is $1' };
      } else if (numAmount > 1000000) {
        validationResults.amount = { valid: false, message: 'Maximum deposit amount is $1,000,000' };
      } else {
        validationResults.amount = { valid: true, message: 'Amount is valid' };
      }
    }

    // Overall validation
    const allValid = validationResults.address.valid && 
                    validationResults.network.valid && 
                    validationResults.amount.valid;

    validationResults.overall = {
      valid: allValid,
      message: allValid 
        ? 'All validation checks passed' 
        : 'Some validation checks failed'
    };

    return NextResponse.json({
      success: true,
      validation: validationResults,
      canProceed: allValid,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating deposit details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PUT - Check transaction status on blockchain (future implementation)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionHash, network } = body;

    if (!transactionHash || !network) {
      return NextResponse.json(
        { error: 'Transaction hash and network are required' },
        { status: 400 }
      );
    }

    // This would integrate with blockchain APIs to check transaction status
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      transaction: {
        hash: transactionHash,
        network: network,
        status: 'pending', // pending, confirmed, failed
        confirmations: 0,
        blockNumber: null,
        timestamp: null
      },
      message: 'Blockchain integration not yet implemented'
    });

  } catch (error) {
    console.error('Error checking transaction status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
