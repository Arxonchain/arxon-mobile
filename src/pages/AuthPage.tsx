import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Users } from 'lucide-react';
import arxonLogo from '@/assets/arxon-logo.jpg';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as AuthMode) || 'signin';
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill referral code from URL or sessionStorage
  useState(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    } else {
      try {
        const stored = localStorage.getItem('arxon_referral_code') || sessionStorage.getItem('arxon_referral_code');
        if (stored) setReferralCode(stored.toUpperCase());
      } catch {}
    }
  });
  
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
          return;
        }
        if (password.length < 8) {
          toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' });
          return;
        }
        // Store referral code in localStorage BEFORE signup so applyPendingReferral picks it up
        if (referralCode.trim()) {
          try {
            localStorage.setItem('arxon_referral_code', referralCode.trim().toUpperCase());
            sessionStorage.setItem('arxon_referral_code', referralCode.trim().toUpperCase());
          } catch {}
        }
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({ title: 'Success', description: 'Check your email to confirm your account' });
        setMode('signin');
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({ title: 'Success', description: 'Check your email for password reset link' });
        setMode('signin');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="glow-orb glow-orb-steel w-96 h-96 top-1/4 left-1/4 opacity-30 fixed" />
      <div className="glow-orb glow-orb-blue w-64 h-64 bottom-1/4 right-1/4 opacity-20 fixed" />
      
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={arxonLogo} alt="Arxon" className="h-16 w-16 rounded-xl" />
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {mode === 'signin' && 'Sign in to start mining ARX-P'}
            {mode === 'signup' && 'Join Arxon and start earning'}
            {mode === 'forgot' && 'Enter your email to reset password'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
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
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            {/* Password (not shown for forgot mode) */}
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
                    className="pl-10 pr-10"
                    required
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
            
            {/* Confirm Password (only for signup) */}
            {mode === 'signup' && (
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
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}
            
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (optional)</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="ARX-XXXXXX"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    maxLength={12}
                  />
                </div>
              </div>
            )}
            
            {/* Forgot password link */}
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-accent hover:text-accent/80"
              >
                Forgot password?
              </button>
            )}
            
            {/* Submit button */}
            <Button type="submit" className="w-full btn-mining btn-glow" disabled={loading}>
              {loading ? 'Please wait...' : (
                mode === 'signin' ? 'Sign In' :
                mode === 'signup' ? 'Create Account' :
                'Send Reset Link'
              )}
            </Button>
          </form>
          
          {/* Mode switcher */}
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
      </div>
    </div>
  );
}
