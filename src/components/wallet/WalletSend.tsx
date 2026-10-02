import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FLAG_COPY, type PrivacyFlags } from '@/chainWallet/privacy';
import { routeSend } from '@/chainWallet/routeSend';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';

const OPEN: PrivacyFlags = {
  hideSender: false,
  hideReceiver: false,
  hideAmount: false,
  hideBalance: false,
};

export default function WalletSend() {
  const navigate = useNavigate();
  const {
    sendArx,
    sendShielded,
    sendPrivate,
    sendUnshield,
    refreshBalance,
    notes,
    shieldedBalance,
    address,
    shieldedPk,
    balance,
  } = useChainWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [flags, setFlags] = useState<PrivacyFlags>(OPEN);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const route = useMemo(
    () =>
      routeSend({
        to,
        amount,
        flags,
        notes,
        publicArx: balance,
        shieldedPk,
      }),
    [to, amount, flags, notes, balance, shieldedPk]
  );

  const spendable = notes.filter((n) => !n.spent).length;

  async function finish(hash: `0x${string}`, title: string) {
    await refreshBalance();
    setNotice(`${title}. ${hash}`);
    navigate(`/tx/${hash}`);
  }

  async function onSend() {
    setNotice(null);
    if (route.kind === 'need-amount' || route.kind === 'bad-to' || route.kind === 'need-funds') {
      setNotice(route.label);
      return;
    }
    setBusy(true);
    try {
      if (route.kind === 'public') {
        await finish(await sendArx(route.to, amount), 'Sent');
        return;
      }
      if (route.kind === 'shield') {
        setNotice('Proving Halo2 shield. First run warms keys and can take a few minutes.');
        await finish(await sendShielded(amount, flags), 'Shielded');
        return;
      }
      if (route.kind === 'private') {
        if (route.shieldFirst) {
          setNotice('Shielding into your note first…');
          await sendShielded(amount, flags);
        }
        setNotice('Proving private pay. Relayer pays gas so your 0x is not the tx from.');
        await finish(await sendPrivate(route.pk, amount, flags), 'Private transfer');
        return;
      }
      if (route.shieldFirst) {
        setNotice('Shielding into your note first…');
        await sendShielded(amount, flags);
      }
      setNotice('Proving unshield. Relayer pays gas. Payout 0x stays public.');
      await finish(await sendUnshield(route.to, amount, flags), 'Unshielded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setNotice(msg);
      const found = msg.match(/0x[a-fA-F0-9]{64}/);
      if (found) navigate(`/tx/${found[0]}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 12px' }}>Send ARX</h1>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', lineHeight: 1.5, marginBottom: 16 }}>
        Paste a public 0x or a shielded key. Leave To blank to hold ARX in your private balance.
      </p>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To 0x… or shielded key 0x… (64 hex)" style={{ ...walletField, marginBottom: 10 }} />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" style={{ ...walletField, marginBottom: 16 }} />

      {FLAG_COPY.map((item) => (
        <label key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10, padding: 12, borderRadius: 16, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)' }}>
          <input type="checkbox" checked={flags[item.key]} onChange={() => setFlags((f) => ({ ...f, [item.key]: !f[item.key] }))} style={{ marginTop: 3 }} />
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{item.label}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'hsl(215 14% 48%)', marginTop: 2 }}>{item.hint}</span>
          </span>
        </label>
      ))}

      <p style={{ fontSize: 13, color: 'hsl(215 35% 72%)', fontWeight: 600, lineHeight: 1.5, margin: '8px 0 10px' }}>{route.label}</p>
      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 14 }}>
        Public {balance ?? '—'} ARX · shielded {shieldedBalance} ARX in {spendable} note{spendable === 1 ? '' : 's'}
        {address ? ` · ${address.slice(0, 6)}…${address.slice(-4)}` : ''}
      </p>
      {notice ? <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', lineHeight: 1.5, marginBottom: 12, wordBreak: 'break-all' }}>{notice}</p> : null}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={walletGhost} onClick={() => navigate('/')}>Cancel</button>
        <button type="button" style={walletBtn} disabled={busy} onClick={() => void onSend()}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
      {flags.hideBalance ? (
        <p style={{ fontSize: 12, color: 'hsl(215 14% 42%)', marginTop: 12 }}>Hide balance is a UI flag (bit 3). On-chain free balance stays public.</p>
      ) : null}
    </div>
  );
}
