import { resolveNetwork, findCurrency } from '../../src/config.js';
import { mockConfig } from '../mocks/config.mock.js';

describe('Config Module', () => {
  describe('resolveNetwork', () => {
    test('should use explicit network when provided', () => {
      const network = resolveNetwork(mockConfig, 'DOT', 'kusama_assethub');
      expect(network).toBe('kusama_assethub');
    });

    test('should use default network when not specified', () => {
      const network = resolveNetwork(mockConfig, 'DOT');
      expect(network).toBe('polkadot_assethub');
    });

    test('should resolve KSM to kusama_assethub', () => {
      const network = resolveNetwork(mockConfig, 'KSM');
      expect(network).toBe('kusama_assethub');
    });

    test('should resolve HDX to hydration', () => {
      const network = resolveNetwork(mockConfig, 'HDX');
      expect(network).toBe('hydration');
    });

    test('should throw error for non-existent network', () => {
      expect(() => {
        resolveNetwork(mockConfig, 'DOT', 'non_existent_network');
      }).toThrow("Network 'non_existent_network' not found in configuration");
    });

    test('should throw error for token without default network', () => {
      expect(() => {
        resolveNetwork(mockConfig, 'UNKNOWN_TOKEN');
      }).toThrow("No default network found for token 'UNKNOWN_TOKEN'");
    });

    test('should throw error for invalid default network', () => {
      const badConfig = {
        ...mockConfig,
        default_token_networks: {
          ...mockConfig.default_token_networks,
          BAD: 'non_existent_network',
        },
      };

      expect(() => {
        resolveNetwork(badConfig, 'BAD');
      }).toThrow(
        "Default network 'non_existent_network' for token 'BAD' not found in configuration"
      );
    });
  });

  describe('findCurrency', () => {
    test('should find DOT on polkadot_assethub', () => {
      const currency = findCurrency(mockConfig, 'polkadot_assethub', 'DOT');
      expect(currency.ticker).toBe('DOT');
      expect(currency.decimals).toBe(10);
      expect(currency.location).toBe('native');
    });

    test('should find USDT on polkadot_assethub', () => {
      const currency = findCurrency(mockConfig, 'polkadot_assethub', 'USDT');
      expect(currency.ticker).toBe('USDT');
      expect(currency.decimals).toBe(6);
      expect(currency.location).toEqual({
        parents: 0,
        interior: {
          X2: [
            { PalletInstance: 50 },
            { GeneralIndex: 1984 },
          ],
        },
      });
    });

    test('should find KSM on kusama_assethub', () => {
      const currency = findCurrency(mockConfig, 'kusama_assethub', 'KSM');
      expect(currency.ticker).toBe('KSM');
      expect(currency.decimals).toBe(12);
      expect(currency.location).toBe('native');
    });

    test('should find HDX on hydration', () => {
      const currency = findCurrency(mockConfig, 'hydration', 'HDX');
      expect(currency.ticker).toBe('HDX');
      expect(currency.decimals).toBe(12);
      expect(currency.location).toBe('native');
    });

    test('should throw error for non-existent network', () => {
      expect(() => {
        findCurrency(mockConfig, 'non_existent_network', 'DOT');
      }).toThrow("Network 'non_existent_network' not found");
    });

    test('should throw error for unsupported currency on network', () => {
      expect(() => {
        findCurrency(mockConfig, 'polkadot_assethub', 'BTC');
      }).toThrow("Currency 'BTC' not supported on network 'polkadot_assethub'");
    });

    test('should find same token on different networks', () => {
      const usdtPolkadot = findCurrency(mockConfig, 'polkadot_assethub', 'USDT');
      const usdtKusama = findCurrency(mockConfig, 'kusama_assethub', 'USDT');

      expect(usdtPolkadot.ticker).toBe('USDT');
      expect(usdtKusama.ticker).toBe('USDT');
      // Both should have the same structure but may differ in details
      expect(usdtPolkadot.decimals).toBe(6);
      expect(usdtKusama.decimals).toBe(6);
    });
  });

  describe('Integration: resolveNetwork + findCurrency', () => {
    test('should resolve and find currency for DOT', () => {
      const network = resolveNetwork(mockConfig, 'DOT');
      const currency = findCurrency(mockConfig, network, 'DOT');

      expect(network).toBe('polkadot_assethub');
      expect(currency.ticker).toBe('DOT');
      expect(currency.decimals).toBe(10);
    });

    test('should resolve and find currency for KSM', () => {
      const network = resolveNetwork(mockConfig, 'KSM');
      const currency = findCurrency(mockConfig, network, 'KSM');

      expect(network).toBe('kusama_assethub');
      expect(currency.ticker).toBe('KSM');
      expect(currency.decimals).toBe(12);
    });

    test('should allow override network for USDT', () => {
      // Default is polkadot_assethub
      const defaultNetwork = resolveNetwork(mockConfig, 'USDT');
      expect(defaultNetwork).toBe('polkadot_assethub');

      // Can override to kusama_assethub
      const overrideNetwork = resolveNetwork(mockConfig, 'USDT', 'kusama_assethub');
      expect(overrideNetwork).toBe('kusama_assethub');

      // Both should have USDT
      const currency1 = findCurrency(mockConfig, defaultNetwork, 'USDT');
      const currency2 = findCurrency(mockConfig, overrideNetwork, 'USDT');

      expect(currency1.ticker).toBe('USDT');
      expect(currency2.ticker).toBe('USDT');
    });
  });
});
