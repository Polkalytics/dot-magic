import type { NetworkHandler, Network, Currency, Config } from '../types.js';

export interface HandlerOptions {
  mockClient?: any;
  mockSigner?: any;
}

/**
 * Base class for network handlers
 */
export abstract class BaseNetworkHandler implements NetworkHandler {
  protected options?: HandlerOptions;

  constructor(
    protected networkName: string,
    protected network: Network,
    protected config: Config,
    options?: HandlerOptions
  ) {
    this.options = options;
  }

  abstract sendTokens(params: {
    to: string;
    currency: Currency;
    amount: bigint;
  }): Promise<{ txHash: string; ok: boolean }>;

  /**
   * Get the first available RPC server
   */
  protected getRpcUrl(): string {
    return this.network.rpc_servers[0];
  }

  /**
   * Parse amount with decimals to bigint
   */
  protected parseAmount(amount: string, decimals: number): bigint {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + paddedFraction);
  }

  /**
   * Format bigint amount to string with decimals
   */
  protected formatAmount(amount: bigint, decimals: number): string {
    const str = amount.toString().padStart(decimals + 1, '0');
    const whole = str.slice(0, -decimals) || '0';
    const fraction = str.slice(-decimals);
    return `${whole}.${fraction}`.replace(/\.?0+$/, '');
  }
}
