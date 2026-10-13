# Deployments

| Network | Chain ID | Contract | Explorer |
|---|---|---|---|
| Arc Mainnet | 5042 | `0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD` | https://explorer.arc.io/address/0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD (verified, exact match) |
| Arc Testnet | 5042002 | `0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD` | https://explorer.testnet.arc.io/address/0xB36f4fB23402bCe6293818c9cAb3Eee00e1D5AfD (verified) |

Same address on both networks because the same deployer key was used at nonce 0.

Compiler: solc 0.8.30, optimizer on (200 runs), EVM target cancun. Standard JSON input used for verification: [`ArcInvoice.standard-input.json`](ArcInvoice.standard-input.json). Foundry broadcast receipts are in `contracts/broadcast/`.

## Mainnet transaction log (2026-10-13)

| # | Action | Gas | Tx |
|---|---|---|---|
| 1 | Deploy ArcInvoice | 933,934 | [0xcd0670…b749](https://explorer.arc.io/tx/0xcd06708bb3ee5425bb4db086ee212efabd355891a12ff7a889f496f2be24b749) |
| 2 | Fund payer wallet (native USDC send) | 21,000 | [0x9363be…9202](https://explorer.arc.io/tx/0x9363be8298547dad8c892c100d758024ba0ae815f94d5a3a2a22b92d8c0e9202) |
| 3 | `createInvoice` #1, 0.25 USDC | 159,603 | [0x40c38e…7d28](https://explorer.arc.io/tx/0x40c38eceecd8c975467bbf39e2d300fe17e2087ef52ac44c74dd58d650657d28) |
| 4 | `pay(1)` from payer wallet | 65,465 | [0xac7ccc…f3e4](https://explorer.arc.io/tx/0xac7cccd2ad45ae362f385dc2808ac5c3fd260c19aa64b3879b27a5b8cf18f3e4) |
| 5 | `createInvoice` #2, 0.01 USDC (open) | 170,199 | [0xf1965c…d27a](https://explorer.arc.io/tx/0xf1965c6a39b793d6708c626d1f8799ae5b5ef85e42eb445da393a9d6debfd27a) |

Effective gas price was 20.1 gwei on an 18-decimal USDC unit, so the whole sequence cost about 0.027 USDC.

Wallets: merchant / deployer `0xff571F44988A44E88b3683c5e7FfC8e8917dDb6e`, payer `0x1312c5e0d039583B63fCc9246Fc5B5df2D2b7060`.
