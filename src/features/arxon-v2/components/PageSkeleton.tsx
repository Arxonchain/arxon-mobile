import { useEffect, useState } from 'react';
import { SkelBanner, SkelCss, SkelTokenList } from '@/walletFigma/flow/ScreenSkeleton';
import { sheetGlass } from '@/walletFigma/flow/LiveScroll';
import { mobileTopPaddingPage } from '@/lib/mobileLayout';

/** Dark glass bones after a delay — blank hold first so fast nav never flashes a loader. */
export default function PageSkeleton({ delayMs = 800 }: { delayMs?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  return (
    <div
      style={{
        minHeight: '100%',
        height: '100%',
        background: '#0a0c10',
        boxSizing: 'border-box',
        padding: `${mobileTopPaddingPage()} 16px 24px`,
      }}
    >
      <SkelCss />
      {show ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkelBanner h={88} />
          <div
            style={{
              borderRadius: 22,
              padding: '8px 12px 10px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              ...sheetGlass,
            }}
          >
            <SkelTokenList n={6} h={48} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
