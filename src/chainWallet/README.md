# Chain wallet (native shell)

ARX-20 listing and per-token vault live here. This branch (`wallet-on-ota`) is a **private** APK bundle. Do not merge to `main` until product wants public OTA.

* Same seed on both networks. Arxon is AccountId20/H160. Derivation is standard ETH (`m/44'/60'/0'/0/0`), so the public ARX 0x and Ethereum 0x match.
* Networks never mix. Ethereum (real) is public ETH/USDC/USDT only. Shield / Unshield / hide flags are Arxon Testnet only. Mine / claim is Arxon Testnet ARX-P.
* Ethereum RPC is `ETHEREUM_RPC` in `networks.ts` (`https://ethereum-rpc.publicnode.com`). Replace that constant later if needed. Timeouts surface the URL. No ETH airdrop on install. No Arxon faucet on Ethereum.
* Native ARX: `0x801`, notes in `storage` keys `arxon.notes` / `arxon.leaves`.
* Issued tokens on Arxon Testnet: paste a contract on Home. Bytecode probe for `IARX20.shield` → ARX-20 vault on `/token/:address`. Plain ERC-20 is public `transfer` only.
* `0x802` must exist on the Arxon RPC (runtime upgrade). Until then the token screen says the pool is not live.

See `arxon-node` `docs/ARX-20.md` for the chain isolation. Seeds stay on device storage, never in this repo.
