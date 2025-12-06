# Testing Guide

This document describes the testing setup for DOT Magic MCP Server.

## Test Suite Overview

The project uses Jest with TypeScript for testing. All tests pass with mock objects, validating the architecture and ensuring the handlers work correctly before implementing the real PAPI integration.

### Test Statistics

- **Test Suites**: 6 total, 6 passed
- **Tests**: 83 total, 83 passed, 1 skipped
- **Coverage Areas**:
  - Wallet and signer integration (Phase 1)
  - Chain provider and RPC failover (Phase 2)
  - Native token transfers
  - Asset token transfers
  - Token swaps on Hydration
  - Configuration system

## Test Structure

```
__tests__/
├── mocks/
│   ├── papi-client.mock.ts   # Mock PAPI client and transactions
│   ├── wallet.mock.ts         # Mock wallet and signers
│   └── config.mock.ts         # Mock configuration
└── integration/
    ├── wallet.test.ts         # ✅ Phase 1: Wallet integration tests (13 tests)
    ├── chain-provider.test.ts # ✅ Phase 2: Chain provider tests (24 tests)
    ├── send-tokens.test.ts    # Native token transfer tests
    ├── send-assets.test.ts    # Asset token transfer tests
    ├── swap-tokens.test.ts    # Hydration swap tests
    └── config.test.ts         # Configuration system tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### 1. Wallet Integration (`wallet.test.ts`) - Phase 1

Tests for the wallet and signer implementation using `@polkadot/keyring`:

**Mnemonic Support:**
- ✅ Create wallet from 12-word mnemonic
- ✅ Create wallet from 24-word mnemonic
- ✅ Derive correct SS58 addresses
- ✅ Use standard BIP39 mnemonics

**Private Key Support:**
- ✅ Create wallet from hex private key
- ✅ Create wallet from 0x-prefixed private key
- ✅ Generate correct public keys

**Environment Variable Priority:**
- ✅ WALLET_PRIVATE_KEY takes priority over config
- ✅ WALLET_MNEMONIC takes priority over config
- ✅ Falls back to config when env vars not set

**PolkadotSigner Interface:**
- ✅ Implements required sign() method
- ✅ Provides publicKey as Uint8Array
- ✅ Generates valid SR25519 signatures
- ✅ Produces different signatures for different data

**Key Test:**
```typescript
test('should create signer from mnemonic', async () => {
  const signer = await createSigner({
    type: 'mnemonic',
    mnemonic: TEST_MNEMONIC,
  });

  expect(signer.publicKey).toBeInstanceOf(Uint8Array);
  expect(signer.publicKey.length).toBe(32);

  // Verify signing works
  const signature = await signer.sign(testData, {}, metadata);
  expect(signature).toBeInstanceOf(Uint8Array);
  expect(signature.length).toBeGreaterThan(0);
});
```

### 2. Chain Provider (`chain-provider.test.ts`) - Phase 2

Tests for chain spec loading and RPC failover implementation:

**Well-Known Chain Mapping:**
- ✅ Map polkadot_assethub → polkadot_asset_hub
- ✅ Map kusama_assethub → ksmcc3_asset_hub
- ✅ Map westend_assethub → westend2_asset_hub
- ✅ Map paseo_assethub → paseo_asset_hub
- ✅ Case-insensitive network name matching

**Relay Chain Support:**
- ✅ Map polkadot → polkadot
- ✅ Map kusama → ksmcc3
- ✅ Map westend → westend2
- ✅ Map paseo → paseo

**Chain Spec Validation:**
- ✅ Detect supported AssetHub chains
- ✅ Detect supported relay chains
- ✅ Return false for unsupported chains (Hydration, etc.)
- ✅ Throw error when loading unsupported chain spec

**Support Detection:**
- ✅ List all supported well-known chains
- ✅ Include both AssetHub and relay chains
- ✅ Provide complete chain inventory

**Key Test:**
```typescript
test('should map network names to well-known IDs', () => {
  expect(getWellKnownChainId('polkadot_assethub')).toBe('polkadot_asset_hub');
  expect(getWellKnownChainId('kusama_assethub')).toBe('ksmcc3_asset_hub');
  expect(getWellKnownChainId('POLKADOT_ASSETHUB')).toBe('polkadot_asset_hub'); // Case-insensitive
});

test('should detect supported chains', () => {
  expect(hasWellKnownChainSpec('polkadot_assethub')).toBe(true);
  expect(hasWellKnownChainSpec('hydration')).toBe(false);
});
```

### 3. Native Token Transfers (`send-tokens.test.ts`)

Tests for sending native tokens (DOT, KSM, etc.) using the Balances pallet:

- ✅ Send DOT on Polkadot AssetHub
- ✅ Send KSM on Kusama AssetHub
- ✅ Handle very small amounts (1 planck)
- ✅ Handle very large amounts (1M tokens)
- ✅ Reject transactions without wallet configuration
- ✅ Verify correct transaction parameters

**Key Test:**
```typescript
test('should send native DOT tokens successfully', async () => {
  const result = await handler.sendTokens({
    to: address,
    currency: dotCurrency,
    amount: 15n * 10n ** 10n, // 1.5 DOT
  });

  expect(result.ok).toBe(true);
  expect(result.txHash).toBe('mock-tx-hash-balances');
});
```

### 4. Asset Token Transfers (`send-assets.test.ts`)

Tests for sending asset tokens (USDT, USDC, etc.) using the Assets pallet:

- ✅ Send USDT on Polkadot AssetHub
- ✅ Send USDT on Kusama AssetHub
- ✅ Extract asset ID correctly from XCM location
- ✅ Handle decimal precision correctly
- ✅ Reject invalid asset location formats
- ✅ Handle multiple transactions without re-initialization

**Key Test:**
```typescript
test('should send USDT tokens successfully', async () => {
  const result = await handler.sendTokens({
    to: address,
    currency: usdtCurrency,
    amount: 100n * 10n ** 6n, // 100 USDT
  });

  expect(result.ok).toBe(true);
  // Verify correct asset ID (1984) was used
  expect(mockClient._typedApi.tx.Assets.transfer_keep_alive).toHaveBeenCalledWith({
    id: 1984,
    target: { type: 'Id', value: address },
    amount: 100000000n,
  });
});
```

### 5. Token Swaps (`swap-tokens.test.ts`)

Tests for Hydration DEX swaps using the Router pallet:

**Sell Operations (amount_in specified):**
- ✅ Swap DOT for HDX
- ✅ Apply default slippage (0.5%)
- ✅ Apply custom slippage
- ✅ Reject slippage > 10%
- ✅ Reject negative slippage
- ✅ Handle HDX to DOT swaps
- ✅ Handle decimal amounts correctly

**Buy Operations (amount_out specified):**
- ✅ Swap DOT for exactly X HDX
- ✅ Apply slippage to max_amount_in

**Validation:**
- ✅ Require either amountIn or amountOut
- ✅ Reject both amountIn and amountOut
- ✅ Reject unsupported tokens
- ✅ Require wallet configuration

**Asset ID Mapping:**
- ✅ Map HDX as asset ID 0
- ✅ Map DOT as asset ID 5
- ✅ Map USDT as asset ID 10

**Key Test:**
```typescript
test('should swap DOT for HDX with custom slippage', async () => {
  const result = await handler.swap({
    tokenIn: 'DOT',
    tokenOut: 'HDX',
    amountIn: '10',
    slippage: 2.5, // 2.5%
  });

  expect(result.ok).toBe(true);

  // Verify slippage calculation
  const callArgs = mockClient._typedApi.tx.Router.sell.mock.calls[0][0];
  const amountIn = 10n * 10n ** 10n; // 10 DOT
  const expectedMin = amountIn - (amountIn * 250n / 10000n);
  expect(callArgs.min_amount_out).toBe(expectedMin);
});
```

### 6. Configuration System (`config.test.ts`)

Tests for configuration loading and network resolution:

**Network Resolution:**
- ✅ Use explicit network when provided
- ✅ Use default network when not specified
- ✅ Resolve DOT, KSM, HDX correctly
- ✅ Throw error for non-existent networks
- ✅ Throw error for tokens without default networks

**Currency Resolution:**
- ✅ Find native tokens on networks
- ✅ Find asset tokens with XCM locations
- ✅ Handle same token on different networks
- ✅ Throw error for unsupported currencies

**Integration:**
- ✅ Resolve network + find currency workflow
- ✅ Allow network override for tokens

**Key Test:**
```typescript
test('should resolve and find currency for DOT', () => {
  const network = resolveNetwork(mockConfig, 'DOT');
  const currency = findCurrency(mockConfig, network, 'DOT');

  expect(network).toBe('polkadot_assethub');
  expect(currency.ticker).toBe('DOT');
  expect(currency.decimals).toBe(10);
});
```

## Mock Objects

### PAPI Client Mock

The mock client simulates the full PAPI client API:

- **Typed API**: Mocks for Balances, Assets, and Router pallets
- **Transactions**: Mock transaction builders with sign/submit methods
- **Queries**: Mock query interface for runtime state
- **Runtime APIs**: Mock runtime APIs for price calculations

### Signer Mock

The mock signer implements the PolkadotSigner interface:

- **sign()**: Returns mock signatures
- **getAddress()**: Returns configurable address
- **publicKey**: Returns mock public key

### Configuration Mock

Provides a complete test configuration with:

- 3 AssetHub networks (Polkadot, Kusama, Hydration)
- Multiple currencies per network
- Default network mappings
- Test wallet configuration

## Key Features of the Test Suite

### 1. Dependency Injection

Handlers support optional mock clients for testing:

```typescript
const handler = new AssetHubHandler(
  networkName,
  network,
  config,
  { mockClient, mockSigner } // Injected for testing
);
```

### 2. Full Integration Testing

Tests verify the complete flow from handler method call through to transaction submission:

```typescript
handler.sendTokens()
  → initialize()
  → createTransaction()
  → signAndSubmit()
  → verify result
```

### 3. Comprehensive Error Handling

Tests cover error cases:
- Missing wallet configuration
- Unsupported tokens/networks
- Invalid parameters
- Slippage validation

### 4. Real-World Scenarios

Tests use realistic amounts and addresses:
- Proper decimal handling
- Real SS58 addresses
- Actual asset IDs from production
- Edge cases (very small/large amounts)

## Next Steps for Testing

### Unit Tests Needed

1. **BaseNetworkHandler**
   - parseAmount() edge cases
   - formatAmount() edge cases

2. **Factory**
   - Network type detection
   - Handler creation for all network types

### Integration Tests Needed (with real PAPI)

Once the real implementation is complete:

1. **Testnet Integration**
   - Connect to Westend/Paseo
   - Submit real transactions
   - Verify finalization

2. **Error Scenarios**
   - Insufficient balance
   - Invalid addresses
   - Network failures

3. **Performance**
   - Transaction submission time
   - Pool query latency

## Writing New Tests

### Template for Handler Tests

```typescript
import { YourHandler } from '../../src/handlers/your-handler.js';
import { createMockClient, createMockSigner } from '../mocks/papi-client.mock.js';
import { mockConfig } from '../mocks/config.mock.js';

describe('YourHandler', () => {
  let handler: YourHandler;
  let mockClient: any;
  let mockSigner: any;

  beforeEach(() => {
    mockClient = createMockClient();
    mockSigner = createMockSigner();
    handler = new YourHandler(
      'network_name',
      mockConfig.networks.network_name,
      mockConfig,
      { mockClient, mockSigner }
    );
  });

  afterEach(async () => {
    await handler.cleanup();
  });

  test('should do something', async () => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use descriptive test names**: Describe what the test does and expects
2. **Test one thing**: Each test should verify a single behavior
3. **Use realistic data**: Use real addresses, amounts, and asset IDs
4. **Clean up**: Always call cleanup() in afterEach
5. **Verify mocks**: Check that the correct API methods were called with correct params

## Continuous Integration

To run tests in CI:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    npm install
    npm test
```

## Debugging Tests

```bash
# Run a specific test file
npm test send-tokens.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run a specific test by name
npm test -- -t "should send native DOT"
```

## Test-Driven Development Workflow

The current test suite enables TDD for implementing real functionality:

1. **Tests already exist** for all core features
2. **Implement real PAPI integration** in handlers
3. **Tests will guide you** to ensure correct implementation
4. **Switch from mocks to real clients** when ready
5. **Tests pass with real implementation** = feature complete

This approach ensures:
- ✅ Architecture is validated before implementation
- ✅ Clear requirements from tests
- ✅ Immediate feedback when implementing
- ✅ Confidence that features work correctly
