import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Trophy } from 'lucide-react';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import {
  GamePanel, GlossyBackButton, GlossyButton, RibbonBanner, TreasureBackdrop,
} from '@/features/word-forge/components/GlossyKit';
import { mobileScrollPadding } from '@/lib/mobileLayout';

interface ForgeLeaderRow {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  best_level: number;
  total_words: number;
  best_streak: number;
  rank: number;
}

const RANK_COLORS = ['#ffd93d', '#cfd8e3', '#e8a367'];

export default function WordForgeLeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setHideNav } = useMobileNav();
  const [rows, setRows] = useState<ForgeLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('word_forge_leaderboard' as 'profiles')
        .select('user_id, username, avatar_url, best_level, total_words, best_streak, rank')
        .order('rank', { ascending: true })
        .limit(50);
      if (!cancelled) {
        if (!error && data) setRows(data as unknown as ForgeLeaderRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#04070f', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
    }}>
      <TreasureBackdrop />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'max(26px, env(safe-area-inset-top)) 18px 24px',
        maxWidth: 400, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <GlossyBackButton onClick={() => navigate('/games')} />
          <img src={FORGE_UI.forgeLogo} alt="Arxon Word Forge" style={{
            width: 128, height: 'auto',
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.65))',
          }} />
          <div style={{ width: 44 }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 24 }}
          style={{ marginTop: 30 }}
        >
          <GamePanel style={{ paddingTop: 34 }}>
            <RibbonBanner color="gold">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={16} strokeWidth={3} /> Top Forgers
              </span>
            </RibbonBanner>

            {loading ? (
              <p style={{ textAlign: 'center', color: 'rgba(220,240,255,0.55)', fontSize: 12, padding: '18px 0' }}>
                Loading ranks…
              </p>
            ) : rows.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(220,240,255,0.55)', fontSize: 12, padding: '18px 0', lineHeight: 1.6 }}>
                No forge rankings yet.<br />Clear sectors to claim the crown.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 7, maxHeight: '52vh', overflowY: 'auto', padding: '2px 1px' }}>
                {rows.map((row, i) => {
                  const isMe = row.user_id === user?.id;
                  const podium = row.rank <= 3 ? RANK_COLORS[row.rank - 1] : null;
                  return (
                    <motion.div
                      key={row.user_id}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(0.15 + i * 0.04, 0.7) }}
                      style={{
                        display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 10, alignItems: 'center',
                        padding: '9px 12px', borderRadius: 13,
                        background: isMe ? 'rgba(255,217,61,0.1)' : 'rgba(2,10,22,0.7)',
                        border: `1.5px solid ${isMe ? 'rgba(255,217,61,0.5)' : podium ? `${podium}44` : 'rgba(79,216,235,0.16)'}`,
                        boxShadow: podium ? `0 0 14px ${podium}22` : undefined,
                      }}
                    >
                      <span style={{
                        fontSize: 15, fontWeight: 900,
                        color: podium ?? '#4FD8EB',
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        textShadow: podium ? `0 0 10px ${podium}66` : undefined,
                      }}>
                        {row.rank === 1 && <Crown size={13} fill={podium ?? undefined} strokeWidth={2.4} />}
                        {row.rank}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 800, color: '#fff',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {row.username || 'Operator'}
                          {isMe && <span style={{ color: '#ffd93d', fontSize: 8.5, fontWeight: 900, marginLeft: 6, letterSpacing: '0.1em' }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(220,240,255,0.45)', marginTop: 1.5 }}>
                          {row.total_words} words · streak {row.best_streak}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: '#4FD8EB', lineHeight: 1 }}>{row.best_level}</div>
                        <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(220,240,255,0.4)' }}>SECTOR</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <GlossyButton color="cyan" onClick={() => navigate('/word-forge/stats')}>
                My Stats
              </GlossyButton>
            </div>
          </GamePanel>
        </motion.div>
      </div>
    </div>
  );
}
