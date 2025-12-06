import {
  getWellKnownChainId,
  hasWellKnownChainSpec,
  getSupportedWellKnownChains,
  loadChainSpec,
} from '../../src/chain-provider.js';

describe('Chain Provider', () => {
  describe('getWellKnownChainId', () => {
    test('should map polkadot_assethub to polkadot_asset_hub', () => {
      expect(getWellKnownChainId('polkadot_assethub')).toBe('polkadot_asset_hub');
    });

    test('should map kusama_assethub to ksmcc3_asset_hub', () => {
      expect(getWellKnownChainId('kusama_assethub')).toBe('ksmcc3_asset_hub');
    });

    test('should map westend_assethub to westend2_asset_hub', () => {
      expect(getWellKnownChainId('westend_assethub')).toBe('westend2_asset_hub');
    });

    test('should map paseo_assethub to paseo_asset_hub', () => {
      expect(getWellKnownChainId('paseo_assethub')).toBe('paseo_asset_hub');
    });

    test('should be case insensitive', () => {
      expect(getWellKnownChainId('POLKADOT_ASSETHUB')).toBe('polkadot_asset_hub');
      expect(getWellKnownChainId('Polkadot_AssetHub')).toBe('polkadot_asset_hub');
    });

    test('should return null for unknown chains', () => {
      expect(getWellKnownChainId('hydration')).toBeNull();
      expect(getWellKnownChainId('unknown_chain')).toBeNull();
    });

    test('should map relay chains', () => {
      expect(getWellKnownChainId('polkadot')).toBe('polkadot');
      expect(getWellKnownChainId('kusama')).toBe('ksmcc3');
      expect(getWellKnownChainId('westend')).toBe('westend2');
      expect(getWellKnownChainId('paseo')).toBe('paseo');
    });
  });

  describe('hasWellKnownChainSpec', () => {
    test('should return true for supported AssetHub chains', () => {
      expect(hasWellKnownChainSpec('polkadot_assethub')).toBe(true);
      expect(hasWellKnownChainSpec('kusama_assethub')).toBe(true);
      expect(hasWellKnownChainSpec('westend_assethub')).toBe(true);
      expect(hasWellKnownChainSpec('paseo_assethub')).toBe(true);
    });

    test('should return true for relay chains', () => {
      expect(hasWellKnownChainSpec('polkadot')).toBe(true);
      expect(hasWellKnownChainSpec('kusama')).toBe(true);
    });

    test('should return false for unsupported chains', () => {
      expect(hasWellKnownChainSpec('hydration')).toBe(false);
      expect(hasWellKnownChainSpec('acala')).toBe(false);
      expect(hasWellKnownChainSpec('moonbeam')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(hasWellKnownChainSpec('POLKADOT_ASSETHUB')).toBe(true);
      expect(hasWellKnownChainSpec('Kusama_AssetHub')).toBe(true);
    });
  });

  describe('getSupportedWellKnownChains', () => {
    test('should return list of supported chains', () => {
      const chains = getSupportedWellKnownChains();

      expect(chains).toBeInstanceOf(Array);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('polkadot_assethub');
      expect(chains).toContain('kusama_assethub');
      expect(chains).toContain('westend_assethub');
      expect(chains).toContain('paseo_assethub');
    });

    test('should include relay chains', () => {
      const chains = getSupportedWellKnownChains();

      expect(chains).toContain('polkadot');
      expect(chains).toContain('kusama');
      expect(chains).toContain('westend');
      expect(chains).toContain('paseo');
    });
  });

  describe('loadChainSpec', () => {
    // Note: These tests will only pass if the actual chain spec modules are available
    // For now, we'll test the error handling

    test('should throw error for unsupported chains', async () => {
      await expect(loadChainSpec('hydration')).rejects.toThrow(
        'No well-known chain spec available for hydration'
      );
    });

    test('should throw error for unknown chains', async () => {
      await expect(loadChainSpec('unknown_chain')).rejects.toThrow(
        'No well-known chain spec available for unknown_chain'
      );
    });

    // Skipping actual chain spec loading tests as they require the polkadot-api/chains modules
    // which may not be available in the test environment
    test.skip('should load chain spec for polkadot_assethub', async () => {
      const chainSpec = await loadChainSpec('polkadot_assethub');

      expect(chainSpec).toBeDefined();
      expect(typeof chainSpec).toBe('string');
      expect(chainSpec.length).toBeGreaterThan(0);
    });
  });

  describe('Network name to well-known ID mapping', () => {
    const testCases = [
      { network: 'polkadot_assethub', expected: 'polkadot_asset_hub' },
      { network: 'kusama_assethub', expected: 'ksmcc3_asset_hub' },
      { network: 'westend_assethub', expected: 'westend2_asset_hub' },
      { network: 'paseo_assethub', expected: 'paseo_asset_hub' },
      { network: 'polkadot', expected: 'polkadot' },
      { network: 'kusama', expected: 'ksmcc3' },
      { network: 'westend', expected: 'westend2' },
      { network: 'paseo', expected: 'paseo' },
    ];

    test.each(testCases)(
      'should map $network to $expected',
      ({ network, expected }) => {
        expect(getWellKnownChainId(network)).toBe(expected);
      }
    );
  });
});
