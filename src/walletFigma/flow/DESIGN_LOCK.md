# Approved wallet UI lock

These files are the approved design. Do not modify their JSX structure, classNames, styles, or copy.

This is the 131-screen Arxon wallet UI (Figma frames in `catalog.ts`, welcome 01.01 through Explore 23.03). Preview: `/flow`.

## Locked files

- `catalog.ts` — screen index
- `WelcomeScreens.tsx` — 01 splash, gateway, slides
- `CreateWallet.tsx` — 02 create / backup
- `PhraseBackup.tsx` — 04 recovery phrase
- `ImportWallet.tsx` — 05 import
- `FinishSetup.tsx` — 06 Face ID / ready
- `UnlockScreens.tsx` — 07 unlock and dApp requests
- `HomeScreens.tsx` — 08 Home
- `FindScreens.tsx` — 09 search, manage, alerts
- `TokenScreens.tsx` — 10 token detail
- `SendScreens.tsx` — 11 Send
- `ReceiveScreens.tsx` — 12 Receive
- `SwapScreens.tsx` — 13 Swap
- `BuyScreens.tsx` — 14 Buy
- `ActivityScreens.tsx` — 15 Activity
- `ReceiptScreens.tsx` — 16 private receipt
- `ClaimScreens.tsx` — 17 Claim
- `VaultScreens.tsx` — 18 Vault and accounts
- `AccountScreens.tsx` — 19 Account
- `PrivacyScreens.tsx` — 20 Privacy
- `ExploreScreens.tsx` — 23 Explore
- `WalletTabs.tsx` — Home / Vault / Explore / History / Account / Testnet
- `../../walletFigma/tokens.ts`
- `../../walletFigma/icons.tsx`
- `../../../public/wallet-figma/**`

Figma chrome stays. The 9:41 status bar, signal / Wi‑Fi / battery, home indicator, and icons mark where those elements will function. Do not implement them as device UI and do not remove them from these screens.

Not locked: `FlowStudio.tsx`, `ModeShell.tsx`, `liveFrame.tsx`.
