import { getWsProvider } from '@polkadot-api/ws-provider';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import type { JsonRpcProvider } from '@polkadot-api/json-rpc-provider';

/**
 * Map of network names to well-known chain identifiers
 * These chains have bundled chain specs in polkadot-api
 */
const WELL_KNOWN_CHAINS: Record<string, string> = {
  polkadot_assethub: 'polkadot_asset_hub',
  kusama_assethub: 'ksmcc3_asset_hub',
  westend_assethub: 'westend2_asset_hub',
  paseo_assethub: 'paseo_asset_hub',
  paseo_passethub: 'paseo_asset_hub',
  polkadot: 'polkadot',
  kusama: 'ksmcc3',
  westend: 'westend2',
  paseo: 'paseo',
};

/**
 * Map of AssetHub chains to their relay chains
 */
const ASSETHUB_RELAY_CHAINS: Record<string, string> = {
  polkadot_assethub: 'polkadot',
  kusama_assethub: 'kusama',
  westend_assethub: 'westend',
  paseo_assethub: 'paseo',
  paseo_passethub: 'paseo',
};

/**
 * Get the well-known chain ID for a network, if available
 */
export function getWellKnownChainId(networkName: string): string | null {
  return WELL_KNOWN_CHAINS[networkName.toLowerCase()] || null;
}

/**
 * Get the relay chain for an AssetHub parachain
 */
export function getRelayChain(networkName: string): string | null {
  return ASSETHUB_RELAY_CHAINS[networkName.toLowerCase()] || null;
}

/**
 * Load chain spec for a well-known chain
 * Returns the chain spec that can be used with Smoldot
 */
export async function loadChainSpec(networkName: string): Promise<string> {
  const wellKnownId = getWellKnownChainId(networkName);

  if (wellKnownId) {
    // Import chain spec from polkadot-api/chains
    try {
      const chainModule = await import(`polkadot-api/chains/${wellKnownId}`);
      return chainModule.chainSpec;
    } catch (error) {
      throw new Error(
        `Failed to load chain spec for ${networkName} (${wellKnownId}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // For custom chains (like Hydration), we would need to fetch or bundle the chain spec
  throw new Error(
    `No well-known chain spec available for ${networkName}. ` +
    `Custom chain specs need to be bundled or fetched separately.`
  );
}

/**
 * Create a JSON-RPC provider with automatic failover between multiple RPC endpoints
 * Tries each endpoint in order until one works
 */
export function createRpcProvider(
  rpcUrls: string[],
  onError?: (url: string, error: Error) => void
): JsonRpcProvider {
  if (rpcUrls.length === 0) {
    throw new Error('At least one RPC URL is required');
  }

  let currentIndex = 0;
  let currentProvider: JsonRpcProvider | null = null;

  // Create provider for current endpoint
  const createProvider = (index: number): JsonRpcProvider => {
    const url = rpcUrls[index];
    const wsProvider = getWsProvider(url);

    // Wrap with Polkadot SDK compatibility layer
    return withPolkadotSdkCompat(wsProvider);
  };

  // Initialize with first endpoint
  currentProvider = createProvider(currentIndex);

  // Create a proxy provider that handles failover
  const failoverProvider: JsonRpcProvider = (onMessage) => {
    if (!currentProvider) {
      currentProvider = createProvider(currentIndex);
    }

    return currentProvider((message) => {
      // Handle errors by failing over to next endpoint
      if (message && typeof message === 'object' && 'error' in message) {
        const error = new Error(`RPC error from ${rpcUrls[currentIndex]}`);

        if (onError) {
          onError(rpcUrls[currentIndex], error);
        }

        // Try next endpoint
        currentIndex = (currentIndex + 1) % rpcUrls.length;

        // Recreate provider with new endpoint
        if (currentProvider) {
          currentProvider = null;
        }
        currentProvider = createProvider(currentIndex);

        // Retry with new provider
        return currentProvider(onMessage);
      }

      // Forward message normally
      onMessage(message);
    });
  };

  return failoverProvider;
}

/**
 * Check if a network has a well-known chain spec
 */
export function hasWellKnownChainSpec(networkName: string): boolean {
  return getWellKnownChainId(networkName) !== null;
}

/**
 * Get list of supported well-known chain names
 */
export function getSupportedWellKnownChains(): string[] {
  return Object.keys(WELL_KNOWN_CHAINS);
}
