import { AssetHubHandler } from '../../src/handlers/assethub.js';
import { createMockClient, createMockSigner } from '../mocks/papi-client.mock.js';
import { mockConfig } from '../mocks/config.mock.js';

describe('send_tokens - Native Tokens', () => {
  let handler: AssetHubHandler;
  let mockClient: any;
  let mockSigner: any;

  beforeEach(() => {
    mockClient = createMockClient();
    mockSigner = createMockSigner();
    handler = new AssetHubHandler(
      'polkadot_assethub',
      mockConfig.networks.polkadot_assethub,
      mockConfig,
      { mockClient, mockSigner }
    );
  });

  afterEach(async () => {
    await handler.cleanup();
  });

  test('should send native DOT tokens successfully', async () => {
    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 15n * 10n ** 10n; // 1.5 DOT (10 decimals)

    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'DOT'
    )!;

    const result = await handler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);
    expect(result.txHash).toBe('mock-tx-hash-balances');

    // Verify the correct transaction method was called
    expect(mockClient._typedApi.tx.Balances.transfer_keep_alive).toHaveBeenCalledWith({
      dest: { type: 'Id', value: toAddress },
      value: amount,
    });

    // Verify signAndSubmit was called
    const tx = mockClient._typedApi.tx.Balances.transfer_keep_alive.mock.results[0].value;
    expect(tx.signAndSubmit).toHaveBeenCalledWith(mockSigner);
  });

  test('should send native KSM tokens successfully', async () => {
    const ksmHandler = new AssetHubHandler(
      'kusama_assethub',
      mockConfig.networks.kusama_assethub,
      mockConfig,
      { mockClient, mockSigner }
    );

    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 1n * 10n ** 12n; // 1 KSM (12 decimals)

    const currency = mockConfig.networks.kusama_assethub.supported_currencies.find(
      c => c.ticker === 'KSM'
    )!;

    const result = await ksmHandler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);
    expect(result.txHash).toBeDefined();

    await ksmHandler.cleanup();
  });

  test('should reject if wallet is not configured and no mock signer', async () => {
    const noWalletConfig = {
      ...mockConfig,
      wallet: undefined,
    };

    const handlerNoWallet = new AssetHubHandler(
      'polkadot_assethub',
      mockConfig.networks.polkadot_assethub,
      noWalletConfig,
      { mockClient } // No mock signer
    );

    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'DOT'
    )!;

    await expect(
      handlerNoWallet.sendTokens({
        to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        currency,
        amount: 1000000n,
      })
    ).rejects.toThrow('Wallet configuration is required');

    await handlerNoWallet.cleanup();
  });

  test('should handle very small amounts', async () => {
    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 1n; // 1 planck (smallest unit)

    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'DOT'
    )!;

    const result = await handler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);
  });

  test('should handle very large amounts', async () => {
    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 1000000n * 10n ** 10n; // 1M DOT

    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'DOT'
    )!;

    const result = await handler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);
  });
});
