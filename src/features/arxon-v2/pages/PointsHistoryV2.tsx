import { useCallback, useEffect, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/mobile/PullToRefreshIndicator';
import {
  V2Page, V2Header, V2Card, V2SectionHeader, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

interface LedgerEntry {
  id: string;
  amount: number;
  balance_after: number | null;
  category: string;
  description: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  mining: 'Mining',
  task: 'Task',
  social: 'Social',
  referral: 'Referral',
  checkin: 'Check-in',
  campaign: 'Campaign',
  arena_stake: 'Arena Stake',
  arena_reward: 'Arena Win',
  nexus_send: 'Nexus Send',
  nexus_receive: 'Nexus Receive',
  nexus_bonus: 'Nexus Bonus',
  restoration: 'Restored',
  game: 'Game',
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PointsHistoryV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('points_ledger' as any)
        .select('id, amount, balance_after, category, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(
        (data || []).map((row: any) => ({
          id: row.id,
          amount: Number(row.amount),
          balance_after: row.balance_after != null ? Number(row.balance_after) : null,
          category: row.category,
          description: row.description,
          created_at: row.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to load points history:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`points-ledger-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'points_ledger', filter: `user_id=eq.${user.id}` },
        () => { void fetchHistory(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchHistory, user]);

  const ptr = usePullToRefresh(fetchHistory);

  return (
    <V2Page style={{ minHeight: '100vh', overflowY: 'auto', position: 'relative' }}>
      <div
        ref={ptr.scrollRef}
        onTouchStart={ptr.onTouchStart}
        onTouchMove={ptr.onTouchMove}
        onTouchEnd={ptr.onTouchEnd}
      >
        <PullToRefreshIndicator pullDistance={ptr.pullDistance} isRefreshing={ptr.isRefreshing} />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{
            transform: `translateY(${ptr.isRefreshing ? 60 : ptr.pullDistance * 0.7}px)`,
            transition: ptr.pullDistance === 0 && !ptr.isRefreshing ? 'transform 0.2s ease' : 'none',
          }}
        >
          <V2Header title="Points History" onBack={() => navigate(-1)} />

          <div style={{ padding: '8px 20px 0' }}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, color: v2.brand.mutedSoft, marginBottom: 16, lineHeight: 1.5 }}>
              Every ARX-P added or removed from your balance — tasks, mining, arena, Nexus, and restorations.
            </motion.p>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ height: 72, borderRadius: v2.radius.lg, background: v2.brand.raised, opacity: 1 - i * 0.15 }} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <motion.div variants={fadeUp}>
                <V2Card padding="40px 20px" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: v2.brand.mutedSoft, margin: 0 }}>No history yet</p>
                  <p style={{ fontSize: 12, color: v2.brand.muted, marginTop: 6 }}>
                    Complete tasks, mine, or use Nexus to see activity here.
                  </p>
                </V2Card>
              </motion.div>
            ) : (
              <>
                <motion.div variants={fadeUp}>
                  <V2SectionHeader title="Recent Activity" badge={`${entries.length} entries`} />
                </motion.div>
                {entries.map((entry, i) => {
                  const isCredit = entry.amount > 0;
                  const col = isCredit ? v2.accent.mining : v2.accent.danger;
                  const label = CATEGORY_LABELS[entry.category] || entry.category;

                  return (
                    <motion.div key={entry.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.02 }}>
                      <V2Card accent={col} padding="14px 16px" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: v2.radius.sm, flexShrink: 0,
                            background: `${col}18`, border: `1px solid ${col}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isCredit ? <TrendingUp size={18} color={col} /> : <TrendingDown size={18} color={col} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: '0 0 2px' }}>
                              {entry.description}
                            </p>
                            <p style={{ fontSize: 10, color: v2.brand.muted, margin: 0 }}>
                              {label} · {relTime(entry.created_at)}
                              {entry.balance_after != null && (
                                <> · Balance: {Math.round(entry.balance_after).toLocaleString()}</>
                              )}
                            </p>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: col, flexShrink: 0, margin: 0 }}>
                            {isCredit ? '+' : ''}{Math.round(entry.amount).toLocaleString()}
                          </p>
                        </div>
                      </V2Card>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </V2Page>
  );
}
