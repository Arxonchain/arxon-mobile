import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEPTH_WATCH_CHARACTERS, isCharacterUnlocked, unlockLabel,
} from './data/characters';
import { fetchUnlockedCharacters, fetchUserBestRun } from './data/supabaseScores';

interface CharacterSelectProps {
  onSelect: (characterId: string) => void;
}

export default function CharacterSelect({ onSelect }: CharacterSelectProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bestLevel, setBestLevel] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState('explorer');

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [best, ids] = await Promise.all([
        fetchUserBestRun(user.id),
        fetchUnlockedCharacters(user.id),
      ]);
      setBestLevel(best?.level_reached ?? 0);
      setUnlocked(ids);
    })();
  }, [user]);

  return (
    <div style={{
      minHeight: '100vh', background: 'hsl(225 30% 3%)', padding: '20px 20px 100px',
      fontFamily: "'Creato Display',-apple-system,sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={iconBtn}>
          <ArrowLeft size={20} color="hsl(215 35% 62%)" />
        </button>
        <div>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'hsl(215 20% 93%)', margin: 0 }}>Depth Watch</p>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 45%)', margin: '4px 0 0' }}>Choose your operative</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {DEPTH_WATCH_CHARACTERS.map((c) => {
          const open = isCharacterUnlocked(c.unlock, bestLevel, unlocked, c.id);
          const active = selected === c.id;
          return (
            <motion.button
              key={c.id}
              whileTap={open ? { scale: 0.96 } : undefined}
              onClick={() => { if (open) setSelected(c.id); }}
              style={{
                borderRadius: 18, padding: 14, textAlign: 'left', cursor: open ? 'pointer' : 'default',
                background: active ? 'hsl(215 35% 62%/0.12)' : 'hsl(225 26% 8%)',
                border: active ? '1px solid hsl(215 35% 62%/0.4)' : '1px solid hsl(215 22% 14%)',
                opacity: open ? 1 : 0.55, position: 'relative',
              }}
            >
              {!open && (
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <Lock size={14} color="hsl(215 14% 45%)" />
                </div>
              )}
              <img src={c.spriteSrc} alt={c.name} style={{
                width: '100%', height: 100, objectFit: 'contain', borderRadius: 12,
                background: 'hsl(225 28% 6%)', marginBottom: 10,
              }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 20% 90%)', margin: 0 }}>{c.name}</p>
              <p style={{ fontSize: 10, color: 'hsl(215 14% 42%)', margin: '4px 0 0', lineHeight: 1.35 }}>{c.tagline}</p>
              {!open && (
                <p style={{ fontSize: 9, fontWeight: 700, color: 'hsl(38 55% 52%)', margin: '8px 0 0' }}>
                  {unlockLabel(c.unlock)}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelect(selected)}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, hsl(215 35% 52%), hsl(215 45% 62%))',
          color: 'hsl(225 30% 6%)', fontSize: 15, fontWeight: 800,
          boxShadow: '0 8px 24px hsl(215 35% 62%/0.25)',
        }}
      >
        Enter the Watch
      </motion.button>

      {bestLevel > 0 && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'hsl(215 14% 40%)', marginTop: 16 }}>
          Personal best — Sector {bestLevel}
        </p>
      )}
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 40, height: 40, borderRadius: 12, border: '1px solid hsl(215 22% 16%)',
  background: 'hsl(225 26% 8%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
