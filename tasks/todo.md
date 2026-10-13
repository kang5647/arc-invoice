# Arc Microgrants — build plan (Phase 1, 2026-10-13)

Deadline: 2026-10-14 23:59 ET (2026-10-15 11:59 SGT). Submission: https://dorahacks.io/hackathon/arc-microgrants

## Verified Arc mainnet facts (docs.arc.io + live RPC probe)
- Chain ID 5042 (0x13b2). RPC https://rpc.mainnet.arc.io (wss same host). Explorer https://explorer.arc.io (Blockscout).
- Gas = USDC. Native 18 dec in RPC/msg.value; ERC-20 interface at 0x3600000000000000000000000000000000000000 (6 dec), same balance.
- Base fee floor 20 gwei (live = exactly 20 gwei). Tx below 20 gwei maxFee silently dropped. Finality 1 block.
- EVM Osaka; PUSH0/TSTORE/MCOPY fine. PREVRANDAO=0, no blobs, value send to address(0) reverts, blocklist reverts.
- Deployment permissionless. Foundry 1.3.5 works (estimateGas of our escrow bytecode succeeded on mainnet).
- Verification: `forge verify-contract --chain-id 5042 --verifier blockscout --verifier-url https://explorer.arc.io/api/` (inferred from testnet docs; UI fallback https://explorer.arc.io/contract-verification).
- USDC on Arc supports EIP-3009 + EIP-2612 (typehashes verified on-chain). CCTP v2 domain 26.
- Testnet: 5042002, https://rpc.testnet.arc.io, faucet https://faucet.circle.com (20 USDC / 2h).

## Measured costs (20 gwei, 1e-18 USDC per wei)
- Representative escrow contract deploy: 978,055 gas = 0.0196 USDC (eth_estimateGas on mainnet).
- Simple contract call 26.7k gas = 0.0005 USDC (real receipts sampled). 584k gas call = 0.0117 USDC.

## Plan
- [x] APPROVAL from user on project + budget (option B, ArcInvoice)
- [x] Fund throwaway deployer wallet with ~5 USDC on Arc (Kraken/KuCoin/Gate direct, or CCTP from Base)
- [x] Foundry contract + tests (arc-anvil or plain forge tests)
- [x] Deploy to Arc testnet first, smoke test
- [x] Next.js + wagmi/viem frontend, Vercel
- [x] APPROVAL on mainnet deploy cost (~0.03 USDC)
- [x] Deploy mainnet, verify, demo txs
- [x] README, DoraHacks submission content, logo 480x480
- [ ] Submit before deadline

## Review (2026-10-13)
- Contract: 0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD on both Arc testnet (5042002) and mainnet (5042); verified on both explorers.
- Mainnet txs: deploy 0xcd0670…b749, create #1 0x40c38e…7d28, pay #1 0xac7ccc…f3e4, create #2 0xf1965c…d27a. Total spend ≈ 0.025 USDC gas; deployer 1.90 USDC left, payer wallet 0.05.
- Live: https://arc-invoice-two.vercel.app (mainnet build). Repo: https://github.com/kang5647/arc-invoice
- Submission text: docs/dorahacks-submission.md. Logo: web/public/logo.png
- Gotchas: forge verify via API blocked by Cloudflare on explorer.arc.io; manual Standard-JSON upload in browser works. wagmi reads must pass chainId or they hit the first configured chain. Next 16 cacheComponents breaks client pages using runtime params; disabled.
- Remaining for user: fill the DoraHacks form.
