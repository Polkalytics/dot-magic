import { z } from 'zod';

// Asset location schema
const AssetLocationSchema = z.union([
  z.literal('native'),
  z.object({
    parents: z.number(),
    interior: z.record(z.string(), z.any()),
  }),
]);

// Currency schema
const CurrencySchema = z.object({
  ticker: z.string(),
  decimals: z.number(),
  location: AssetLocationSchema,
});

// Network schema
const NetworkSchema = z.object({
  name: z.string(),
  rpc_servers: z.array(z.string()).min(1),
  native_token: z.object({
    symbol: z.string(),
    decimals: z.number(),
  }),
  supported_currencies: z.array(CurrencySchema),
});

// Wallet schema
const WalletSchema = z.object({
  type: z.enum(['mnemonic', 'private_key', 'ledger']),
  mnemonic: z.string().optional(),
  private_key: z.string().optional(),
  derivation_path: z.string().optional(),
});

// Main config schema
export const ConfigSchema = z.object({
  networks: z.record(z.string(), NetworkSchema),
  default_token_networks: z.record(z.string(), z.string()),
  wallet: WalletSchema.optional(),
});

// TypeScript types derived from schemas
export type AssetLocation = z.infer<typeof AssetLocationSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type Network = z.infer<typeof NetworkSchema>;
export type WalletConfig = z.infer<typeof WalletSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Network handler interface
export interface NetworkHandler {
  sendTokens(params: {
    to: string;
    currency: Currency;
    amount: bigint;
  }): Promise<{ txHash: string; ok: boolean }>;
}

// Swap parameters
export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn?: string;
  amountOut?: string;
  slippage?: number;
}

export interface SwapResult {
  txHash: string;
  ok: boolean;
  amountIn?: string;
  amountOut?: string;
}
