import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { solanaSigner } from './altChains';

const RPC = 'https://solana-rpc.publicnode.com';

export const SOL_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
export const SOL_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function connection() {
  return new Connection(RPC, 'confirmed');
}

function keypair(secret: Uint8Array) {
  return Keypair.fromSeed(secret);
}

export async function solanaBalance(address: string) {
  const lamports = await connection().getBalance(new PublicKey(address), 'confirmed');
  return lamports / 1e9;
}

export async function solanaTokenBalance(owner: string, mint: string) {
  const conn = connection();
  const ata = await getAssociatedTokenAddress(new PublicKey(mint), new PublicKey(owner));
  try {
    const account = await getAccount(conn, ata);
    return Number(account.amount) / 1e6;
  } catch {
    return 0;
  }
}

/** Sign and broadcast native SOL from the wallet's Solana address. */
export async function sendSolana(mnemonic: string, index: number, to: string, amount: string) {
  const signer = await solanaSigner(mnemonic, index);
  const from = keypair(signer.secret);
  const conn = connection();
  const lamports = toBaseUnits(amount, 9);
  if (lamports <= 0n) throw new Error('Enter an amount greater than zero.');
  const balance = await conn.getBalance(from.publicKey, 'confirmed');
  if (BigInt(balance) < lamports + 5000n) {
    throw new Error('Not enough SOL to cover this amount and the network fee.');
  }
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: new PublicKey(to.trim()),
      lamports,
    }),
  );
  return conn.sendTransaction(tx, [from]);
}

/** Sign and broadcast SPL USDT or USDC. Creates the receiver's token account when it is missing. */
export async function sendSolanaStable(mnemonic: string, index: number, symbol: 'USDT' | 'USDC', to: string, amount: string) {
  const signer = await solanaSigner(mnemonic, index);
  const from = keypair(signer.secret);
  const conn = connection();
  const mint = new PublicKey(symbol === 'USDT' ? SOL_USDT : SOL_USDC);
  const owner = new PublicKey(to.trim());
  const fromAta = await getAssociatedTokenAddress(mint, from.publicKey);
  const toAta = await getAssociatedTokenAddress(mint, owner);
  const units = toBaseUnits(amount, 6);
  if (units <= 0n) throw new Error('Enter an amount greater than zero.');
  const fromAccount = await getAccount(conn, fromAta).catch(() => null);
  if (!fromAccount || fromAccount.amount < units) throw new Error(`Not enough ${symbol} on Solana.`);
  const tx = new Transaction();
  const existing = await conn.getAccountInfo(toAta);
  const sol = await conn.getBalance(from.publicKey, 'confirmed');
  const feeReserve = existing ? 5000 : 2_100_000;
  if (sol < feeReserve) throw new Error('This Solana address needs a little SOL to pay the network fee.');
  if (!existing) {
    tx.add(createAssociatedTokenAccountInstruction(from.publicKey, toAta, owner, mint));
  }
  tx.add(createTransferInstruction(fromAta, toAta, from.publicKey, units));
  return conn.sendTransaction(tx, [from]);
}

function toBaseUnits(amount: string, decimals: number) {
  const cleaned = amount.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error('Enter a valid amount.');
  const [whole, frac = ''] = cleaned.split('.');
  if (frac.length > decimals) throw new Error('Too many decimal places for this coin.');
  const scale = 10n ** BigInt(decimals);
  return BigInt(whole || '0') * scale + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
}
