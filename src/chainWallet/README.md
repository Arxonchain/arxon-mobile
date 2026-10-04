# Chain wallet (native shell)

ARX-20 listing and per-token vault live here. This branch (`wallet-on-ota`) is a **private** APK bundle. Do not merge to `main` until product wants public OTA.

* Native ARX: `0x801`, notes in `storage` keys `arxon.notes` / `arxon.leaves`.
* Issued tokens: paste a contract on Portfolio. Bytecode probe for `IARX20.shield` → ARX-20 vault on `/token/:address` (call the **token**, prove with `token` in wasm). Plain ERC-20 is public `transfer` only.
* `0x802` must exist on the RPC (runtime upgrade). Until then the token screen says the pool is not live.

See `arxon-node` `docs/ARX-20.md` for the chain isolation. Seeds stay on device storage, never in this repo.
