/**
 * V2-only auth landing (ARXON_UI_V2). Classic builds use pages/AuthPage.tsx.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Users } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon.svg';
import authCrystal from '@/assets/v2-auth-crystal.jpg';
import authEarth from '@/assets/v2-auth-earth-cyan.png';
import { applyPendingReferralCode } from '@/lib/referral/applyPendingReferral';
import { TurnstileWidget, isTurnstileConfigured } from '@/components/auth/TurnstileWidget';
type AuthMode = 'signin' | 'signup' | 'forgot';

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

  const { signIn, signUp, resetPassword } = useAuth();
  const captchaRequired = isTurnstileConfigured();
  const { toast } = useToast();
  const navigate = useNavigate();

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
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaRequired && !captchaToken) {
      toast({
        title: 'Security check required',
        description: 'Complete the verification below (or tap Retry), then try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          toast({
            title: 'Passwords do not match',
            description: 'Please make sure both passwords are identical.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (password.length < 8) {
          toast({
            title: 'Password too short',
            description: 'Use at least 8 characters.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const ref = referralCode.trim().toUpperCase();
        if (ref) {
          try {
            localStorage.setItem('arxon_referral_code', ref);
            sessionStorage.setItem('arxon_referral_code', ref);
          } catch {}
        }

        const { error, user: newUser } = await signUp(email, password, ref || undefined, captchaToken || undefined);
        if (error) {
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
        const { error } = await signIn(email, password, captchaToken || undefined);
        if (error) throw error;
        navigate('/');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email, captchaToken || undefined);
        if (error) throw error;
        toast({
          title: 'Check your email',
          description: 'Reset link sent. You stay signed out until you open the email link and set a new password.',
        });
        setMode('signin');
      }
    } catch (err: any) {
      if (isAlreadyRegisteredError(err?.message)) {
        toast({
          title: 'Account already exists',
          description: 'An account already exists with this email — please log in.',
          variant: 'destructive',
        });
        setMode('signin');
      } else {
        toast({
          title: 'Error',
          description: err.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setCaptchaToken(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <style>{`
        @keyframes arxonEarthRoll {
          0% { transform: translate(-50%, -46%) rotate(0deg) scale(1.05); }
          50% { transform: translate(-48%, -48%) rotate(180deg) scale(1.12); }
          100% { transform: translate(-50%, -46%) rotate(360deg) scale(1.05); }
        }
        @keyframes arxonEarthDrift {
          0%, 100% { opacity: 0.78; filter: drop-shadow(0 0 40px rgba(79,216,235,0.35)); }
          50% { opacity: 0.95; filter: drop-shadow(0 0 70px rgba(79,216,235,0.55)); }
        }
      `}</style>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${authCrystal})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(14px) brightness(0.55) saturate(1.15)',
          transform: 'scale(1.12)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 50% 20%, rgba(79,216,235,0.18), transparent 55%),
            linear-gradient(180deg, rgba(2,6,14,0.35) 0%, rgba(2,6,14,0.82) 100%)
          `,
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] z-[1] w-[min(92vw,420px)] aspect-square"
        style={{ animation: 'arxonEarthDrift 6s ease-in-out infinite' }}
      >
        <img
          src={authEarth}
          alt=""
          className="absolute left-1/2 top-1/2 w-[130%] max-w-none select-none"
          style={{
            mixBlendMode: 'screen',
            animation: 'arxonEarthRoll 28s linear infinite',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div
          className="p-8 rounded-3xl border border-cyan-400/25 shadow-2xl"
          style={{
            background: 'linear-gradient(165deg, rgba(10,28,48,0.72) 0%, rgba(5,14,28,0.82) 100%)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px rgba(79,216,235,0.1)',
          }}
        >
          <div className="flex justify-center mb-6">
            <img src={arxonLogo} alt="Arxon" className="h-16 w-16 rounded-xl shadow-[0_0_28px_rgba(79,216,235,0.35)]" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 text-cyan-50">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <p className="text-cyan-100/60 text-center mb-8 text-sm">
            {mode === 'signin' && 'Sign in to start mining ARX-P'}
            {mode === 'signup' && 'Join Arxon and start earning'}
            {mode === 'forgot' && 'Enter your email to reset password'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-black/20 border-cyan-400/20"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-black/20 border-cyan-400/20"
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-black/20 border-cyan-400/20"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Referral Code (optional)
                  </Label>
                  <Input
                    id="referral"
                    type="text"
                    placeholder="FRIEND123"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="uppercase bg-black/20 border-cyan-400/20"
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            <TurnstileWidget
              key={mode}
              action={mode}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />

            {mode === 'signin' && (
              <button type="button" onClick={() => setMode('forgot')} className="text-sm text-accent hover:text-accent/80">
                Forgot password?
              </button>
            )}

            <Button
              type="submit"
              className="w-full btn-mining btn-glow"
              disabled={
                loading ||
                (mode === 'signup' && !!confirmPassword && password !== confirmPassword) ||
                (captchaRequired && !captchaToken)
              }
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
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'forgot' ? (
              <button
                onClick={() => setMode('signin')}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-accent hover:text-accent/80"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        </div>
        <p className="mt-5 text-center text-[10px] tracking-[0.22em] uppercase text-cyan-200/45">
          Privacy for the people
        </p>
      </div>
    </div>
  );
}
