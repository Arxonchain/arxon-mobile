import { bitcoinSigner } from './altChains';

const API = 'https://mempool.space/api';

type Utxo = { txid: string; vout: number; value: number };

export async function bitcoinBalance(address: string) {
  const res = await fetch(`${API}/address/${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error('Could not read the Bitcoin balance.');
  const body = (await res.json()) as {
    chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
    mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
  };
  const chain = (body.chain_stats?.funded_txo_sum ?? 0) - (body.chain_stats?.spent_txo_sum ?? 0);
  const mempool = (body.mempool_stats?.funded_txo_sum ?? 0) - (body.mempool_stats?.spent_txo_sum ?? 0);
  return (chain + mempool) / 1e8;
}

/** Sign and broadcast a native Bitcoin payment from the wallet's bc1 address. */
export async function sendBitcoin(mnemonic: string, index: number, to: string, amount: string) {
  const signer = await bitcoinSigner(mnemonic, index);
  const btc = await import('@scure/btc-signer');
  const sats = toBaseUnits(amount, 8);
  if (sats < 546n) throw new Error('That Bitcoin amount is below the network dust limit.');
  const utxos = await readUtxos(signer.address);
  if (!utxos.length) throw new Error('This Bitcoin address has no spendable coins yet.');
  const rate = await feeRate();
  const picked = selectUtxos(utxos, sats, rate);
  const payment = btc.p2wpkh(signer.publicKey, btc.NETWORK);
  if (!payment.script) throw new Error('Could not build the Bitcoin payment.');
  const tx = new btc.Transaction();
  for (const utxo of picked.inputs) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: payment.script, amount: BigInt(utxo.value) },
    });
  }
  tx.addOutputAddress(to.trim(), sats, btc.NETWORK);
  if (picked.change > 0n) tx.addOutputAddress(signer.address, picked.change, btc.NETWORK);
  const signed = tx.sign(signer.privateKey);
  tx.finalize();
  if (!signed) throw new Error('Could not sign the Bitcoin transaction.');
  const raw = tx.hex;
  const res = await fetch(`${API}/tx`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: raw });
  const text = (await res.text()).trim();
  if (!res.ok) throw new Error(text || 'The Bitcoin network rejected this transaction.');
  return text;
}

async function readUtxos(address: string) {
  const res = await fetch(`${API}/address/${encodeURIComponent(address)}/utxo`);
  if (!res.ok) throw new Error('Could not read Bitcoin coins for this address.');
  const rows = (await res.json()) as Utxo[];
  return rows.filter((row) => row.txid && Number.isFinite(row.value) && row.value > 0);
}

async function feeRate() {
  const res = await fetch(`${API}/v1/fees/recommended`);
  if (!res.ok) return 3;
  const body = (await res.json()) as { halfHourFee?: number; hourFee?: number };
  const rate = Number(body.halfHourFee || body.hourFee || 2);
  return Number.isFinite(rate) && rate > 0 ? rate : 2;
}

function selectUtxos(utxos: Utxo[], sats: bigint, rate: number) {
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const picked: Utxo[] = [];
  let total = 0n;
  for (const utxo of sorted) {
    picked.push(utxo);
    total += BigInt(utxo.value);
    const fee = estimateFee(picked.length, 2, rate);
    if (total >= sats + fee) break;
  }
  const withChange = estimateFee(picked.length, 2, rate);
  const noChange = estimateFee(picked.length, 1, rate);
  if (total >= sats + withChange + 546n) {
    return { inputs: picked, change: total - sats - withChange };
  }
  if (total >= sats + noChange) return { inputs: picked, change: 0n };
  throw new Error('Not enough Bitcoin to cover this amount and the network fee.');
}

function estimateFee(inputs: number, outputs: number, rate: number) {
  const vbytes = 11 + inputs * 68 + outputs * 31;
  return BigInt(Math.ceil(vbytes * rate));
}

function toBaseUnits(amount: string, decimals: number) {
  const cleaned = amount.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error('Enter a valid amount.');
  const [whole, frac = ''] = cleaned.split('.');
  if (frac.length > decimals) throw new Error('Too many decimal places for this coin.');
  const scale = 10n ** BigInt(decimals);
  return BigInt(whole || '0') * scale + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
}
