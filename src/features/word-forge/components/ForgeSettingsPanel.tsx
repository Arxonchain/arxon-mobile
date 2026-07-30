import { useCallback, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FORGE_MUSIC_TRACKS, playTap } from '../audio/forgeAudio';
import type { ForgeSettings } from '../hooks/useForgeSettings';

interface ForgeSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: ForgeSettings;
  onChange: (s: ForgeSettings) => void;
  accent: string;
}

/** Controlled bottom-sheet settings panel — parent owns the trigger. */
export function ForgeSettingsPanel({ open, onClose, settings, onChange, accent }: ForgeSettingsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, onClose]);

  return (
    <>
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
                onClick={onClose}
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
                onChange={(v) => onChange({ ...settings, sfxVolume: v })}
                onCommit={() => playTap()} />
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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Pointer-driven volume control: drag the bar or use the −/+ step buttons.
 * Custom (not <input type=range>) so it works reliably inside the game's
 * gesture-heavy layout on touch devices.
 */
function SliderRow({
  label, value, onChange, onCommit, accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  accent: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const raw = clamp01((clientX - rect.left) / rect.width);
    onChange(Math.round(raw * 20) / 20);
  }, [onChange]);

  const step = (delta: number) => {
    onChange(clamp01(Math.round((value + delta) * 20) / 20));
    onCommit?.();
  };

  const btnStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
    background: 'rgba(255,255,255,0.08)', color: '#e2e8f0',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: accent }}>{Math.round(value * 100)}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" aria-label={`Decrease ${label}`} style={btnStyle} onClick={() => step(-0.1)}>
          <Minus size={15} strokeWidth={3} />
        </button>
        <div
          ref={barRef}
          role="slider"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value * 100)}
          onPointerDown={(e) => {
            e.preventDefault();
            draggingRef.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            setFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) setFromClientX(e.clientX);
          }}
          onPointerUp={() => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            onCommit?.();
          }}
          onPointerCancel={() => { draggingRef.current = false; }}
          style={{
            flex: 1, height: 30, display: 'flex', alignItems: 'center',
            cursor: 'pointer', touchAction: 'none',
          }}
        >
          <div style={{
            position: 'relative', width: '100%', height: 10, borderRadius: 5,
            background: 'rgba(255,255,255,0.12)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${value * 100}%`, borderRadius: 5,
              background: `linear-gradient(180deg, ${accent}, ${accent}99)`,
              boxShadow: `0 0 8px ${accent}66`,
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: `${value * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: 'linear-gradient(180deg, #ffffff, #cfe8f2)',
              border: `2px solid ${accent}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }} />
          </div>
        </div>
        <button type="button" aria-label={`Increase ${label}`} style={btnStyle} onClick={() => step(0.1)}>
          <Plus size={15} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
