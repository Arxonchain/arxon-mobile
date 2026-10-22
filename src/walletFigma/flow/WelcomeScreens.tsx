import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { markBootOk } from '@/lib/bootState';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';

/** Source file is 1280×500. Do not force the design box 236×78 — that stretches the mark. */
const WORDMARK_W = 236;
const WORDMARK_H = (WORDMARK_W * 500) / 1280;

const asset = (name: string) => `/wallet-figma/welcome/${name}`;

type Go = (id: string, remember?: boolean) => void;

/** Welcome frames from section 01, in the order the prototype plays them. */
export function WelcomeScreens({ id, go }: { id: string; go: Go }) {
  if (id === 'splash') return <Splash onNext={() => go('gateway', false)} />;
  if (id === 'gateway') return <Gateway onNext={() => go('slide15')} />;
  if (id === 'slide15') return <Slide15 onNext={() => go('slide16')} />;
  return <Slide16 onCreate={() => go('caution1')} onRestore={() => go('import')} />;
}

function Phone({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const live = useLiveFrame();
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: 390,
        minHeight: 844,
        height: live?.app ? '100%' : 844,
        background: '#050505',
        overflow: 'hidden',
        color: '#e7e7e8',
        fontFamily: font.sans,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Glow />
      {children}
      {live?.app ? null : <StatusBar />}
      {live?.app ? null : <HomeIndicator />}
    </div>
  );
}

function Splash({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    markBootOk();
  }, []);

  return (
    <Phone onClick={onNext}>
      <img
        src="/wallet-figma/wordmark.png"
        alt="Arxon"
        width={1280}
        height={500}
        style={{
          position: 'absolute',
          left: (390 - WORDMARK_W) / 2,
          top: 383 + (78 - WORDMARK_H) / 2,
          width: WORDMARK_W,
          height: WORDMARK_H,
          maxWidth: 'none',
          objectFit: 'contain',
        }}
      />
    </Phone>
  );
}

/** App splash. Wordmark only — the phone status bar stays in the /flow frames. */
export function OfficialSplash({ ready = true, onFinish }: { ready?: boolean; onFinish: () => void }) {
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    markBootOk();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => finishRef.current(), 2800);
    return () => window.clearTimeout(t);
  }, [ready]);

  return (
    <button
      type="button"
      onClick={() => ready && onFinish()}
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: 'radial-gradient(ellipse 120% 70% at 50% -10%, #3d6dff 0%, #1a3d9e 28%, #0a1630 58%, #050505 78%)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <img src="/wallet-figma/wordmark.png" alt="Arxon" width={1280} height={500} style={{ width: 236, height: 'auto' }} />
    </button>
  );
}

function Gateway({ onNext }: { onNext: () => void }) {
  return (
    <Phone>
      <style>{driftCss}</style>
      <img src={asset('poly-8.png')} alt="" width={250} height={230} style={{ position: 'absolute', left: -80, top: 40, width: 250, height: 230, maxWidth: 'none', opacity: 0.4, transform: 'rotate(-71deg)', pointerEvents: 'none' }} />
      <img src={asset('poly-7.png')} alt="" width={250} height={230} style={{ position: 'absolute', left: 210, top: 150, width: 250, height: 230, maxWidth: 'none', opacity: 0.4, transform: 'rotate(104deg) scaleY(-1)', pointerEvents: 'none' }} />
      <Drift left={82} top={198} duration={9} delay={-1} dx={7} dy={-8}>
        <Img name="orb-b.svg" w={96} h={96} left={0} top={6} />
        <div style={{ position: 'absolute', left: 4, top: 0, width: 96, height: 96, borderRadius: 48, background: '#627eeb' }}>
          <Img name="eth.svg" w={39.429} h={63} left={28} top={17} />
        </div>
      </Drift>
      <Drift left={190} top={153} duration={11} delay={-3} dx={-8} dy={6}>
        <Img name="orb-a.svg" w={96} h={96} left={5} top={0} />
        <Img name="orb-b.svg" w={96} h={96} left={0} top={1} />
        <div style={arxMark(21, 29, 'arx-mask.png', 56, 40)} />
      </Drift>
      <Drift left={86} top={320} duration={10} delay={-5} dx={6} dy={8}>
        <Img name="orb-c.svg" w={96} h={96} left={0} top={3} />
        <Img name="orb-b.svg" w={96} h={96} left={4} top={0} />
        <Img name="dollar.svg" w={53} h={53} left={23} top={22} />
      </Drift>
      <Drift left={207} top={276} duration={8.5} delay={-2} dx={-6} dy={-7}>
        <Img name="orb-b.svg" w={96} h={96} left={0} top={0} flip />
        <Img name="orb-d.svg" w={96} h={96} left={5} top={7} flip />
        <Img name="bitcoin.svg" w={52} h={52} left={27} top={29} />
      </Drift>
      <Copy
        top={517}
        dots="dots-1.svg"
        title={
          <>
            Your Gateway to <Accent>Layer-1</Accent>
            <br />
            <Accent>blockchain</Accent> with <Accent>toggle</Accent>
            <br />
            <Accent>privacy</Accent>
          </>
        }
        action="Next"
        onAction={onNext}
      />
    </Phone>
  );
}

function Slide15({ onNext }: { onNext: () => void }) {
  return (
    <Phone>
      <img src={asset('glow-b.png')} alt="" width={326} height={326} style={{ position: 'absolute', left: -285, top: 45, width: 326, height: 326, maxWidth: 'none', pointerEvents: 'none' }} />
      <img src={asset('glow-a.png')} alt="" width={326} height={326} style={{ position: 'absolute', left: 349, top: 200, width: 326, height: 326, maxWidth: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Coin left={77} top={147} size={89.114} color="#f7931a">
          <Img name="btc-15.svg" w={42.532} h={42.532} left={23} top={23} />
        </Coin>
        <Coin left={209} top={147} size={89.114} color="#90b9ff">
          <Img name="dollar-15.svg" w={39.494} h={39.494} left={25} top={25} />
        </Coin>
        <Coin left={143} top={147} size={89.114} color="#050505">
          <div style={{ position: 'absolute', left: 13, top: 19, width: 56, height: 47, overflow: 'hidden' }}>
            <img
              src={asset('mark.png')}
              alt=""
              style={{ position: 'absolute', width: '355.56%', height: '165.6%', left: '-49.46%', top: '-31.68%', maxWidth: 'none' }}
            />
          </div>
        </Coin>
      </div>
      <Img name="pocket.svg" w={240.001} h={229.415} left={75} top={221} z={2} />
      <Copy
        top={520}
        dots="dots-2.svg"
        title={
          <>
            Your wallet, your
            <br />
            <Accent>transaction</Accent>
            <br />
            <Accent>100% Privacy you control</Accent>
          </>
        }
        action="Next"
        onAction={onNext}
      />
    </Phone>
  );
}

function Slide16({ onCreate, onRestore }: { onCreate: () => void; onRestore: () => void }) {
  return (
    <Phone>
      <img src={asset('ring-outer.png')} alt="" width={326} height={326} style={{ position: 'absolute', left: 32, top: 95, width: 326, height: 326, maxWidth: 'none', pointerEvents: 'none' }} />
      <img src={asset('ring-inner.png')} alt="" width={256} height={256} style={{ position: 'absolute', left: 67, top: 130, width: 256, height: 256, maxWidth: 'none', opacity: 0.9, pointerEvents: 'none' }} />
      <img src={asset('ring-center.png')} alt="" width={120} height={120} style={{ position: 'absolute', left: 135, top: 198, width: 120, height: 120, maxWidth: 'none', opacity: 0.3, pointerEvents: 'none' }} />
      <Img name="coin-eth.svg" w={79.038} h={79.038} left={70} top={94} />
      <Img name="coin-btc.svg" w={84} h={84} left={251} top={98} />
      <Coin left={64.84} top={335.94} size={79.156} color="#90b9ff" pad={1.82}>
        <img src={asset('sol.png')} alt="" width={75.55} height={75.55} style={{ width: 75.55, height: 75.55, maxWidth: 'none', borderRadius: 38, objectFit: 'cover' }} />
      </Coin>
      <Coin left={250.73} top={335.04} size={86.962} color="#92f7dc" pad={1}>
        <img src={asset('usdt.png')} alt="" width={86} height={86} style={{ width: 86, height: 86, maxWidth: 'none', borderRadius: 43, objectFit: 'cover' }} />
      </Coin>
      <div style={{ position: 'absolute', left: 151, top: 213, width: 89, height: 89, borderRadius: 44.5, background: '#5c94f4' }}>
        <Img name="orb-center.svg" w={85} h={85} left={2} top={2} />
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 22.7,
            width: 57,
            height: 43.6,
            background: '#050505',
            WebkitMaskImage: `url("${asset('arx-mask-16.png')}")`,
            maskImage: `url("${asset('arx-mask-16.png')}")`,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          }}
        />
      </div>
      <Copy
        top={506}
        dots="dots-3.svg"
        title={
          <>
            Own Your <Accent>Digital Future</Accent>
            <br />
            <Accent>Secure, private, </Accent>and built
            <br />
            for you.
          </>
        }
        action="Create a new wallet"
        onAction={onCreate}
        secondary="Restore existing wallet"
        onSecondary={onRestore}
      />
    </Phone>
  );
}

function Glow() {
  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
      <img src={asset('blob.svg')} alt="" width={1147} height={1094} style={{ position: 'absolute', left: -378, top: -500, width: 1147, height: 1094, maxWidth: 'none' }} />
      <img src={asset('arc-white.svg')} alt="" width={1028} height={598} style={{ position: 'absolute', left: -281, top: -330, width: 1028, height: 598, maxWidth: 'none', mixBlendMode: 'overlay' }} />
      <img src={asset('arc-white.svg')} alt="" width={1028} height={598} style={{ position: 'absolute', left: 189, top: -408, width: 1028, height: 598, maxWidth: 'none', mixBlendMode: 'overlay' }} />
      <img src={asset('arc-white.svg')} alt="" width={1028} height={598} style={{ position: 'absolute', left: -691, top: -408, width: 1028, height: 598, maxWidth: 'none', mixBlendMode: 'overlay' }} />
      <img src={asset('arc-pink.svg')} alt="" width={1028} height={598} style={{ position: 'absolute', left: -251, top: -494, width: 1028, height: 598, maxWidth: 'none', mixBlendMode: 'overlay' }} />
      <img src={asset('arc-pink-2.svg')} alt="" width={1028} height={598} style={{ position: 'absolute', left: -338, top: 68, width: 1028, height: 598, maxWidth: 'none', mixBlendMode: 'overlay' }} />
    </div>
  );
}

function StatusBar() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44, zIndex: 3, pointerEvents: 'none' }}>
      <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
      <img src={asset('status.svg')} alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33, width: 66.6, height: 11.33, maxWidth: 'none' }} />
    </div>
  );
}

function HomeIndicator() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.25, pointerEvents: 'none' }}>
      <div style={{ width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
    </div>
  );
}

function Img({ name, w, h, left, top, flip, z }: { name: string; w: number; h: number; left: number; top: number; flip?: boolean; z?: number }) {
  return (
    <img
      src={asset(name)}
      alt=""
      width={w}
      height={h}
      style={{ position: 'absolute', left, top, width: w, height: h, maxWidth: 'none', zIndex: z, transform: flip ? 'scaleY(-1)' : undefined, pointerEvents: 'none' }}
    />
  );
}

function Drift({
  left,
  top,
  duration,
  delay,
  dx,
  dy,
  children,
}: {
  left: number;
  top: number;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
  children: ReactNode;
}) {
  return (
    <div
      className="arxon-drift"
      style={{
        position: 'absolute',
        left,
        top,
        ['--dx' as string]: `${dx}px`,
        ['--dy' as string]: `${dy}px`,
        animation: `arxon-drift ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      {children}
    </div>
  );
}

function arxMark(left: number, top: number, mask: string, width: number, height: number): CSSProperties {
  return {
    position: 'absolute',
    left,
    top,
    width,
    height,
    background: '#90b9ff',
    WebkitMaskImage: `url("${asset(mask)}")`,
    maskImage: `url("${asset(mask)}")`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
}

const driftCss = `
@keyframes arxon-drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(var(--dx), var(--dy)); }
}
@media (prefers-reduced-motion: reduce) {
  .arxon-drift { animation: none !important; }
}
`;

function Accent({ children }: { children: ReactNode }) {
  return <span style={{ color: '#accafe' }}>{children}</span>;
}

function Coin({ left, top, size, color, pad = 0, children }: { left: number; top: number; size: number; color: string; pad?: number; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: size / 2, background: color, boxSizing: 'border-box', padding: pad }}>
      {children}
    </div>
  );
}

function Copy({
  top,
  dots,
  title,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  top: number;
  dots: string;
  title: ReactNode;
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <div style={{ position: 'absolute', left: 19, top, width: 353, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 55, zIndex: 2 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 17 }}>
        <img src={asset(dots)} alt="" width={164.61} height={3.26856} style={{ width: 164.61, height: 3.26856, maxWidth: 'none' }} />
        <h1 style={headline}>{title}</h1>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <button type="button" onClick={onAction} style={primaryBtn}>{action}</button>
        {secondary && (
          <button type="button" onClick={onSecondary} style={restoreBtn}>{secondary}</button>
        )}
      </div>
    </div>
  );
}

const headline: CSSProperties = {
  margin: 0,
  width: 315,
  textAlign: 'center',
  fontFamily: font.sans,
  fontWeight: 500,
  fontSize: 26,
  lineHeight: 1.4,
  color: '#e7e7e8',
};

const primaryBtn: CSSProperties = {
  width: '100%',
  height: 55,
  border: 'none',
  borderRadius: 8,
  background: '#90b9ff',
  color: '#0b0f16',
  fontFamily: font.sans,
  fontSize: 16,
  fontWeight: 400,
  lineHeight: '22px',
  cursor: 'pointer',
};

const restoreBtn: CSSProperties = {
  width: '100%',
  height: 60,
  border: 'none',
  background: 'transparent',
  color: '#accafe',
  fontFamily: font.sans,
  fontSize: 16,
  fontWeight: 400,
  cursor: 'pointer',
};
