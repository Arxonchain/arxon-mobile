import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import arxonLogo from '@/assets/arxon-icon.svg';
import v2FlowBg from '@/assets/v2-flow-bg.jpg';
import { ARXON_UI_V2_ENABLED } from '@/lib/uiFeature';

interface Props { isAppReady: boolean; onFinish: () => void; }

/** Classic OTA splash when V2 flag is off; neon flow splash only for new-main. */
export default function MobileSplash({ isAppReady, onFinish }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isAppReady) return;
    const holdMs = ARXON_UI_V2_ENABLED ? 1400 : 900;
    const t = setTimeout(() => { setVisible(false); setTimeout(onFinish, 700); }, holdMs);
    return () => clearTimeout(t);
  }, [isAppReady, onFinish]);

  if (!ARXON_UI_V2_ENABLED) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div initial={{opacity:1}} exit={{opacity:0}} transition={{duration:0.7,ease:'easeInOut'}}
            style={{position:'fixed',inset:0,zIndex:9999,background:'hsl(225 30% 3%)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              width:320,height:320,borderRadius:'50%',
              background:'radial-gradient(circle,hsl(215 55% 62%/0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
              transition={{duration:0.8,ease:[0.34,1.56,0.64,1]}}
              style={{position:'absolute',width:160,height:160}}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="74" fill="none" stroke="hsl(215 35% 62%/0.15)" strokeWidth="1"/>
                <motion.circle cx="80" cy="80" r="74" fill="none"
                  stroke="hsl(215 35% 62%/0.45)" strokeWidth="1.5"
                  strokeDasharray="60 400"
                  initial={{rotate:0}} animate={{rotate:360}}
                  transition={{duration:3,repeat:Infinity,ease:'linear'}}
                  style={{transformOrigin:'80px 80px'}}/>
              </svg>
            </motion.div>
            <motion.img src={arxonLogo} alt=""
              initial={{scale:0.7,opacity:0}} animate={{scale:1,opacity:1}}
              transition={{duration:0.6,ease:[0.34,1.56,0.64,1],delay:0.1}}
              style={{width:96,height:96,objectFit:'contain',borderRadius:24,position:'relative',zIndex:2,
                boxShadow:'0 0 40px hsl(215 55% 62%/0.3)'}}/>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: '#02060e',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          <style>{`
            @keyframes splashLineSweep {
              0% { transform: translateX(-30%) rotate(-8deg); opacity: 0.2; }
              50% { opacity: 0.55; }
              100% { transform: translateX(30%) rotate(-8deg); opacity: 0.2; }
            }
            @keyframes splashPulseRing {
              0%, 100% { transform: scale(0.92); opacity: 0.35; }
              50% { transform: scale(1.08); opacity: 0.7; }
            }
          `}</style>
          <div style={{ position: 'absolute', inset: 0 }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${v2FlowBg})`,
              backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.95,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse 70% 50% at 50% 40%, rgba(79,216,235,0.22), transparent 60%),
                linear-gradient(180deg, rgba(2,6,14,0.2) 0%, rgba(2,6,14,0.75) 100%)
              `,
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: '50%', height: '140%', width: '140%',
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(105deg, transparent 35%, rgba(79,216,235,0.12) 50%, transparent 65%)',
              animation: 'splashLineSweep 3.2s ease-in-out infinite',
            }} />
          </div>

          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -18, borderRadius: 24,
                border: '1px solid rgba(79,216,235,0.35)',
                animation: 'splashPulseRing 2.4s ease-in-out infinite',
              }} />
              <motion.img
                src={arxonLogo}
                alt="Arxon"
                style={{ width: 112, height: 112, borderRadius: 22, objectFit: 'contain' }}
                animate={{
                  boxShadow: [
                    '0 0 24px rgba(79,216,235,0.25)',
                    '0 0 56px rgba(79,216,235,0.55)',
                    '0 0 24px rgba(79,216,235,0.25)',
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.55 }}
              style={{ textAlign: 'center' }}
            >
              <h1 style={{
                margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: '0.28em',
                textTransform: 'uppercase', color: '#fff',
                textShadow: '0 0 28px rgba(79,216,235,0.45)',
              }}>
                Arxon
              </h1>
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.08em' }}
                animate={{ opacity: 1, letterSpacing: '0.22em' }}
                transition={{ delay: 0.7, duration: 0.7 }}
                style={{ margin: '12px 0 0', fontSize: 11, textTransform: 'uppercase', color: '#4FD8EB' }}
              >
                Privacy for the people
              </motion.p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              style={{ width: 208, height: 2, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}
            >
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: isAppReady ? '100%' : '72%' }}
                transition={{ duration: isAppReady ? 0.35 : 1.4, ease: 'easeInOut' }}
                style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #4FD8EB, #7FE7C4)' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
