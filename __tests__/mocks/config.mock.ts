import type { Config } from '../../src/types.js';

/**
 * Mock configuration for testing
 */
export const mockConfig: Config = {
  networks: {
    polkadot_assethub: {
      name: 'Polkadot AssetHub',
      rpc_servers: ['wss://polkadot-asset-hub-rpc.polkadot.io'],
      native_token: {
        symbol: 'DOT',
        decimals: 10,
      },
      supported_currencies: [
        {
          ticker: 'DOT',
          decimals: 10,
          location: 'native',
        },
        {
          ticker: 'USDT',
          decimals: 6,
          location: {
            parents: 0,
            interior: {
              X2: [
                { PalletInstance: 50 },
                { GeneralIndex: 1984 },
              ],
            },
          },
        },
      ],
    },
    kusama_assethub: {
      name: 'Kusama AssetHub',
      rpc_servers: ['wss://kusama-asset-hub-rpc.polkadot.io'],
      native_token: {
        symbol: 'KSM',
        decimals: 12,
      },
      supported_currencies: [
        {
          ticker: 'KSM',
          decimals: 12,
          location: 'native',
        },
        {
          ticker: 'USDT',
          decimals: 6,
          location: {
            parents: 0,
            interior: {
              X2: [
                { PalletInstance: 50 },
                { GeneralIndex: 1984 },
              ],
            },
          },
        },
      ],
    },
    hydration: {
      name: 'Hydration',
      rpc_servers: ['wss://rpc.hydradx.cloud'],
      native_token: {
        symbol: 'HDX',
        decimals: 12,
      },
      supported_currencies: [
        {
          ticker: 'HDX',
          decimals: 12,
          location: 'native',
        },
        {
          ticker: 'DOT',
          decimals: 10,
          location: {
            parents: 1,
            interior: {
              Here: null,
            },
          },
        },
        {
          ticker: 'USDT',
          decimals: 6,
          location: {
            parents: 1,
            interior: {
              X3: [
                { Parachain: 1000 },
                { PalletInstance: 50 },
                { GeneralIndex: 1984 },
              ],
            },
          },
        },
      ],
    },
  },
  default_token_networks: {
    DOT: 'polkadot_assethub',
    KSM: 'kusama_assethub',
    USDT: 'polkadot_assethub',
    HDX: 'hydration',
  },
  wallet: {
    type: 'mnemonic',
    mnemonic: 'test test test test test test test test test test test junk',
    derivation_path: '//0',
  },
};

/**
 * Create a minimal test config
 */
export function createTestConfig(overrides?: Partial<Config>): Config {
  return {
    ...mockConfig,
    ...overrides,
  };
}
