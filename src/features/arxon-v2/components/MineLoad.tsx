import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { SkelTokenList } from '@/walletFigma/flow/ScreenSkeleton';

/** Same delay as wallet CardLoad — instant data stays visible; slow waits get bones. */
const SLOW_MS = 800;

export function useMineLoad(waiting: boolean) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, [waiting]);
  return waiting && slow;
}

function Bone({
  w,
  h,
  r = 8,
  frost = false,
}: {
  w: number | string;
  h: number;
  r?: number;
  frost?: boolean;
}) {
  return (
    <span
      className={frost ? 'arxon-bone-frost' : 'arxon-bone'}
      style={{
        display: 'block',
        width: w,
        height: h,
        borderRadius: r,
        flexShrink: 0,
        ...(frost ? undefined : { backgroundColor: 'rgba(28,32,37,0.92)' }),
      }}
    />
  );
}

/**
 * Skeleton clipped to the real element.
 * - copy: text-shaped bones, no card chrome (balance, headings)
 * - card: fill the child card, same radius
 * - rows: token-row bones inside a sheet
 */
export function MineLoad({
  waiting = false,
  extra = false,
  frost = false,
  kind = 'card',
  rowCount = 4,
  radius = 22,
  radiusBottom,
  style,
  children,
}: {
  waiting?: boolean;
  extra?: boolean;
  frost?: boolean;
  kind?: 'copy' | 'card' | 'rows';
  rowCount?: number;
  radius?: number;
  radiusBottom?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const load = useMineLoad(waiting || extra);
  const top = radius;
  const bot = radiusBottom ?? radius;
  const radii = `${top}px ${top}px ${bot}px ${bot}px`;
  const isCopy = kind === 'copy';
  const chrome = kind === 'card' || (kind === 'rows' && (top > 0 || bot > 0));

  return (
    <div
      style={{
        position: 'relative',
        overflow: load && !isCopy ? 'hidden' : undefined,
        borderRadius: isCopy ? undefined : radii,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div aria-hidden={load} style={{ visibility: load ? 'hidden' : 'visible' }}>
        {children}
      </div>
      {load ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            borderRadius: isCopy ? undefined : radii,
            border: chrome
              ? frost
                ? '1px solid rgba(61,109,255,0.28)'
                : '1px solid rgba(255,255,255,0.08)'
              : 'none',
            background: isCopy || !chrome ? 'transparent' : frost ? undefined : 'rgba(10,12,16,0.92)',
            display: isCopy ? 'flex' : undefined,
            flexDirection: isCopy ? 'column' : undefined,
            alignItems: isCopy ? 'center' : undefined,
            justifyContent: isCopy ? 'center' : undefined,
            gap: isCopy ? 12 : undefined,
          }}
        >
          {isCopy ? (
            <>
              <Bone w={132} h={11} r={6} />
              <Bone w={196} h={36} r={8} />
            </>
          ) : kind === 'rows' ? (
            <div style={{ padding: '6px 10px', height: '100%', boxSizing: 'border-box' }}>
              <SkelTokenList n={rowCount} h={44} />
            </div>
          ) : (
            <span
              className={frost ? 'arxon-bone-frost' : 'arxon-bone'}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: radii,
                ...(frost ? undefined : { backgroundColor: 'rgba(28,32,37,0.92)' }),
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
