import { AssetHubHandler } from '../../src/handlers/assethub.js';
import { createMockClient, createMockSigner } from '../mocks/papi-client.mock.js';
import { mockConfig } from '../mocks/config.mock.js';

describe('send_tokens - Asset Tokens', () => {
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

  test('should send USDT tokens successfully', async () => {
    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 100n * 10n ** 6n; // 100 USDT (6 decimals)

    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'USDT'
    )!;

    const result = await handler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);
    expect(result.txHash).toBe('mock-tx-hash-assets');

    // Verify the correct transaction method was called
    expect(mockClient._typedApi.tx.Assets.transfer_keep_alive).toHaveBeenCalledWith({
      id: 1984, // Asset ID from the location
      target: { type: 'Id', value: toAddress },
      amount: amount,
    });

    // Verify signAndSubmit was called
    const tx = mockClient._typedApi.tx.Assets.transfer_keep_alive.mock.results[0].value;
    expect(tx.signAndSubmit).toHaveBeenCalledWith(mockSigner);
  });

  test('should extract asset ID correctly from XCM location', async () => {
    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'USDT'
    )!;

    // The extractAssetId method is private, but we can test it indirectly
    // by sending tokens and checking the params passed to the API
    await handler.sendTokens({
      to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      currency,
      amount: 1000000n,
    });

    const callArgs = mockClient._typedApi.tx.Assets.transfer_keep_alive.mock.calls[0][0];
    expect(callArgs.id).toBe(1984);
  });

  test('should handle USDT with correct decimals', async () => {
    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 12345678n; // 12.345678 USDT in smallest units

    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'USDT'
    )!;

    const result = await handler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);

    const callArgs = mockClient._typedApi.tx.Assets.transfer_keep_alive.mock.calls[0][0];
    expect(callArgs.amount).toBe(amount);
  });

  test('should send USDT on Kusama AssetHub', async () => {
    const ksmHandler = new AssetHubHandler(
      'kusama_assethub',
      mockConfig.networks.kusama_assethub,
      mockConfig,
      { mockClient, mockSigner }
    );

    const toAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const amount = 50n * 10n ** 6n; // 50 USDT

    const currency = mockConfig.networks.kusama_assethub.supported_currencies.find(
      c => c.ticker === 'USDT'
    )!;

    const result = await ksmHandler.sendTokens({
      to: toAddress,
      currency,
      amount,
    });

    expect(result.ok).toBe(true);

    await ksmHandler.cleanup();
  });

  test('should reject asset with invalid location format', async () => {
    const invalidCurrency = {
      ticker: 'INVALID',
      decimals: 6,
      location: 'native', // Wrong - should be object for assets
    };

    // This should use Balances instead of Assets, so it won't fail
    // Let's test with a malformed object instead
    const malformedCurrency = {
      ticker: 'INVALID',
      decimals: 6,
      location: {
        parents: 0,
        interior: {
          X1: [{ PalletInstance: 50 }], // Missing GeneralIndex
        },
      },
    };

    await expect(
      handler.sendTokens({
        to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        currency: malformedCurrency as any,
        amount: 1000000n,
      })
    ).rejects.toThrow('Could not extract asset ID');
  });

  test('should handle multiple transactions without re-initialization', async () => {
    const currency = mockConfig.networks.polkadot_assethub.supported_currencies.find(
      c => c.ticker === 'USDT'
    )!;

    // Make multiple calls
    const result1 = await handler.sendTokens({
      to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      currency,
      amount: 1000000n,
    });

    const result2 = await handler.sendTokens({
      to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      currency,
      amount: 2000000n,
    });

    // Both transactions should succeed
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    // Transactions should have been called twice
    expect(mockClient._typedApi.tx.Assets.transfer_keep_alive).toHaveBeenCalledTimes(2);
  });
});
