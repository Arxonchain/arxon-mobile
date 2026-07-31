import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import { Copy, Check, Send, TrendingUp, Globe } from 'lucide-react';
import {
  V2Page, V2Header, V2Card, V2Tabs, V2Button, V2ButtonGhost,
  V2SectionHeader, V2Eyebrow, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NexusV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, refreshPoints } = usePoints();
  const { profile, loading: profileLoading } = useProfile();
  const [tab, setTab] = useState<'send' | 'history' | 'explorer'>('send');
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [txList, setTxList] = useState<any[]>([]);
  const [allTx, setAllTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const balance = points?.total_points ?? 0;
  const nexusAddr = profile?.nexus_address;

  const fetchTx = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('nexus_transactions').select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setTxList(data || []);
    } catch (e: any) {
      toast({ title: 'Could not load transactions', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTx = async () => {
    try {
      const { data, error } = await supabase.from('nexus_transactions').select('*')
        .eq('private_mode', false).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      setAllTx(data || []);
    } catch (e: any) {
      toast({ title: 'Could not load explorer', description: e?.message || 'Try again', variant: 'destructive' });
    }
  };

  useEffect(() => { if (user) { fetchTx(); fetchAllTx(); } }, [user]);

  const copyAddr = async () => {
    if (!nexusAddr) return;
    await navigator.clipboard.writeText(nexusAddr);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Nexus UID copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!receiver.trim()) { toast({ title: 'Error', description: 'Enter receiver UID', variant: 'destructive' }); return; }
    const num = Number(amount);
    if (!Number.isInteger(num) || num < 1 || num > 10) { toast({ title: 'Error', description: 'Amount must be 1–10 ARX-P', variant: 'destructive' }); return; }
    if (balance < num) { toast({ title: 'Insufficient', description: 'Not enough ARX-P', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_nexus_transfer' as any, {
        p_sender_id: user.id, p_receiver_address: receiver.trim(), p_amount: num,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) { toast({ title: 'Failed', description: res?.error || 'Unknown error', variant: 'destructive' }); return; }
      toast({ title: 'Sent! 🎉', description: `${num} ARX-P sent. +20% mining boost!` });
      setSent(true); setAmount(''); setReceiver('');
      await refreshPoints(); await fetchTx(); await fetchAllTx();
      setTimeout(() => setSent(false), 3000);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <V2Page style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <V2Header onBack={() => navigate(-1)} />
        <div style={{ position: 'relative', width: 130, height: 130, marginBottom: 32 }}>
          <svg style={{ position: 'absolute', inset: 0, animation: 'spin 8s linear infinite' }} width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="60" fill="none" stroke={`${v2.accent.mining}14`} strokeWidth="1" />
            <circle cx="65" cy="65" r="60" fill="none" stroke={`${v2.accent.mining}55`} strokeWidth="1.5" strokeDasharray="35 342" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 78, height: 78, borderRadius: 24, background: v2.gradient.mining,
              border: `1.5px solid ${v2.accent.mining}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: v2.shadow(v2.accent.mining, 0.15),
            }}>
              <Send size={32} color={v2.accent.mining} />
            </div>
          </div>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: v2.brand.steelBright, letterSpacing: '-0.5px', marginBottom: 10, textAlign: 'center' }}>Nexus Transfer</h2>
        <p style={{ fontSize: 14, color: v2.brand.mutedSoft, marginBottom: 36, textAlign: 'center', lineHeight: 1.6 }}>
          Send ARX-P to other miners and earn 20% mining boosts
        </p>
        <V2Button accent={v2.accent.mining} fullWidth onClick={() => setShowAuth(true)}>Sign In</V2Button>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </V2Page>
    );
  }

  return (
    <V2Page>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <V2Header title="Nexus" subtitle="Send & receive ARX-P" onBack={() => navigate(-1)} />

        <div style={{ padding: '8px 20px 0' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <V2Card accent={v2.accent.mining} padding="20px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <V2Eyebrow accent={v2.brand.mutedSoft}>Your Nexus UID</V2Eyebrow>
                  <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelLight, fontFamily: 'monospace', letterSpacing: '0.3px', wordBreak: 'break-all', margin: '4px 0 0' }}>
                    {profileLoading ? 'Loading...' : nexusAddr || 'Generating...'}
                  </p>
                </div>
                <V2ButtonGhost onClick={copyAddr} accent={copied ? v2.accent.mining : v2.brand.steel}>
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </V2ButtonGhost>
              </div>
              <div style={{ borderTop: `1px solid ${v2.brand.border}`, paddingTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: v2.brand.steelBright, letterSpacing: '-1px' }}>{Math.floor(balance).toLocaleString()}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steel }}>ARX-P available</span>
              </div>
            </V2Card>
          </motion.div>

          <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
            <V2Tabs
              tabs={[
                { id: 'send' as const, label: 'Send' },
                { id: 'history' as const, label: 'History' },
                { id: 'explorer' as const, label: 'Explorer' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </motion.div>

          {tab === 'send' && (
            <motion.div variants={fadeUp}>
              <V2Card accent={v2.accent.mining} padding="24px 20px" style={{ marginBottom: 12, textAlign: 'center' }}>
                <V2Eyebrow accent={v2.brand.mutedSoft}>Amount to Send</V2Eyebrow>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, margin: '12px 0 6px' }}>
                  <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-3px', color: v2.brand.steelBright, lineHeight: 1 }}>{amount || '0'}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: v2.brand.muted, marginTop: 10 }}>.00</span>
                </div>
                <p style={{ fontSize: 11, color: v2.brand.muted, margin: 0 }}>Max 10 ARX-P · Earn 20% mining boost</p>
              </V2Card>

              <V2Card padding="14px 16px" style={{ marginBottom: 12 }}>
                <input
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder="Receiver Nexus UID"
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    fontSize: 14, fontWeight: 600, color: v2.brand.steelBright, fontFamily: v2.font,
                  }}
                />
              </V2Card>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => (
                  <motion.button
                    key={k || 'sp'}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    disabled={!k}
                    onClick={() => {
                      if (!k) return;
                      if (k === 'del') { setAmount((a) => a.slice(0, -1)); return; }
                      const next = amount + k;
                      const num = parseInt(next, 10);
                      if (!isNaN(num) && num >= 1 && num <= 10) setAmount(next);
                    }}
                    style={{
                      background: v2.brand.raised, border: `1px solid ${v2.brand.border}`,
                      borderRadius: v2.radius.md, padding: '17px 0', fontSize: 24, fontWeight: 700,
                      color: v2.brand.steelBright, cursor: k ? 'pointer' : 'default', outline: 'none',
                      fontFamily: v2.font,
                    }}
                  >
                    {k === 'del' ? '⌫' : k}
                  </motion.button>
                ))}
              </div>

              <V2Button
                accent={sent ? v2.accent.mining : v2.accent.mining}
                fullWidth
                onClick={handleSend}
                disabled={sending}
                style={sent ? { background: `${v2.accent.mining}22`, color: v2.accent.mining } : undefined}
              >
                {sent ? '✓ Sent! Boost activated' : sending ? 'Sending...' : 'Send ARX-P'}
              </V2Button>

              <V2Card accent={v2.accent.mining} padding="12px 16px" style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, color: `${v2.accent.mining}99`, lineHeight: 1.6, margin: 0 }}>
                  Each transfer earns a <strong style={{ color: v2.accent.mining }}>20% mining boost</strong> for 3 days. Max 5 sends/day. 1–10 ARX-P per send.
                </p>
              </V2Card>
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div variants={fadeUp}>
              <V2SectionHeader title="Your Transactions" action="Refresh" onAction={fetchTx} />
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: 60, borderRadius: v2.radius.lg, marginBottom: 8, background: v2.brand.raised, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))
              ) : txList.length === 0 ? (
                <V2Card padding="48px 20px" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: v2.brand.mutedSoft, margin: 0 }}>No transactions yet</p>
                  <p style={{ fontSize: 12, color: v2.brand.muted, marginTop: 6 }}>Send your first ARX-P</p>
                </V2Card>
              ) : (
                txList.map((tx) => {
                  const isSender = tx.sender_id === user?.id;
                  const col = isSender ? v2.accent.danger : v2.accent.mining;
                  return (
                    <V2Card key={tx.id} accent={col} padding="14px 16px" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: v2.radius.sm, flexShrink: 0,
                          background: `${col}14`, border: `1px solid ${col}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSender ? <Send size={17} color={col} /> : <TrendingUp size={17} color={col} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: 0 }}>{isSender ? 'Sent to' : 'Received from'}</p>
                          <p style={{ fontSize: 10, color: v2.brand.muted, margin: '2px 0 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isSender ? tx.receiver_address?.slice(0, 20) + '...' : tx.sender_address?.slice(0, 20) + '...'}
                          </p>
                          <p style={{ fontSize: 9, color: v2.brand.muted, margin: '3px 0 0' }}>{exactTime(tx.created_at)}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: col, margin: 0 }}>{isSender ? '-' : '+'}{tx.amount} ARX-P</p>
                          <p style={{ fontSize: 9, color: `${col}88`, margin: '3px 0 0' }}>{relativeTime(tx.created_at)}</p>
                        </div>
                      </div>
                    </V2Card>
                  );
                })
              )}
            </motion.div>
          )}

          {tab === 'explorer' && (
            <motion.div variants={fadeUp}>
              <V2SectionHeader title="Public Feed" action="Refresh" onAction={fetchAllTx} />
              {allTx.length === 0 ? (
                <V2Card padding="48px 20px" style={{ textAlign: 'center' }}>
                  <Globe size={40} color={v2.brand.muted} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: v2.brand.mutedSoft, margin: 0 }}>No public transactions</p>
                </V2Card>
              ) : (
                allTx.map((tx) => (
                  <V2Card key={tx.id} accent={v2.brand.steel} padding="14px 16px" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: v2.radius.sm, flexShrink: 0,
                        background: `${v2.brand.steel}14`, border: `1px solid ${v2.brand.steel}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Send size={16} color={v2.brand.steel} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 10, color: v2.brand.muted, fontFamily: 'monospace', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.hide_usernames ? '***' : tx.sender_address?.slice(0, 14) + '...'} →
                        </p>
                        <p style={{ fontSize: 10, color: v2.brand.muted, fontFamily: 'monospace', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.hide_usernames ? '***' : tx.receiver_address?.slice(0, 14) + '...'}
                        </p>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: v2.brand.steelLight, flexShrink: 0, margin: 0 }}>
                        {tx.hide_amount ? '***' : tx.amount} ARX-P
                      </p>
                    </div>
                  </V2Card>
                ))
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </V2Page>
  );
}
