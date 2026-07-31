import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AlertCircle, Crown, Trophy, User } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { v2 } from '../design/tokens';
import {
  V2Page,
  V2Header,
  V2BalanceHero,
  V2HeroCard,
  V2ListRow,
  V2SectionHeader,
  V2Card,
  fadeUp,
  stagger,
} from '../design/Kit';

interface Entry {
  user_id: string;
  username: string | null;
  total_points: number;
  avatar_url: string | null;
}

const PODIUM_ACCENTS = [v2.accent.gold, v2.brand.steelLight, 'hsl(22 50% 48%)'];
const PODIUM_GRADIENTS = [
  `linear-gradient(135deg, hsl(38 55% 22%), hsl(38 45% 14%), hsl(225 35% 10%))`,
  v2.gradient.steel,
  `linear-gradient(135deg, hsl(22 45% 18%), hsl(22 40% 12%), hsl(225 35% 10%))`,
];

function Avatar({ url, name, size = 36, accent = v2.brand.steel }: { url: string | null; name: string | null; size?: number; accent?: string }) {
  const [err, setErr] = useState(false);
  const init = (name || '?')[0].toUpperCase();
  if (url && !err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1px solid ${accent}33` }}>
        <img src={url} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 800,
        color: accent,
        background: `${accent}18`,
        border: `1px solid ${accent}33`,
      }}
    >
      {init}
    </div>
  );
}

export default function LeaderboardV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { points, rank } = usePoints();
  const [leaders, setLeaders] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setRlsBlocked(false);

    const { data: pts, error: ptsErr } = await supabase
      .from('user_points')
      .select('user_id, total_points')
      .order('total_points', { ascending: false })
      .limit(100);

    if (ptsErr || !pts?.length) {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .limit(100);

      if (profileErr || !profileData?.length) {
        setRlsBlocked(true);
        setLoading(false);
        return;
      }

      const { data: rpcData } = await (supabase as { rpc: (name: string, args: object) => Promise<{ data: unknown }> }).rpc(
        'get_leaderboard',
        { limit_count: 100 },
      );

      if (rpcData && Array.isArray(rpcData)) {
        const result: Entry[] = (rpcData as Record<string, unknown>[]).map((r) => ({
          user_id: (r.user_id || r.id) as string,
          username: (r.username as string) || null,
          avatar_url: (r.avatar_url as string) || null,
          total_points: Math.round(Number(r.total_points) || 0),
        }));
        setLeaders(result.filter((e) => e.total_points > 0 || result.length <= 10));
        setLoading(false);
        return;
      }

      setRlsBlocked(true);
      setLoading(false);
      return;
    }

    const userIds = pts.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const result: Entry[] = pts.map((p) => ({
      user_id: p.user_id,
      username: profMap.get(p.user_id)?.username || null,
      avatar_url: profMap.get(p.user_id)?.avatar_url || null,
      total_points: Math.round(Number(p.total_points) || 0),
    }));

    setLeaders(result);
    setLoading(false);
  };

  const totalPts = Math.round(points?.total_points ?? 0);
  const userRank = rank ?? null;
  const top3 = leaders.slice(0, 3);

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : [];
  const podiumRanks = [2, 1, 3];

  return (
    <V2Page>
      <V2Header title="Leaderboard" subtitle="Top ARX-P miners globally" onBack={() => navigate(-1)} large />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 20px' }}>
        {/* Your rank */}
        <motion.div variants={fadeUp} style={{ marginTop: 18 }}>
          <V2BalanceHero
            balance={totalPts}
            rank={userRank}
            stats={[
              { label: 'Rank', value: userRank ? `#${userRank}` : '—', accent: v2.accent.gold },
              { label: 'ARX-P', value: totalPts.toLocaleString(), accent: v2.brand.steelLight },
              { label: 'Streak', value: `${points?.daily_streak ?? 0}d`, accent: v2.accent.mining },
            ]}
          />
        </motion.div>

        {/* RLS notice */}
        {rlsBlocked && !loading && (
          <motion.div variants={fadeUp} style={{ marginTop: 16 }}>
            <V2Card accent={v2.accent.gold} padding="14px 16px">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={16} color={v2.accent.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: v2.accent.gold, margin: '0 0 4px' }}>
                    Leaderboard temporarily unavailable
                  </p>
                  <p style={{ fontSize: 11, color: `${v2.accent.gold}b3`, lineHeight: 1.5, margin: 0 }}>
                    {isAdmin
                      ? 'Run this policy in Supabase SQL Editor to enable public leaderboard reads:'
                      : 'Rankings are being updated. Please check back soon.'}
                  </p>
                  {isAdmin && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: v2.brand.deep,
                        border: `1px solid ${v2.brand.border}`,
                      }}
                    >
                      <code
                        style={{
                          fontSize: 10,
                          color: v2.accent.mining,
                          lineHeight: 1.6,
                          display: 'block',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {`CREATE POLICY "Public leaderboard read"
ON user_points FOR SELECT
TO public USING (true);`}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </V2Card>
          </motion.div>
        )}

        {/* Podium — top 3 as hero cards */}
        {!loading && !rlsBlocked && top3.length >= 3 && (
          <motion.div variants={fadeUp} style={{ marginTop: 20 }}>
            <V2SectionHeader title="Top 3" />
            <div
              style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory' }}
              className="scrollbar-none"
            >
              {podiumOrder.map((entry, idx) => {
                const actualRank = podiumRanks[idx];
                const accent = PODIUM_ACCENTS[actualRank - 1];
                const isFirst = actualRank === 1;
                return (
                  <div key={entry.user_id} style={{ minWidth: '72%', flexShrink: 0, scrollSnapAlign: 'start' }}>
                    <V2HeroCard
                      eyebrow={`#${actualRank} · ${isFirst ? 'Champion' : actualRank === 2 ? 'Runner Up' : 'Third Place'}`}
                      title={entry.username || 'Miner'}
                      subtitle={`${entry.total_points.toLocaleString()} ARX-P`}
                      accent={accent}
                      gradient={PODIUM_GRADIENTS[actualRank - 1]}
                      compact
                      icon={
                        isFirst ? (
                          <Crown size={10} color={accent} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
                        ) : (
                          <Trophy size={10} color={accent} />
                        )
                      }
                      onCta={() => entry.user_id !== user?.id && navigate(`/profile/${entry.user_id}`)}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Full list */}
        <motion.div variants={fadeUp} style={{ marginTop: 24 }}>
          <V2SectionHeader
            title="All Miners"
            badge={loading ? undefined : `Top ${leaders.length}`}
          />

          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 58,
                  borderRadius: v2.radius.lg,
                  marginBottom: 10,
                  background: v2.brand.surface,
                  border: `1px solid ${v2.brand.border}`,
                  opacity: 1 - i * 0.1,
                }}
              />
            ))
          ) : rlsBlocked ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🔒</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: v2.brand.mutedSoft, marginBottom: 6 }}>
                Leaderboard needs setup
              </p>
              <p style={{ fontSize: 12, color: v2.brand.muted, lineHeight: 1.5 }}>
                See the notice above to enable public access
              </p>
            </div>
          ) : leaders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontSize: 38, marginBottom: 12 }}>🏆</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: v2.brand.mutedSoft }}>No miners yet</p>
              <p style={{ fontSize: 12, color: v2.brand.muted, marginTop: 4 }}>Start mining to appear here</p>
            </div>
          ) : (
            leaders.map((entry, idx) => {
              const isTop3 = idx < 3;
              const isMe = entry.user_id === user?.id;
              const accent = isTop3 ? PODIUM_ACCENTS[idx] : isMe ? v2.brand.steel : v2.brand.mutedSoft;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <V2ListRow
                  key={entry.user_id}
                  icon={
                    entry.avatar_url ? (
                      <Avatar url={entry.avatar_url} name={entry.username} size={28} accent={accent} />
                    ) : isTop3 ? (
                      <span style={{ fontSize: 14 }}>{medals[idx]}</span>
                    ) : (
                      <User size={16} />
                    )
                  }
                  iconAccent={accent}
                  title={
                    isMe
                      ? `${entry.username || 'Miner'} (You)`
                      : entry.username || 'Miner'
                  }
                  subtitle={isTop3 ? `Rank #${idx + 1}` : `#${idx + 1}`}
                  value={entry.total_points.toLocaleString()}
                  valueLabel="ARX-P"
                  onClick={!isMe ? () => navigate(`/profile/${entry.user_id}`) : undefined}
                />
              );
            })
          )}
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
