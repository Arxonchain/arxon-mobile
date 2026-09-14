import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Globe, ShieldCheck, Wallet, CheckCircle2, Lock, Loader2, Send, ChevronDown,
} from 'lucide-react';
import { useVerification } from '@/hooks/useVerification';
import { COUNTRIES, countryByCode } from '@/lib/verification/countries';
import { toast } from '@/hooks/use-toast';
import { v2 } from '@/features/arxon-v2/design/tokens';
import { V2Card, V2Button, fadeUp } from '@/features/arxon-v2/design/Kit';

type Props = { variant?: 'v2' | 'mobile' | 'web' };

const STEP_ICONS = {
  email: Mail,
  country: Globe,
  age: ShieldCheck,
  wallet: Wallet,
};

export default function VerificationCenter({ variant = 'v2' }: Props) {
  const v = useVerification();
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
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const progressPct = v.requiredCount > 0 ? Math.round((v.completedCount / v.requiredCount) * 100) : 0;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: v2.radius.sm,
    boxSizing: 'border-box',
    background: v2.brand.raised,
    border: `1px solid ${v2.brand.border}`,
    outline: 'none',
    fontSize: 14,
    color: v2.brand.steelBright,
    fontFamily: v2.font,
  };

  const StepShell = ({ id, title, desc, children, done }: {
    id: keyof typeof STEP_ICONS;
    title: string;
    desc: string;
    children?: React.ReactNode;
    done: boolean;
  }) => {
    const Icon = STEP_ICONS[id];
    const inner = (
      <>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: children ? 14 : 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: done ? `${accent}22` : `${v2.brand.steel}12`,
            border: `1px solid ${done ? `${accent}55` : `${v2.brand.steel}33`}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: done ? accent : v2.brand.steel,
          }}>
            {done ? <CheckCircle2 size={20} /> : <Icon size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: v2.brand.steelBright, margin: 0 }}>{title}</p>
            <p style={{ fontSize: 11, color: v2.brand.muted, margin: '4px 0 0', lineHeight: 1.45 }}>{desc}</p>
          </div>
          {done && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: accent, padding: '4px 8px',
              borderRadius: 99, background: `${accent}18`, border: `1px solid ${accent}44`,
            }}>Done</span>
          )}
        </div>
        {!done && children}
      </>
    );

    if (isMobileStyle) {
      return <div style={cardStyle}>{inner}</div>;
    }
    return (
      <V2Card padding="16px" accent={done ? accent : undefined} style={{ marginBottom: 12 }}>
        {inner}
      </V2Card>
    );
  };

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ marginBottom: 16 }}>
        {isMobileStyle ? (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: v2.brand.muted, margin: '0 0 8px' }}>Verification progress</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: v2.brand.steelBright }}>{progressPct}%</span>
              <span style={{ fontSize: 11, color: v2.brand.muted }}>{v.completedCount}/{v.requiredCount} required</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: v2.brand.border, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: accent, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
        ) : (
          <V2Card padding="16px" accent={accent}>
            <p style={{ fontSize: 12, color: v2.brand.muted, margin: '0 0 8px' }}>Verification progress</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: v2.brand.steelBright }}>{progressPct}%</span>
              <span style={{ fontSize: 11, color: v2.brand.muted }}>{v.completedCount} of {v.requiredCount} required steps</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: v2.brand.border, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: accent, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
            {v.isComplete && (
              <p style={{ fontSize: 11, color: accent, margin: '10px 0 0', fontWeight: 600 }}>
                Account verification complete. You will no longer see daily reminders.
              </p>
            )}
          </V2Card>
        )}
      </motion.div>

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
          <V2Button
            accent={v2.brand.steel}
            fullWidth
            disabled={busy === 'email-resend'}
            onClick={() => run('email-resend', v.resendEmailVerification, 'Verification email sent. Check your inbox.')}
          >
            {busy === 'email-resend' ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Resend verification email</>}
          </V2Button>
        )}
        {v.emailVerified && !v.emailLocked && v.remainingEmailChanges > 0 && (
          <div style={{ marginTop: v.emailVerified ? 0 : 12 }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <V2Button
              accent={v2.brand.steel}
              fullWidth
              disabled={busy === 'email-change' || !newEmail.trim()}
              onClick={() => run('email-change', () => v.changeEmail(newEmail), 'Check both inboxes to confirm the new email.')}
            >
              {busy === 'email-change' ? 'Updating…' : 'Change email'}
            </V2Button>
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
            {COUNTRIES.filter((c) => c.code !== 'OTHER').map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: v2.brand.muted, pointerEvents: 'none' }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <V2Button
            accent={accent}
            fullWidth
            disabled={!countryCode || busy === 'country'}
            onClick={() => run('country', () => v.saveCountry(countryCode), 'Country saved.')}
          >
            {busy === 'country' ? 'Saving…' : 'Save country'}
          </V2Button>
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
        <V2Button
          accent={accent}
          fullWidth
          disabled={!ageChecked || busy === 'age'}
          onClick={() => run('age', v.confirmAge, 'Age confirmation saved.')}
        >
          {busy === 'age' ? 'Saving…' : 'Confirm age'}
        </V2Button>
      </StepShell>

      {/* Wallet coming soon */}
      <StepShell
        id="wallet"
        title="Wallet connect"
        desc="Required for future airdrop claims — coming soon"
        done={false}
      >
        <span style={{
          display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '6px 12px',
          borderRadius: 99, background: `${v2.brand.steel}14`, color: v2.brand.mutedSoft,
          border: `1px solid ${v2.brand.border}`,
        }}>Coming soon</span>
      </StepShell>
    </div>
  );
}

function countryDoneDesc(country: string | null | undefined, code: string | null | undefined) {
  if (!code || code === 'XX') return null;
  return country ? `${country} (${code})` : code;
}
