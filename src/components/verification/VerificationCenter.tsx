import { useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Globe, ShieldCheck, Wallet, CheckCircle2, Lock, ChevronDown,
} from 'lucide-react';
import { useVerification } from '@/hooks/useVerification';
import { COUNTRIES } from '@/lib/verification/countries';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { v2 } from '@/features/arxon-v2/design/tokens';
import { fadeUp } from '@/features/arxon-v2/design/Kit';
import { Field, FrostPanel, GlassSheet, pc, PrimaryBtn, TokenRow } from '@/features/arxon-v2/design/ProfileChrome';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { useNavigate } from 'react-router-dom';
import { startTestnetConnect } from '@/lib/testnetConnectSession';
import { useFourTxClaim } from '@/hooks/useFourTxClaim';
import { shortAddress } from '@/lib/testnetWalletLink';

type Props = { variant?: 'v2' | 'mobile' | 'web' };

const STEP_ICONS = {
  email: Mail,
  country: Globe,
  age: ShieldCheck,
  wallet: Wallet,
};

export default function VerificationCenter({ variant = 'v2' }: Props) {
  const v = useVerification();
  const navigate = useNavigate();
  const { linkedAddress } = useFourTxClaim(true);
  const [newEmail, setNewEmail] = useState('');
  const [countryCode, setCountryCode] = useState(v.profile?.country_code ?? '');
  const [ageChecked, setAgeChecked] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const accent = v2.accent.mining;
  const isMobileStyle = variant === 'mobile';

  const cardStyle = isMobileStyle
    ? {
        background: 'hsl(225 24% 11%)',
        border: '1px solid hsl(215 22% 18%)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
      }
    : undefined;

  const run = async (key: string, fn: () => Promise<void>, okMsg: string) => {
    setBusy(key);
    try {
      await fn();
      toast({ title: 'Success', description: okMsg });
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'verify'));
    } finally {
      setBusy(null);
    }
  };

  const progressPct = v.requiredCount > 0 ? Math.round((v.completedCount / v.requiredCount) * 100) : 0;

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    boxSizing: 'border-box',
    background: isMobileStyle ? v2.brand.raised : pc.glyph,
    border: `1px solid ${isMobileStyle ? v2.brand.border : 'rgba(255,255,255,0.08)'}`,
    outline: 'none',
    fontSize: 14,
    color: '#fff',
    fontFamily: neon.font,
  };

  const StepShell = ({ id, title, desc, children, done }: {
    id: keyof typeof STEP_ICONS;
    title: string;
    desc: string;
    children?: ReactNode;
    done: boolean;
  }) => {
    const Icon = STEP_ICONS[id];
    const inner = (
      <>
        <TokenRow
          wrap
          icon={done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
          glyphBg={done ? 'rgba(61,220,132,0.22)' : undefined}
          title={title}
          sub={desc}
          trailing={done ? <span style={{ fontSize: 11, fontWeight: 700, color: pc.good }}>Done</span> : null}
        />
        {!done && children ? <div style={{ padding: '0 0 10px' }}>{children}</div> : null}
      </>
    );

    if (isMobileStyle) {
      return <div style={cardStyle}>{inner}</div>;
    }
    return <GlassSheet>{inner}</GlassSheet>;
  };

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ marginBottom: 16 }}>
        {isMobileStyle ? (
          <div data-tour="verify-panel" style={{ ...cardStyle, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: v2.brand.muted, margin: '0 0 8px' }}>Verification progress</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: v2.brand.steelBright }}>{progressPct}%</span>
              <span style={{ fontSize: 11, color: v2.brand.muted }}>{v.completedCount}/{v.requiredCount} required</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: v2.brand.border, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: accent, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
            <p style={{ fontSize: 11, color: v2.brand.muted, margin: '10px 0 0' }}>
              Email · Country · Age 18+ · Wallet
            </p>
          </div>
        ) : (
          <div data-tour="verify-panel">
          <FrostPanel>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>Verification</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 750, color: pc.ink, fontFamily: neon.font }}>{progressPct}%</span>
              <span style={{ fontSize: 12, color: pc.muted, fontFamily: neon.font }}>{v.completedCount} of {v.requiredCount} required</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(12,16,24,0.12)', overflow: 'hidden', marginTop: 10 }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: pc.ink, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
            <p style={{ fontSize: 11, color: pc.muted, margin: '10px 0 0', fontFamily: neon.font }}>
              Email · Country · Age 18+ · Wallet
            </p>
            {v.isComplete ? (
              <p style={{ fontSize: 12, color: pc.muted, margin: '8px 0 0', fontFamily: neon.font }}>
                Verification complete. Daily reminders stop.
              </p>
            ) : null}
          </FrostPanel>
          </div>
        )}
      </motion.div>

      <div data-tour="verify-steps">
      {/* Email */}
      <StepShell
        id="email"
        title="Email connection"
        desc={v.emailVerified
          ? v.emailLocked
            ? `${v.user?.email} — permanently linked`
            : `${v.user?.email} — verified · ${v.remainingEmailChanges} change(s) left`
          : `Confirm ${v.user?.email ?? 'your email'} is tied to this account`}
        done={v.emailVerified}
      >
        {!v.emailVerified && (
          <PrimaryBtn
            label={busy === 'email-resend' ? 'Sending…' : 'Resend verification email'}
            disabled={busy === 'email-resend'}
            onClick={() => void run('email-resend', v.resendEmailVerification, 'Verification email sent. Check your inbox.')}
          />
        )}
        {v.emailVerified && !v.emailLocked && v.remainingEmailChanges > 0 && (
          <div style={{ marginTop: v.emailVerified ? 0 : 12 }}>
            <Field value={newEmail} onChange={setNewEmail} placeholder="New email address" type="email" />
            <PrimaryBtn
              label={busy === 'email-change' ? 'Updating…' : 'Change email'}
              disabled={busy === 'email-change' || !newEmail.trim()}
              onClick={() => void run('email-change', () => v.changeEmail(newEmail), 'Check both inboxes to confirm the new email.')}
            />
            <p style={{ fontSize: 10, color: v2.brand.muted, margin: '8px 0 0' }}>
              After {v.remainingEmailChanges} more change{v.remainingEmailChanges === 1 ? '' : 's'}, email will be locked forever.
            </p>
          </div>
        )}
        {v.emailLocked && (
          <p style={{ fontSize: 11, color: v2.brand.mutedSoft, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <Lock size={14} /> Email cannot be changed on this account.
          </p>
        )}
      </StepShell>

      {/* Country */}
      <StepShell
        id="country"
        title="Country"
        desc={countryDoneDesc(v.profile?.country, v.profile?.country_code) ?? 'Select the country you primarily use Arxon from'}
        done={Boolean(v.profile?.country_code && v.profile.country_code !== 'XX')}
      >
        <div style={{ position: 'relative' }}>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', paddingRight: 36 }}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: v2.brand.muted, pointerEvents: 'none' }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <PrimaryBtn
            label={busy === 'country' ? 'Saving…' : 'Save country'}
            disabled={!countryCode || busy === 'country'}
            onClick={() => void run('country', () => v.saveCountry(countryCode), 'Country saved.')}
          />
        </div>
      </StepShell>

      {/* Age */}
      <StepShell
        id="age"
        title="Age confirmation"
        desc="Confirm you are 18 years or older to use Arxon"
        done={Boolean(v.profile?.age_confirmed_at)}
      >
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={ageChecked}
            onChange={(e) => setAgeChecked(e.target.checked)}
            style={{ marginTop: 3, accentColor: accent }}
          />
          <span style={{ fontSize: 12, color: v2.brand.mutedSoft, lineHeight: 1.5 }}>
            I confirm that I am at least 18 years old and agree to use Arxon in compliance with local laws.
          </span>
        </label>
        <PrimaryBtn
          label={busy === 'age' ? 'Saving…' : 'Confirm age'}
          disabled={!ageChecked || busy === 'age'}
          onClick={() => void run('age', v.confirmAge, 'Age confirmation saved.')}
        />
      </StepShell>

      <StepShell
        id="wallet"
        title="Connect wallet"
        desc={linkedAddress
          ? `Linked ${shortAddress(linkedAddress)}. Same Arxon testnet wallet as mining tasks.`
          : 'Connect your Arxon testnet wallet. Same flow as Testnet Tasks.'}
        done={Boolean(v.steps.find((s) => s.id === 'wallet')?.done || linkedAddress)}
      >
        <PrimaryBtn
          label="Connect wallet"
          onClick={() => {
            startTestnetConnect('/settings?tab=verification');
            navigate('/mine/connect');
          }}
        />
      </StepShell>
      </div>
    </div>
  );
}

function countryDoneDesc(country: string | null | undefined, code: string | null | undefined) {
  if (!code || code === 'XX') return null;
  return country ? `${country} (${code})` : code;
}
