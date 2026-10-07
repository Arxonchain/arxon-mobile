import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatUnits, getAddress, parseUnits, type Address } from 'viem';

import { pushActivity, saveClocks } from '@/chainWallet/activity';
import {
  assertKnownArx20Anchor,
  fetchArx20NoteLeaves,
  publicClient,
  waitIncluded,
  walletClient,
} from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import {
  startClocks,
  stampInBlock,
  stampProved,
  stampSent,
  type TxClocks,
  type TxPhase,
} from '@/chainWallet/clocks';
import { useLockNetwork } from '@/chainWallet/walletNav';
import { asBits, SEND_FLAGS, UNSHIELD_FLAGS, VAULT_FLAGS, type PrivacyFlags } from '@/chainWallet/privacy';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { proveShield, proveTransfer, proveUnshield } from '@/chainWallet/prove';
import { storage } from '@/chainWallet/storage';
import {
  arx20ShieldCalldata,
  arx20TransferCalldata,
  arx20UnshieldCalldata,
  erc20TransferCalldata,
} from '@/chainWallet/submitArx20';
import {
  commitTokenOutputs,
  hydrateTokenLeaves,
  loadLiveTokenNotes,
  loadTokenNotes,
  markTokenSpent,
  pickTokenNote,
  shieldedTotal,
  type StoredNote,
} from '@/chainWallet/tokenNotes';
import {
  loadListedTokens,
  tokenPublicBalance,
  type ListedToken,
} from '@/chainWallet/tokens';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';
import { TokenMark } from '@/components/wallet/TokenMark';

const UNIT = BigInt(1_000_000_000);
const OPEN: PrivacyFlags = {
  hideSender: false,
  hideReceiver: false,
  hideAmount: false,
  hideBalance: false,
};

type Mode = 'send' | 'shield' | 'unshield' | 'private';

async function expiryBlock(rpcUrl: string): Promise<number> {
  const block = await publicClient(rpcUrl).getBlockNumber();
  return Number(block) + 96;
}

function requireUnits(amount: string, decimals: number): bigint {
  const wei = parseUnits(amount.trim() || '0', decimals);
  if (wei === BigInt(0) || wei % UNIT !== BigInt(0)) {
    throw new Error('Amount must be a positive multiple of 0.000000001 token units.');
  }
  return wei;
}

export default function WalletToken() {
  const { address: tokenParam = '' } = useParams<{ address: string }>();
  const navigate = useNavigate();
  useLockNetwork('arxon');
  const { address, mnemonic, rpcUrl, shieldedPk, network, setNetwork } = useChainWallet();
  const { show } = useHideBalance();
  const [meta, setMeta] = useState<ListedToken | null>(null);
  const [publicBal, setPublicBal] = useState<string>('—');
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [mode, setMode] = useState<Mode>('send');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [flags, setFlags] = useState<PrivacyFlags>(OPEN);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<TxPhase>('Processing');
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [poolLive, setPoolLive] = useState<boolean | null>(null);

  const token = (() => {
    try {
      return getAddress(tokenParam) as Address;
    } catch {
      return null;
    }
  })();

  const vault = shieldedTotal(notes);
  const vaultLabel = meta ? formatUnits(vault, meta.decimals) : '0';

  const reload = useCallback(async () => {
    if (!token || !address) return;
    const listed = await loadListedTokens();
    const found = listed.find((t) => t.address.toLowerCase() === token.toLowerCase()) ?? null;
    setMeta(found);
    if (!found) return;
    try {
      const bal = await tokenPublicBalance(rpcUrl, token, address);
      setPublicBal(formatUnits(bal, found.decimals));
    } catch {
      setPublicBal('—');
    }
    if (found.standard === 'arx20') {
      const leaves = await fetchArx20NoteLeaves(rpcUrl, token);
      setPoolLive(leaves !== null);
      await hydrateTokenLeaves(rpcUrl, token).catch(() => undefined);
      setNotes(await loadTokenNotes(token));
    } else {
      setPoolLive(null);
    }
  }, [address, rpcUrl, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function sendTx(
    data: `0x${string}`,
    label: string,
    kind: 'shield' | 'private' | 'unshield' | 'transfer',
    clocks?: TxClocks
  ) {
    if (!mnemonic || !token) throw new Error('No wallet');
    const client = walletClient(rpcUrl, mnemonic);
    const hash = await client.sendTransaction({
      to: token,
      data,
      gas: kind === 'transfer' ? BigInt(120_000) : BigInt(8_000_000),
      type: 'legacy' as const,
    } as unknown as Parameters<typeof client.sendTransaction>[0]);
    if (clocks) stampSent(clocks);
    await pushActivity({
      hash,
      kind,
      to: token,
      amount,
      maskBits: 0,
      at: clocks?.tapAt ?? Date.now(),
      token: meta?.symbol ?? 'Token',
      network: 'arxon',
      clocks: clocks ? { ...clocks } : undefined,
    });
    const receipt = await waitIncluded(rpcUrl, hash);
    if (clocks) {
      stampInBlock(clocks);
      await saveClocks(hash, clocks);
      setPhase('In block');
    }
    if (receipt.status !== 'success') {
      throw new Error(`${label} reverted (${hash}).`);
    }
    return hash;
  }

  async function onGo() {
    setNotice(null);
    if (!token || !meta || !mnemonic) return;
    if (!amount.trim()) {
      setNotice('Enter an amount');
      return;
    }
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setPhase('Processing');
    try {
      if (mode === 'send') {
        const wei = parseUnits(amount.trim() || '0', meta.decimals);
        if (wei === BigInt(0)) throw new Error('Enter an amount.');
        const toAddr = getAddress(to.trim()) as Address;
        const hash = await sendTx(erc20TransferCalldata(toAddr, wei), 'Send', 'transfer');
        navigate(`/tx/${hash}`);
        return;
      }
      const clocks = startClocks();
      const wei = requireUnits(amount, meta.decimals);
      const expiry = await expiryBlock(rpcUrl);
      const sk = await storage.getShieldedSk();
      if (mode === 'shield') {
        const proof = await proveShield({
          amountWei: wei,
          maskBits: asBits(VAULT_FLAGS),
          expiryBlock: expiry,
          skHex: sk,
          token,
        });
        stampProved(clocks);
        setPhase('Proved');
        await storage.setShieldedSk(proof.sk_hex);
        const hash = await sendTx(arx20ShieldCalldata(proof), 'Shield', 'shield', clocks);
        await commitTokenOutputs(token, [
          {
            cm: proof.note.cm,
            cv: proof.note.cv,
            rho: proof.note.rho,
            amountWei: proof.note.amount_wei,
            pk: proof.note.pk_hex,
          },
        ], proof.pk_hex);
        navigate(`/tx/${hash}`);
        return;
      }
      if (!sk) throw new Error('Shield once first to create your vault key.');
      const live = await loadLiveTokenNotes(rpcUrl, token);
      const note = pickTokenNote(live.notes, wei, meta.symbol);
      if (mode === 'private') {
        const proof = await proveTransfer({
          amountWei: wei,
          maskBits: asBits(flags),
          expiryBlock: expiry,
          skHex: sk,
          recipientPk: to.trim(),
          note: { amountWei: note.amountWei, rho: note.rho, leafIndex: note.leafIndex },
          leaves: live.leaves,
          token,
        });
        stampProved(clocks);
        setPhase('Proved');
        await assertKnownArx20Anchor(rpcUrl, token, proof.anchor);
        const hash = await sendTx(arx20TransferCalldata(proof), 'Private', 'private', clocks);
        await markTokenSpent(token, note.cm);
        await commitTokenOutputs(
          token,
          proof.notes.map((n) => ({
            cm: n.cm,
            cv: n.cv,
            rho: n.rho,
            amountWei: n.amount_wei,
            pk: n.pk_hex,
          })),
          shieldedPk
        );
        navigate(`/tx/${hash}`);
        return;
      }
      const dest = to.trim() || address;
      if (!dest) throw new Error('No wallet');
      const recipient = getAddress(dest) as Address;
      const proof = await proveUnshield({
        amountWei: wei,
        maskBits: asBits(UNSHIELD_FLAGS),
        expiryBlock: expiry,
        skHex: sk,
        recipient,
        note: { amountWei: note.amountWei, rho: note.rho, leafIndex: note.leafIndex },
        leaves: live.leaves,
        token,
      });
      stampProved(clocks);
      setPhase('Proved');
      await assertKnownArx20Anchor(rpcUrl, token, proof.anchor);
      const hash = await sendTx(arx20UnshieldCalldata(proof, recipient), 'Unshield', 'unshield', clocks);
      await markTokenSpent(token, note.cm);
      await commitTokenOutputs(
        token,
        proof.notes.map((n) => ({
          cm: n.cm,
          cv: n.cv,
          rho: n.rho,
          amountWei: n.amount_wei,
          pk: n.pk_hex,
        })),
        shieldedPk
      );
      navigate(`/tx/${hash}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
      void reload();
    }
  }

  if (network === 'ethereum') {
    return (
      <div style={{ ...walletPage, padding: '52px 20px 0' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 12px' }}>{meta?.symbol ?? 'Token'}</h1>
        <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Arxon Testnet only</p>
        <button type="button" style={walletBtn} onClick={() => void setNetwork('arxon')}>
          Arxon Testnet · play
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={walletPage}>
        <p>Invalid token address.</p>
      </div>
    );
  }

  const arx20 = meta?.standard === 'arx20';
  const modes: { id: Mode; label: string; show: boolean }[] = [
    { id: 'send', label: 'Send', show: true },
    { id: 'shield', label: 'Shield', show: !!arx20 },
    { id: 'private', label: 'Private', show: !!arx20 },
    { id: 'unshield', label: 'Unshield', show: !!arx20 },
  ];

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button
        type="button"
        onClick={() => (confirm ? setConfirm(false) : navigate('/testnet'))}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700, marginTop: 12 }}>
        {meta?.standard === 'arx20' ? 'ARX-20' : 'ERC-20'}
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '8px 0 4px' }}>{meta?.symbol ?? 'Token'}</h1>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginBottom: 6 }}>{meta?.name ?? token}</p>
      <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: '8px 0 0' }}>{show(publicBal)}</p>
      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', margin: '4px 0 0' }}>testnet · no USD</p>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        {arx20 ? (
          <>
            <TokenMark id="ARX" size={16} />
            Vault {show(vaultLabel)}
          </>
        ) : (
          'Public'
        )}
      </p>
      {poolLive === false ? (
        <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', marginBottom: 16 }}>Offline</p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {modes
          .filter((m) => m.show)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setConfirm(false);
              }}
              style={mode === m.id ? walletBtn : walletGhost}
            >
              {m.label}
            </button>
          ))}
      </div>

      {confirm ? null : (
        <>
      {mode === 'send' || mode === 'private' ? (
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="To"
          style={{ ...walletField, marginBottom: 10 }}
        />
      ) : null}
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        style={{ ...walletField, marginBottom: 14 }}
      />

      {mode === 'private'
        ? SEND_FLAGS.map((item) => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                marginBottom: 10,
                padding: 12,
                borderRadius: 16,
                background: 'hsl(225 26% 8%)',
                border: '1px solid hsl(215 22% 18%)',
              }}
            >
              <input
                type="checkbox"
                checked={flags[item.key]}
                onChange={() => setFlags((f) => ({ ...f, [item.key]: !f[item.key] }))}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
            </label>
          ))
        : null}
        </>
      )}

      {notice ? (
        <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', lineHeight: 1.5, marginBottom: 12, wordBreak: 'break-all' }}>
          {notice}
        </p>
      ) : null}
      {confirm ? (
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 8px' }}>
            {amount || '—'} {meta?.symbol ?? ''}
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'hsl(215 40% 72%)' }}>Arxon Testnet</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 30% 60%)', marginBottom: 12 }}>play</p>
        </div>
      ) : null}
      <button type="button" style={{ ...walletBtn, width: '100%' }} disabled={busy || !meta} onClick={() => void onGo()}>
        {busy ? (mode === 'send' ? 'Processing' : phase) : confirm ? 'Confirm' : mode === 'shield' ? 'Shield' : mode === 'unshield' ? 'Unshield' : 'Send'}
      </button>
    </div>
  );
}
