import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Share2, Users, Activity, UserX, Gift, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useReferrals } from '@/hooks/useReferrals';
import { useAuth } from '@/contexts/AuthContext';
import {
  V2Page, V2Header, V2HeroCard, V2Card, V2Button, V2ButtonGhost,
  V2SectionHeader, V2Eyebrow, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

export default function ReferralsV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { referralCode, referrals, stats, loading, getReferralLink } = useReferrals(user);

  const { activeReferrals, inactiveReferrals } = useMemo(() => ({
    activeReferrals: referrals.filter((r) => r.is_active === true),
    inactiveReferrals: referrals.filter((r) => r.is_active !== true),
  }), [referrals]);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast({ title: '✓ Code Copied!', description: `Referral code ${referralCode} copied` });
  };

  const shareReferralLink = async () => {
    const link = referralCode
      ? `https://arxonchain.xyz/?ref=${referralCode}`
      : getReferralLink();
    if (!link) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ARXON',
          text: `Join me on ARXON and start mining ARX-P! Use my referral code: ${referralCode}`,
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(link);
          toast({ title: '✓ Link Copied!', description: 'Referral link copied to clipboard' });
        }
      }
    } else {
      navigator.clipboard.writeText(link);
      toast({ title: '✓ Link Copied!', description: 'Referral link copied to clipboard' });
    }
  };

  const statCards = [
    { icon: Users, label: 'Total Referrals', value: stats.totalReferrals, accent: v2.brand.steel },
    { icon: Activity, label: 'Active Miners', value: stats.activeMiners, accent: v2.accent.mining },
    { icon: UserX, label: 'Inactive', value: stats.inactiveMiners, accent: v2.brand.mutedSoft },
    { icon: Gift, label: 'ARX-P Earned', value: stats.totalEarnings, accent: v2.accent.gold },
  ];

  return (
    <V2Page>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <V2Header eyebrow="Earn" title="Referrals" subtitle="Invite friends, earn ARX-P" onBack={() => navigate('/')} />

        <div style={{ padding: '0 16px 0' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
            <V2HeroCard
              eyebrow="Refer & Earn"
              title="Invite Friends & Earn"
              subtitle="Share your code and earn 100 ARX-P when friends join and mine"
              accent={v2.brand.steel}
              gradient={v2.gradient.steel}
              icon={<Zap size={10} />}
              compact
            />
          </motion.div>

          {user && (
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <V2Card accent={v2.brand.steel} padding="20px">
                <V2Eyebrow accent={v2.brand.mutedSoft}>Your Referral Code</V2Eyebrow>
                <div style={{ textAlign: 'center', margin: '12px 0 16px' }}>
                  {loading && !referralCode ? (
                    <div style={{ height: 36, width: 160, borderRadius: 10, margin: '0 auto', background: v2.brand.raised, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ) : (
                    <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: 6, color: v2.brand.steelLight, fontFamily: 'monospace' }}>
                      {referralCode || '...'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <V2ButtonGhost onClick={copyReferralCode} accent={v2.brand.steel}>
                    <Copy size={14} /> Copy Code
                  </V2ButtonGhost>
                  <V2Button accent={v2.brand.steel} onClick={shareReferralLink} disabled={!referralCode}>
                    <Share2 size={14} /> Share Link
                  </V2Button>
                </div>
              </V2Card>
            </motion.div>
          )}

          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <V2Card key={s.label} accent={s.accent} padding="14px" style={{ textAlign: 'center' }}>
                  <div style={{ color: s.accent, display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <Icon size={18} />
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: s.accent, lineHeight: 1, margin: '0 0 4px' }}>{s.value}</p>
                  <p style={{ fontSize: 9, color: v2.brand.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>{s.label}</p>
                </V2Card>
              );
            })}
          </motion.div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 64, borderRadius: v2.radius.lg, background: v2.brand.raised, opacity: 1 - i * 0.2, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <motion.div variants={fadeUp}>
              <V2Card padding="40px 20px" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: v2.brand.mutedSoft, marginBottom: 6 }}>No referrals yet</p>
                <p style={{ fontSize: 12, color: v2.brand.muted, marginBottom: 20, lineHeight: 1.5 }}>
                  Share your referral link and earn{' '}
                  <span style={{ color: v2.brand.steel, fontWeight: 700 }}>100 ARX-P</span>{' '}
                  for every friend who joins
                </p>
                <V2Button accent={v2.brand.steel} onClick={shareReferralLink} disabled={!referralCode}>
                  <Share2 size={16} /> Share Your Link
                </V2Button>
              </V2Card>
            </motion.div>
          ) : (
            <>
              {activeReferrals.length > 0 && (
                <motion.div variants={fadeUp}>
                  <V2SectionHeader title={`Active (${activeReferrals.length})`} />
                  {activeReferrals.map((r, i) => (
                    <V2Card key={r.id} accent={v2.accent.mining} padding="12px 16px" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: v2.radius.sm, flexShrink: 0,
                          background: `linear-gradient(135deg, ${v2.accent.mining}, hsl(155 45% 28%))`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: 'white',
                        }}>
                          {(r.referred_username || 'A')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.referred_username || 'Anonymous'}
                          </p>
                          <p style={{ fontSize: 10, color: v2.brand.muted, margin: '2px 0 0' }}>
                            {r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : 'N/A'}
                            {' · '}
                            <span style={{ color: v2.accent.mining }}>⛏ Mining</span>
                          </p>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: v2.accent.mining, flexShrink: 0 }}>
                          +{r.points_awarded || 0}
                        </span>
                      </div>
                    </V2Card>
                  ))}
                </motion.div>
              )}

              {inactiveReferrals.length > 0 && (
                <motion.div variants={fadeUp} style={{ marginTop: 10 }}>
                  <V2SectionHeader title={`Inactive (${inactiveReferrals.length})`} />
                  {inactiveReferrals.map((r) => (
                    <V2Card key={r.id} padding="12px 16px" style={{ marginBottom: 8, opacity: 0.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: v2.radius.sm, flexShrink: 0,
                          background: v2.brand.raised, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: v2.brand.mutedSoft,
                        }}>
                          {(r.referred_username || 'A')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: v2.brand.steelLight, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.referred_username || 'Anonymous'}
                          </p>
                          <p style={{ fontSize: 10, color: v2.brand.muted, margin: '2px 0 0' }}>
                            {r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                        <span style={{ fontSize: 12, color: v2.brand.muted, flexShrink: 0 }}>+{r.points_awarded || 0}</span>
                      </div>
                    </V2Card>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </V2Page>
  );
}
