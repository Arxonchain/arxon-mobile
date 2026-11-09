import type { CSSProperties, ReactNode } from 'react';
import { WALLET_TAB_CLEAR } from './WalletTabs';
import type { SkeletonKind } from './livePaint';

const SHIMMER_CSS = `
@keyframes arxon-bone {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.arxon-bone {
  background-image: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(172,202,254,0.18) 48%, rgba(255,255,255,0.04) 100%);
  background-size: 220% 100%;
  animation: arxon-bone 1.15s ease-in-out infinite;
}
.arxon-bone-frost {
  background-image: linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(172,202,254,0.72) 48%, rgba(255,255,255,0.15) 100%),
    radial-gradient(120% 90% at 88% 0%, rgba(172,202,254,0.95) 0%, rgba(232,240,255,0.7) 38%, #ffffff 72%);
  background-size: 220% 100%, 100% 100%;
  animation: arxon-bone 1.15s ease-in-out infinite;
}
`;

export function SkelCss() {
  return <style>{SHIMMER_CSS}</style>;
}

function Bone({
  w,
  h,
  r = 10,
  style,
  frost,
}: {
  w?: number | string;
  h: number;
  r?: number;
  style?: CSSProperties;
  frost?: boolean;
}) {
  return (
    <span
      className={frost ? 'arxon-bone-frost' : 'arxon-bone'}
      style={{
        display: 'block',
        width: w ?? '100%',
        height: h,
        borderRadius: r,
        flexShrink: 0,
        ...(frost ? { border: '1px solid rgba(61,109,255,0.28)' } : { backgroundColor: 'rgba(28,32,37,0.92)' }),
        ...style,
      }}
    />
  );
}

/** Frost hero / review card loader. */
export function SkelHero({ h = 176 }: { h?: number }) {
  return <Bone h={h} r={24} frost />;
}

export function SkelFrostCard({ h = 92 }: { h?: number }) {
  return <Bone h={h} r={16} frost />;
}

export function SkelBanner({ h = 108 }: { h?: number }) {
  return <Bone h={h} r={18} />;
}

export function SkelBanners() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
      <SkelBanner />
      <SkelBanner />
    </div>
  );
}

export function SkelTokenRow({ h = 52 }: { h?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: h, padding: '0 2px' }}>
      <Bone w={40} h={40} r={20} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bone w="46%" h={12} r={6} />
        <Bone w="28%" h={10} r={5} />
      </div>
      <div style={{ width: 72, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <Bone w={56} h={12} r={6} />
        <Bone w={40} h={10} r={5} />
      </div>
    </div>
  );
}

export function SkelTokenList({ n = 4, h = 52 }: { n?: number; h?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: n }, (_, i) => <SkelTokenRow key={i} h={h} />)}
    </div>
  );
}

export function SkelPills({ n = 4 }: { n?: number }) {
  return <Pills n={n} />;
}

function Header() {
  return (
    <div style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Bone w={42} h={42} r={21} />
      <Bone w={76} h={36} r={18} />
    </div>
  );
}

function Pills({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
      {Array.from({ length: n }, (_, i) => <Bone key={i} h={34} r={17} />)}
    </div>
  );
}

function Rows({ n, h = 56 }: { n: number; h?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, height: h }}>
          <Bone w={40} h={40} r={20} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w="46%" h={12} r={6} />
            <Bone w="28%" h={10} r={5} />
          </div>
          <div style={{ width: 72, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <Bone w={56} h={12} r={6} />
            <Bone w={40} h={10} r={5} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tabs() {
  return (
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'max(8px, env(safe-area-inset-bottom, 0px))', height: 64, borderRadius: 32, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,12,16,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 10px' }}>
      {Array.from({ length: 5 }, (_, i) => <Bone key={i} w={36} h={36} r={12} />)}
    </div>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return (
    <div style={{ borderRadius: 22, padding: '14px 12px 12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,12,16,0.88)' }}>
      {children}
    </div>
  );
}

function Page({ children, tabs }: { children: ReactNode; tabs?: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'max(92px, calc(env(safe-area-inset-top, 0px) + 54px)) 20px 0', boxSizing: 'border-box' }}>
      <SkelCss />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingBottom: tabs ? WALLET_TAB_CLEAR : 24 }}>
        {children}
      </div>
      {tabs ? <Tabs /> : null}
    </div>
  );
}

function HomeSkel() {
  return (
    <Page tabs>
      <Header />
      <Bone h={176} r={24} frost style={{ marginTop: 12 }} />
      <div style={{ marginTop: 10 }}><Pills n={4} /></div>
      <div style={{ marginTop: 16 }}><Sheet><Rows n={5} /></Sheet></div>
    </Page>
  );
}

function TestnetSkel() {
  return (
    <Page tabs>
      <Header />
      <Bone w="70%" h={48} r={12} style={{ margin: '22px auto 0' }} />
      <div style={{ marginTop: 12 }}><Pills n={3} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 28 }}>
        <Bone h={108} r={18} />
        <Bone h={108} r={18} />
      </div>
      <div style={{ marginTop: 8 }}><Pills n={4} /></div>
      <div style={{ marginTop: 12 }}><Sheet><Rows n={3} /></Sheet></div>
    </Page>
  );
}

function WalletSkel() {
  return (
    <Page>
      <Bone w={44} h={44} r={22} />
      <Bone h={148} r={24} frost style={{ marginTop: 12 }} />
      <div style={{ marginTop: 16 }}><Sheet><Rows n={4} /></Sheet></div>
    </Page>
  );
}

function MarketSkel() {
  return (
    <Page tabs>
      <Bone w="40%" h={28} r={10} />
      <Bone h={48} r={16} frost style={{ marginTop: 14 }} />
      <div style={{ marginTop: 14 }}><Pills n={4} /></div>
      <div style={{ marginTop: 16 }}><Rows n={6} h={64} /></div>
    </Page>
  );
}

function ExploreSkel() {
  return (
    <Page tabs>
      <Bone w="42%" h={26} r={10} />
      <Bone h={48} r={14} frost style={{ marginTop: 12 }} />
      <div style={{ marginTop: 12 }}><Pills n={4} /></div>
      <div style={{ marginTop: 8 }}><Sheet><Rows n={5} /></Sheet></div>
    </Page>
  );
}

function AccountSkel() {
  return (
    <Page tabs>
      <Bone w="36%" h={24} r={10} />
      <Bone h={84} r={22} style={{ marginTop: 14 }} />
      <Bone w="38%" h={10} r={5} style={{ marginTop: 18 }} />
      <div style={{ marginTop: 8 }}><Sheet><Rows n={3} /></Sheet></div>
      <Bone w="32%" h={10} r={5} style={{ marginTop: 16 }} />
      <div style={{ marginTop: 8 }}><Sheet><Rows n={4} /></Sheet></div>
    </Page>
  );
}

function SendSkel() {
  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bone w={44} h={44} r={22} />
        <Bone w="40%" h={16} r={8} />
      </div>
      <Bone h={52} r={14} frost style={{ marginTop: 12 }} />
      <Bone w="28%" h={10} r={5} style={{ marginTop: 16 }} />
      <div style={{ marginTop: 8 }}><Sheet><Rows n={5} h={76} /></Sheet></div>
      <Bone w="88%" h={12} r={6} style={{ marginTop: 12 }} />
    </Page>
  );
}

function ReceiveSkel() {
  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bone w={44} h={44} r={22} />
        <Bone w="36%" h={16} r={8} />
      </div>
      <Bone w={180} h={40} r={20} style={{ margin: '16px auto 0' }} />
      <Bone w={264} h={264} r={24} frost style={{ margin: '22px auto 0' }} />
      <Bone w="70%" h={12} r={6} style={{ margin: '18px auto 0' }} />
      <Bone h={52} r={14} style={{ marginTop: 20 }} />
      <Bone h={52} r={14} style={{ marginTop: 10 }} />
    </Page>
  );
}

function TokenSkel() {
  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bone w={44} h={44} r={22} />
        <Bone w={40} h={40} r={20} />
      </div>
      <Bone w="44%" h={36} r={12} style={{ marginTop: 18 }} />
      <Bone w="28%" h={14} r={7} style={{ marginTop: 10 }} />
      <Bone h={196} r={18} style={{ marginTop: 18 }} />
      <div style={{ marginTop: 16 }}><Pills n={3} /></div>
    </Page>
  );
}

function ActivitySkel() {
  return (
    <Page tabs>
      <Bone w="40%" h={24} r={10} />
      <div style={{ marginTop: 16 }}><Sheet><Rows n={6} /></Sheet></div>
    </Page>
  );
}

function DetailSkel() {
  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bone w={44} h={44} r={22} />
        <Bone w="42%" h={16} r={8} />
      </div>
      <Bone h={52} r={14} frost style={{ marginTop: 14 }} />
      <div style={{ marginTop: 16 }}><Sheet><Rows n={4} /></Sheet></div>
    </Page>
  );
}

/** Page-shaped placeholder. Keep in sync with live layouts (hero, frost fields, sheets, pills). */
export function ScreenSkeleton({ kind }: { kind: SkeletonKind }) {
  if (kind === 'home') return <HomeSkel />;
  if (kind === 'testnet') return <TestnetSkel />;
  if (kind === 'wallet') return <WalletSkel />;
  if (kind === 'market') return <MarketSkel />;
  if (kind === 'explore') return <ExploreSkel />;
  if (kind === 'account') return <AccountSkel />;
  if (kind === 'send') return <SendSkel />;
  if (kind === 'receive') return <ReceiveSkel />;
  if (kind === 'token') return <TokenSkel />;
  if (kind === 'activity') return <ActivitySkel />;
  return <DetailSkel />;
}

export { Bone as SkelBone };
