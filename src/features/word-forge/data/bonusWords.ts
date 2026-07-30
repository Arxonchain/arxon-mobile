export interface BonusWord {
  word: string;
  definition: string;
}

export const BONUS_WORDS: BonusWord[] = [
  { word: 'ARX', definition: 'Arxon ecosystem token and brand core.' },
  { word: 'ARXP', definition: 'Arxon points earned before TGE conversion.' },
  { word: 'HODL', definition: 'Hold through volatility instead of panic-selling.' },
  { word: 'FOMO', definition: 'Fear of missing out on a rally or drop.' },
  { word: 'BULLISH', definition: 'Expecting prices or sentiment to rise.' },
  { word: 'BEARISH', definition: 'Expecting prices or sentiment to fall.' },
  { word: 'WHALE', definition: 'A holder with enough size to move markets.' },
  { word: 'NODE', definition: 'Network participant that validates or relays data.' },
  { word: 'LEDGER', definition: 'Immutable record of transactions or state.' },
  { word: 'WALLET', definition: 'Keys and interface for holding crypto assets.' },
  { word: 'MINER', definition: 'Participant securing or producing network value.' },
  { word: 'STAKE', definition: 'Lock tokens to secure a network and earn yield.' },
  { word: 'YIELD', definition: 'Return earned from staking or liquidity.' },
  { word: 'TOKEN', definition: 'On-chain unit representing value or utility.' },
  { word: 'CHAIN', definition: 'Sequential blocks forming a distributed ledger.' },
  { word: 'BLOCK', definition: 'Batch of transactions sealed into the chain.' },
  { word: 'HASH', definition: 'One-way fingerprint of data used in blockchains.' },
  { word: 'MINT', definition: 'Create new tokens or NFTs on-chain.' },
  { word: 'BURN', definition: 'Permanently remove tokens from supply.' },
  { word: 'SWAP', definition: 'Exchange one asset for another.' },
  { word: 'POOL', definition: 'Shared liquidity or reward reservoir.' },
  { word: 'FARM', definition: 'Earn rewards by supplying liquidity or stake.' },
  { word: 'APE', definition: 'Slang for entering a position aggressively.' },
  { word: 'REKT', definition: 'Slang for taking a heavy loss on a trade.' },
  { word: 'MOON', definition: 'Slang for a sharp upward price move.' },
  { word: 'PUMP', definition: 'Rapid price increase, often hype-driven.' },
  { word: 'DUMP', definition: 'Rapid sell-off driving price down.' },
  { word: 'DIP', definition: 'Short-term price pullback before recovery.' },
  { word: 'RUG', definition: 'Slang for a scam pull of liquidity or funds.' },
  { word: 'GAS', definition: 'Fee paid to execute transactions on-chain.' },
  { word: 'DEFI', definition: 'Decentralized finance without traditional banks.' },
  { word: 'DEX', definition: 'Decentralized exchange for peer swaps.' },
  { word: 'CEX', definition: 'Centralized exchange operated by a company.' },
  { word: 'KYC', definition: 'Identity verification required by some platforms.' },
  { word: 'DAO', definition: 'Community-governed organization on-chain.' },
  { word: 'NFT', definition: 'Unique digital asset recorded on a blockchain.' },
  { word: 'LAYER', definition: 'Stack level in a blockchain network design.' },
  { word: 'BRIDGE', definition: 'Protocol moving assets between chains.' },
  { word: 'VAULT', definition: 'Secured store of assets or strategies.' },
  { word: 'ORACLE', definition: 'Feeds real-world data into smart contracts.' },
  { word: 'ALPHA', definition: 'Early or privileged market insight.' },
  { word: 'BETA', definition: 'Early software stage before full release.' },
  { word: 'TGE', definition: 'Token Generation Event — launch of a token.' },
  { word: 'AIRDROP', definition: 'Free token distribution to eligible wallets.' },
  { word: 'LAMBO', definition: 'Meme symbol of crypto wealth goals.' },
  { word: 'NGMI', definition: 'Slang: "not gonna make it" — bearish on someone.' },
  { word: 'WAGMI', definition: 'Slang: "we\'re all gonna make it" — community optimism.' },
  { word: 'DYOR', definition: 'Do your own research before investing.' },
  { word: 'SAFU', definition: 'Meme assurance that funds are safe.' },
];

const BONUS_SET = new Set(BONUS_WORDS.map((b) => b.word));

export function isBonusWord(word: string): boolean {
  return BONUS_SET.has(word.toUpperCase());
}

export function bonusDefinition(word: string): string | null {
  const hit = BONUS_WORDS.find((b) => b.word === word.toUpperCase());
  return hit?.definition ?? null;
}

export function bonusWordsInRange(minLen: number, maxLen: number): string[] {
  return BONUS_WORDS
    .map((b) => b.word)
    .filter((w) => w.length >= minLen && w.length <= maxLen);
}
