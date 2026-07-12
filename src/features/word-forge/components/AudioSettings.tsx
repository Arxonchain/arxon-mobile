import { useEffect, useRef, useState } from 'react';
import type { ForgeSettings } from '../hooks/useForgeSettings';

interface AudioSettingsProps {
  settings: ForgeSettings;
  onChange: (s: ForgeSettings) => void;
  accent: string;
}

export function AudioSettings({ settings, onChange, accent }: AudioSettingsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Audio settings"
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.35)',
          color: accent, cursor: 'pointer', fontSize: 16,
        }}
      >
        {settings.music || settings.sfx ? '🔊' : '🔇'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, zIndex: 30,
          padding: '12px 14px', borderRadius: 12, minWidth: 160,
          background: 'rgba(8,12,20,0.95)', border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <ToggleRow
            label="Sound FX"
            on={settings.sfx}
            onToggle={() => onChange({ ...settings, sfx: !settings.sfx })}
            accent={accent}
          />
          <ToggleRow
            label="Music"
            on={settings.music}
            onToggle={() => onChange({ ...settings, music: !settings.music })}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label, on, onToggle, accent,
}: { label: string; on: boolean; onToggle: () => void; accent: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginBottom: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    }}>
      <span style={{ color: '#cbd5e1' }}>{label}</span>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2,
          background: on ? accent : 'rgba(255,255,255,0.15)',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
      >
        <span style={{
          display: 'block', width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </label>
  );
}
