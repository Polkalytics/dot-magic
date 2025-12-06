/**
 * Mock PAPI client for testing
 */
import { jest } from '@jest/globals';

export interface MockTransaction {
  txHash: string;
  ok: boolean;
  events?: any[];
  dispatchError?: any;
  block?: any;
}

export interface MockTransactionBuilder {
  sign: any;
  signAndSubmit: any;
  signSubmitAndWatch: any;
  getEstimatedFees: any;
}

/**
 * Create a mock transaction builder
 */
export function createMockTransaction(result: MockTransaction): MockTransactionBuilder {
  return {
    sign: jest.fn<() => Promise<string>>().mockResolvedValue(`0x${result.txHash}`),
    signAndSubmit: jest.fn<() => Promise<MockTransaction>>().mockResolvedValue(result),
    signSubmitAndWatch: jest.fn<() => any>().mockReturnValue({
      subscribe: jest.fn((callbacks: any) => {
        setTimeout(() => {
          callbacks.next({ type: 'signed', txHash: result.txHash });
          callbacks.next({ type: 'broadcasted' });
          callbacks.next({ type: 'finalized', ok: result.ok });
        }, 0);
      }),
    }),
    getEstimatedFees: jest.fn<() => Promise<bigint>>().mockResolvedValue(1000000n),
  };
}

/**
 * Mock TypedAPI
 */
export function createMockTypedApi() {
  return {
    tx: {
      Balances: {
        transfer_keep_alive: jest.fn<(params: any) => MockTransactionBuilder>((params: any) =>
          createMockTransaction({
            txHash: 'mock-tx-hash-balances',
            ok: true,
          })
        ),
      },
      Assets: {
        transfer_keep_alive: jest.fn<(params: any) => MockTransactionBuilder>((params: any) =>
          createMockTransaction({
            txHash: 'mock-tx-hash-assets',
            ok: true,
          })
        ),
      },
      Router: {
        sell: jest.fn<(params: any) => MockTransactionBuilder>((params: any) =>
          createMockTransaction({
            txHash: 'mock-tx-hash-router-sell',
            ok: true,
          })
        ),
        buy: jest.fn<(params: any) => MockTransactionBuilder>((params: any) =>
          createMockTransaction({
            txHash: 'mock-tx-hash-router-buy',
            ok: true,
          })
        ),
      },
    },
    query: {
      System: {
        Account: jest.fn<() => Promise<any>>().mockResolvedValue({
          data: {
            free: 1000000000000n,
          },
        }),
      },
    },
    apis: {
      // Runtime APIs for price calculations
      HydrationApi: {
        get_spot_price: jest.fn<() => Promise<bigint>>().mockResolvedValue(100000000n),
      },
    },
  };
}

/**
 * Mock PAPI client
 */
export function createMockClient() {
  const typedApi = createMockTypedApi();

  return {
    getTypedApi: jest.fn<() => any>().mockReturnValue(typedApi),
    destroy: jest.fn<() => void>(),
    finalized$: {
      subscribe: jest.fn<() => void>(),
    },
    best$: {
      subscribe: jest.fn<() => void>(),
    },
    compatibilityToken: Promise.resolve('mock-compat-token'),
    _typedApi: typedApi, // For direct access in tests
  };
}

/**
 * Mock Smoldot chain
 */
export function createMockSmoldotChain() {
  return {
    sendJsonRpc: jest.fn<() => Promise<string>>().mockResolvedValue('{}'),
    remove: jest.fn<() => void>(),
  };
}

/**
 * Mock Smoldot instance
 */
export function createMockSmoldot() {
  return {
    addChain: jest.fn<() => Promise<any>>().mockResolvedValue(createMockSmoldotChain()),
    terminate: jest.fn<() => void>(),
  };
}

/**
 * Mock signer that implements PolkadotSigner interface
 */
export function createMockSigner(address: string = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY') {
  return {
    publicKey: new Uint8Array(32).fill(1),
    sign: jest.fn<() => Promise<Uint8Array>>().mockResolvedValue(new Uint8Array(64).fill(2)),
    getAddress: jest.fn<() => string>().mockReturnValue(address),
  };
}
