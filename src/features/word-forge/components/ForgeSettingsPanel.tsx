import { useEffect, useRef, useState } from 'react';
import { FORGE_MUSIC_TRACKS } from '../audio/forgeAudio';
import type { ForgeSettings } from '../hooks/useForgeSettings';

interface ForgeSettingsPanelProps {
  settings: ForgeSettings;
  onChange: (s: ForgeSettings) => void;
  accent: string;
}

export function ForgeSettingsPanel({ settings, onChange, accent }: ForgeSettingsPanelProps) {
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Game settings"
        style={{
          width: 36, height: 36, borderRadius: 8,
          border: '1px solid rgba(79,216,235,0.25)',
          background: 'rgba(0,0,0,0.45)',
          color: accent, cursor: 'pointer', fontSize: 15,
        }}
      >
        ⚙
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div
            ref={ref}
            style={{
              width: 'min(100%, 420px)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '20px 18px max(24px, env(safe-area-inset-bottom))',
              borderRadius: '16px 16px 0 0',
              background: 'linear-gradient(180deg, rgba(6,14,26,0.98) 0%, rgba(2,8,16,0.99) 100%)',
              border: '1px solid rgba(79,216,235,0.2)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, letterSpacing: '0.2em', color: accent }}>
                FORGE SETTINGS
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  fontSize: 20, cursor: 'pointer', lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <Section title="Audio">
              <ToggleRow label="Sound FX" on={settings.sfx} accent={accent}
                onToggle={() => onChange({ ...settings, sfx: !settings.sfx })} />
              <SliderRow label="SFX Volume" value={settings.sfxVolume} accent={accent}
                onChange={(v) => onChange({ ...settings, sfxVolume: v })} />
              <ToggleRow label="Background Music" on={settings.music} accent={accent}
                onToggle={() => onChange({ ...settings, music: !settings.music })} />
              <SliderRow label="Music Volume" value={settings.musicVolume} accent={accent}
                onChange={(v) => onChange({ ...settings, musicVolume: v })} />
            </Section>

            <Section title="Music Track">
              <div style={{ display: 'grid', gap: 8 }}>
                {FORGE_MUSIC_TRACKS.map((track) => {
                  const active = settings.musicTrack === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => onChange({ ...settings, musicTrack: track.id, music: true })}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                        background: active ? `${accent}18` : 'rgba(0,0,0,0.35)',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: active ? accent : '#e2e8f0' }}>
                        {track.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                        {track.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Gameplay">
              <ToggleRow label="Haptic Feedback" on={settings.haptics} accent={accent}
                onToggle={() => onChange({ ...settings, haptics: !settings.haptics })} />
            </Section>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        margin: '0 0 10px', fontSize: 9, fontWeight: 800, letterSpacing: '0.25em',
        color: 'rgba(79,216,235,0.55)',
      }}>
        {title.toUpperCase()}
      </p>
      {children}
    </div>
  );
}

function ToggleRow({
  label, on, onToggle, accent,
}: { label: string; on: boolean; onToggle: () => void; accent: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginBottom: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
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

function SliderRow({
  label, value, onChange, accent,
}: { label: string; value: number; onChange: (v: number) => void; accent: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 10, color: accent }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent }}
      />
    </label>
  );
}

/** @deprecated use ForgeSettingsPanel */
export function AudioSettings(props: ForgeSettingsPanelProps) {
  return <ForgeSettingsPanel {...props} />;
}
