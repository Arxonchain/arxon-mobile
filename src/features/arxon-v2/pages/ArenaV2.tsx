/**
 * Arena — prediction battles hub.
 */
import { useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mobileTopPaddingPage, mobileScrollPadding, mobilePageScrollRoot } from '@/lib/mobileLayout';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { frostWash } from '@/walletFigma/flow/LiveScroll';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function ArenaBattlegroundShell({ children }: { children: ReactNode }) {
  const contained = useIsAppPreview();
  return (
    <div style={{
      ...mobilePageScrollRoot(contained),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: mobileTopPaddingPage(),
      paddingBottom: mobileScrollPadding(),
      paddingLeft: 16,
      paddingRight: 16,
      boxSizing: 'border-box',
      fontFamily: neon.font,
      background: neon.deep,
    }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>{children}</div>
    </div>
  );
}

export default function ArenaV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  return (
    <ArenaBattlegroundShell>
      <motion.div
          data-tour="arena-hub"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          style={{
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            ...frostWash,
            border: '1px solid rgba(61,109,255,0.32)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
            padding: '22px 18px 20px',
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        >
          <h1 style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 750,
            color: '#0c1018',
            lineHeight: 1.1,
            letterSpacing: '-0.6px',
            fontFamily: neon.font,
          }}>
            Prediction Market
          </h1>
          <p style={{
            margin: '8px 0 0',
            fontSize: 14,
            fontWeight: 600,
            color: '#5c6370',
          }}>
            Predict · Stake · Earn
          </p>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => go('/arena/prediction-market')}
            style={{
              height: 44,
              marginTop: 16,
              padding: '0 22px',
              border: 'none',
              borderRadius: 14,
              background: '#0c1018',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: neon.font,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Enter Market
          </motion.button>
        </motion.div>
    </ArenaBattlegroundShell>
  );
}
