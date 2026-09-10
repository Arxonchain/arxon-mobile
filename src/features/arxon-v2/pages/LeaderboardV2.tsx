import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AlertCircle, Crown, Medal, Award, User, Sparkles, Trophy } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { formatPointsDisplay } from '@/lib/formatPoints';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { fetchGlobalLeaderboard } from '@/lib/fetchGlobalLeaderboard';
import { V2Page, fadeUp, stagger } from '../design/Kit';
import { neon } from '../design/neonTokens';
import {
  NeonScreenHeader,
  NeonCompactBalance,
  NeonRankBanner,
  NeonListRow,
  NeonSectionLabel,
  NeonGlassCard,
} from '../design/NeonSecondaryUI';

interface Entry {
  user_id: string;
  username: string | null;
  total_points: number;
  avatar_url: string | null;
}

const PODIUM = [
  { rank: 1, label: 'Champion', accent: neon.gold, icon: Crown },
  { rank: 2, label: 'Runner Up', accent: neon.cyan, icon: Medal },
  { rank: 3, label: 'Third Place', accent: '#e8a87c', icon: Award },
] as const;

function Avatar({ url, name, size = 28, accent = neon.cyan }: { url: string | null; name: string | null; size?: number; accent?: string }) {
  const [err, setErr] = useState(false);
  const init = (name || '?')[0].toUpperCase();
  if (url && !err) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <span style={{ fontSize: size * 0.38, fontWeight: 800, color: accent }}>{init}</span>
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

    const { entries, blocked } = await fetchGlobalLeaderboard(100);
    if (blocked) {
      setRlsBlocked(true);
      setLoading(false);
      return;
    }

    setLeaders(entries);
    setLoading(false);
  };

  const totalPts = Math.round(points?.total_points ?? 0);
  const userRank = rank ?? null;
  const top3 = leaders.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : [];
  const podiumMeta = [PODIUM[1], PODIUM[0], PODIUM[2]];

  return (
    <V2Page>
      <NeonScreenHeader
        eyebrow="Global Rankings"
        title="Leaderboard"
        subtitle="Top ARX-P miners worldwide"
        onBack={() => navigate(-1)}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 16px 24px' }}>
        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <NeonCompactBalance
            balance={totalPts}
            rank={userRank}
            label="Your Balance"
            stats={[
              { label: 'Rank', value: userRank ? `#${userRank}` : '—', accent: neon.gold },
              { label: 'ARX-P', value: formatPointsDisplay(totalPts), accent: neon.cyan },
              { label: 'Streak', value: `${points?.daily_streak ?? 0}d`, accent: neon.teal },
            ]}
          />
        </motion.div>

        {rlsBlocked && !loading && (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard accent={neon.gold} padding="12px 14px">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={16} color={neon.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: neon.gold, margin: '0 0 4px' }}>
                    Leaderboard temporarily unavailable
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(184,239,248,0.55)', lineHeight: 1.5, margin: 0 }}>
                    {isAdmin ? 'Enable public read policy on user_points in Supabase.' : 'Rankings are being updated. Check back soon.'}
                  </p>
                  {isAdmin && (
                    <code style={{
                      display: 'block', marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: 9,
                      background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
                      color: neon.teal, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                    }}>
                      {`CREATE POLICY "Public leaderboard read"\nON user_points FOR SELECT\nTO public USING (true);`}
                    </code>
                  )}
                </div>
              </div>
            </NeonGlassCard>
          </motion.div>
        )}

        {!loading && !rlsBlocked && top3.length >= 3 && (
          <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
            <NeonSectionLabel>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} color={neon.gold} /> Top 3
              </span>
            </NeonSectionLabel>
            <div
              style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory' }}
              className="scrollbar-none"
            >
              {podiumOrder.map((entry, idx) => {
                const meta = podiumMeta[idx];
                return (
                  <div key={entry.user_id} style={{ scrollSnapAlign: 'start' }}>
                    <NeonRankBanner
                      rank={meta.rank}
                      label={meta.label}
                      username={entry.username || 'Miner'}
                      points={entry.total_points}
                      accent={meta.accent}
                      icon={meta.icon}
                      onClick={entry.user_id !== user?.id ? () => navigate(`/profile/${entry.user_id}`) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <NeonSectionLabel>
            All Miners{!loading && !rlsBlocked ? ` · ${leaders.length}` : ''}
          </NeonSectionLabel>

          {loading ? (
            <div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 48, borderRadius: 14, marginBottom: 6,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    opacity: 1 - i * 0.08,
                  }}
                />
              ))}
            </div>
          ) : rlsBlocked ? (
            <NeonGlassCard accent={neon.cyan} padding="28px 16px">
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, margin: '0 auto 10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${neon.cyan}12`, border: `1px solid ${neon.cyan}25`,
                }}>
                  <AlertCircle size={22} color={neon.cyan} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#b8eff8', marginBottom: 4 }}>Setup required</p>
                <p style={{ fontSize: 10, color: 'rgba(184,239,248,0.45)', lineHeight: 1.5, margin: 0 }}>
                  See notice above to enable public access
                </p>
              </div>
            </NeonGlassCard>
          ) : leaders.length === 0 ? (
            <NeonGlassCard accent={neon.gold} padding="28px 16px">
              <div style={{ textAlign: 'center' }}>
                <Trophy size={32} color={neon.gold} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.8 }} />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#b8eff8', marginBottom: 4 }}>No miners yet</p>
                <p style={{ fontSize: 10, color: 'rgba(184,239,248,0.45)', margin: 0 }}>Start mining to appear here</p>
              </div>
            </NeonGlassCard>
          ) : (
            <NeonGlassCard accent={neon.cyan} padding="8px 8px 4px">
              {leaders.map((entry, idx) => {
                const isTop3 = idx < 3;
                const isMe = entry.user_id === user?.id;
                const accent = isTop3 ? PODIUM[idx].accent : isMe ? neon.teal : 'rgba(184,239,248,0.55)';
                const PodiumIcon = isTop3 ? PODIUM[idx].icon : User;

                return (
                  <NeonListRow
                    key={entry.user_id}
                    rank={idx + 1}
                    icon={
                      entry.avatar_url ? (
                        <Avatar url={entry.avatar_url} name={entry.username} size={26} accent={accent} />
                      ) : isTop3 ? (
                        <PodiumIcon size={14} strokeWidth={2.2} />
                      ) : (
                        <User size={14} strokeWidth={2.2} />
                      )
                    }
                    accent={accent}
                    title={isMe ? `${entry.username || 'Miner'} (You)` : entry.username || 'Miner'}
                    subtitle={isTop3 ? PODIUM[idx].label : undefined}
                    value={formatPointsDisplay(entry.total_points)}
                    valueLabel="ARX-P"
                    highlight={isMe}
                    onClick={!isMe ? () => navigate(`/profile/${entry.user_id}`) : undefined}
                  />
                );
              })}
            </NeonGlassCard>
          )}
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
