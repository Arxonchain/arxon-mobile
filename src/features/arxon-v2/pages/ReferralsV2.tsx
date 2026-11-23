import { useMemo, useState, type ReactNode } from 'react';
import { Copy, Share2, Users, Activity, UserX, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { shareText, copyAddress } from '@/walletFigma/flow/copyFlash';
import { useReferrals } from '@/hooks/useReferrals';
import { useAuth } from '@/contexts/AuthContext';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { displayReferralLink } from '@/lib/publicSite';
import { MineLoad } from '../components/MineLoad';
import { MinerAvatar } from '../components/MinerAvatar';
import { V2Page } from '../design/Kit';
import { neon } from '../design/neonTokens';
import {
  Body,
  EmptyCopy,
  FrostPanel,
  GhostBtn,
  GlassSheet,
  pc,
  PrimaryBtn,
  ProfileHead,
  TokenRow,
} from '../design/ProfileChrome';

export default function ReferralsV2() {
  const { user } = useAuth();
  const { referralCode, referrals, stats, loading, getReferralLink, refreshReferrals } = useReferrals(user);
  const pull = usePullRefresh(() => refreshReferrals(), { threshold: 28 });
  const [copied, setCopied] = useState(false);

  const { activeReferrals, inactiveReferrals } = useMemo(() => ({
    activeReferrals: referrals.filter((r) => r.is_active === true),
    inactiveReferrals: referrals.filter((r) => r.is_active !== true),
  }), [referrals]);

  const link = getReferralLink();
  const short = link ? displayReferralLink(link) : '';

  const copyCode = async () => {
    if (!referralCode) return;
    await copyAddress(referralCode, 'Referral code copied');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    if (!link) return;
    await shareText('Join ARXON', `Join me on ARXON and start mining ARX-P. Use my referral: ${referralCode}\n${link}`);
  };

  return (
    <V2Page pull={pull}>
      <ProfileHead
        title="Referrals"
        subtitle="100 ARX-P per friend who joins and mines"
      />
      <div style={{ padding: '0 16px 12px' }}>
        <MineLoad extra={pull.busy} frost kind="card" radius={22}>
          <FrostPanel>
            <div data-tour="refer-code">
            <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
              Your code
            </p>
            <p style={{
              margin: '8px 0 0',
              fontSize: 28,
              fontWeight: 750,
              letterSpacing: '2px',
              color: pc.ink,
              fontFamily: neon.font,
              lineHeight: 1,
            }}>
              {referralCode || '••••••'}
            </p>
            <p style={{
              margin: '10px 0 0',
              fontSize: 12,
              fontWeight: 650,
              color: pc.muted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: neon.font,
            }}>
              {short || 'Generating…'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => void copyCode()}
                style={{
                  flex: 1, height: 40, borderRadius: 12, border: 'none',
                  background: pc.ink, color: '#fff', fontSize: 13, fontWeight: 700,
                  fontFamily: neon.font, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Copy size={14} />
                {copied ? 'Copied' : 'Copy code'}
              </button>
              <button
                type="button"
                onClick={() => void share()}
                disabled={!link}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  border: '1px solid rgba(12,16,24,0.12)',
                  background: 'transparent', color: pc.ink, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Share2 size={15} />
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <Body ink>Share copies the full arxonchain.xyz link. Friends keep their own accounts.</Body>
            </div>
            </div>
          </FrostPanel>
        </MineLoad>

        <GlassSheet title="Your network">
          <MineLoad extra={pull.busy} kind="rows" rowCount={4} radius={0}>
            <TokenRow icon={<Users size={14} />} title="Total referrals" trailing={<Stat>{stats.totalReferrals}</Stat>} />
            <TokenRow icon={<Activity size={14} />} title="Active miners" trailing={<Stat good>{stats.activeMiners}</Stat>} />
            <TokenRow icon={<UserX size={14} />} title="Inactive" trailing={<Stat muted>{stats.inactiveMiners}</Stat>} />
            <TokenRow icon={<Gift size={14} />} title="ARX-P earned" trailing={<Stat>{stats.totalEarnings}</Stat>} />
          </MineLoad>
        </GlassSheet>

        {loading && referrals.length === 0 ? (
          <MineLoad waiting extra={pull.busy} kind="rows" rowCount={3} radius={22}>
            <div style={{ height: 140 }} />
          </MineLoad>
        ) : referrals.length === 0 ? (
          <GlassSheet title="Friends">
            <EmptyCopy title="No referrals yet" body="Share your link. You earn 100 ARX-P when a friend joins and mines." />
            <div style={{ padding: '0 0 10px' }}>
              <PrimaryBtn label="Share link" onClick={() => void share()} disabled={!link} />
            </div>
          </GlassSheet>
        ) : (
          <>
            {activeReferrals.length > 0 ? (
              <GlassSheet title={`Active · ${activeReferrals.length}`}>
                {activeReferrals.map((r) => (
                  <TokenRow
                    key={r.id}
                    icon={<MinerAvatar size={32} />}
                    title={r.referred_username || 'Miner'}
                    sub={`${r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : ''} · Mining`}
                    trailing={<Stat good>+{r.points_awarded || 0}</Stat>}
                  />
                ))}
              </GlassSheet>
            ) : null}
            {inactiveReferrals.length > 0 ? (
              <GlassSheet title={`Inactive · ${inactiveReferrals.length}`}>
                {inactiveReferrals.map((r) => (
                  <TokenRow
                    key={r.id}
                    icon={<MinerAvatar size={32} />}
                    title={r.referred_username || 'Miner'}
                    sub={r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : ''}
                    trailing={<Stat muted>+{r.points_awarded || 0}</Stat>}
                  />
                ))}
              </GlassSheet>
            ) : null}
          </>
        )}

        {!referrals.length ? null : (
          <div style={{ marginTop: 4 }}>
            <GhostBtn label="Share link" onClick={() => void share()} />
          </div>
        )}
      </div>
    </V2Page>
  );
}

function Stat({ children, good, muted }: { children: ReactNode; good?: boolean; muted?: boolean }) {
  return (
    <span style={{
      fontSize: 13,
      fontWeight: 700,
      color: good ? pc.good : muted ? pc.soft : '#fff',
      fontVariantNumeric: 'tabular-nums',
      flexShrink: 0,
    }}>
      {children}
    </span>
  );
}
