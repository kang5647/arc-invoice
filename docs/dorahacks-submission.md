# DoraHacks submission content — ArcInvoice

## Profile

**Build (project) name:** ArcInvoice

**Build logo:** `web/public/logo.png` (480×480 PNG)

**Vision (one line):**
Payment links settled in native USDC on Arc: a merchant shares a link, the payer settles in one click with no token approval, and the money lands in the merchant's wallet with one-block finality.

**Category:** Crypto / Web3

**GitHub:** https://github.com/kang5647/arc-invoice

**Project website:** https://arc-invoice-two.vercel.app

**Demo video:** (optional, none)

## Details

**Problem**
Getting paid in stablecoins is still clunky: the payer needs a gas token on top of USDC, has to approve a token spend, and then waits for confirmations. Merchants end up copying addresses into chats and checking explorers by hand.

**Solution**
ArcInvoice turns an invoice into a link. The merchant creates it with one transaction, the payer opens the link and pays with a single click, and the contract forwards the USDC straight to the merchant while recording the receipt on-chain. No backend, no approvals, no second asset.

**Why Arc**
- USDC is Arc's native gas token, so the invoice amount travels as `msg.value` in the same transaction that records the payment. Payers hold one asset and sign once.
- Arc's deterministic one-block finality means the "Paid" state is final the moment the wallet confirms.
- Native USDC transfers emit Arc's system Transfer log, so the explorer shows the money movement without extra contract work.
- Gas on an 18-decimal unit at a 20 gwei floor makes a payment cost about 0.001 USDC, which makes small invoices practical.

**Technical architecture**
- Solidity 0.8.30 contract `ArcInvoice` (Foundry): `createInvoice`, `pay` (payable, exact-amount check, checks-effects-interactions, reentrancy lock, direct forward to merchant), `cancel`, plus indexed views so the frontend never needs `eth_getLogs` (Arc caps it at 10,000 blocks).
- 11 Foundry tests including reentrancy, forward failure, expiry, permissions and a fuzz test on amounts.
- Next.js 16 + wagmi 3 + viem 2 frontend, no backend. Reads through Circle's public RPC, writes through the connected injected wallet. Deployed on Vercel.
- Deployed and exercised on Arc testnet first, then on Arc mainnet.

**Features**
- Merchant dashboard: stats (collected, open, paid), invoice table, create slide-over, copy link, cancel.
- Stripe-style checkout page per invoice with share link, live status, and an on-chain receipt after payment.
- Automatic Arc network add and switch in the wallet.
- Expiry support for time-limited invoices.

**Mainnet contract**
`0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD` on Arc (chain ID 5042)
https://explorer.arc.io/address/0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD

**Verified mainnet transactions**
- Deploy: https://explorer.arc.io/tx/0xcd06708bb3ee5425bb4db086ee212efabd355891a12ff7a889f496f2be24b749
- Create invoice #1: https://explorer.arc.io/tx/0x40c38eceecd8c975467bbf39e2d300fe17e2087ef52ac44c74dd58d650657d28
- Pay invoice #1 (second wallet): https://explorer.arc.io/tx/0xac7cccd2ad45ae362f385dc2808ac5c3fd260c19aa64b3879b27a5b8cf18f3e4
- Create invoice #2 (open, 0.01 USDC, for reviewers to pay): https://explorer.arc.io/tx/0xf1965c6a39b793d6708c626d1f8799ae5b5ef85e42eb445da393a9d6debfd27a

**Try it in 60 seconds**
1. Open https://arc-invoice-two.vercel.app/pay/1 to see a paid invoice and its receipt.
2. Open https://arc-invoice-two.vercel.app/pay/2, connect a wallet with a little USDC on Arc, and pay 0.01 USDC in one click.
3. Go to https://arc-invoice-two.vercel.app, create your own invoice, and open its link.

**What's next**
Gasless payment via EIP-3009 `receiveWithAuthorization` on Arc's USDC, x402 support so agents can settle invoices automatically, batch payouts via Multicall3, and EURC invoices through StableFX.
