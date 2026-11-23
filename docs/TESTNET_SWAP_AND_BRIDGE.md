# Testnet AMM swap and Sepolia bridge

**Status: parked.** Agreed 2026-11-19. Do not wire Swap or a bridge UI until we explicitly reopen this.

Canonical plan (chain, contracts, phases, security): `arxon-node/docs/TESTNET_SWAP_AND_BRIDGE.md`.

## Wallet constraints when this reopens

- Real txs only: `getAmountsOut` on the 7171 router; success after receipt; balances after confirmation. No mocked swap.
- Official USDTarx / USDCarx addresses only. Do not show a random ERC-20 as those tickers.
- Swap screens in `src/walletFigma/flow/SwapScreens.tsx` are locked Figma. Drop `Unavailable` only with an explicit UI approval; keep structure, classNames, copy. Wire confirm through `liveFrame`.
- After swap, shield via `0x802` (stables) or `0x801` (tARX). Four flags are for private pay, not for the AMM tx.
- Sepolia bridge: two real txs (lock on Sepolia, mint on 7171). Link both explorers. No mint without a lock.
- No mainnet Uniswap/Jupiter signing from this app.

Faucet stays tARX (`START_URL`). Stables come from the AMM (or a capped drip only if the pool cannot serve a first swap).
