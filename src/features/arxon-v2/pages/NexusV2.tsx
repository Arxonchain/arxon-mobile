import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Copy, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { copyAddress } from '@/walletFigma/flow/copyFlash';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { neon } from '../design/neonTokens';
import { V2Page } from '../design/Kit';
import { MineLoad } from '../components/MineLoad';
import {
  Body,
  EmptyCopy,
  Field,
  FrostPanel,
  GlassSheet,
  pc,
  PrimaryBtn,
  ProfileHead,
  SegmentTabs,
  TokenRow,
} from '../design/ProfileChrome';

type Tab = 'send' | 'history' | 'explorer';

type NexusTx = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_address: string | null;
  receiver_address: string | null;
  amount: number;
  created_at: string;
  hide_usernames?: boolean | null;
  hide_amount?: boolean | null;
};

function shortUid(value?: string | null) {
  if (!value) return '';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NexusV2() {
  const { user } = useAuth();
  const { points, refreshPoints } = usePoints();
  const { profile, loading: profileLoading } = useProfile();
  const [tab, setTab] = useState<Tab>('send');
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [txList, setTxList] = useState<NexusTx[]>([]);
  const [allTx, setAllTx] = useState<NexusTx[]>([]);
  const [historyWait, setHistoryWait] = useState(true);
  const [explorerWait, setExplorerWait] = useState(true);

  const balance = points?.total_points ?? 0;
  const nexusAddr = profile?.nexus_address ?? '';

  const fetchTx = useCallback(async () => {
    if (!user) return;
    setHistoryWait(true);
    try {
      const { data, error } = await supabase
        .from('nexus_transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setTxList((data as NexusTx[]) || []);
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'transfer'));
    } finally {
      setHistoryWait(false);
    }
  }, [user]);

  const fetchAllTx = useCallback(async () => {
    setExplorerWait(true);
    try {
      const { data, error } = await supabase
        .from('nexus_transactions')
        .select('*')
        .eq('private_mode', false)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setAllTx((data as NexusTx[]) || []);
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'transfer'));
    } finally {
      setExplorerWait(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchTx();
    void fetchAllTx();
  }, [user, fetchTx, fetchAllTx]);

  const pull = usePullRefresh(async () => {
    await Promise.all([refreshPoints(), fetchTx(), fetchAllTx()]);
  }, { threshold: 28 });

  const copyUid = async () => {
    if (!nexusAddr) return;
    await copyAddress(nexusAddr, 'Nexus UID copied');
  };

  const setAmountSafe = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setAmount('');
      return;
    }
    const num = parseInt(digits, 10);
    if (num >= 1 && num <= 10) setAmount(String(num));
  };

  const canSend = receiver.trim().length > 0;

  const handleSend = async () => {
    if (!user) return;
    if (!receiver.trim()) {
      toast({ title: 'Receiver needed', description: 'Enter a Nexus UID.', variant: 'destructive' });
      return;
    }
    const num = Number(amount);
    if (!Number.isInteger(num) || num < 1 || num > 10) {
      toast({ title: 'Amount', description: 'Send 1–10 ARX-P.', variant: 'destructive' });
      return;
    }
    if (balance < num) {
      toast({ title: 'Not enough ARX-P', description: 'Lower the amount or mine more first.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_nexus_transfer' as any, {
        p_sender_id: user.id,
        p_receiver_address: receiver.trim(),
        p_amount: num,
      });
      if (error) throw error;
      const res = data as { success?: boolean; error?: string };
      if (!res?.success) {
        toast(publicErrorToast(res?.error, 'transfer'));
        return;
      }
      toast({ title: 'Sent', description: `${num} ARX-P sent. +20% mining boost.` });
      setSent(true);
      setAmount('');
      setReceiver('');
      await refreshPoints();
      await fetchTx();
      await fetchAllTx();
      window.setTimeout(() => setSent(false), 2800);
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'transfer'));
    } finally {
      setSending(false);
    }
  };

  return (
    <V2Page pull={pull}>
      <ProfileHead
        title="Nexus"
        subtitle="Send ARX-P to miners. Earn a 20% boost."
      />
      <div style={{ padding: '0 16px 12px' }}>
        <MineLoad waiting={profileLoading} extra={pull.busy} frost kind="card" radius={22}>
          <FrostPanel>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
              Available
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 32,
                fontWeight: 750,
                letterSpacing: '-0.8px',
                color: pc.ink,
                fontFamily: neon.font,
                lineHeight: 1,
              }}
            >
              {Math.floor(balance).toLocaleString()}
              <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 650, letterSpacing: 0 }}>ARX-P</span>
            </p>
            <p style={{ margin: '14px 0 0', fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
              Your UID
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 13,
                fontWeight: 650,
                color: pc.ink,
                fontFamily: neon.font,
                wordBreak: 'break-all',
              }}
            >
              {profileLoading ? 'Loading…' : shortUid(nexusAddr) || 'Generating…'}
            </p>
            <button
              type="button"
              onClick={() => void copyUid()}
              disabled={!nexusAddr}
              style={{
                marginTop: 14,
                width: '100%',
                height: 40,
                borderRadius: 12,
                border: 'none',
                background: pc.ink,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: neon.font,
                cursor: nexusAddr ? 'pointer' : 'default',
                opacity: nexusAddr ? 1 : 0.45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Copy size={14} />
              Copy full UID
            </button>
          </FrostPanel>
        </MineLoad>

        <SegmentTabs
          tabs={[
            { id: 'send' as Tab, label: 'Send' },
            { id: 'history' as Tab, label: 'History' },
            { id: 'explorer' as Tab, label: 'Explorer' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'send' && (
          <div data-tour="nexus-send">
            <FrostPanel>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
                Amount
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 36,
                  fontWeight: 750,
                  letterSpacing: '-1px',
                  color: pc.ink,
                  fontFamily: neon.font,
                  lineHeight: 1,
                }}
              >
                {amount || '0'}
                <span style={{ marginLeft: 6, fontSize: 14, fontWeight: 650, letterSpacing: 0 }}>ARX-P</span>
              </p>
              <Body ink>1–10 ARX-P per send. Max 5 sends a day.</Body>
            </FrostPanel>

            <Field
              value={amount}
              onChange={setAmountSafe}
              placeholder="Amount 1–10 ARX-P"
              type="tel"
            />
            <Field
              value={receiver}
              onChange={setReceiver}
              placeholder="Receiver Nexus UID"
            />

            {canSend ? (
              <PrimaryBtn
                label={sent ? 'Sent — boost on' : sending ? 'Sending…' : 'Send ARX-P'}
                onClick={() => void handleSend()}
                disabled={sending}
              />
            ) : null}

            <GlassSheet title="Boost" style={{ marginTop: 12 }}>
              <div style={{ padding: '10px 2px 12px' }}>
                <Body>
                  Each transfer earns a <span style={{ color: '#fff', fontWeight: 650 }}>20% mining boost</span> for 3 days.
                </Body>
              </div>
            </GlassSheet>
          </div>
        )}

        {tab === 'history' && (
          <MineLoad waiting={historyWait && txList.length === 0} extra={pull.busy} kind="rows" rowCount={5} radius={22}>
            {txList.length === 0 && !historyWait ? (
              <GlassSheet>
                <EmptyCopy title="No transfers yet" body="Send ARX-P to another miner. Your history will show here." />
              </GlassSheet>
            ) : (
              <GlassSheet title="Your transfers">
                {txList.map((tx) => {
                  const isSender = tx.sender_id === user?.id;
                  const peer = isSender ? tx.receiver_address : tx.sender_address;
                  return (
                    <TokenRow
                      key={tx.id}
                      wrap
                      icon={isSender ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      glyphBg={isSender ? pc.danger : pc.good}
                      title={isSender ? 'Sent' : 'Received'}
                      sub={`${shortUid(peer)} · ${relativeTime(tx.created_at)}`}
                      trailing={
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isSender ? pc.danger : pc.good,
                            fontFamily: neon.font,
                            flexShrink: 0,
                          }}
                        >
                          {isSender ? '−' : '+'}{tx.amount} ARX-P
                        </span>
                      }
                    />
                  );
                })}
              </GlassSheet>
            )}
          </MineLoad>
        )}

        {tab === 'explorer' && (
          <MineLoad waiting={explorerWait && allTx.length === 0} extra={pull.busy} kind="rows" rowCount={5} radius={22}>
            {allTx.length === 0 && !explorerWait ? (
              <GlassSheet>
                <EmptyCopy title="No public transfers" body="Public Nexus sends will appear in this feed." />
              </GlassSheet>
            ) : (
              <GlassSheet title="Public feed">
                {allTx.map((tx) => (
                  <TokenRow
                    key={tx.id}
                    wrap
                    icon={<Send size={14} />}
                    title={tx.hide_usernames ? 'Hidden · Hidden' : `${shortUid(tx.sender_address)} → ${shortUid(tx.receiver_address)}`}
                    sub={relativeTime(tx.created_at)}
                    trailing={
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: neon.font, flexShrink: 0 }}>
                        {tx.hide_amount ? '•••' : `${tx.amount} ARX-P`}
                      </span>
                    }
                  />
                ))}
              </GlassSheet>
            )}
          </MineLoad>
        )}
      </div>
    </V2Page>
  );
}
