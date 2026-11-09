import { useCallback, useEffect, useState } from 'react';
import { getAddress } from 'viem';
import { quoteArxonFee } from '@/chainWallet/chain';
import { quoteBitcoinFee } from '@/chainWallet/bitcoinSend';
import { quoteEthereumFee } from '@/chainWallet/ethereum';
import type { EthereumToken } from '@/chainWallet/networks';
import { quoteSolanaFee } from '@/chainWallet/solanaSend';
import { useLiveFrame } from './liveFrame';

function qtyLabel(value: number, symbol: string) {
  if (!Number.isFinite(value) || value <= 0) return `0 ${symbol}`;
  const digits = value >= 1 ? 4 : value >= 0.0001 ? 6 : 8;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: digits })} ${symbol}`;
}

function amountLabel(value: number, symbol: string) {
  const digits = Number.isInteger(value) ? 2 : value >= 1 ? 4 : 6;
  return `${value.toLocaleString('en-US', { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits })} ${symbol}`;
}

export function useLiveFee(opts: {
  amount: string;
  to: string;
  symbol: string;
  testnet?: boolean;
  chain?: 'ethereum' | 'solana';
}) {
  const live = useLiveFrame();
  const unitGuess = opts.testnet || /^(ARX|ARXT|TARX)$/i.test(opts.symbol) ? (opts.testnet ? 'tARX' : 'ARX') : opts.symbol;
  const [fee, setFee] = useState(0);
  const [unit, setUnit] = useState(unitGuess);
  const [busy, setBusy] = useState(!!live?.app);
  const [tick, setTick] = useState(0);
  const requote = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!live?.app) {
      setBusy(false);
      return;
    }
    let cancel = false;
    setBusy(true);
    void quoteFee(live, opts).then((row) => {
      if (cancel) return;
      setFee(row.fee);
      setUnit(row.unit);
      setBusy(false);
    }).catch(() => {
      if (cancel) return;
      setFee(0);
      setUnit(unitGuess);
      setBusy(false);
    });
    return () => {
      cancel = true;
    };
  }, [live?.app, live?.address, live?.rpcUrl, live?.btcAddress, live?.solAddress, opts.amount, opts.to, opts.symbol, opts.testnet, opts.chain, tick, unitGuess]);

  const sendQty = Number(String(opts.amount).replace(/,/g, '')) || 0;
  const feeLabel = busy ? 'Checking…' : qtyLabel(fee, unit);
  const same = unit.toUpperCase() === unitGuess.toUpperCase() || unit.toUpperCase() === opts.symbol.toUpperCase();
  const totalLabel = !busy && same && fee > 0
    ? amountLabel(sendQty + fee, unitGuess)
    : amountLabel(sendQty, unitGuess);

  return { fee, unit, busy, requote, feeLabel, totalLabel };
}

async function quoteFee(
  live: NonNullable<ReturnType<typeof useLiveFrame>>,
  opts: { amount: string; to: string; symbol: string; testnet?: boolean; chain?: 'ethereum' | 'solana' },
) {
  const sym = opts.symbol.toUpperCase();
  const amount = String(opts.amount).replace(/,/g, '');
  const arxon = opts.testnet || sym === 'ARX' || sym === 'ARXT' || sym === 'TARX';
  if (arxon) {
    const from = live.address && /^0x[0-9a-fA-F]{40}$/.test(live.address) ? getAddress(live.address) : undefined;
    const dest = /^0x[0-9a-fA-F]{40}$/.test(opts.to) ? getAddress(opts.to) : from;
    const fee = from ? await quoteArxonFee(live.rpcUrl, from, dest, amount) : 0;
    return { fee, unit: opts.testnet ? 'tARX' : 'ARX' };
  }
  if (sym === 'BTC' && live.btcAddress) {
    return { fee: await quoteBitcoinFee(live.btcAddress, amount), unit: 'BTC' };
  }
  if (sym === 'SOL' && live.solAddress) {
    return { fee: await quoteSolanaFee(live.solAddress, opts.to, 'SOL'), unit: 'SOL' };
  }
  if ((sym === 'USDT' || sym === 'USDC') && opts.chain === 'solana' && live.solAddress) {
    return { fee: await quoteSolanaFee(live.solAddress, opts.to, sym), unit: 'SOL' };
  }
  if ((sym === 'ETH' || sym === 'USDT' || sym === 'USDC') && live.address && /^0x[0-9a-fA-F]{40}$/.test(opts.to)) {
    const fee = await quoteEthereumFee(sym as EthereumToken, getAddress(live.address), getAddress(opts.to), amount);
    return { fee, unit: 'ETH' };
  }
  return { fee: 0, unit: sym };
}
