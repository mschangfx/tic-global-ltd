'use client';

export interface NetworkFeeData {
  network: string;
  gasPrice?: string;
  estimatedFee: string;
  processingTime: string;
  feeInUSD?: string;
  lastUpdated: Date;
}

export interface RealTimeFeeResponse {
  success: boolean;
  fees: NetworkFeeData[];
  error?: string;
}

class BlockchainFeeService {
  private static instance: BlockchainFeeService;
  private cache: Map<string, { data: NetworkFeeData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  static getInstance(): BlockchainFeeService {
    if (!BlockchainFeeService.instance) {
      BlockchainFeeService.instance = new BlockchainFeeService();
    }
    return BlockchainFeeService.instance;
  }

  // Get real-time fees for all supported networks
  async getRealTimeFees(): Promise<RealTimeFeeResponse> {
    try {
      const networks = ['ethereum', 'bsc', 'tron'];
      const fees: NetworkFeeData[] = [];

      for (const network of networks) {
        const feeData = await this.getNetworkFee(network);
        if (feeData) {
          fees.push(feeData);
        }
      }

      return {
        success: true,
        fees
      };
    } catch (error) {
      console.error('Error fetching real-time fees:', error);
      return {
        success: false,
        fees: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get fee data for a specific network
  async getNetworkFee(network: string): Promise<NetworkFeeData | null> {
    const cacheKey = `fee_${network}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      let feeData: NetworkFeeData;

      switch (network.toLowerCase()) {
        case 'ethereum':
          feeData = await this.getEthereumFees();
          break;
        case 'bsc':
          feeData = await this.getBSCFees();
          break;
        case 'tron':
          feeData = await this.getTronFees();
          break;
        default:
          return null;
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: feeData,
        timestamp: Date.now()
      });

      return feeData;
    } catch (error) {
      console.error(`Error fetching ${network} fees:`, error);
      return this.getFallbackFeeData(network);
    }
  }

  // Get Ethereum network fees
  private async getEthereumFees(): Promise<NetworkFeeData> {
    try {
      // For now, use reliable fallback data instead of external APIs
      // In production, you can add API keys and enable real API calls
      console.log('Using fallback Ethereum fees (external APIs disabled for stability)');
      return this.getFallbackFeeData('ethereum');
    } catch (error) {
      console.warn('Failed to fetch Ethereum fees, using fallback');
      return this.getFallbackFeeData('ethereum');
    }
  }

  // Get BSC network fees
  private async getBSCFees(): Promise<NetworkFeeData> {
    try {
      // For now, use reliable fallback data instead of external APIs
      console.log('Using fallback BSC fees (external APIs disabled for stability)');
      return this.getFallbackFeeData('bsc');
    } catch (error) {
      console.warn('Failed to fetch BSC fees, using fallback');
      return this.getFallbackFeeData('bsc');
    }
  }

  // Get Tron network fees
  private async getTronFees(): Promise<NetworkFeeData> {
    try {
      // For now, use reliable fallback data instead of external APIs
      console.log('Using fallback Tron fees (external APIs disabled for stability)');
      return this.getFallbackFeeData('tron');
    } catch (error) {
      console.warn('Failed to fetch Tron fees, using fallback');
      return this.getFallbackFeeData('tron');
    }
  }

  // Calculate Ethereum transaction fee
  private calculateEthereumFee(gasPriceGwei: string): string {
    const gasLimit = 21000; // Standard ETH transfer
    const gasPriceWei = parseFloat(gasPriceGwei) * 1e9;
    const feeWei = gasLimit * gasPriceWei;
    const feeEth = feeWei / 1e18;
    return feeEth.toFixed(6);
  }

  // Calculate BSC transaction fee
  private calculateBSCFee(gasPriceGwei: string): string {
    const gasLimit = 21000; // Standard BNB transfer
    const gasPriceWei = parseFloat(gasPriceGwei) * 1e9;
    const feeWei = gasLimit * gasPriceWei;
    const feeBnb = feeWei / 1e18;
    return feeBnb.toFixed(6);
  }

  // Get processing time based on gas price
  private getProcessingTime(gasPrice: string, network: string): string {
    const price = parseFloat(gasPrice);
    
    switch (network) {
      case 'ethereum':
        if (price < 20) return '10-20 minutes';
        if (price < 50) return '5-15 minutes';
        return '2-10 minutes';
      
      case 'bsc':
        if (price < 5) return '5-10 minutes';
        if (price < 10) return '3-5 minutes';
        return '1-3 minutes';
      
      default:
        return '5-15 minutes';
    }
  }

  // Convert amount to USD (simplified - in production use real-time rates)
  private async convertToUSD(amount: string, symbol: string): Promise<string> {
    const rates: Record<string, number> = {
      'ETH': 2500,
      'BNB': 300,
      'TRX': 0.08,
      'USDT': 1.0
    };

    const rate = rates[symbol] || 1;
    const usdValue = parseFloat(amount) * rate;
    return usdValue.toFixed(2);
  }

  // Fallback fee data when APIs are unavailable
  private getFallbackFeeData(network: string): NetworkFeeData {
    const fallbackData: Record<string, NetworkFeeData> = {
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

    return fallbackData[network] || fallbackData.tron;
  }

  // Calculate withdrawal fee with 10% gas fee
  calculateWithdrawalFee(amount: number, networkFee: string, networkSymbol: string): {
    gasFee: number;
    networkFee: number;
    totalFee: number;
    netAmount: number;
  } {
    const gasFeeRate = 0.10; // 10% gas fee
    const gasFee = amount * gasFeeRate;
    
    // Convert network fee to USD for calculation
    const networkFeeNum = parseFloat(networkFee) * this.getSymbolRate(networkSymbol);
    
    const totalFee = gasFee + networkFeeNum;
    const netAmount = amount - totalFee;

    return {
      gasFee,
      networkFee: networkFeeNum,
      totalFee,
      netAmount: Math.max(0, netAmount)
    };
  }

  private getSymbolRate(symbol: string): number {
    const rates: Record<string, number> = {
      'ETH': 2500,
      'BNB': 300,
      'TRX': 0.08,
      'USDT': 1.0
    };
    return rates[symbol] || 1;
  }
}

export default BlockchainFeeService;
