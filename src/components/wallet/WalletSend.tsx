import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEND_FLAGS, UNSHIELD_FLAGS, VAULT_FLAGS, type PrivacyFlags } from '@/chainWallet/privacy';
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
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const selfIn = mode === 'shield';
  const selfOut = mode === 'unshield';
  const {
    sendArx,
    sendShielded,
    sendPrivate,
    sendUnshield,
    refreshBalance,
    notes,
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
        to: selfIn ? '' : selfOut && address ? address : to,
        amount,
        flags: selfIn ? VAULT_FLAGS : selfOut ? UNSHIELD_FLAGS : { ...flags, hideBalance: false },
        notes,
        publicArx: balance,
        shieldedPk,
      }),
    [to, amount, flags, notes, balance, shieldedPk, selfIn, selfOut, address]
  );

  async function finish(hash: `0x${string}`) {
    await refreshBalance();
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
        await finish(await sendArx(route.to, amount));
        return;
      }
      if (route.kind === 'shield') {
        await finish(await sendShielded(amount, VAULT_FLAGS));
        return;
      }
      if (route.kind === 'private') {
        if (route.shieldFirst) {
          await sendShielded(amount, flags);
        }
        await finish(await sendPrivate(route.pk, amount, { ...flags, hideBalance: false }));
        return;
      }
      if (route.shieldFirst) {
        await sendShielded(amount, VAULT_FLAGS);
      }
      await finish(await sendUnshield(route.to, amount, UNSHIELD_FLAGS));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setNotice(msg);
      const found = msg.match(/0x[a-fA-F0-9]{64}/);
      if (found) navigate(`/tx/${found[0]}`);
    } finally {
      setBusy(false);
    }
  }

  const title = selfIn ? 'Shield' : selfOut ? 'Unshield' : 'Send';
  const cta = busy ? 'Processing' : title;

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 16px' }}>{title}</h1>
      {selfIn || selfOut ? null : (
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="To"
          style={{ ...walletField, marginBottom: 10 }}
        />
      )}
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        style={{ ...walletField, marginBottom: 16 }}
      />

      {selfIn || selfOut
        ? null
        : SEND_FLAGS.map((item) => (
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
          ))}

      {notice ? (
        <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', marginBottom: 12, wordBreak: 'break-all' }}>{notice}</p>
      ) : null}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={walletGhost} onClick={() => navigate('/')}>
          Cancel
        </button>
        <button type="button" style={walletBtn} disabled={busy} onClick={() => void onSend()}>
          {cta}
        </button>
      </div>
    </div>
  );
}
