import type { Config, NetworkHandler } from '../types.js';
import { AssetHubHandler } from './assethub.js';
import { HydrationHandler } from './hydration.js';
import type { HandlerOptions } from './base.js';

/**
 * Factory to create appropriate network handler based on network name
 */
export function createNetworkHandler(
  networkName: string,
  config: Config,
  options?: HandlerOptions
): NetworkHandler {
  const network = config.networks[networkName];
  if (!network) {
    throw new Error(`Network '${networkName}' not found in configuration`);
  }

  // Determine handler type based on network name
  const lowerName = networkName.toLowerCase();

  if (lowerName.includes('hydration')) {
    return new HydrationHandler(networkName, network, config, options);
  }

  // Default to AssetHub handler for all AssetHub chains
  if (
    lowerName.includes('assethub') ||
    lowerName.includes('asset_hub') ||
    lowerName.includes('statemine') ||
    lowerName.includes('statemint')
  ) {
    return new AssetHubHandler(networkName, network, config, options);
  }

  throw new Error(`No handler available for network type: ${networkName}`);
}
