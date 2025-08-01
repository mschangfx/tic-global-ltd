import { NextRequest, NextResponse } from 'next/server';

// Server-side fee data (since BlockchainFeeService is client-side only)
const getServerSideFeeData = () => {
  return {
    ethereum: {
      network: 'ethereum',
      gasPrice: '25 gwei',
      estimatedFee: '0.00525 ETH',
      processingTime: '3-8 minutes',
      feeInUSD: '13.13',
      lastUpdated: new Date()
    },
    bsc: {
      network: 'bsc',
      gasPrice: '3 gwei',
      estimatedFee: '0.000063 BNB',
      processingTime: '2-4 minutes',
      feeInUSD: '0.02',
      lastUpdated: new Date()
    },
    tron: {
      network: 'tron',
      gasPrice: 'N/A',
      estimatedFee: '10 TRX',
      processingTime: '1-3 minutes',
      feeInUSD: '0.80',
      lastUpdated: new Date()
    }
  };
};

// Server-side withdrawal fee calculation
const calculateWithdrawalFee = (amount: number, networkFee: string, networkSymbol: string) => {
  const gasFeeRate = 0.10; // 10% gas fee
  const gasFee = amount * gasFeeRate;

  // Convert network fee to USD for calculation
  const rates: Record<string, number> = {
    'ETH': 2500,
    'BNB': 300,
    'TRX': 0.08,
    'USDT': 1.0
  };

  const rate = rates[networkSymbol] || 1;
  const networkFeeNum = parseFloat(networkFee) * rate;

  const totalFee = gasFee + networkFeeNum;
  const netAmount = amount - totalFee;

  return {
    gasFee,
    networkFee: networkFeeNum,
    totalFee,
    netAmount: Math.max(0, netAmount)
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network');
    const action = searchParams.get('action') || 'all';

    const feeData = getServerSideFeeData();

    switch (action) {
      case 'all':
        // Get fees for all networks
        const allFees = Object.values(feeData);
        return NextResponse.json({
          success: true,
          fees: allFees
        });

      case 'network':
        // Get fees for specific network
        if (!network) {
          return NextResponse.json({
            success: false,
            error: 'Network parameter is required'
          }, { status: 400 });
        }

        const networkFee = feeData[network.toLowerCase() as keyof typeof feeData];
        if (!networkFee) {
          return NextResponse.json({
            success: false,
            error: `Unsupported network: ${network}`
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          fee: networkFee
        });

      case 'withdrawal-fee':
        // Calculate withdrawal fee with 10% gas fee
        const amount = parseFloat(searchParams.get('amount') || '0');
        const feeNetwork = searchParams.get('network') || 'tron';

        if (amount <= 0) {
          return NextResponse.json({
            success: false,
            error: 'Valid amount is required'
          }, { status: 400 });
        }

        const networkFeeData = feeData[feeNetwork.toLowerCase() as keyof typeof feeData];
        if (!networkFeeData) {
          return NextResponse.json({
            success: false,
            error: `Unsupported network: ${feeNetwork}`
          }, { status: 400 });
        }

        // Extract numeric value from fee string (e.g., "0.0063 ETH" -> "0.0063")
        const feeValue = networkFeeData.estimatedFee.split(' ')[0];
        const feeSymbol = networkFeeData.estimatedFee.split(' ')[1] || 'USD';

        const withdrawalFee = calculateWithdrawalFee(
          amount,
          feeValue,
          feeSymbol
        );

        return NextResponse.json({
          success: true,
          withdrawal: {
            originalAmount: amount,
            gasFee: withdrawalFee.gasFee,
            networkFee: withdrawalFee.networkFee,
            totalFee: withdrawalFee.totalFee,
            netAmount: withdrawalFee.netAmount,
            feeBreakdown: {
              gasFeePercentage: '10%',
              gasFeeAmount: withdrawalFee.gasFee,
              networkFeeAmount: withdrawalFee.networkFee,
              networkFeeString: networkFeeData.estimatedFee
            },
            network: feeNetwork,
            processingTime: networkFeeData.processingTime
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in blockchain fees API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, network, amount } = body;

    const feeData = getServerSideFeeData();

    switch (action) {
      case 'calculate-withdrawal':
        if (!amount || amount <= 0) {
          return NextResponse.json({
            success: false,
            error: 'Valid amount is required'
          }, { status: 400 });
        }

        const targetNetwork = network || 'tron';
        const networkFeeData = feeData[targetNetwork.toLowerCase() as keyof typeof feeData];

        if (!networkFeeData) {
          return NextResponse.json({
            success: false,
            error: `Unsupported network: ${targetNetwork}`
          }, { status: 400 });
        }

        // Extract numeric value from fee string
        const feeValue = networkFeeData.estimatedFee.split(' ')[0];
        const feeSymbol = networkFeeData.estimatedFee.split(' ')[1] || 'USD';

        const withdrawalCalculation = calculateWithdrawalFee(
          amount,
          feeValue,
          feeSymbol
        );

        return NextResponse.json({
          success: true,
          calculation: {
            originalAmount: amount,
            gasFee: withdrawalCalculation.gasFee,
            networkFee: withdrawalCalculation.networkFee,
            totalFee: withdrawalCalculation.totalFee,
            netAmount: withdrawalCalculation.netAmount,
            breakdown: {
              gasFeeRate: '10%',
              gasFeeDescription: '10% platform gas fee',
              networkFeeDescription: `Network fee: ${networkFeeData.estimatedFee}`,
              processingTime: networkFeeData.processingTime
            },
            network: targetNetwork,
            timestamp: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in blockchain fees POST API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
