import { createClient } from 'polkadot-api';
import { BaseNetworkHandler, type HandlerOptions } from './base.js';
import type { Currency, Config, Network } from '../types.js';
import { createSigner } from '../wallet.js';
import { createRpcProvider, hasWellKnownChainSpec, getWellKnownChainId } from '../chain-provider.js';
import { dot_ah, ksm_ah, wnd_ah, pas_ah } from '@polkadot-api/descriptors';

/**
 * Handler for AssetHub chains (Polkadot, Kusama, Westend, Paseo)
 * AssetHub uses the Balances pallet for native token transfers
 * and Assets pallet for other tokens
 */
export class AssetHubHandler extends BaseNetworkHandler {
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

  /**
   * Get the typed descriptor for this AssetHub chain
   */
  private getTypedDescriptor() {
    const wellKnownId = getWellKnownChainId(this.networkName);

    switch (wellKnownId) {
      case 'polkadot_asset_hub':
        return dot_ah;
      case 'ksmcc3_asset_hub':
        return ksm_ah;
      case 'westend2_asset_hub':
        return wnd_ah;
      case 'paseo_asset_hub':
        return pas_ah;
      default:
        throw new Error(`No typed descriptor available for ${this.networkName}`);
    }
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

    // Check if this is a well-known chain
    if (!hasWellKnownChainSpec(this.networkName)) {
      throw new Error(
        `Network '${this.networkName}' is not a well-known chain. ` +
        `Only well-known AssetHub chains are currently supported.`
      );
    }

    // Use RPC provider with failover
    console.log(`Connecting to ${this.networkName} via RPC...`);
    const rpcProvider = createRpcProvider(
      this.network.rpc_servers,
      (url, error) => {
        console.error(`RPC error from ${url}:`, error.message);
        console.log(`Failing over to next RPC endpoint...`);
      }
    );

    // Create client with RPC provider
    this.client = createClient(rpcProvider);

    // Use typed descriptor for this specific AssetHub chain
    const descriptor = this.getTypedDescriptor();
    this.api = this.client.getTypedApi(descriptor);
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

    const { to, currency, amount } = params;

    // For native tokens, use Balances.transfer_keep_alive
    if (currency.location === 'native') {
      return this.sendNativeToken(to, amount);
    }

    // For asset tokens, use Assets.transfer_keep_alive
    return this.sendAssetToken(to, currency, amount);
  }

  private async sendNativeToken(to: string, amount: bigint): Promise<{ txHash: string; ok: boolean }> {
    if (!this.api) {
      throw new Error('API not initialized');
    }

    // Create the transfer transaction
    const tx = this.api.tx.Balances.transfer_keep_alive({
      dest: { type: 'Id', value: to }, // MultiAddress::Id
      value: amount,
    });

    // Sign and submit
    const result = await tx.signAndSubmit(this.signer);

    return {
      txHash: result.txHash,
      ok: result.ok,
    };
  }

  private async sendAssetToken(
    to: string,
    currency: Currency,
    amount: bigint
  ): Promise<{ txHash: string; ok: boolean }> {
    if (!this.api) {
      throw new Error('API not initialized');
    }

    // Extract asset ID from the location
    const assetId = this.extractAssetId(currency);

    // Create the asset transfer transaction
    const tx = this.api.tx.Assets.transfer_keep_alive({
      id: assetId,
      target: { type: 'Id', value: to }, // MultiAddress::Id
      amount: amount,
    });

    // Sign and submit
    const result = await tx.signAndSubmit(this.signer);

    return {
      txHash: result.txHash,
      ok: result.ok,
    };
  }

  /**
   * Extract asset ID from XCM location
   */
  private extractAssetId(currency: Currency): number {
    if (typeof currency.location !== 'object') {
      throw new Error('Invalid asset location format');
    }

    const interior = currency.location.interior;

    // Parse X2 interior: [PalletInstance, GeneralIndex]
    if ('X2' in interior && Array.isArray(interior.X2)) {
      const generalIndex = interior.X2.find((item: any) => 'GeneralIndex' in item);
      if (generalIndex && typeof generalIndex.GeneralIndex === 'number') {
        return generalIndex.GeneralIndex;
      }
    }

    throw new Error(`Could not extract asset ID from location for ${currency.ticker}`);
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
