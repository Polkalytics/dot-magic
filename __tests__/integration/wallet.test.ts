import { createSigner, getSignerAddress } from '../../src/wallet.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Wallet Module', () => {
  const WALLET_DIR = '.wallet';
  const MNEMONIC_FILE = path.join(WALLET_DIR, 'mnemonic.txt');

  beforeEach(() => {
    // Clean up wallet directory before each test
    if (fs.existsSync(WALLET_DIR)) {
      fs.rmSync(WALLET_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up wallet directory after each test
    if (fs.existsSync(WALLET_DIR)) {
      fs.rmSync(WALLET_DIR, { recursive: true, force: true });
    }
  });

  describe('Auto-generated wallet', () => {
    test('should auto-generate wallet on first run', async () => {
      expect(fs.existsSync(MNEMONIC_FILE)).toBe(false);

      const signer = await createSigner();

      expect(signer).toBeDefined();
      expect(signer.publicKey).toBeDefined();
      expect(signer.signTx).toBeDefined();
      expect(signer.publicKey).toBeInstanceOf(Uint8Array);
      expect(signer.publicKey.length).toBe(32);

      // Wallet file should now exist
      expect(fs.existsSync(MNEMONIC_FILE)).toBe(true);
    });

    test('should create wallet directory with correct permissions', async () => {
      await createSigner();

      expect(fs.existsSync(WALLET_DIR)).toBe(true);

      const dirStats = fs.statSync(WALLET_DIR);
      const dirMode = dirStats.mode & 0o777;

      // Should be 0o700 (rwx------)
      expect(dirMode).toBe(0o700);
    });

    test('should create mnemonic file with correct permissions', async () => {
      await createSigner();

      expect(fs.existsSync(MNEMONIC_FILE)).toBe(true);

      const fileStats = fs.statSync(MNEMONIC_FILE);
      const fileMode = fileStats.mode & 0o777;

      // Should be 0o600 (rw-------)
      expect(fileMode).toBe(0o600);
    });

    test('should generate valid 12-word mnemonic', async () => {
      await createSigner();

      const mnemonic = fs.readFileSync(MNEMONIC_FILE, 'utf-8').trim();
      const words = mnemonic.split(' ');

      expect(words.length).toBe(12);
      // Each word should be non-empty
      words.forEach(word => {
        expect(word.length).toBeGreaterThan(0);
      });
    });

    test('should load existing wallet on subsequent runs', async () => {
      // First run: generate wallet
      const signer1 = await createSigner();

      // Second run: should load same wallet
      const signer2 = await createSigner();

      // Should have the same public key
      expect(signer1.publicKey).toEqual(signer2.publicKey);
    });

    test('should generate different wallets for different test runs', async () => {
      // First wallet
      const signer1 = await createSigner();
      const key1 = signer1.publicKey;

      // Clean up and generate new wallet
      fs.rmSync(WALLET_DIR, { recursive: true, force: true });

      const signer2 = await createSigner();
      const key2 = signer2.publicKey;

      // Different wallets should have different keys
      expect(key1).not.toEqual(key2);
    });
  });

  describe('getSignerAddress', () => {
    test('should return SS58 address for signer', async () => {
      const signer = await createSigner();
      const address = getSignerAddress(signer);

      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(40); // SS58 addresses are typically 47-48 characters
    });

    test('should return different addresses for different SS58 formats', async () => {
      const signer = await createSigner();

      const addressGeneric = getSignerAddress(signer, 42); // Generic Substrate
      const addressPolkadot = getSignerAddress(signer, 0);  // Polkadot
      const addressKusama = getSignerAddress(signer, 2);    // Kusama

      expect(addressGeneric).toBeDefined();
      expect(addressPolkadot).toBeDefined();
      expect(addressKusama).toBeDefined();

      // Same key, different formats = different addresses
      expect(addressGeneric).not.toEqual(addressPolkadot);
      expect(addressPolkadot).not.toEqual(addressKusama);
    });

    test('should return consistent address for same signer', async () => {
      const signer = await createSigner();

      const address1 = getSignerAddress(signer, 42);
      const address2 = getSignerAddress(signer, 42);

      expect(address1).toEqual(address2);
    });
  });

  describe('Signer functionality', () => {
    test('should be able to sign data', async () => {
      const signer = await createSigner();

      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const signedExtensions = {};
      const metadata = new Uint8Array([]);
      const atBlockNumber = 1000;

      const signature = await signer.signTx(testData, signedExtensions, metadata, atBlockNumber);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should produce different signatures for different data', async () => {
      const signer = await createSigner();

      const testData1 = new Uint8Array([1, 2, 3]);
      const testData2 = new Uint8Array([4, 5, 6]);
      const signedExtensions = {};
      const metadata = new Uint8Array([]);
      const atBlockNumber = 1000;

      const signature1 = await signer.signTx(testData1, signedExtensions, metadata, atBlockNumber);
      const signature2 = await signer.signTx(testData2, signedExtensions, metadata, atBlockNumber);

      // Different data should produce different signatures
      expect(signature1).not.toEqual(signature2);
    });

    test('should sign with extensions', async () => {
      const signer = await createSigner();

      const testData = new Uint8Array([1, 2, 3]);
      const signedExtensions = {
        ext1: {
          identifier: 'ext1',
          value: new Uint8Array([10, 20]),
          additionalSigned: new Uint8Array([]),
        },
        ext2: {
          identifier: 'ext2',
          value: new Uint8Array([30, 40]),
          additionalSigned: new Uint8Array([]),
        },
      };
      const metadata = new Uint8Array([]);
      const atBlockNumber = 1000;

      const signature = await signer.signTx(testData, signedExtensions, metadata, atBlockNumber);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('Persistence', () => {
    test('should persist wallet across multiple signers', async () => {
      const signer1 = await createSigner();
      const address1 = getSignerAddress(signer1);

      // Create another signer (should load same wallet)
      const signer2 = await createSigner();
      const address2 = getSignerAddress(signer2);

      expect(address1).toEqual(address2);
    });

    test('should maintain mnemonic file integrity', async () => {
      await createSigner();

      const mnemonicContent = fs.readFileSync(MNEMONIC_FILE, 'utf-8').trim();

      // Should be a valid mnemonic (12 words, lowercase, spaces)
      expect(mnemonicContent).toMatch(/^([a-z]+\s){11}[a-z]+$/);
    });
  });
});
