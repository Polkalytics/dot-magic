/**
 * Mock wallet and signer for testing
 */
import { jest } from '@jest/globals';

export interface MockWallet {
  address: string;
  publicKey: Uint8Array;
  sign: (data: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Create a mock wallet for testing
 */
export function createMockWallet(
  address: string = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
): MockWallet {
  return {
    address,
    publicKey: new Uint8Array(32).fill(1),
    sign: jest.fn<(data: Uint8Array) => Promise<Uint8Array>>().mockResolvedValue(new Uint8Array(64).fill(2)),
  };
}

/**
 * Mock wallet factory
 */
export const mockWalletFactory = {
  createFromMnemonic: jest.fn<(mnemonic: string, derivationPath?: string) => MockWallet>((mnemonic: string, derivationPath?: string) =>
    createMockWallet()
  ),
  createFromPrivateKey: jest.fn<(privateKey: string) => MockWallet>((privateKey: string) =>
    createMockWallet()
  ),
};
