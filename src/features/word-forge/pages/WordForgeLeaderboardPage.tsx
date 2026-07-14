import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { ForgeTitle, TechButton } from '@/features/word-forge/components/ForgeTitle';
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
      minHeight: '100vh', background: '#050810', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${FORGE_UI.discoveryBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(8px) brightness(0.28)', transform: 'scale(1.06)',
      }} />
      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'max(48px, env(safe-area-inset-top)) 16px 24px',
        maxWidth: 420, margin: '0 auto',
      }}>
        <button
          type="button"
          onClick={() => navigate('/games')}
          style={{
            marginBottom: 12, padding: '6px 12px', borderRadius: 4,
            border: '1px solid rgba(79,216,235,0.22)', background: 'rgba(0,0,0,0.55)',
            color: 'rgba(79,216,235,0.85)', cursor: 'pointer', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em',
          }}
        >
          ← HUB
        </button>

        <ForgeTitle />
        <p style={{
          margin: '8px 0 16px', textAlign: 'center', fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
        }}>
          TOP FORGE OPERATORS
        </p>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Loading ranks…</p>
        ) : rows.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            No forge rankings yet. Clear sectors to appear here.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {rows.map((row) => {
              const isMe = row.user_id === user?.id;
              return (
                <div key={row.user_id} style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10, alignItems: 'center',
                  padding: '10px 12px', borderRadius: 4,
                  border: `1px solid ${isMe ? '#ffd93d55' : 'rgba(79,216,235,0.18)'}`,
                  background: isMe ? 'rgba(255,217,61,0.08)' : 'rgba(0,8,16,0.72)',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: row.rank <= 3 ? '#ffd93d' : '#4FD8EB' }}>
                    #{row.rank}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#e8fcff' }}>
                      {row.username || 'Operator'}
                      {isMe && <span style={{ color: '#ffd93d', fontSize: 9, marginLeft: 6 }}>YOU</span>}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                      {row.total_words} words · streak {row.best_streak}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#4FD8EB' }}>{row.best_level}</div>
                    <div style={{ fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>SECTOR</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <TechButton variant="ghost" onClick={() => navigate('/word-forge/stats')}>My Stats</TechButton>
        </div>
      </div>
    </div>
  );
}
