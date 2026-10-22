export type TabId = 'home' | 'vault' | 'explore' | 'history' | 'account';

export type Kind =
  | 'splash'
  | 'hero'
  | 'form'
  | 'choice'
  | 'caution'
  | 'phrase'
  | 'confirm'
  | 'success'
  | 'home'
  | 'list'
  | 'amount'
  | 'review'
  | 'detail'
  | 'overlay';

export type Scr = {
  id: string;
  name: string;
  section: string;
  kind: Kind;
  title?: string;
  body?: string;
  primary?: [string, string];
  secondary?: [string, string];
  tab?: TabId | null;
  rows?: string[];
  overlay?: boolean;
  parent?: string;
};

const s = (
  id: string,
  name: string,
  section: string,
  kind: Kind,
  extra: Partial<Scr> = {},
): Scr => ({ id, name, section, kind, tab: null, ...extra });

export const SCREENS: Scr[] = [
  s('splash', '01.01 Welcome', '01 · Welcome & intro', 'splash', { primary: ['Continue', 'gateway'] }),
  s('gateway', '01.01 Welcome – Gateway', '01 · Welcome & intro', 'hero', {
    title: 'Your Gateway to Layer-1 blockchain with toggle privacy',
    primary: ['Next', 'slide15'],
  }),
  s('slide15', 'Slide 15', '01 · Welcome & intro', 'hero', {
    title: 'Your wallet, your transaction',
    body: '100% Privacy you control',
    primary: ['Next', 'slide16'],
  }),
  s('slide16', 'Slide 16', '01 · Welcome & intro', 'hero', {
    title: 'Own Your Digital Future',
    body: 'Secure, private, and built for you.',
    primary: ['Create a new wallet', 'create'],
    secondary: ['Restore existing wallet', 'import'],
  }),

  s('create', '02.01 Create password', '02 · Create wallet', 'form', {
    title: 'Create a password',
    body: 'You’ll use this to unlock Arxon on this device. It can’t be recovered, so keep it safe.',
    primary: ['Continue', 'backup'],
  }),
  s('backup', '02.02 Back up your wallet – Google Drive selected', '02 · Create wallet', 'choice', {
    title: 'Back up your wallet',
    body: 'Secure your blockchain journey. If you lose this device, a backup is the only way back in.',
    primary: ['Continue', 'drive-connect'],
    secondary: ['Maybe later', 'ready-skip'],
    rows: ['Google Drive · Recommended · Encrypted with your password', 'Manual backup · Write down your 12-word phrase'],
  }),
  s('backup-manual', '02.03 Back up your wallet – Manual backup selected', '02 · Create wallet', 'choice', {
    title: 'Back up your wallet',
    body: 'Write the phrase down. Arxon never sees it.',
    primary: ['Continue', 'caution1'],
    secondary: ['Maybe later', 'ready-skip'],
  }),

  s('drive-connect', '03.01 Google Drive – Connect', '03 · Backup – Google Drive', 'hero', {
    title: 'Connect Google Drive',
    body: 'Save an encrypted copy of your wallet. Restore it on any device with your password.',
    primary: ['Continue with Google', 'drive-confirm'],
    secondary: ['Choose another method', 'backup'],
  }),
  s('drive-confirm', '03.02 Google Drive – Confirm password', '03 · Backup – Google Drive', 'form', {
    title: 'Confirm your password',
    body: 'Enter your Arxon password to encrypt your backup before it’s saved to Google Drive.',
    primary: ['Back up to Google Drive', 'drive-done'],
  }),
  s('drive-done', '03.03 Wallet created (Google Drive backup)', '03 · Backup – Google Drive', 'success', {
    title: 'Your wallet is ready',
    body: 'Account 01 is created and protected. You choose what stays private on every payment.',
    primary: ['Enter Arxon', 'home'],
  }),

  s('caution1', '04.01 Caution 1 – Screen privacy', '04 · Backup – Recovery phrase', 'caution', {
    title: 'Make sure your screen is only visible to you',
    body: 'If your seed phrase is captured by screenshots or recordings, you may lose control of your wallet.',
    primary: ['I understand', 'caution2'],
    secondary: ['Maybe later', 'ready-skip'],
  }),
  s('caution2', '04.02 Caution 2 – Store offline', '04 · Backup – Recovery phrase', 'caution', {
    title: 'Store your seed phrase offline',
    body: 'Write it on paper and keep it somewhere safe. Never save it in notes, photos, or cloud apps.',
    primary: ['I understand', 'caution3'],
    secondary: ['Maybe later', 'ready-skip'],
  }),
  s('caution3', '04.03 Caution 3 – Never share', '04 · Backup – Recovery phrase', 'caution', {
    title: 'Never share it with anyone',
    body: 'Anyone with your seed phrase can take your funds. Arxon will never ask you for it.',
    primary: ['Back up seed phrase', 'phrase-hidden'],
    secondary: ['Maybe later', 'ready-skip'],
  }),
  s('phrase-hidden', '04.04 Recovery phrase – Hidden', '04 · Backup – Recovery phrase', 'phrase', {
    title: 'Your recovery phrase',
    body: 'These 12 words are the only way to restore your wallet. Write them down in order.',
    primary: ['Reveal phrase', 'phrase-shown'],
  }),
  s('phrase-shown', '04.05 Recovery phrase – Revealed', '04 · Backup – Recovery phrase', 'phrase', {
    title: 'Your recovery phrase',
    body: 'These 12 words are the only way to restore your wallet. Write them down in order.',
    primary: ['I’ve written it down', 'phrase-confirm'],
  }),
  s('phrase-confirm', '04.06 Confirm phrase', '04 · Backup – Recovery phrase', 'confirm', {
    title: 'Confirm your phrase',
    body: 'Tap the correct word for each position to make sure you saved it.',
    primary: ['Verify', 'phrase-done'],
  }),
  s('phrase-done', '04.07 Wallet created (Recovery phrase backup)', '04 · Backup – Recovery phrase', 'success', {
    title: 'Your wallet is ready',
    body: 'Account 01 is created and protected. You choose what stays private on every payment.',
    primary: ['Enter Arxon', 'home'],
  }),

  s('import', '05.01 Import wallet', '05 · Import wallet', 'form', {
    title: 'Import wallet',
    body: 'Enter your 12 or 24-word recovery phrase. Separate each word with a space.',
    primary: ['Import wallet', 'ready-skip'],
  }),
  s('face', '06.01 Enable Face ID', '06 · Finish setup', 'hero', {
    title: 'Enable Face ID',
    body: 'Unlock Arxon and approve transactions faster. Your recovery phrase stays protected on this device.',
    primary: ['Enable Face ID', 'ready-skip'],
    secondary: ['Maybe later', 'ready-skip'],
  }),
  s('ready-skip', '06.02 Wallet ready (backup skipped or wallet imported)', '06 · Finish setup', 'success', {
    title: 'You’re all set!',
    body: 'Your Arxon wallet is ready. Fund it to start using Arxon privately.',
    primary: ['Go to wallet', 'home'],
  }),

  s('unlock', '07.01 Unlock', '07 · Unlock & app requests', 'form', {
    title: 'Welcome back',
    body: 'Enter your password to unlock Arxon.',
    primary: ['Unlock', 'home-funded'],
    secondary: ['Use Face ID', 'home-funded'],
  }),
  s('unlock-wrong', '07.03 Unlock – Wrong password', '07 · Unlock & app requests', 'form', {
    title: 'Welcome back',
    body: 'That password doesn’t match. Try again.',
    primary: ['Unlock', 'home-funded'],
  }),
  s('dapp', '07.02 dApp connect request', '07 · Unlock & app requests', 'overlay', {
    title: 'Connect to Arxswap',
    body: 'This app can see your address. It cannot see your phrase or Vault notes.',
    primary: ['Connect', 'home'],
    secondary: ['Cancel', 'home'],
    parent: 'home',
    rows: ['View your address', 'Request payments'],
  }),
  s('dapp-tx', '07.04 dApp – Approve transaction', '07 · Unlock & app requests', 'overlay', {
    title: 'Approve payment',
    body: 'Arxswap wants to send 12 tARX from Home.',
    primary: ['Approve', 'send-success'],
    secondary: ['Reject', 'home-funded'],
    parent: 'home-funded',
  }),
  s('connected', '07.05 Connected apps', '07 · Unlock & app requests', 'list', {
    title: 'Connected apps',
    body: 'Disconnect any time. This does not move funds.',
    rows: ['WalletConnect sessions'],
    primary: ['Done', 'account'],
  }),

  s('home', '08.01 Home – First-timer', '08 · Home', 'home', { tab: 'home' }),
  s('testnet', 'Testnet home', '08 · Home', 'home', { tab: 'home' }),
  s('home-hidden', '08.02 Home – Balance hidden', '08 · Home', 'home', { tab: 'home' }),
  s('home-funded', '08.03 Home – Funded', '08 · Home', 'home', { tab: 'home' }),
  s('more', '08.04 Home – More', '08 · Home', 'overlay', {
    title: 'More',
    overlay: true,
    parent: 'home-funded',
    tab: 'home',
    rows: ['Buy', 'Mine'],
  }),
  s('home-vaulted', '08.05 Home – Funded, after moving to Vault', '08 · Home', 'home', { tab: 'home' }),
  s('home-unvaulted', '08.06 Home – Funded, after moving out of Vault', '08 · Home', 'home', { tab: 'home' }),

  s('search', '09.01 Search', '09 · Home – Search, tokens & alerts', 'form', {
    title: 'Search',
    body: 'Tokens, an address, or an Arxon name.',
    primary: ['Search', 'token-arx'],
  }),
  s('manage', '09.02 Manage tokens', '09 · Home – Search, tokens & alerts', 'list', {
    title: 'Manage tokens',
    rows: ['Arxon · Shown', 'Bitcoin · Shown', 'Ethereum · Shown', 'Tether · Shown', 'USD Coin · Shown'],
    primary: ['Add custom token', 'add-token'],
  }),
  s('add-token', '09.03 Add custom token', '09 · Home – Search, tokens & alerts', 'form', {
    title: 'Add custom token',
    body: 'Paste a contract on Arxon. Symbol and decimals are read from the token.',
    primary: ['Add token', 'manage'],
  }),
  s('notifications', '09.04 Notifications', '09 · Home – Search, tokens & alerts', 'list', {
    title: 'Notifications',
    rows: ['No new alerts'],
    primary: ['Done', 'home'],
  }),

  s('token-arx', '10.01 Token detail – Arxon (first-timer)', '10 · Token detail', 'detail', {
    title: 'Arxon',
    body: '0.00 tARX on Home. Fund the wallet to start.',
    primary: ['Receive', 'receive'],
    secondary: ['Buy', 'buy'],
    tab: 'home',
  }),
  s('token-btc', '10.02 Token detail – Bitcoin (first-timer)', '10 · Token detail', 'detail', {
    title: 'Bitcoin',
    body: 'This wallet does not hold BTC yet. There is no Bitcoin address to receive.',
    primary: ['Back', 'home'],
    tab: 'home',
  }),
  s('token-eth', '10.03 Token detail – Ethereum (first-timer)', '10 · Token detail', 'detail', {
    title: 'Ethereum',
    body: '0.00 ETH on Home. Ethereum cannot move into the Vault.',
    primary: ['Receive', 'receive'],
    tab: 'home',
  }),
  s('token-sol', '10.10 Token detail – Solana', '10 · Token detail', 'detail', {
    title: 'Solana',
    body: '0.00 SOL on Home. Live market chart.',
    primary: ['Receive', 'receive'],
    tab: 'home',
  }),
  s('token-arx-funded', '10.04 Token detail – Arxon (funded)', '10 · Token detail', 'detail', {
    title: 'Arxon',
    body: '1,400.00 tARX on Home. No market price.',
    primary: ['Send', 'send-token'],
    secondary: ['Receive', 'receive'],
    tab: 'home',
  }),
  s('token-btc-funded', '10.05 Token detail – Bitcoin (funded)', '10 · Token detail', 'detail', {
    title: 'Bitcoin',
    body: 'Shown for the design. This build does not hold BTC.',
    primary: ['Back', 'home-funded'],
    tab: 'home',
  }),
  s('token-eth-funded', '10.06 Token detail – Ethereum (funded)', '10 · Token detail', 'detail', {
    title: 'Ethereum',
    body: 'Home funds only. Ethereum cannot go in the Vault.',
    primary: ['Send', 'send-amount'],
    tab: 'home',
  }),
  s('token-usdt', '10.07 Token detail – Tether (funded)', '10 · Token detail', 'detail', {
    title: 'Tether',
    body: 'USDT on Home. USDT on Arxon can move to the Vault.',
    primary: ['Send', 'send-amount'],
    secondary: ['Move to Vault', 'vault-amount'],
    tab: 'home',
  }),
  s('token-arx-split', '10.08 Token detail – Arxon (Home balance, funds in Vault)', '10 · Token detail', 'detail', {
    title: 'Arxon',
    body: 'Home shows 1,400.00 tARX. Vault funds are not in this total.',
    primary: ['In Vault', 'vault'],
    secondary: ['Send', 'send-amount-vault'],
    tab: 'home',
  }),
  s('token-usdc', '10.09 Token detail – USD Coin (funded)', '10 · Token detail', 'detail', {
    title: 'USD Coin',
    body: 'USDC on Home. The In Vault pill opens the Vault when this token is there.',
    primary: ['In Vault', 'vault'],
    tab: 'home',
  }),

  s('send-token', '11.01 Send – Select token', '11 · Send', 'list', {
    title: 'Send',
    body: 'Home funds only.',
    rows: ['Arxon · tARX', 'Ethereum · ETH', 'Tether · USDT', 'USD Coin · USDC'],
    primary: ['Arxon', 'send-who'],
  }),
  s('send-who', '11.02 Send – Select recipient', '11 · Send', 'form', {
    title: 'Who is this for?',
    body: 'An address or an Arxon name.',
    primary: ['Continue', 'send-amount'],
    secondary: ['Scan QR', 'send-qr'],
  }),
  s('send-amount', '11.03 Send – Amount', '11 · Send', 'amount', {
    title: 'Amount',
    body: 'Available on Home.',
    primary: ['Review', 'send-review'],
  }),
  s('send-review', '11.04 Send – Review', '11 · Send', 'review', {
    title: 'Review',
    body: 'Privacy starts from your defaults. Change it for this payment only.',
    primary: ['Send', 'send-success'],
    secondary: ['Payment privacy', 'send-privacy'],
    rows: ['To · 0x4c…a91e', 'Amount · 25 tARX', 'Network fee · 0.0004 tARX'],
  }),
  s('send-success', '11.05 Send – Success', '11 · Send', 'success', {
    title: 'Sent',
    body: '25 tARX left Home. The public receipt shows what you chose to leave visible.',
    primary: ['Done', 'home-funded'],
    secondary: ['View private receipt', 'receipt'],
  }),
  s('send-privacy', '11.06 Send – Payment privacy', '11 · Send', 'list', {
    title: 'Payment privacy',
    body: 'What the public will see on this payment.',
    rows: ['Hide sender', 'Hide receiver', 'Hide amount', 'Hide balance'],
    primary: ['Apply to this payment', 'send-review'],
    secondary: ['Change my defaults', 'defaults'],
  }),
  s('send-failed', '11.07 Send – Failed', '11 · Send', 'caution', {
    title: 'Send failed',
    body: 'Nothing left your wallet. The fee was not charged.',
    primary: ['Try again', 'send-review'],
    secondary: ['Back to Home', 'home-funded'],
  }),
  s('send-qr', '11.08 Send – Scan QR code', '11 · Send', 'hero', {
    title: 'Scan a QR code',
    body: 'Point the camera at an Arxon address.',
    primary: ['Enter address instead', 'send-who'],
  }),
  s('send-amount-vault', '11.09 Send – Amount (Vault funds excluded)', '11 · Send', 'amount', {
    title: 'Amount',
    body: 'Vault funds are not available here. Send those from the Vault.',
    primary: ['Review', 'send-review'],
    secondary: ['Send from Vault', 'vault-send-options'],
  }),

  s('receive', '12.01 Receive', '12 · Receive & networks', 'detail', {
    title: 'Receive',
    body: 'Account 01 · Arxon testnet · tARX',
    primary: ['Copy address', 'receive'],
    secondary: ['Select network', 'network'],
    rows: ['0x4c21…a91e'],
  }),
  s('network', '12.02 Select network', '12 · Receive & networks', 'list', {
    title: 'Select network',
    rows: ['Arxon testnet · 7171', 'Ethereum · real ETH'],
    primary: ['Add network', 'add-network'],
    secondary: ['Done', 'receive'],
  }),
  s('add-network', '12.03 Add network', '12 · Receive & networks', 'form', {
    title: 'Add network',
    body: 'Name, RPC, chain id, and symbol. Explorer is optional.',
    primary: ['Save network', 'network'],
  }),

  s('swap', '13.01 Swap', '13 · Swap', 'amount', {
    title: 'Swap',
    body: 'Uses Home funds only. tARX has no market on this testnet, so a swap cannot price yet.',
    primary: ['Review', 'swap-review'],
    secondary: ['Move to Home', 'move-home'],
  }),
  s('swap-token', '13.02 Swap – Select token', '13 · Swap', 'list', {
    title: 'Select token',
    rows: ['Arxon', 'Ethereum', 'Tether', 'USD Coin'],
    primary: ['Arxon', 'swap'],
  }),
  s('swap-review', '13.03 Swap – Review', '13 · Swap', 'review', {
    title: 'Review swap',
    rows: ['Pay · Home balance', 'Receive · quote unavailable', 'Slippage · 0.5%', 'Privacy · your defaults'],
    primary: ['Confirm swap', 'swap-success'],
    secondary: ['Cancel', 'swap'],
  }),
  s('swap-success', '13.04 Swap – Success', '13 · Swap', 'success', {
    title: 'Swapped',
    body: 'A live quote is not available on testnet yet. This screen is the success state.',
    primary: ['Done', 'home-funded'],
  }),
  s('swap-vault', '13.05 Swap – Vault funds not available', '13 · Swap', 'amount', {
    title: 'Swap',
    body: 'Available is your Home balance. Vault funds have to move to Home first.',
    primary: ['Move to Home', 'move-home'],
    secondary: ['Back', 'home-vaulted'],
  }),

  s('buy', '14.01 Buy – Amount', '14 · Buy', 'amount', {
    title: 'Buy',
    body: 'Buying isn’t open on testnet. Receive tARX, or use funds already on Home.',
    primary: ['Review', 'buy-review'],
  }),
  s('buy-review', '14.02 Buy – Review', '14 · Buy', 'review', {
    title: 'Review buy',
    body: 'No card charge is sent from this preview.',
    primary: ['Confirm', 'buy-status'],
    secondary: ['Cancel', 'buy'],
  }),
  s('buy-status', '14.03 Buy – Status', '14 · Buy', 'success', {
    title: 'Buy pending',
    body: 'This provider is not connected yet.',
    primary: ['Done', 'home'],
  }),

  s('activity-empty', '15.01 Activity – Empty', '15 · Activity', 'list', {
    title: 'History',
    body: 'Payments and Vault moves show up here.',
    rows: ['Nothing yet'],
    tab: 'history',
  }),
  s('activity', '15.02 Activity', '15 · Activity', 'list', {
    title: 'History',
    rows: ['Sent · 25 tARX', 'Received · 10 tARX', 'Moved to Vault · 500 tARX'],
    primary: ['Filter', 'activity-filter'],
    tab: 'history',
  }),
  s('tx', '15.03 Transaction details', '15 · Activity', 'detail', {
    title: 'Transaction',
    body: 'Sent 25 tARX from Home.',
    primary: ['View private receipt', 'receipt'],
    secondary: ['Back', 'activity'],
  }),
  s('activity-filter', '15.04 Activity – Filter', '15 · Activity', 'overlay', {
    title: 'Filter',
    body: 'Type, token, and date.',
    parent: 'activity',
    tab: 'history',
    rows: ['All', 'Sent', 'Received', 'Swaps', 'Private', 'Vault moves'],
    primary: ['Apply', 'activity-vault'],
    secondary: ['Reset', 'activity'],
  }),
  s('activity-vault', '15.05 Activity – Vault moves', '15 · Activity', 'list', {
    title: 'History',
    body: 'Vault moves sit in All. Amounts are not colored.',
    rows: ['Moved to Vault · 500 tARX', 'Moved to Home · 100 tARX'],
    tab: 'history',
    primary: ['Filter', 'activity-filter'],
  }),
  s('tx-vault', '15.06 Transaction details – Moved to Vault', '15 · Activity', 'detail', {
    title: 'Moved to Vault',
    body: '500 tARX left Home and entered the Vault.',
    primary: ['Move back to Home', 'move-home'],
    secondary: ['Back', 'activity-vault'],
  }),
  s('activity-filtered', '15.07 Activity – Filtered: Vault moves', '15 · Activity', 'list', {
    title: 'History',
    body: 'Filter · Vault moves',
    rows: ['Moved to Vault · 500 tARX'],
    tab: 'history',
    primary: ['Clear filter', 'activity'],
  }),
  s('activity-none', '15.08 Activity – Filtered: Vault moves (no results)', '15 · Activity', 'list', {
    title: 'History',
    body: 'No Vault moves match this filter.',
    rows: ['Nothing matches'],
    tab: 'history',
    primary: ['Clear filter', 'activity'],
  }),

  s('receipt', '16.01 Private receipt', '16 · Private receipt & disclosure codes', 'detail', {
    title: 'Private receipt',
    body: 'You can see the full payment. The public receipt shows only what you left visible.',
    primary: ['Generate disclosure code', 'code-create'],
    secondary: ['View codes', 'code-log'],
  }),
  s('code-create', '16.02 Disclosure code – Create', '16 · Private receipt & disclosure codes', 'form', {
    title: 'Disclosure code',
    body: 'Who is this for? One code, single use, logged on-chain.',
    rows: ['Lawyer', 'Judge', 'Regulator', 'Other'],
    primary: ['Generate code', 'code-ready'],
  }),
  s('code-ready', '16.03 Disclosure code – Ready', '16 · Private receipt & disclosure codes', 'success', {
    title: 'Code ready',
    body: 'ARX-7K2Q · single use. Share it only with the person you named.',
    primary: ['Copy code', 'code-log'],
    secondary: ['Generate new code', 'code-create'],
  }),
  s('code-log', '16.04 Disclosure codes – Log', '16 · Private receipt & disclosure codes', 'list', {
    title: 'Disclosure codes',
    rows: ['Lawyer · ARX-•••• · not used', 'Regulator · ARX-•••• · used'],
    primary: ['Done', 'receipt'],
  }),

  s('claim', '17.01 Claim ARX', '17 · Claim ARX', 'review', {
    title: 'Claim your ARX',
    body: 'Converts today’s mining points once. This cannot be undone.',
    rows: ['From · ARX-P', 'To · Account 01', 'Claims left · 1'],
    primary: ['Claim ARX', 'claim-done'],
  }),
  s('claim-done', '17.02 Claim ARX – Success', '17 · Claim ARX', 'success', {
    title: 'ARX claimed',
    body: 'The points are claimed. Home updates when the chain confirms.',
    primary: ['Done', 'home-funded'],
  }),

  s('vault-empty', '18.01 Vault – Empty', '18 · Vault & accounts', 'detail', {
    title: 'Vault',
    body: 'Move funds into your Vault to hide them from your Home balance. Move them back any time.',
    rows: ['Hidden from Home', 'Same recovery phrase', 'Move back any time'],
    primary: ['Move funds to Vault', 'vault-pick-in'],
    tab: 'vault',
  }),
  s('vault', '18.02 Vault', '18 · Vault & accounts', 'detail', {
    title: 'Vault',
    body: '500.00 tARX · Hidden. One Vault for this wallet, shared by every account.',
    rows: ['Arxon · 500 tARX · Hidden'],
    primary: ['Move in', 'vault-pick-in'],
    secondary: ['Move out', 'vault-pick-out'],
    tab: 'vault',
  }),
  s('vault-amount', '18.03 Move to Vault – Amount', '18 · Vault & accounts', 'amount', {
    title: 'Move to Vault',
    body: 'Available on Home. Max leaves the network fee.',
    primary: ['Review', 'vault-review'],
  }),
  s('vault-review', '18.04 Move to Vault – Review', '18 · Vault & accounts', 'review', {
    title: 'Review move',
    rows: ['To · Vault', 'From · Home · Account 01', 'Privacy · hidden from Home', 'Network fee · 0.0004 tARX'],
    primary: ['Confirm and move', 'vault-pending'],
    secondary: ['Cancel', 'vault'],
  }),
  s('vault-done', '18.05 Moved to Vault – Success', '18 · Vault & accounts', 'success', {
    title: 'Moved to Vault',
    body: 'Home no longer counts these funds.',
    primary: ['Done', 'vault'],
    secondary: ['Back to Home', 'home-vaulted'],
  }),
  s('move-home', '18.06 Move to Home – Amount', '18 · Vault & accounts', 'amount', {
    title: 'Move to Home',
    body: 'The fee is paid from the amount you move. There is no review step.',
    primary: ['Move to Home', 'move-home-done'],
  }),
  s('move-home-done', '18.07 Moved to Home – Success', '18 · Vault & accounts', 'success', {
    title: 'Moved to Home',
    body: 'These funds are on Home again and can be sent or swapped.',
    primary: ['Done', 'vault'],
    secondary: ['Back to Home', 'home-unvaulted'],
  }),
  s('vault-nofunds', '18.08 Vault – Empty, no funds on Home', '18 · Vault & accounts', 'detail', {
    title: 'Vault',
    body: 'Home is empty, so there is nothing to move in.',
    primary: ['Add funds', 'buy'],
    tab: 'vault',
  }),
  s('vault-over', '18.09 Move to Vault – Amount over available', '18 · Vault & accounts', 'amount', {
    title: 'Move to Vault',
    body: 'That amount is over what Home has. Review stays off.',
    primary: ['Review', 'vault-over'],
  }),
  s('vault-failed', '18.10 Move to Vault – Failed', '18 · Vault & accounts', 'caution', {
    title: 'Move failed',
    body: 'Balances did not change. A failed move charges no fee.',
    primary: ['Try again', 'vault-review'],
    secondary: ['Back to Vault', 'vault'],
  }),
  s('accounts', '18.11 Switch account', '18 · Vault & accounts', 'overlay', {
    title: 'Accounts',
    body: 'Same recovery phrase. Same Vault.',
    parent: 'home',
    rows: ['Account 01 · Active', 'Add account'],
    primary: ['Add account', 'add-account'],
    secondary: ['Close', 'home'],
  }),
  s('add-account', '18.12 Add account', '18 · Vault & accounts', 'form', {
    title: 'Add account',
    body: 'A name for another account on this phrase. It shares the Vault.',
    primary: ['Create account', 'home'],
  }),
  s('vault-pending', '18.13 Moving to Vault – Pending', '18 · Vault & accounts', 'success', {
    title: 'Moving to Vault',
    body: 'Waiting for the chain. Home updates when it confirms.',
    primary: ['View status', 'vault-done'],
  }),
  s('vault-lock', '18.14 Unlock Vault', '18 · Vault & accounts', 'form', {
    title: 'Unlock Vault',
    body: 'Face ID or your password. Home stays usable while this is locked.',
    primary: ['Unlock', 'vault'],
    secondary: ['Use Face ID', 'vault'],
  }),
  s('vault-lock-wrong', '18.15 Unlock Vault – Wrong password', '18 · Vault & accounts', 'form', {
    title: 'Unlock Vault',
    body: 'Wrong password. Five in a row locks the Vault for five minutes.',
    primary: ['Try again', 'vault-locked'],
  }),
  s('vault-pick-in', '18.16 Move to Vault – Select token', '18 · Vault & accounts', 'list', {
    title: 'Move to Vault',
    body: 'v1: tARX, USDT, and USDC on Arxon. Bitcoin and Ethereum cannot.',
    rows: ['Arxon · Home', 'Tether · Home', 'USD Coin · Home'],
    primary: ['Arxon', 'vault-amount'],
  }),
  s('vault-pick-out', '18.17 Move to Home – Select token', '18 · Vault & accounts', 'list', {
    title: 'Move to Home',
    rows: ['Arxon · In Vault'],
    primary: ['Arxon', 'move-home'],
  }),
  s('vault-many', '18.18 Vault – Multiple tokens', '18 · Vault & accounts', 'list', {
    title: 'Vault',
    body: 'Sorted by value. Send opens the token list when more than one token is here.',
    rows: ['Arxon · Hidden', 'USD Coin · Hidden', 'Tether · Hidden'],
    primary: ['Send', 'vault-send-token'],
    secondary: ['Move out', 'vault-pick-out'],
    tab: 'vault',
  }),
  s('vault-locked', '18.19 Unlock Vault – Locked after too many attempts', '18 · Vault & accounts', 'caution', {
    title: 'Vault locked',
    body: 'Too many passwords. Locked for 5 minutes, then 10, 20, and 30 at most. Home still works.',
    primary: ['Back to Home', 'home-funded'],
    tab: 'vault',
  }),
  s('vault-send-options', '18.20 Vault – Send options', '18 · Vault & accounts', 'overlay', {
    title: 'Send from Vault',
    parent: 'vault',
    tab: 'vault',
    rows: ['Private transfer', 'Unshield to public address'],
    primary: ['Private transfer', 'priv-amount'],
    secondary: ['Unshield to public address', 'unshield-amount'],
  }),
  s('priv-amount', '18.21 Private transfer – Amount', '18 · Vault & accounts', 'amount', {
    title: 'Private transfer',
    body: 'Sender, recipient, and amount stay hidden.',
    primary: ['Review', 'priv-review'],
  }),
  s('priv-review', '18.22 Private transfer – Review', '18 · Vault & accounts', 'review', {
    title: 'Review private transfer',
    rows: ['From · Vault', 'Privacy · sender, recipient, amount hidden', 'Fee · from the Vault'],
    primary: ['Send', 'priv-pending'],
  }),
  s('priv-done', '18.23 Private transfer – Success', '18 · Vault & accounts', 'success', {
    title: 'Sent from Vault',
    body: 'The Vault balance dropped. Home did not change.',
    primary: ['Done', 'vault'],
  }),
  s('unshield-amount', '18.24 Unshield to address – Amount', '18 · Vault & accounts', 'amount', {
    title: 'Unshield to address',
    body: 'The recipient and amount will be visible on-chain.',
    primary: ['Review', 'unshield-review'],
  }),
  s('unshield-review', '18.25 Unshield to address – Review', '18 · Vault & accounts', 'review', {
    title: 'Review unshield',
    rows: ['To · public address', 'Visible · recipient and amount', 'From · Vault'],
    primary: ['Unshield', 'unshield-pending'],
  }),
  s('unshield-done', '18.26 Unshield to address – Success', '18 · Vault & accounts', 'success', {
    title: 'Unshielded',
    body: 'The public address can see the amount. Home is unchanged.',
    primary: ['Done', 'vault'],
  }),
  s('vault-send-token', '18.27 Send from Vault – Select token', '18 · Vault & accounts', 'list', {
    title: 'Send from Vault',
    rows: ['Arxon', 'USD Coin', 'Tether'],
    primary: ['Arxon', 'vault-send-options'],
  }),
  s('priv-pending', '18.28 Private transfer – Pending', '18 · Vault & accounts', 'success', {
    title: 'Sending privately',
    body: 'Waiting for confirmation.',
    primary: ['Continue', 'priv-done'],
  }),
  s('unshield-pending', '18.29 Unshield to address – Pending', '18 · Vault & accounts', 'success', {
    title: 'Unshielding',
    body: 'Waiting for confirmation.',
    primary: ['Continue', 'unshield-done'],
  }),

  s('account', '19.01 Account', '19 · Account & support', 'list', {
    title: 'Account',
    body: 'Account 01 · keys stay on this phone',
    rows: ['Default privacy', 'Face ID & password', 'Arxon Mining · Not set up', 'Help & support', 'Currency · USD'],
    tab: 'account',
  }),
  s('currency', '19.02 Currency', '19 · Account & support', 'list', {
    title: 'Currency',
    rows: ['USD · Selected'],
    primary: ['Done', 'account'],
  }),
  s('help', '19.03 Help & support', '19 · Account & support', 'list', {
    title: 'Help & support',
    rows: ['Guides and FAQs', 'Report a problem'],
    primary: ['Report a problem', 'report'],
  }),
  s('report', '19.04 Report a problem', '19 · Account & support', 'form', {
    title: 'Report a problem',
    body: 'App version and device only. Never keys or balances.',
    rows: ['Bug', 'Transaction', 'Suggestion', 'Other'],
    primary: ['Send report', 'help'],
  }),

  s('privacy', '20.01 Privacy settings', '20 · Privacy & security', 'list', {
    title: 'Privacy',
    rows: ['Default privacy', 'Balance privacy', 'Auto-lock', 'Face ID & password', 'Connected apps'],
    primary: ['Default privacy', 'defaults'],
  }),
  s('defaults', '20.02 Default privacy', '20 · Privacy & security', 'list', {
    title: 'Default privacy',
    body: 'Your current mode. Saved on this phone and used on the next payment.',
    rows: ['Hide sender', 'Hide receiver', 'Hide amount', 'Hide balance'],
    primary: ['Save defaults', 'privacy'],
  }),
  s('balance-privacy', '20.03 Balance privacy', '20 · Privacy & security', 'hero', {
    title: 'Balance privacy',
    body: 'Hide the Home total, the change, and every token amount.',
    primary: ['Hide balances', 'home-hidden'],
  }),
  s('autolock', '20.04 Auto-lock', '20 · Privacy & security', 'overlay', {
    title: 'Auto-lock',
    parent: 'privacy',
    rows: ['Immediately', '1 minute', '5 minutes', '15 minutes', '1 hour'],
    primary: ['5 minutes', 'privacy'],
  }),
  s('face-settings', '20.05 Face ID & password', '20 · Privacy & security', 'list', {
    title: 'Face ID & password',
    rows: ['Face ID · Off', 'Opening the Vault · Off', 'Change password', 'View recovery phrase'],
    primary: ['Change password', 'change-pass'],
    secondary: ['View phrase', 'view-verify'],
  }),
  s('change-pass', '20.06 Change password', '20 · Privacy & security', 'form', {
    title: 'Change password',
    body: 'Current password, then a new one.',
    primary: ['Update password', 'face-settings'],
  }),
  s('view-verify', '20.07 View phrase – Verify', '20 · Privacy & security', 'form', {
    title: 'View recovery phrase',
    body: 'Enter your password first.',
    primary: ['Continue', 'view-hidden'],
  }),
  s('view-hidden', '20.08 View phrase – Hidden', '20 · Privacy & security', 'phrase', {
    title: 'Recovery phrase',
    body: 'Hidden until you reveal it.',
    primary: ['Reveal', 'view-shown'],
  }),
  s('view-shown', '20.09 View phrase – Revealed', '20 · Privacy & security', 'phrase', {
    title: 'Recovery phrase',
    body: 'Anyone with these words can move the funds.',
    primary: ['Done', 'face-settings'],
  }),

  s('mine-entry', '21.01 Mining – Entry', '21 · Mining extension', 'hero', {
    title: 'Mine ARX',
    body: 'Earn from this wallet. Mining can see the address you pick. It never asks for your phrase.',
    primary: ['Get started', 'mine-access'],
    secondary: ['Not now', 'home'],
  }),
  s('mine-access', '21.02 Mining – Wallet access request', '21 · Mining extension', 'overlay', {
    title: 'Allow mining',
    body: 'View address and receive rewards. Not your keys.',
    parent: 'mine-entry',
    primary: ['Allow', 'mine-bg'],
    secondary: ['Cancel', 'mine-entry'],
  }),
  s('mine-bg', '21.03 Mining – Background & alerts', '21 · Mining extension', 'list', {
    title: 'Background & alerts',
    rows: ['Run in background', 'Notifications'],
    primary: ['Continue', 'mine-ready'],
    secondary: ['Skip for now', 'mine-ready'],
  }),
  s('mine-ready', '21.04 Mining – Ready', '21 · Mining extension', 'success', {
    title: 'Mining is ready',
    body: 'Rewards go to Account 01.',
    primary: ['Open dashboard', 'mine-dash'],
  }),
  s('mine-perms', '21.05 Mining – Permissions', '21 · Mining extension', 'list', {
    title: 'Mining permissions',
    rows: ['Wallet access · On', 'Background · Off', 'Notifications · Off'],
    primary: ['Remove mining access', 'mine-entry'],
  }),
  s('mine-dash', '21.06 Mining – Dashboard', '21 · Mining extension', 'detail', {
    title: 'Mining',
    body: 'Active. Figures on this screen are placeholders until the live numbers are confirmed.',
    rows: ['Recent rewards'],
    primary: ['Pause mining', 'mine-paused'],
    secondary: ['Permissions', 'mine-perms'],
  }),
  s('mine-paused', '21.07 Mining – Paused', '21 · Mining extension', 'detail', {
    title: 'Mining paused',
    body: 'No rewards while paused.',
    primary: ['Resume mining', 'mine-dash'],
  }),
  s('mine-rewards', '21.08 Mining – Rewards', '21 · Mining extension', 'list', {
    title: 'Rewards',
    body: 'They land on the rewards account. Nothing to claim here.',
    rows: ['+ ARX-P · placeholder'],
    primary: ['Back', 'mine-dash'],
  }),
  s('mine-stopped', '21.09 Mining – Stopped', '21 · Mining extension', 'caution', {
    title: 'Mining stopped',
    body: 'Low battery, no connection, or low power mode. Resume when you’re ready.',
    primary: ['Resume mining', 'mine-dash'],
  }),

  s('explore', '23.01 Explore', '23 · Explore', 'list', {
    title: 'Explore',
    rows: ['Search', 'dApps', 'Explorers', 'Buy', 'Connected apps'],
    tab: 'explore',
  }),
  s('dapps', '23.02 dApps', '23 · Explore', 'list', {
    title: 'dApps',
    body: 'Uniswap, Jupiter, 1inch, Raydium, Aave, Lido, OpenSea, Magic Eden',
    rows: ['Uniswap', 'Jupiter', '1inch', 'Raydium', 'Aave', 'OpenSea'],
    primary: ['Uniswap', 'explore'],
  }),
  s('arxswap', '23.03 Explore', '23 · Explore', 'list', {
    title: 'Explore',
    body: 'In-app browser',
    primary: ['Back', 'explore'],
  }),
];

export const SCREEN_MAP = Object.fromEntries(SCREENS.map((screen) => [screen.id, screen]));
