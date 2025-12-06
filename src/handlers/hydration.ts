import { createClient } from 'polkadot-api';
import { start } from '@polkadot-api/smoldot';
import { BaseNetworkHandler, type HandlerOptions } from './base.js';
import type { Currency, SwapParams, SwapResult, Config, Network } from '../types.js';
import { createSigner } from '../wallet.js';
import { createRpcProvider } from '../chain-provider.js';

/**
 * Handler for Hydration network
 * Hydration uses the Router pallet for swaps and Balances for native transfers
 */
export class HydrationHandler extends BaseNetworkHandler {
  private client: any = null;
  private api: any = null;
  private signer: any = null;

  constructor(
    networkName: string,
    network: Network,
    config: Config,
    options?: HandlerOptions
  ) {
    super(networkName, network, config, options);
  }

  async initialize() {
    // Use mock client if provided (for testing)
    if (this.options?.mockClient) {
      this.client = this.options.mockClient;
      this.api = this.client._typedApi || this.client.getTypedApi();
      this.signer = this.options.mockSigner;
      return;
    }

    // Real initialization
    if (this.client) return;

    // Create signer from auto-generated wallet
    this.signer = await createSigner();

    // Hydration is not in well-known chains, so we use RPC provider with failover
    // The chain spec would need to be fetched or bundled separately
    // For now, we create a client with RPC failover
    const rpcProvider = createRpcProvider(
      this.network.rpc_servers,
      (url, error) => {
        console.error(`RPC error from ${url}:`, error.message);
        console.log(`Failing over to next RPC endpoint...`);
      }
    );

    this.client = createClient(rpcProvider);
    this.api = this.client.getTypedApi(); // Will need typed descriptors from `papi add`
  }

  async sendTokens(params: {
    to: string;
    currency: Currency;
    amount: bigint;
  }): Promise<{ txHash: string; ok: boolean }> {
    await this.initialize();

    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    // For Hydration, we support native HDX transfers
    if (params.currency.ticker === this.network.native_token.symbol) {
      return this.sendNativeToken(params.to, params.amount);
    }

    throw new Error('Only native HDX transfers are currently supported on Hydration');
  }

  /**
   * Perform a token swap on Hydration
   */
  async swap(params: SwapParams): Promise<SwapResult> {
    await this.initialize();

    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    // Validate slippage
    const slippage = params.slippage ?? 0.5;
    if (slippage < 0 || slippage > 10) {
      throw new Error('Slippage must be between 0% and 10%');
    }

    // Validate that either amountIn or amountOut is specified
    if (!params.amountIn && !params.amountOut) {
      throw new Error('Either amountIn or amountOut must be specified');
    }
    if (params.amountIn && params.amountOut) {
      throw new Error('Only one of amountIn or amountOut should be specified');
    }

    // Get currency configurations
    const tokenInCurrency = this.network.supported_currencies.find(
      c => c.ticker === params.tokenIn
    );
    const tokenOutCurrency = this.network.supported_currencies.find(
      c => c.ticker === params.tokenOut
    );

    if (!tokenInCurrency) {
      throw new Error(`Token ${params.tokenIn} not supported on Hydration`);
    }
    if (!tokenOutCurrency) {
      throw new Error(`Token ${params.tokenOut} not supported on Hydration`);
    }

    // Get asset IDs from locations
    const assetInId = this.getAssetId(tokenInCurrency);
    const assetOutId = this.getAssetId(tokenOutCurrency);

    // Use Router.sell or Router.buy depending on whether amountIn or amountOut is specified
    if (params.amountIn) {
      return this.sell(assetInId, assetOutId, params.amountIn, slippage, tokenInCurrency.decimals);
    } else {
      return this.buy(assetInId, assetOutId, params.amountOut!, slippage, tokenOutCurrency.decimals);
    }
  }

  private async sell(
    assetIn: number,
    assetOut: number,
    amountIn: string,
    slippage: number,
    decimals: number
  ): Promise<SwapResult> {
    if (!this.api) {
      throw new Error('API not initialized');
    }

    // Parse amount
    const amount = this.parseAmount(amountIn, decimals);

    // Calculate minimum amount out based on slippage
    // In production, query the pool for expected output first
    const expectedOut = amount; // Simplified: 1:1 for now
    const slippageBps = Math.floor(slippage * 100); // Convert to basis points
    const minAmountOut = expectedOut - (expectedOut * BigInt(slippageBps) / 10000n);

    // Create the sell transaction
    const tx = this.api.tx.Router.sell({
      asset_in: assetIn,
      asset_out: assetOut,
      amount_in: amount,
      min_amount_out: minAmountOut,
      route: [], // Auto-route
    });

    // Sign and submit
    const result = await tx.signAndSubmit(this.signer);

    return {
      txHash: result.txHash,
      ok: result.ok,
      amountIn: amountIn,
      // TODO: Extract actual amountOut from events
      amountOut: this.formatAmount(minAmountOut, decimals),
    };
  }

  private async buy(
    assetIn: number,
    assetOut: number,
    amountOut: string,
    slippage: number,
    decimals: number
  ): Promise<SwapResult> {
    if (!this.api) {
      throw new Error('API not initialized');
    }

    // Parse amount
    const amount = this.parseAmount(amountOut, decimals);

    // Calculate maximum amount in based on slippage
    const expectedIn = amount; // Simplified: 1:1 for now
    const slippageBps = Math.floor(slippage * 100);
    const maxAmountIn = expectedIn + (expectedIn * BigInt(slippageBps) / 10000n);

    // Create the buy transaction
    const tx = this.api.tx.Router.buy({
      asset_in: assetIn,
      asset_out: assetOut,
      amount_out: amount,
      max_amount_in: maxAmountIn,
      route: [], // Auto-route
    });

    // Sign and submit
    const result = await tx.signAndSubmit(this.signer);

    return {
      txHash: result.txHash,
      ok: result.ok,
      amountOut: amountOut,
      // TODO: Extract actual amountIn from events
      amountIn: this.formatAmount(maxAmountIn, decimals),
    };
  }

  /**
   * Get Hydration asset ID from currency configuration
   */
  private getAssetId(currency: Currency): number {
    if (currency.location === 'native') {
      return 0; // HDX is asset ID 0
    }

    // Map well-known assets
    // In production, this should be more comprehensive
    const assetMap: Record<string, number> = {
      'DOT': 5,
      'USDT': 10,
      'USDC': 21,
    };

    if (currency.ticker in assetMap) {
      return assetMap[currency.ticker];
    }

    throw new Error(`Unknown asset ID for ${currency.ticker} on Hydration`);
  }

  private async sendNativeToken(to: string, amount: bigint): Promise<{ txHash: string; ok: boolean }> {
    if (!this.api) {
      throw new Error('API not initialized');
    }

    const tx = this.api.tx.Balances.transfer_keep_alive({
      dest: { type: 'Id', value: to },
      value: amount,
    });

    const result = await tx.signAndSubmit(this.signer);

    return {
      txHash: result.txHash,
      ok: result.ok,
    };
  }


  async cleanup() {
    if (this.client && !this.options?.mockClient) {
      this.client.destroy();
    }
    this.client = null;
    this.api = null;
    this.signer = null;
  }
}
