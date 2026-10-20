import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';

const art = (name: string) => `/wallet-figma/phrase/${name}`;

type Go = (id: string, remember?: boolean) => void;

const WORDS = ['river', 'cloud', 'mango', 'window', 'candle', 'ocean', 'tiger', 'garden', 'silver', 'mountain', 'paper', 'apple'];

const CHECKS: { label: string; options: string[]; answer: string }[] = [
  { label: '#1', options: ['river', 'rebel', 'cactus'], answer: 'river' },
  { label: '#10', options: ['spoil', 'mountain', 'diet'], answer: 'mountain' },
  { label: '#12', options: ['apple', 'tiger', 'ocean'], answer: 'apple' },
];

const CAUTIONS = [
  {
    id: 'caution1',
    step: 1,
    icon: 'eye-off.svg',
    title: 'Make sure your screen is only visible to you',
    body: 'If your seed phrase is captured by screenshots or recordings, you may lose control of your wallet.',
    action: 'I understand',
    next: 'caution2',
  },
  {
    id: 'caution2',
    step: 2,
    icon: 'paper.svg',
    title: 'Store your seed phrase offline',
    body: 'Write it on paper and keep it somewhere safe. Never save it in notes, photos, or cloud apps.',
    action: 'I understand',
    next: 'caution3',
  },
  {
    id: 'caution3',
    step: 3,
    icon: 'user-x.svg',
    title: 'Never share it with anyone',
    body: 'Anyone with your seed phrase can take your funds. Arxon will never ask you for it.',
    action: 'Back up seed phrase',
    next: 'phrase-hidden',
  },
];

export function PhraseBackupScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const words = live?.words && live.words.length >= 12 ? live.words.slice(0, 12) : WORDS;
  useEffect(() => {
    if (live?.app && (id === 'phrase-hidden' || id === 'phrase-shown' || id === 'phrase-done')) void live.ensureWords();
  }, [id, live]);
  const caution = CAUTIONS.find((item) => item.id === id);
  if (caution) {
    return (
      <Caution
        step={caution.step}
        icon={caution.icon}
        title={caution.title}
        body={caution.body}
        action={caution.action}
        onBack={() => (back ? back() : go(caution.step === 1 ? 'backup-manual' : CAUTIONS[caution.step - 2].id, false))}
        onNext={() => go(caution.next)}
        onLater={() => go('ready-skip')}
      />
    );
  }
  if (id === 'phrase-hidden' || id === 'phrase-shown') {
    return (
      <Phrase
        words={words}
        revealed={id === 'phrase-shown'}
        onBack={() => (back ? back() : go(id === 'phrase-shown' ? 'phrase-hidden' : 'caution3', false))}
        onReveal={() => go('phrase-shown')}
        onHide={() => (back ? back() : go('phrase-hidden', false))}
        onWritten={() => go('phrase-confirm')}
      />
    );
  }
  if (id === 'phrase-confirm') {
    return <Confirm words={words} onBack={() => (back ? back() : go('phrase-shown', false))} onVerify={() => go('phrase-done')} />;
  }
  return <Ready onEnter={() => { if (live?.app) void live.ensureWords(); go('home'); }} />;
}

function Caution({
  step,
  icon,
  title,
  body,
  action,
  onBack,
  onNext,
  onLater,
}: {
  step: number;
  icon: string;
  title: string;
  body: string;
  action: string;
  onBack: () => void;
  onNext: () => void;
  onLater: () => void;
}) {
  return (
    <Screen>
      <div style={{ position: 'absolute', left: 18, top: 58, display: 'flex', gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <span key={n} style={{ width: 114, height: 4, borderRadius: 2, background: n <= step ? '#accafe' : '#26292f' }} />
        ))}
      </div>
      <Back top={76} onClick={onBack} />
      <img src={art('glow.svg')} alt="" width={400} height={400} style={{ position: 'absolute', left: -5, top: 50 }} />
      <img src={art('orbit.svg')} alt="" width={230} height={230} style={{ position: 'absolute', left: 80, top: 135 }} />
      <img src={art('orbit-inner.svg')} alt="" width={160} height={160} style={{ position: 'absolute', left: 115, top: 170 }} />
      <div style={{ position: 'absolute', left: 147, top: 202, width: 96, height: 96, borderRadius: 48, background: '#accafe', border: '1.5px solid #29333d', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={art(icon)} alt="" width={44} height={44} />
      </div>
      <span style={{ position: 'absolute', left: 24, top: 410, background: '#accafe', color: '#0c1018', borderRadius: 14, padding: '5px 12px', fontWeight: 600, fontSize: 12 }}>Caution {step}/3</span>
      <h1 style={{ ...headline, top: 448, width: 342, fontSize: 28 }}>{title}</h1>
      <p style={{ ...copy, top: 530, width: 330, fontSize: 16 }}>{body}</p>
      <button type="button" onClick={onNext} style={{ ...primary, top: 649 }}>{action}</button>
      <button type="button" onClick={onLater} style={later}>Maybe later</button>
    </Screen>
  );
}

function Phrase({
  words,
  revealed,
  onBack,
  onReveal,
  onHide,
  onWritten,
}: {
  words: string[];
  revealed: boolean;
  onBack: () => void;
  onReveal: () => void;
  onHide: () => void;
  onWritten: () => void;
}) {
  return (
    <Screen>
      <Back top={56} onClick={onBack} />
      <h1 style={{ ...headline, top: 112, fontSize: 30 }}>Your recovery phrase</h1>
      <p style={{ ...copy, top: 158, width: 336, fontSize: 15 }}>
        These 12 words are the only way to restore your wallet. Write them down in order.
      </p>
      <div style={{ position: 'absolute', left: 18, top: 243, width: 354, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} style={{ display: 'flex', gap: 10 }}>
            {[0, 1].map((col) => {
              const index = row * 2 + col;
              return (
                <span key={index} style={wordChip}>
                  <span style={{ width: 26, color: '#5c5f64', fontSize: 13 }}>{String(index + 1).padStart(2, '0')}</span>
                  <span style={{ color: revealed ? '#fff' : '#8b9097', fontWeight: 500, fontSize: 16 }}>{revealed ? words[index] : '••••••'}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {!revealed && (
        <button type="button" onClick={onReveal} style={veil}>
          <span style={{ width: 56, height: 56, borderRadius: 28, background: '#1c2025', border: '1px solid #2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={art('lock.svg')} alt="" width={26} height={26} />
          </span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Tap to reveal your phrase</span>
        </button>
      )}
      {revealed && (
        <button type="button" onClick={onHide} style={hideBtn}>
          <img src={art('eye-off-sm.svg')} alt="" width={16} height={16} />
          Hide
        </button>
      )}
      <button type="button" onClick={revealed ? onWritten : onReveal} style={{ ...primary, top: 712 }}>
        {revealed ? 'I’ve written it down' : 'Reveal phrase'}
      </button>
    </Screen>
  );
}

function Confirm({ words, onBack, onVerify }: { words: string[]; onBack: () => void; onVerify: () => void }) {
  const checks = words === WORDS ? CHECKS : [
    { label: '#1', options: [words[0], 'rebel', 'cactus'], answer: words[0] },
    { label: '#10', options: ['spoil', words[9], 'diet'], answer: words[9] },
    { label: '#12', options: [words[11], 'tiger', 'ocean'], answer: words[11] },
  ];
  const [picks, setPicks] = useState<Array<string | null>>([null, null, null]);
  const selected = picks.filter(Boolean).length;
  const ready = checks.every((check, i) => picks[i] === check.answer);
  return (
    <Screen>
      <Back top={56} onClick={onBack} />
      <h1 style={{ ...headline, top: 112, fontSize: 30 }}>Confirm your phrase</h1>
      <p style={{ ...copy, top: 158, width: 336, fontSize: 15 }}>
        Tap the correct word for each position to make sure you saved it.
      </p>
      {checks.map((check, group) => (
        <div key={check.label}>
          <p style={{ position: 'absolute', left: 24, top: 232 + group * 104, margin: 0, fontSize: 14 }}>
            <span style={{ color: '#8b9097', fontWeight: 400 }}>Word </span>
            <span style={{ fontWeight: 700 }}>{check.label}</span>
          </p>
          <div style={{ position: 'absolute', left: 18, top: 260 + group * 104, display: 'flex', gap: 9 }}>
            {check.options.map((word) => {
              const on = picks[group] === word;
              return (
                <button key={word} type="button" onClick={() => setPicks((prev) => prev.map((item, i) => (i === group ? word : item)))} style={{ width: 112, height: 52, borderRadius: 12, border: on ? '1.5px solid #accafe' : '1px solid #2a3447', background: on ? '#2a3447' : '#1c2025', color: on ? '#accafe' : '#fff', fontFamily: font.sans, fontWeight: on ? 600 : 500, fontSize: 15, cursor: 'pointer' }}>
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p style={{ position: 'absolute', left: 24, top: 548, margin: 0, color: '#8b9097', fontSize: 13 }}>{selected} of 3 words selected</p>
      <button type="button" disabled={!ready} onClick={onVerify} style={{ ...primary, top: 712, opacity: ready ? 1 : 0.45, cursor: ready ? 'pointer' : 'default' }}>Verify</button>
    </Screen>
  );
}

function Ready({ onEnter }: { onEnter: () => void }) {
  return (
    <Screen clock="ready">
      <div style={{ position: 'absolute', left: 121, top: 134, width: 148, height: 148, borderRadius: 74, background: '#10151d', border: '1px solid #2a3447', boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 147, top: 160, width: 96, height: 96, borderRadius: 48, background: '#10151d', border: '1px solid #accafe', boxSizing: 'border-box' }} />
      <img src="/wallet-figma/create/shield-ready.svg" alt="" width={48} height={48} style={{ position: 'absolute', left: 171, top: 184 }} />
      <h1 style={{ ...headline, top: 320, left: 24, width: 342, fontSize: 30, textAlign: 'center' }}>Your wallet is ready</h1>
      <p style={{ position: 'absolute', left: 40, top: 366, width: 310, margin: 0, textAlign: 'center', color: '#8b9097', fontSize: 15, lineHeight: '22px' }}>
        Account 01 is created and protected. You choose what stays private on every payment.
      </p>
      <div style={{ position: 'absolute', left: 18, top: 452, width: 354, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ReadyRow title="Recovery phrase verified" detail="You confirmed all 12 words" />
        <ReadyRow title="Password set" detail="Unlocks Arxon on this device" />
        <ReadyRow title="Privacy defaults set" detail="You choose what each payment hides" />
      </div>
      <button type="button" onClick={onEnter} style={{ ...primary, top: 712 }}>Enter Arxon</button>
    </Screen>
  );
}

function ReadyRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ background: '#1c2025', border: '1px solid #2a3447', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <span style={{ width: 28, height: 28, borderRadius: 14, background: '#12261d', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 28px' }}>
        <img src="/wallet-figma/create/check-ready.svg" alt="" width={16} height={16} />
      </span>
      <span>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, color: '#8b9097', fontSize: 13 }}>{detail}</span>
      </span>
    </div>
  );
}

function Screen({ children, clock = 'flow' }: { children: ReactNode; clock?: 'flow' | 'ready' }) {
  const hide = useAppHidesFigmaChrome();
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {hide ? null : (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
        <span style={{ position: 'absolute', left: clock === 'ready' ? 28 : 21, top: clock === 'ready' ? 13 : 14, width: clock === 'ready' ? undefined : 54, textAlign: 'center', fontSize: clock === 'ready' ? 15 : 14, fontWeight: 600, letterSpacing: clock === 'ready' ? 0 : -0.28 }}>9:41</span>
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: clock === 'ready' ? 296 : 288.67, top: clock === 'ready' ? 17 : 17.33 }} />
      </div>
      )}
      {children}
      {hide ? null : (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.25 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: '#293342' }} />
      </div>
      )}
    </div>
  );
}

function Back({ top, onClick }: { top: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" style={{ position: 'absolute', left: 18, top, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
      <img src="/wallet-figma/create/chev.svg" alt="" width={20} height={20} />
    </button>
  );
}

const headline: CSSProperties = { position: 'absolute', left: 24, margin: 0, fontWeight: 700, lineHeight: 'normal' };
const copy: CSSProperties = { position: 'absolute', left: 24, margin: 0, color: '#8b9097', fontWeight: 400, lineHeight: 'normal' };
const primary: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' };
const later: CSSProperties = { position: 'absolute', left: 19, top: 722, width: 353, border: 'none', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontWeight: 600, fontSize: 15, cursor: 'pointer' };
const wordChip: CSSProperties = { width: 172, height: 48, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' };
const veil: CSSProperties = { position: 'absolute', left: 18, top: 243, width: 354, height: 338, border: 'none', borderRadius: 14, background: 'rgba(5,5,5,0.72)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontFamily: font.sans };
const hideBtn: CSSProperties = { position: 'absolute', left: 294, top: 593, border: 'none', borderRadius: 18, background: '#1c2025', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px 8px 12px', fontFamily: font.sans, fontWeight: 500, fontSize: 13, cursor: 'pointer' };
