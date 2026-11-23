/**
 * V2-only auth landing (ARXON_UI_V2). Classic builds use pages/AuthPage.tsx.
 */
import { useState, useEffect, useCallback, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Users } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon.svg';
import { applyPendingReferralCode } from '@/lib/referral/applyPendingReferral';
import { TurnstileWidget, isTurnstileConfigured } from '@/components/auth/TurnstileWidget';
import LegalLinks from '@/components/legal/LegalLinks';
import { captchaStaleMessage, isCaptchaTokenStale } from '@/lib/auth/captchaToken';
import { Capacitor } from '@capacitor/core';
import { font, ink } from '@/walletFigma/tokens';
import { livePrimary, sheetGlass } from '@/walletFigma/flow/LiveScroll';

type AuthMode = 'signin' | 'signup' | 'forgot';

const PRESS_CSS = `
.arxon-auth-v2 button {
  -webkit-tap-highlight-color: transparent;
  transition: scale 90ms ease, translate 90ms ease, filter 90ms ease;
}
.arxon-auth-v2 button:active:not(:disabled) {
  scale: 0.97;
  translate: 0 1px;
  filter: brightness(0.9);
}
.arxon-auth-v2 input::placeholder {
  color: #8c8f99;
  opacity: 1;
}
.arxon-auth-v2 a {
  color: #accafe;
  text-decoration: none;
}
.arxon-auth-v2 input:-webkit-autofill,
.arxon-auth-v2 input:-webkit-autofill:hover,
.arxon-auth-v2 input:-webkit-autofill:focus {
  -webkit-text-fill-color: #ffffff;
  caret-color: #accafe;
  box-shadow: 0 0 0 1000px #0a0c10 inset;
  transition: background-color 9999s ease-out;
}
`;

const fieldRow: CSSProperties = {
  width: '100%',
  height: 48,
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 12px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(10,12,16,0.55)',
  boxSizing: 'border-box',
};

const fieldInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 48,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: ink.text,
  caretColor: ink.accent,
  fontFamily: font.sans,
  fontSize: 14,
  fontWeight: 500,
};

const iconMute: CSSProperties = { color: ink.secondary, flexShrink: 0 };

function Field({
  icon,
  trailing,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; trailing?: ReactNode }) {
  return (
    <div style={fieldRow}>
      {icon}
      <input {...input} style={{ ...fieldInput, ...input.style }} />
      {trailing}
    </div>
  );
}

function isAlreadyRegisteredError(message?: string) {
  const m = (message || '').toLowerCase();
  return m.includes('already exists') || m.includes('already registered') || m.includes('please log in');
}

export default function AuthLandingV2() {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as AuthMode) || 'signin';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVerifiedAt, setCaptchaVerifiedAt] = useState<number | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const { signIn, signUp, resetPassword } = useAuth();
  const captchaRequired = isTurnstileConfigured();
  const { toast } = useToast();
  const navigate = useNavigate();

  /** Clear token + remount widget so Success UI never outlives a consumed/expired token. */
  const invalidateCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaVerifiedAt(null);
    setCaptchaResetKey((k) => k + 1);
  }, []);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaVerifiedAt(Date.now());
  }, []);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
    } else {
      try {
        const stored =
          localStorage.getItem('arxon_referral_code') ||
          sessionStorage.getItem('arxon_referral_code');
        if (stored) setReferralCode(stored.trim().toUpperCase());
      } catch {}
    }
  }, [searchParams]);

  useEffect(() => {
    setCaptchaToken(null);
    setCaptchaVerifiedAt(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation before consuming a single-use Turnstile token.
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Please make sure both passwords are identical.',
          variant: 'destructive',
        });
        return;
      }
      if (password.length < 8) {
        toast({
          title: 'Password too short',
          description: 'Use at least 8 characters.',
          variant: 'destructive',
        });
        return;
      }
    }

    const token = captchaToken?.trim() || '';
    if (captchaRequired && !token) {
      toast({
        title: 'Security check required',
        description: 'Complete the verification below (or tap Retry), then try again.',
        variant: 'destructive',
      });
      return;
    }
    if (captchaRequired && isCaptchaTokenStale(captchaVerifiedAt)) {
      invalidateCaptcha();
      toast({
        title: 'Security check expired',
        description: captchaStaleMessage(),
        variant: 'destructive',
      });
      return;
    }

    // Keep the Turnstile token until the auth request finishes. Tokens are single-use
    // server-side — remounting before the response only causes false "expired" errors.
    setLoading(true);
    let authFailed = false;

    try {
      if (mode === 'signup') {
        const ref = referralCode.trim().toUpperCase();
        if (ref) {
          try {
            localStorage.setItem('arxon_referral_code', ref);
            sessionStorage.setItem('arxon_referral_code', ref);
          } catch {}
        }

        const { error, user: newUser } = await signUp(email, password, ref || undefined, token || undefined);
        if (error) {
          authFailed = true;
          if (isAlreadyRegisteredError(error.message)) {
            toast({
              title: 'Account already exists',
              description: 'An account already exists with this email — please log in.',
              variant: 'destructive',
            });
            setMode('signin');
            return;
          }
          throw error;
        }
        try { await applyPendingReferralCode(); } catch {}
        toast({
          title: 'Check your email',
          description: newUser?.email_confirmed_at
            ? 'You can sign in with your email and password.'
            : 'We sent a confirmation link. Open it to activate your account (check spam too).',
        });
        setMode('signin');
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password, token || undefined);
        if (error) {
          authFailed = true;
          throw error;
        }
        const miningHome = Capacitor.isNativePlatform() || import.meta.env.VITE_WALLET_SHELL === 'true';
        navigate(miningHome ? '/mine' : '/');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email, token || undefined);
        if (error) {
          authFailed = true;
          throw error;
        }
        toast({
          title: 'Check your email',
          description: 'Reset link sent. You stay signed out until you open the email link and set a new password.',
        });
        setMode('signin');
      }
    } catch (err: any) {
      authFailed = true;
      if (isAlreadyRegisteredError(err?.message)) {
        toast({
          title: 'Account already exists',
          description: 'An account already exists with this email — please log in.',
          variant: 'destructive',
        });
        setMode('signin');
      } else {
        toast(publicErrorToast(err, 'auth'));
      }
    } finally {
      setLoading(false);
      if (authFailed) invalidateCaptcha();
    }
  };

  const submitDisabled =
    loading ||
    (mode === 'signup' && !!confirmPassword && password !== confirmPassword) ||
    (captchaRequired && !captchaToken);

  return (
    <div
      className="arxon-auth-v2"
      style={{
        position: 'relative',
        minHeight: '100%',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: '16px 16px 24px',
        paddingTop: 'max(72px, calc(env(safe-area-inset-top, 0px) + 52px))',
        background: '#0a0c10',
        color: ink.text,
        fontFamily: font.sans,
      }}
    >
      <style>{PRESS_CSS}</style>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
        <div
          style={{
            ...sheetGlass,
            borderRadius: 22,
            padding: '16px 14px 14px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <img
              src={arxonLogo}
              alt="Arxon"
              style={{ width: 40, height: 40, borderRadius: 12 }}
            />
          </div>

          <h1
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 650,
              letterSpacing: -0.4,
              color: ink.text,
              fontFamily: font.sans,
            }}
          >
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <p
            style={{
              margin: '4px 0 14px',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 400,
              color: ink.secondary,
            }}
          >
            {mode === 'signin' && 'Log in with your existing mining account'}
            {mode === 'signup' && 'Join Arxon and start earning'}
            {mode === 'forgot' && 'Enter your email to reset password'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Field
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              icon={<Mail size={16} style={iconMute} />}
            />

            {mode !== 'forgot' && (
              <Field
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                icon={<Lock size={16} style={iconMute} />}
                trailing={
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      display: 'flex',
                      border: 'none',
                      background: 'none',
                      padding: 4,
                      color: ink.secondary,
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            )}

            {mode === 'signup' && (
              <>
                <Field
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  icon={<Lock size={16} style={iconMute} />}
                />
                <Field
                  id="referral"
                  type="text"
                  placeholder="Referral code (optional)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  icon={<Users size={16} style={iconMute} />}
                  style={{ textTransform: 'uppercase' }}
                />
              </>
            )}

            {captchaRequired ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <TurnstileWidget
                  key={mode}
                  action={mode}
                  resetKey={captchaResetKey}
                  onVerify={handleCaptchaVerify}
                  onExpire={() => {
                    setCaptchaToken(null);
                    setCaptchaVerifiedAt(null);
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                    setCaptchaVerifiedAt(null);
                  }}
                />
              </div>
            ) : null}

            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  color: ink.accent,
                  fontFamily: font.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={submitDisabled}
              style={{
                ...livePrimary,
                height: 48,
                marginTop: 4,
                opacity: submitDisabled ? 0.45 : 1,
                cursor: submitDisabled ? 'default' : 'pointer',
              }}
            >
              {loading
                ? 'Please wait...'
                : captchaRequired && !captchaToken
                ? 'Complete security check'
                : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>

            {(mode === 'signin' || mode === 'signup') && (
              <p
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: ink.muted,
                }}
              >
                By continuing, you agree to our{' '}
                <LegalLinks linkClassName="hover:underline" separator=" and " />
              </p>
            )}
          </form>

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => setMode('signin')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: 'none',
                  background: 'none',
                  color: ink.secondary,
                  fontFamily: font.sans,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                Back to sign in
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: ink.secondary }}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    color: ink.accent,
                    fontFamily: font.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        </div>
        <p
          style={{
            margin: '12px 0 0',
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(140,143,153,0.7)',
          }}
        >
          Privacy for the people
        </p>
      </div>
    </div>
  );
}