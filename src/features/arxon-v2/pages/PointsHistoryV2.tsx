import { useCallback, useEffect, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { MineLoad } from '../components/MineLoad';
import { V2Page } from '../design/Kit';
import {
  EmptyCopy,
  GlassSheet,
  pc,
  ProfileHead,
  TokenRow,
} from '../design/ProfileChrome';

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
  arena_stake: 'Arena stake',
  arena_reward: 'Arena win',
  nexus_send: 'Nexus send',
  nexus_receive: 'Nexus receive',
  nexus_bonus: 'Nexus bonus',
  restoration: 'Restored',
  game: 'Game',
  dice_stake: 'Dice stake',
  dice_win: 'Dice win',
  dice_free_roll: 'Dice free roll',
  dice_refund: 'Dice refund',
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
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
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

  const pull = usePullRefresh(() => fetchHistory(true), { threshold: 28 });

  return (
    <V2Page pull={pull}>
      <ProfileHead
        title="Points history"
        subtitle="Credits and deductions"
      />
      <div style={{ padding: '0 16px 12px' }}>
        <MineLoad waiting={loading} extra={pull.busy} kind="rows" rowCount={6} radius={22}>
          {entries.length === 0 ? (
            <GlassSheet>
              <EmptyCopy title="No history yet" body="Complete tasks, mine, or use Nexus and activity will show here." />
            </GlassSheet>
          ) : (
            <GlassSheet title={`${entries.length} entries`}>
              {entries.map((entry) => {
                const credit = entry.amount > 0;
                const label = CATEGORY_LABELS[entry.category] || entry.category;
                return (
                  <TokenRow
                    key={entry.id}
                    wrap
                    icon={credit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    glyphBg={credit ? 'rgba(61,220,132,0.22)' : 'rgba(242,82,82,0.22)'}
                    title={entry.description || label}
                    sub={`${label} · ${relTime(entry.created_at)}${entry.balance_after != null ? ` · ${Math.round(entry.balance_after).toLocaleString()} ARX-P` : ''}`}
                    trailing={
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: credit ? pc.good : pc.danger,
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {credit ? '+' : ''}{Math.round(entry.amount).toLocaleString()}
                      </span>
                    }
                  />
                );
              })}
            </GlassSheet>
          )}
        </MineLoad>
      </div>
    </V2Page>
  );
}
