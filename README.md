# DOT Magic

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Polkadot and Kusama ecosystems. Send tokens, swap assets on Hydration DEX, and manage crypto operations through natural language.

## About

DOT Magic is an MCP server that provides secure, type-safe access to Polkadot/Kusama blockchain operations. It uses the Polkadot API (PAPI) SDK to enable:

- **Token Transfers**: Send native and asset tokens across Polkadot, Kusama, Westend, Paseo, and their AssetHub parachains
- **DEX Swaps**: Perform token swaps on Hydration (formerly HydraDX) with automatic slippage protection
- **Wallet Management**: Auto-generated secure wallets with mnemonic backup
- **Type Safety**: Full type safety using generated descriptors from @polkadot-api

Supported networks:
- Polkadot PassetHub (PAS)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dot-magic
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. The wallet will be auto-generated on first use and stored in `.wallet/mnemonic.txt`. Make sure to back up this mnemonic phrase securely.

### Configuration

The server uses `config.yaml` for network configuration. The default configuration includes all supported networks with working RPC endpoints. You can customize:

- RPC endpoints for each network
- Supported currencies and their asset locations
- Default networks for each token

Example configuration is provided in `config.example.yaml`.

## How to Integrate with Claude

### Claude Desktop Integration

1. Locate your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the DOT Magic server to your configuration:

```json
{
  "mcpServers": {
    "dot-magic": {
      "command": "node",
      "args": ["/absolute/path/to/dot-magic/dist/src/index.js"],
      "env": {
        "DOT_MAGIC_CONFIG": "/absolute/path/to/dot-magic/config.yaml"
      }
    }
  }
}
```

3. Replace `/absolute/path/to/dot-magic` with the actual path to your dot-magic directory.

4. Restart Claude Desktop.

5. You should now see the DOT Magic tools available in Claude. You can verify by asking:
   - "What MCP tools do you have access to?"
   - "Can you show me my wallet address?"

### Using with Claude

Once integrated, you can interact with the blockchain through natural language:

**Example prompts:**

- "Send 10 DOT to `<address>`"
- "What's my wallet address?"
- "Swap 5 USDT for HDX on Hydration"
- "Send 0.5 KSM to `<address>` on Kusama AssetHub"

**Available Tools:**

1. **send_tokens**: Send tokens to any address
   - Parameters: `to` (address), `ticker` (token symbol), `amount` (decimal), `network` (optional)

2. **swap_tokens**: Swap tokens on Hydration DEX
   - Parameters: `token_in`, `token_out`, `amount_in` OR `amount_out`, `slippage` (optional, default 0.5%)

3. **get_wallet_address**: Get your wallet's SS58 address
   - No parameters required

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Test the MCP server end-to-end:
```bash
node test-mcp-client.js
```

Test sending tokens directly:
```bash
node test-send-pas.js
```

## Security

- The wallet mnemonic is stored in `.wallet/mnemonic.txt` - keep this secure and backed up
- Never commit your wallet files to version control
- The `.gitignore` is configured to exclude wallet files
- Consider using environment variables for sensitive configuration

## Development

Watch mode for development:
```bash
npm run dev
```

The project structure:
```
dot-magic/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── config.ts          # Configuration loading
│   ├── wallet.ts          # Wallet management
│   ├── chain-provider.ts  # RPC provider setup
│   ├── types.ts           # TypeScript types
│   └── handlers/          # Network-specific handlers
│       ├── base.ts
│       ├── assethub.ts
│       ├── hydration.ts
│       └── factory.ts
├── __tests__/             # Jest test files
├── config.yaml            # Network configuration
└── package.json
```

## Troubleshooting

**Connection issues:**
- Verify RPC endpoints in `config.yaml` are accessible
- Try alternative RPC endpoints from the config
- Check your internet connection

**Transaction failures:**
- Ensure wallet has sufficient balance for transaction + fees
- Verify the recipient address is valid for the target network
- Check slippage settings for swaps

**Wallet not found:**
- The wallet is auto-generated on first use
- Check `.wallet/mnemonic.txt` exists
- Ensure the directory has write permissions

## License

ISC

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
