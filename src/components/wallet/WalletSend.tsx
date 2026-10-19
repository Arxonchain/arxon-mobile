import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAddress, type Address } from 'viem';
import { SEND_FLAGS, UNSHIELD_FLAGS, VAULT_FLAGS, type PrivacyFlags } from '@/chainWallet/privacy';
import { isShieldedPk, routeSend } from '@/chainWallet/routeSend';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import type { TxPhase } from '@/chainWallet/clocks';
import { ETHEREUM_TOKENS, NETWORKS, type EthereumToken } from '@/chainWallet/networks';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';
import { useLockNetwork, walletHomePath } from '@/chainWallet/walletNav';
import { TokenMark } from '@/components/wallet/TokenMark';

const OPEN: PrivacyFlags = {
  hideSender: false,
  hideReceiver: false,
  hideAmount: false,
  hideBalance: false,
};

function isEthToken(value: string | null): value is EthereumToken {
  return value === 'ETH' || value === 'USDC' || value === 'USDT';
}

export default function WalletSend() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const wantArxon = params.get('net') === 'arxon' || mode === 'shield' || mode === 'unshield' || mode === 'private';
  useLockNetwork(wantArxon ? 'arxon' : 'ethereum');
  const {
    sendArx,
    sendEthereum,
    sendShielded,
    sendPrivate,
    sendUnshield,
    refreshBalance,
    notes,
    address,
    shieldedPk,
    balance,
  } = useChainWallet();
  const isEth = !wantArxon;
  const selfIn = !isEth && mode === 'shield';
  const selfOut = !isEth && mode === 'unshield';
  const wantPrivate = !isEth && mode === 'private';
  const home = walletHomePath(isEth ? 'ethereum' : 'arxon');
  const requested = params.get('token');
  const [token, setToken] = useState<EthereumToken>(isEthToken(requested) ? requested : 'ETH');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [flags, setFlags] = useState<PrivacyFlags>(OPEN);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<TxPhase>('Processing');
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isEthToken(requested)) setToken(requested);
    setConfirm(false);
  }, [requested, isEth]);

  useEffect(() => {
    if (selfOut && address) setTo((prev) => prev || address);
  }, [selfOut, address]);

  const net = NETWORKS[isEth ? 'ethereum' : 'arxon'];
  const tokenLabel = isEth ? token : net.nativeSymbol;

  const route = useMemo(
    () =>
      isEth
        ? null
        : routeSend({
            to: selfIn ? '' : selfOut ? (to.trim() || address || '') : to,
            amount,
            flags: selfIn ? VAULT_FLAGS : selfOut ? UNSHIELD_FLAGS : flags,
            notes,
            publicArx: balance,
            shieldedPk,
          }),
    [to, amount, flags, notes, balance, shieldedPk, selfIn, selfOut, address, isEth]
  );

  async function finish(hash: `0x${string}`) {
    await refreshBalance();
    navigate(`/tx/${hash}`);
  }

  async function onSend() {
    setNotice(null);
    if (isEth) {
      if (!amount.trim()) {
        setNotice('Enter an amount');
        return;
      }
      try {
        getAddress(to.trim());
      } catch {
        setNotice('Bad address');
        return;
      }
      if (!confirm) {
        setConfirm(true);
        return;
      }
      setBusy(true);
      try {
        await finish(await sendEthereum(token, getAddress(to.trim()) as Address, amount));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        setNotice(msg);
        const found = msg.match(/0x[a-fA-F0-9]{64}/);
        if (found) navigate(`/tx/${found[0]}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (wantPrivate && !isShieldedPk(to)) {
      setNotice('Enter a shielded pk (0x + 64 hex)');
      return;
    }
    if (!route) return;
    if (route.kind === 'need-amount' || route.kind === 'bad-to' || route.kind === 'need-funds') {
      setNotice(route.label);
      return;
    }
    if (!confirm) {
      setConfirm(true);
      return;
    }
      setBusy(true);
      setPhase('Processing');
      try {
        if (route.kind === 'public') {
          await finish(await sendArx(route.to, amount));
          return;
        }
        if (route.kind === 'shield') {
          await finish(await sendShielded(amount, VAULT_FLAGS, setPhase));
          return;
        }
        if (route.kind === 'private') {
          if (route.shieldFirst) {
            await sendShielded(amount, flags, setPhase);
          }
          await finish(await sendPrivate(route.pk, amount, flags, setPhase));
          return;
        }
        if (route.shieldFirst) {
          await sendShielded(amount, VAULT_FLAGS, setPhase);
        }
        await finish(await sendUnshield(route.to, amount, UNSHIELD_FLAGS, setPhase));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setNotice(msg);
      const found = msg.match(/0x[a-fA-F0-9]{64}/);
      if (found) navigate(`/tx/${found[0]}`);
    } finally {
      setBusy(false);
    }
  }

  const title = selfIn ? 'Shield' : selfOut ? 'Unshield' : wantPrivate ? 'Private' : 'Send';
  const cta = busy ? phase : confirm ? 'Confirm' : title;

  return (
    <div style={walletPage}>
      <button
        type="button"
        onClick={() => (confirm ? setConfirm(false) : navigate(home))}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 8px' }}>{title}</h1>
      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: isEth ? 'hsl(155 40% 55%)' : 'hsl(215 40% 72%)',
          marginBottom: 16,
        }}
      >
        {net.label}
      </p>

      {confirm ? (
        <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.16em', fontWeight: 800, color: 'hsl(215 14% 52%)' }}>SEND</p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
            <TokenMark id={isEth ? token : 'ARX'} size={56} />
          </div>
          <p style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', margin: '10px 0 8px', lineHeight: 1.1 }}>
            {amount || '—'} {tokenLabel}
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: isEth ? 'hsl(155 50% 62%)' : 'hsl(215 40% 72%)',
              marginBottom: 6,
            }}
          >
            {net.name}
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: isEth ? 'hsl(155 40% 55%)' : 'hsl(215 30% 60%)' }}>
            {isEth ? 'real' : 'play'}
          </p>
        </div>
      ) : (
        <>
          {isEth ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {ETHEREUM_TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  type="button"
                  onClick={() => setToken(t.symbol)}
                  style={{
                    ...(token === t.symbol ? walletBtn : walletGhost),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 8px',
                  }}
                >
                  <TokenMark id={t.symbol} size={20} />
                  {t.symbol}
                </button>
              ))}
            </div>
          ) : null}
          {selfIn ? null : (
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={selfOut ? 'Payout 0x (yours or another)' : wantPrivate ? 'Shielded pk 0x…' : 'To'}
              style={{ ...walletField, marginBottom: 10 }}
            />
          )}
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            style={{ ...walletField, marginBottom: 16 }}
          />

          {isEth || selfIn || selfOut
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
        </>
      )}

      {notice ? (
        <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', marginBottom: 12, wordBreak: 'break-all' }}>{notice}</p>
      ) : null}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={walletGhost} onClick={() => (confirm ? setConfirm(false) : navigate(home))}>
          Cancel
        </button>
        <button type="button" style={walletBtn} disabled={busy} onClick={() => void onSend()}>
          {cta}
        </button>
      </div>
    </div>
  );
}
