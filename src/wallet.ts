import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { getPolkadotSigner, type PolkadotSigner } from 'polkadot-api/signer';
import * as fs from 'fs';
import * as path from 'path';
import type { WalletConfig } from './types.js';

const WALLET_DIR = '.wallet';
const MNEMONIC_FILE = path.join(WALLET_DIR, 'mnemonic.txt');

// Re-export PolkadotSigner type from PAPI for convenience
export type { PolkadotSigner };

/**
 * Load or generate mnemonic from wallet file
 */
function loadOrGenerateMnemonic(): string {
  // Check if mnemonic file exists
  if (fs.existsSync(MNEMONIC_FILE)) {
    const mnemonic = fs.readFileSync(MNEMONIC_FILE, 'utf-8').trim();
    console.log('✓ Loaded existing wallet from', MNEMONIC_FILE);
    return mnemonic;
  }

  // Generate new mnemonic
  const mnemonic = mnemonicGenerate(12);

  // Create wallet directory if it doesn't exist
  if (!fs.existsSync(WALLET_DIR)) {
    fs.mkdirSync(WALLET_DIR, { mode: 0o700 }); // rwx------
  }

  // Write mnemonic to file with restricted permissions
  fs.writeFileSync(MNEMONIC_FILE, mnemonic, { mode: 0o600 }); // rw-------

  console.warn('⚠️  NEW WALLET CREATED');
  console.warn(`Mnemonic saved to: ${MNEMONIC_FILE}`);
  console.warn('⚠️  BACKUP THIS MNEMONIC - IT CANNOT BE RECOVERED IF LOST');
  console.warn('');

  return mnemonic;
}

/**
 * Create a signer from wallet file (auto-generates if needed)
 */
export async function createSigner(config?: WalletConfig): Promise<PolkadotSigner> {
  // Wait for crypto to be ready
  await cryptoWaitReady();

  // Load or generate mnemonic from file
  const mnemonic = loadOrGenerateMnemonic();

  const keyring = new Keyring({ type: 'sr25519' });

  // Use mnemonic with default derivation path
  const derivationPath = '//0';
  const keypair = keyring.addFromUri(`${mnemonic}${derivationPath}`);

  // Use getPolkadotSigner helper to create properly formatted signer
  return getPolkadotSigner(
    keypair.publicKey,
    'Sr25519',
    (input: Uint8Array) => keypair.sign(input)
  );
}

/**
 * Get the SS58 address for a signer
 */
export function getSignerAddress(signer: PolkadotSigner, ss58Format: number = 42): string {
  const keyring = new Keyring({ type: 'sr25519', ss58Format });
  return keyring.encodeAddress(signer.publicKey, ss58Format);
}
