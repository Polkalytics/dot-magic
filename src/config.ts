import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { ConfigSchema, type Config } from './types.js';

/**
 * Load and validate configuration from a YAML file
 */
export function loadConfig(configPath: string): Config {
  try {
    const fileContent = readFileSync(configPath, 'utf8');
    const rawConfig = parse(fileContent);

    // Validate the configuration
    const config = ConfigSchema.parse(rawConfig);

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Resolve which network to use for a given token ticker
 */
export function resolveNetwork(config: Config, ticker: string, networkName?: string): string {
  if (networkName) {
    if (!config.networks[networkName]) {
      throw new Error(`Network '${networkName}' not found in configuration`);
    }
    return networkName;
  }

  const defaultNetwork = config.default_token_networks[ticker];
  if (!defaultNetwork) {
    throw new Error(`No default network found for token '${ticker}'. Please specify a network.`);
  }

  if (!config.networks[defaultNetwork]) {
    throw new Error(`Default network '${defaultNetwork}' for token '${ticker}' not found in configuration`);
  }

  return defaultNetwork;
}

/**
 * Find a currency configuration by ticker in a specific network
 */
export function findCurrency(config: Config, networkName: string, ticker: string) {
  const network = config.networks[networkName];
  if (!network) {
    throw new Error(`Network '${networkName}' not found`);
  }

  const currency = network.supported_currencies.find(c => c.ticker === ticker);
  if (!currency) {
    throw new Error(`Currency '${ticker}' not supported on network '${networkName}'`);
  }

  return currency;
}
