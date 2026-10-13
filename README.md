# ArcInvoice

**Payment links settled in native USDC on Arc.** A merchant creates an invoice, shares a link, and the payer settles it in a single transaction. No token approval, no second gas asset, final in one block.

- Live app: https://arc-invoice-two.vercel.app
- Network: Arc mainnet (chain ID 5042) · contract: `MAINNET_ADDRESS` (verified on [explorer.arc.io](https://explorer.arc.io))
- Testnet deployment (chain ID 5042002): [`0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD`](https://explorer.testnet.arc.io/address/0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD)

## What it does

1. **Create.** The merchant signs one transaction: `createInvoice(amount, expiresAt, memo)`. The invoice is stored on Arc and the app shows a shareable link `/pay/<id>`.
2. **Share.** Anyone with USDC on Arc can open the link. The page reads the invoice straight from the chain, no backend.
3. **Pay.** The payer clicks once. `pay(id)` is called with the invoice amount as `msg.value`. Because USDC *is* Arc's native token, the money and the record travel in the same transaction. The contract forwards the USDC to the merchant immediately and marks the invoice paid.

Every step emits an event, and native USDC moves also emit Arc's system `Transfer` log, so the receipt is fully verifiable on the explorer.

## Why Arc

| Arc property | What ArcInvoice gets from it |
|---|---|
| USDC is the gas token | A payer needs only USDC. No ETH, no approvals, one click. |
| Native value with 18 decimals and an ERC-20 view with 6 | The contract uses only the native path, avoiding the two-interface decimal trap entirely. |
| Deterministic one-block finality | The "Paid" state is final the moment the wallet confirms. |
| EIP-7708 native Transfer logs | Explorers show the USDC movement without the contract doing extra work. |
| 20 gwei base fee on an 18-decimal unit | A payment costs about 0.0013 USDC in gas. |

## Architecture

```
contracts/            Foundry
  src/ArcInvoice.sol  single contract: createInvoice / pay / cancel + views
  test/ArcInvoice.t.sol  11 tests incl. reentrancy, forward failure, expiry, fuzz
  script/Deploy.s.sol
web/                  Next.js 16 + wagmi 3 + viem 2, no backend
  src/app/page.tsx         merchant dashboard: create + list + cancel
  src/app/pay/[id]/        public pay page with share link and receipt
  src/lib/config.ts        chain selection via NEXT_PUBLIC_ARC_NETWORK
```

Reads use the public Circle RPC and the contract's own index (`merchantInvoices`, `getInvoices`), which sidesteps Arc's 10,000-block `eth_getLogs` limit. Writes go through the connected injected wallet (MetaMask, Rabby, etc.).

## Contract

```solidity
function createInvoice(uint96 amount, uint64 expiresAt, string calldata memo) external returns (uint256 id);
function pay(uint256 id) external payable;          // msg.value must equal amount; forwards to merchant
function cancel(uint256 id) external;               // merchant only, while Open
function getInvoice(uint256 id) external view returns (Invoice memory);
function merchantInvoices(address) external view returns (uint256[] memory);
function getInvoices(uint256[] calldata ids) external view returns (Invoice[] memory);
```

Amounts are native units (18 decimals, `1 USDC == 1e18`). Checks-effects-interactions plus a reentrancy lock; the contract holds no balance between transactions.

## Run it yourself

```bash
# contracts
cd contracts && forge test -vv

# deploy (needs a wallet with a little USDC on Arc; PRIVATE_KEY in ../.env)
forge script script/Deploy.s.sol --rpc-url https://rpc.mainnet.arc.io --broadcast \
  --with-gas-price 20100000000 --priority-gas-price 1000000000
forge verify-contract <ADDR> src/ArcInvoice.sol:ArcInvoice --chain-id 5042 \
  --verifier blockscout --verifier-url https://explorer.arc.io/api/

# frontend
cd ../web && pnpm install
echo "NEXT_PUBLIC_ARC_NETWORK=mainnet\nNEXT_PUBLIC_CONTRACT_ADDRESS=<ADDR>" > .env.local
pnpm dev
```

Arc wallet settings: RPC `https://rpc.mainnet.arc.io`, chain ID `5042`, symbol `USDC`, 18 decimals, explorer `https://explorer.arc.io`. The app offers to add the network when you connect.

## Reproduce an on-chain payment from the CLI

```bash
C=<ADDR>; R=https://rpc.mainnet.arc.io
cast send $C "createInvoice(uint96,uint64,string)" 1000000000000000000 0 "Coffee" --private-key $MERCHANT_KEY -r $R --gas-price 20100000000 --priority-gas-price 1000000000
cast send $C "pay(uint256)" 1 --value 1000000000000000000 --private-key $PAYER_KEY -r $R --gas-price 20100000000 --priority-gas-price 1000000000
cast call $C "getInvoice(uint256)((address,uint96,uint64,uint64,uint8,address,uint64,string))" 1 -r $R
```

## Mainnet transactions

MAINNET_TXS

## 60-second reviewer flow

1. Open https://arc-invoice-two.vercel.app/pay/1 to see a paid invoice and its receipt.
2. Connect a wallet on Arc mainnet (the app adds the network), create a 0.01 USDC invoice, open its link, pay it. Gas plus amount is about a cent.
3. Click the explorer link on the confirmation to see the `InvoicePaid` event and the native USDC transfer.

## Future

Memo-tagged batch payouts via Multicall3, gasless pay via EIP-3009 `receiveWithAuthorization` on Arc's USDC, x402 integration so agents can settle invoices automatically, and EURC invoices via StableFX.

## License

MIT
