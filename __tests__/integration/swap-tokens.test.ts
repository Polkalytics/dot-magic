import { HydrationHandler } from '../../src/handlers/hydration.js';
import { createMockClient, createMockSigner } from '../mocks/papi-client.mock.js';
import { mockConfig } from '../mocks/config.mock.js';

describe('swap_tokens - Hydration', () => {
  let handler: HydrationHandler;
  let mockClient: any;
  let mockSigner: any;

  beforeEach(() => {
    mockClient = createMockClient();
    mockSigner = createMockSigner();
    handler = new HydrationHandler(
      'hydration',
      mockConfig.networks.hydration,
      mockConfig,
      { mockClient, mockSigner }
    );
  });

  afterEach(async () => {
    await handler.cleanup();
  });

  describe('Sell (amount_in specified)', () => {
    test('should swap DOT for HDX with sell', async () => {
      const result = await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'HDX',
        amountIn: '10', // 10 DOT
        slippage: 1.0, // 1%
      });

      expect(result.ok).toBe(true);
      expect(result.txHash).toBe('mock-tx-hash-router-sell');
      expect(result.amountIn).toBe('10');
      expect(result.amountOut).toBeDefined();

      // Verify the Router.sell was called
      expect(mockClient._typedApi.tx.Router.sell).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_in: 5, // DOT asset ID
          asset_out: 0, // HDX asset ID
          amount_in: 100000000000n, // 10 DOT with 10 decimals
          min_amount_out: expect.any(BigInt), // Min amount based on slippage
          route: [],
        })
      );
    });

    test('should apply default slippage of 0.5%', async () => {
      await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'USDT',
        amountIn: '100',
        // No slippage specified
      });

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];

      // With 100 DOT and 0.5% slippage, min_amount_out should be 99.5% of amount_in
      // amount_in = 100 * 10^10 = 1000000000000
      // min_amount_out = 1000000000000 - (1000000000000 * 50 / 10000) = 995000000000
      const expectedMin = 1000000000000n - (1000000000000n * 50n / 10000n);
      expect(callArgs.min_amount_out).toBe(expectedMin);
    });

    test('should apply custom slippage correctly', async () => {
      await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'USDT',
        amountIn: '50',
        slippage: 2.5, // 2.5%
      });

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];

      // With 50 DOT and 2.5% slippage
      // amount_in = 50 * 10^10 = 500000000000
      // min_amount_out = 500000000000 - (500000000000 * 250 / 10000) = 487500000000
      const expectedMin = 500000000000n - (500000000000n * 250n / 10000n);
      expect(callArgs.min_amount_out).toBe(expectedMin);
    });

    test('should reject slippage > 10%', async () => {
      await expect(
        handler.swap({
          tokenIn: 'DOT',
          tokenOut: 'HDX',
          amountIn: '10',
          slippage: 11, // Invalid
        })
      ).rejects.toThrow('Slippage must be between 0% and 10%');
    });

    test('should reject negative slippage', async () => {
      await expect(
        handler.swap({
          tokenIn: 'DOT',
          tokenOut: 'HDX',
          amountIn: '10',
          slippage: -1, // Invalid
        })
      ).rejects.toThrow('Slippage must be between 0% and 10%');
    });

    test('should handle HDX to DOT swap', async () => {
      const result = await handler.swap({
        tokenIn: 'HDX',
        tokenOut: 'DOT',
        amountIn: '1000', // 1000 HDX
        slippage: 0.5,
      });

      expect(result.ok).toBe(true);

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];
      expect(callArgs.asset_in).toBe(0); // HDX
      expect(callArgs.asset_out).toBe(5); // DOT
      expect(callArgs.amount_in).toBe(1000000000000000n); // 1000 HDX with 12 decimals
    });

    test('should handle decimal amounts correctly', async () => {
      await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'USDT',
        amountIn: '1.5', // 1.5 DOT
        slippage: 1.0,
      });

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];
      expect(callArgs.amount_in).toBe(15000000000n); // 1.5 with 10 decimals
    });
  });

  describe('Buy (amount_out specified)', () => {
    test('should swap DOT for HDX with buy', async () => {
      const result = await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'HDX',
        amountOut: '1000', // Want exactly 1000 HDX
        slippage: 1.0,
      });

      expect(result.ok).toBe(true);
      expect(result.txHash).toBe('mock-tx-hash-router-buy');
      expect(result.amountOut).toBe('1000');
      expect(result.amountIn).toBeDefined();

      // Verify the Router.buy was called
      expect(mockClient._typedApi.tx.Router.buy).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_in: 5, // DOT
          asset_out: 0, // HDX
          amount_out: 1000000000000000n, // 1000 HDX with 12 decimals
          max_amount_in: expect.any(BigInt), // Max amount based on slippage
          route: [],
        })
      );
    });

    test('should apply slippage to max_amount_in correctly', async () => {
      await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'HDX',
        amountOut: '100', // Want 100 HDX
        slippage: 2.0, // 2%
      });

      const callArgs = mockClient._typedApi.tx.Router.buy.mock.calls[0][0];

      // With 100 HDX and 2% slippage
      // amount_out = 100 * 10^12 = 100000000000000
      // max_amount_in = 100000000000000 + (100000000000000 * 200 / 10000) = 102000000000000
      const expectedMax = 100000000000000n + (100000000000000n * 200n / 10000n);
      expect(callArgs.max_amount_in).toBe(expectedMax);
    });
  });

  describe('Validation', () => {
    test('should require either amountIn or amountOut', async () => {
      await expect(
        handler.swap({
          tokenIn: 'DOT',
          tokenOut: 'HDX',
          // Neither amountIn nor amountOut specified
        })
      ).rejects.toThrow('Either amountIn or amountOut must be specified');
    });

    test('should reject both amountIn and amountOut', async () => {
      await expect(
        handler.swap({
          tokenIn: 'DOT',
          tokenOut: 'HDX',
          amountIn: '10',
          amountOut: '1000', // Both specified - invalid
        })
      ).rejects.toThrow('Only one of amountIn or amountOut should be specified');
    });

    test('should reject unsupported tokenIn', async () => {
      await expect(
        handler.swap({
          tokenIn: 'BTC', // Not supported
          tokenOut: 'HDX',
          amountIn: '1',
        })
      ).rejects.toThrow('Token BTC not supported on Hydration');
    });

    test('should reject unsupported tokenOut', async () => {
      await expect(
        handler.swap({
          tokenIn: 'DOT',
          tokenOut: 'ETH', // Not supported
          amountIn: '1',
        })
      ).rejects.toThrow('Token ETH not supported on Hydration');
    });

    test('should require wallet configuration', async () => {
      const noWalletConfig = {
        ...mockConfig,
        wallet: undefined,
      };

      const handlerNoWallet = new HydrationHandler(
        'hydration',
        mockConfig.networks.hydration,
        noWalletConfig,
        { mockClient } // No mock signer
      );

      await expect(
        handlerNoWallet.swap({
          tokenIn: 'DOT',
          tokenOut: 'HDX',
          amountIn: '10',
        })
      ).rejects.toThrow('Wallet configuration is required');

      await handlerNoWallet.cleanup();
    });
  });

  describe('Asset ID Mapping', () => {
    test('should map HDX as asset 0', async () => {
      await handler.swap({
        tokenIn: 'HDX',
        tokenOut: 'DOT',
        amountIn: '100',
      });

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];
      expect(callArgs.asset_in).toBe(0);
    });

    test('should map DOT correctly', async () => {
      await handler.swap({
        tokenIn: 'DOT',
        tokenOut: 'HDX',
        amountIn: '10',
      });

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];
      expect(callArgs.asset_in).toBe(5); // DOT is asset ID 5 on Hydration
    });

    test('should map USDT correctly', async () => {
      await handler.swap({
        tokenIn: 'USDT',
        tokenOut: 'HDX',
        amountIn: '100',
      });

      const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];
      expect(callArgs.asset_in).toBe(10); // USDT is asset ID 10
    });
  });

  describe('Send Native HDX', () => {
    test('should send native HDX tokens', async () => {
      const currency = mockConfig.networks.hydration.supported_currencies.find(
        c => c.ticker === 'HDX'
      )!;

      const result = await handler.sendTokens({
        to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        currency,
        amount: 1000n * 10n ** 12n, // 1000 HDX
      });

      expect(result.ok).toBe(true);
      expect(mockClient._typedApi.tx.Balances.transfer_keep_alive).toHaveBeenCalled();
    });

    test('should reject sending non-HDX tokens', async () => {
      const currency = mockConfig.networks.hydration.supported_currencies.find(
        c => c.ticker === 'DOT'
      )!;

      await expect(
        handler.sendTokens({
          to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          currency,
          amount: 1000000000n,
        })
      ).rejects.toThrow('Only native HDX transfers are currently supported');
    });
  });
});
