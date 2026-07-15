import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/mobile/PullToRefreshIndicator';

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

export default function PointsHistory() {
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

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`points-ledger-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_ledger',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory, user]);

  const ptr = usePullToRefresh(fetchHistory);

  return (
    <div
      ref={ptr.scrollRef}
      onTouchStart={ptr.onTouchStart}
      onTouchMove={ptr.onTouchMove}
      onTouchEnd={ptr.onTouchEnd}
      style={{
        minHeight: '100vh',
        background: 'hsl(225 30% 3%)',
        paddingBottom: 100,
        fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
      }}
    >
      <PullToRefreshIndicator pullDistance={ptr.pullDistance} isRefreshing={ptr.isRefreshing} />

      <div
        style={{
          transform: `translateY(${ptr.isRefreshing ? 60 : ptr.pullDistance * 0.7}px)`,
          transition: ptr.pullDistance === 0 && !ptr.isRefreshing ? 'transform 0.2s ease' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'hsl(215 25% 11%)', border: '1px solid hsl(215 22% 18%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} color="hsl(215 25% 55%)" />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Points History</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 42%)', marginBottom: 16, lineHeight: 1.5 }}>
            Every ARX-P added or removed from your balance — tasks, mining, arena, Nexus, and restorations.
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 72, borderRadius: 16,
                    background: 'hsl(215 22% 10%)',
                    border: '1px solid hsl(215 20% 14%)',
                    opacity: 1 - i * 0.15,
                  }}
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div
              style={{
                borderRadius: 20, padding: '40px 20px', textAlign: 'center',
                background: 'hsl(215 22% 8%)', border: '1px solid hsl(215 20% 12%)',
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 18% 45%)' }}>No history yet</p>
              <p style={{ fontSize: 12, color: 'hsl(215 14% 30%)', marginTop: 6 }}>
                Complete tasks, mine, or use Nexus to see activity here.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const isCredit = entry.amount > 0;
              const col = isCredit ? 'hsl(155 45% 50%)' : 'hsl(0 60% 58%)';
              const label = CATEGORY_LABELS[entry.category] || entry.category;

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', marginBottom: 8, borderRadius: 16,
                    background: 'hsl(215 26% 10%)', border: '1px solid hsl(215 22% 16%)',
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: isCredit ? 'hsl(155 45% 43%/0.12)' : 'hsl(0 60% 56%/0.1)',
                      border: `1px solid ${isCredit ? 'hsl(155 45% 43%/0.25)' : 'hsl(0 60% 56%/0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isCredit ? (
                      <TrendingUp size={18} color={col} />
                    ) : (
                      <TrendingDown size={18} color={col} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 18% 88%)', marginBottom: 2 }}>
                      {entry.description}
                    </p>
                    <p style={{ fontSize: 10, color: 'hsl(215 14% 40%)' }}>
                      {label} · {relTime(entry.created_at)}
                      {entry.balance_after != null && (
                        <> · Balance: {Math.round(entry.balance_after).toLocaleString()}</>
                      )}
                    </p>
                  </div>

                  <p style={{ fontSize: 14, fontWeight: 800, color: col, flexShrink: 0 }}>
                    {isCredit ? '+' : ''}{Math.round(entry.amount).toLocaleString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
