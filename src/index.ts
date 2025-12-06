#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, resolveNetwork, findCurrency } from './config.js';
import { createNetworkHandler } from './handlers/factory.js';
import { HydrationHandler } from './handlers/hydration.js';
import { createSigner } from './wallet.js';
import type { Config } from './types.js';
import { Keyring } from '@polkadot/keyring';

const CONFIG_PATH = process.env.DOT_MAGIC_CONFIG || './config.yaml';

class DotMagicServer {
  private server: Server;
  private config: Config;

  constructor() {
    this.server = new Server(
      {
        name: 'dot-magic',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Load configuration
    try {
      this.config = loadConfig(CONFIG_PATH);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      process.exit(1);
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_wallet_address',
            description: 'Get the SS58 address of the MCP server',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'send_tokens',
            description: 'Send tokens to an address',
            inputSchema: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Destination address (SS58 format)',
                },
                ticker: {
                  type: 'string',
                  description: 'Token ticker symbol (e.g., DOT, KSM, USDT)',
                },
                amount: {
                  type: 'string',
                  description: 'Amount to send (e.g., "1.5" for 1.5 tokens)',
                },
                network: {
                  type: 'string',
                  description: 'Network name (optional, uses default network for the token if not specified)',
                },
              },
              required: ['to', 'ticker', 'amount'],
            },
          },/*
          {
            name: 'swap_tokens',
            description: 'Swap tokens on Hydration DEX',
            inputSchema: {
              type: 'object',
              properties: {
                token_in: {
                  type: 'string',
                  description: 'Input token ticker',
                },
                token_out: {
                  type: 'string',
                  description: 'Output token ticker',
                },
                amount_in: {
                  type: 'string',
                  description: 'Amount of input tokens (specify either amount_in or amount_out, not both)',
                },
                amount_out: {
                  type: 'string',
                  description: 'Amount of output tokens (specify either amount_in or amount_out, not both)',
                },
                slippage: {
                  type: 'number',
                  description: 'Maximum slippage percentage (default: 0.5%, max: 10%)',
                  minimum: 0,
                  maximum: 10,
                },
              },
              required: ['token_in', 'token_out'],
            },
          },*/
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'send_tokens':
            return await this.handleSendTokens(args);
          case 'swap_tokens':
            return await this.handleSwapTokens(args);
          case 'get_wallet_address':
            return await this.handleGetWalletAddress();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleSendTokens(args: any) {
    const { to, ticker, amount, network: networkName } = args;

    // Validate required fields
    if (!to || !ticker || !amount) {
      throw new Error('Missing required fields: to, ticker, and amount are required');
    }

    // Resolve network
    const resolvedNetwork = resolveNetwork(this.config, ticker, networkName);

    // Find currency
    const currency = findCurrency(this.config, resolvedNetwork, ticker);

    // Parse amount
    const amountBigInt = this.parseAmount(amount, currency.decimals);

    // Create handler and send tokens
    const handler = createNetworkHandler(resolvedNetwork, this.config);

    const result = await handler.sendTokens({
      to,
      currency,
      amount: amountBigInt,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.ok,
            txHash: result.txHash,
            network: resolvedNetwork,
            amount: amount,
            ticker: ticker,
            to: to,
          }, null, 2),
        },
      ],
    };
  }

  private async handleSwapTokens(args: any) {
    const { token_in, token_out, amount_in, amount_out, slippage } = args;

    // Validate required fields
    if (!token_in || !token_out) {
      throw new Error('Missing required fields: token_in and token_out are required');
    }

    if (!amount_in && !amount_out) {
      throw new Error('Either amount_in or amount_out must be specified');
    }

    if (amount_in && amount_out) {
      throw new Error('Only one of amount_in or amount_out should be specified');
    }

    // Validate slippage
    const slippageValue = slippage ?? 0.5;
    if (slippageValue < 0 || slippageValue > 10) {
      throw new Error('Slippage must be between 0% and 10%');
    }

    // Create Hydration handler
    const handler = createNetworkHandler('hydration', this.config) as HydrationHandler;

    // Perform swap
    const result = await handler.swap({
      tokenIn: token_in,
      tokenOut: token_out,
      amountIn: amount_in,
      amountOut: amount_out,
      slippage: slippageValue,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.ok,
            txHash: result.txHash,
            tokenIn: token_in,
            tokenOut: token_out,
            amountIn: result.amountIn || amount_in,
            amountOut: result.amountOut || amount_out,
            slippage: slippageValue,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetWalletAddress() {
    // Create signer to trigger wallet load/generation
    const signer = await createSigner();

    // Get SS58 address (default format 42 = generic substrate)
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
    const keypair = keyring.addFromSeed(signer.publicKey);

    return {
      content: [
        {
          type: 'text',
          text: keypair.address,
        },
      ],
    };
  }

  private parseAmount(amount: string, decimals: number): bigint {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + paddedFraction);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DOT Magic MCP Server running on stdio');
  }
}

// Start the server
const server = new DotMagicServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
