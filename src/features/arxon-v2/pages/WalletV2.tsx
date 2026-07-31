import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { COMMUNITY_LINKS } from '@/lib/communityLinks';
import {
  V2Page, V2Header, V2Card, V2HeroCard, V2ListRow, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

const FEATURES = [
  { icon: '🔐', label: 'Secure On-Chain Transfers', sub: 'Your keys, your coins. Always.' },
  { icon: '⚡', label: 'Instant ARX Withdrawals', sub: 'Bridge directly to mainnet' },
  { icon: '🎁', label: 'Exclusive Holder Rewards', sub: 'NFT & token airdrops for holders' },
];

export default function WalletV2() {
  const navigate = useNavigate();

  return (
    <V2Page>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <V2Header title="Wallet" subtitle="Connect & manage your Web3 wallet" onBack={() => navigate(-1)} large />

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.div variants={fadeUp} style={{ position: 'relative', width: 156, height: 156, margin: '24px 0 32px' }}>
            <svg style={{ position: 'absolute', inset: 0, animation: 'spinSlow 14s linear infinite' }} width="156" height="156" viewBox="0 0 156 156">
              <circle cx="78" cy="78" r="72" fill="none" stroke={`${v2.brand.steel}12`} strokeWidth="1" />
              <circle cx="78" cy="78" r="72" fill="none" stroke={`${v2.brand.steel}45`} strokeWidth="1.5" strokeDasharray="38 414" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 90, height: 90, borderRadius: 28,
                background: v2.gradient.steel,
                border: `1.5px solid ${v2.brand.steel}45`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: v2.shadow(v2.brand.glow, 0.15),
              }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="14" rx="3" fill={`${v2.brand.steel}30`} stroke={v2.brand.steel} strokeWidth="1.7" />
                  <path d="M2 11h20" stroke={v2.brand.steel} strokeWidth="1.7" />
                  <circle cx="17" cy="15.5" r="1.5" fill={v2.brand.steel} />
                  <path d="M7 4v3M12 3v4M17 4v3" stroke={`${v2.brand.steel}88`} strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} style={{ width: '100%', marginBottom: 16 }}>
            <V2HeroCard
              eyebrow="Web3 Wallet"
              title="Wallet Connect"
              subtitle="Connect your Web3 wallet to unlock advanced features and on-chain rewards"
              accent={v2.brand.steel}
              gradient={v2.gradient.steel}
              compact
            />
          </motion.div>

          <motion.div variants={fadeUp} style={{ width: '100%', marginBottom: 16 }}>
            {FEATURES.map((f) => (
              <V2ListRow
                key={f.label}
                icon={<span style={{ fontSize: 20 }}>{f.icon}</span>}
                iconAccent={v2.brand.steel}
                title={f.label}
                subtitle={f.sub}
              />
            ))}
          </motion.div>

          <motion.div variants={fadeUp} style={{ width: '100%' }}>
            <V2Card accent={v2.accent.gold} padding="20px" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: v2.accent.gold, boxShadow: `0 0 10px ${v2.accent.gold}88`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: v2.accent.gold }}>Coming Soon</span>
              </div>
              <p style={{ fontSize: 12, color: v2.brand.mutedSoft, lineHeight: 1.6, margin: '0 0 14px' }}>
                Arxon Wallet is in development. On-chain ARX transfers and token bridging will be available soon.
              </p>
              <a
                href={COMMUNITY_LINKS.x.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: v2.radius.sm,
                  background: `${v2.accent.gold}18`, border: `1px solid ${v2.accent.gold}44`,
                  color: v2.accent.gold, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}
              >
                🐦 Follow {COMMUNITY_LINKS.x.handle} for launch updates
              </a>
            </V2Card>
          </motion.div>
        </div>
      </motion.div>
      <style>{`@keyframes spinSlow{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </V2Page>
  );
}
