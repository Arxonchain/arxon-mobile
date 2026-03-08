import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, Shield, Zap, ArrowRight, Crown, Sparkles } from 'lucide-react';
import XIcon from '@/components/icons/XIcon';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type OnboardingStep = 'intro' | 'x-connect' | 'assigned';

interface ArenaOnboardingProps {
  onComplete: (fingerprintHash?: string) => Promise<{ success: boolean; club: 'alpha' | 'omega' | null; error?: string }>;
  isLoading?: boolean;
}

const ArenaOnboarding = ({ onComplete, isLoading = false }: ArenaOnboardingProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [isVerifying, setIsVerifying] = useState(false);
  const [assignedClub, setAssignedClub] = useState<'alpha' | 'omega' | null>(null);
  
  // X account connection state
  const [xUsername, setXUsername] = useState('');
  const [xConnecting, setXConnecting] = useState(false);
  const [xConnected, setXConnected] = useState(false);
  const [xError, setXError] = useState<string | null>(null);

  const handleConnectX = async () => {
    if (!xUsername.trim()) {
      setXError('Please enter your X username');
      return;
    }

    const username = xUsername.trim().replace('@', '');
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
      setXError('Invalid X username format');
      return;
    }

    setXConnecting(true);
    setXError(null);

    try {
      // Check if X profile already exists for this user
      const { data: existingProfile } = await supabase
        .from('x_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('x_profiles')
          .update({ 
            username, 
            profile_url: `https://x.com/${username}`,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('x_profiles')
          .insert({
            user_id: user?.id,
            username,
            profile_url: `https://x.com/${username}`,
          });

        if (error) throw error;
      }

      setXConnected(true);
      toast.success('X account connected!', {
        description: `@${username} linked to your Arena profile`,
      });

      // Auto-register after X connect (no fingerprint needed)
      setTimeout(async () => {
        setIsVerifying(true);
        try {
          const result = await onComplete();
          if (result.success && result.club) {
            setAssignedClub(result.club);
            setStep('assigned');
          } else if (result.error) {
            toast.error('Registration failed', { description: result.error });
          }
        } catch (error: any) {
          console.error('Registration error:', error);
          toast.error('Registration failed');
        } finally {
          setIsVerifying(false);
        }
      }, 1500);

    } catch (error: any) {
      console.error('X connection error:', error);
      setXError(error.message || 'Failed to connect X account');
      toast.error('Connection failed');
    } finally {
      setXConnecting(false);
    }
  };

  const features = [
    { icon: Trophy, text: 'Battle for Rewards', desc: 'Stake ARX-P to earn exclusive boosts' },
    { icon: Swords, text: 'Epic Club Wars', desc: 'Alpha vs Omega in weekly showdowns' },
    { icon: Shield, text: 'Verified Voting', desc: 'Secure identity verification' },
    { icon: Zap, text: 'Earn Badges', desc: 'Collect achievements and climb ranks' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="glass-card p-8 border border-border/50"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', duration: 0.7 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 mb-4"
                >
                  <Trophy className="w-10 h-10 text-primary" />
                </motion.div>
                <h1 className="text-3xl font-black text-foreground mb-2">
                  Welcome to the Arena
                </h1>
                <p className="text-muted-foreground">
                  Enter the battleground where champions are made
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="p-4 rounded-xl bg-secondary/50 border border-border/30"
                  >
                    <feature.icon className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-bold text-foreground text-sm">{feature.text}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Club Preview */}
              <div className="mb-8 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  You'll be assigned to one of two clubs:
                </p>
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-amber-500">ALPHA</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary">OMEGA</span>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <motion.button
                onClick={() => setStep('x-connect')}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Enter the Arena
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              {/* Info text */}
              <p className="text-xs text-muted-foreground text-center mt-4">
                Connect your X account to join
              </p>
            </motion.div>
          )}

          {step === 'x-connect' && (
            <motion.div
              key="x-connect"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card p-8 border border-border/50"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 mb-4"
                >
                  <XIcon className="w-10 h-10 text-foreground" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your X Account</h2>
                <p className="text-muted-foreground text-sm">
                  Link your X (Twitter) account to participate in Arena battles
                </p>
              </div>

              {xConnected ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-foreground font-medium">@{xUsername.replace('@', '')} connected!</p>
                  <p className="text-muted-foreground text-sm">Setting up your Arena profile...</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="x-username">X Username</Label>
                    <Input
                      id="x-username"
                      type="text"
                      value={xUsername}
                      onChange={(e) => setXUsername(e.target.value)}
                      placeholder="@username"
                      disabled={xConnecting}
                      className="text-center text-lg"
                    />
                  </div>

                  {xError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {xError}
                    </div>
                  )}

                  <motion.button
                    onClick={handleConnectX}
                    disabled={xConnecting || !xUsername.trim()}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-foreground text-background rounded-xl font-bold text-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: xConnecting ? 1 : 1.02 }}
                    whileTap={{ scale: xConnecting ? 1 : 0.98 }}
                  >
                    {xConnecting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <XIcon className="w-5 h-5" />
                        Connect X Account
                      </>
                    )}
                  </motion.button>

                  <p className="text-xs text-muted-foreground text-center">
                    X account connection is <span className="text-primary font-medium">required</span> to participate in Arena
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Fingerprint step removed - registration happens automatically after X connect */}

          {step === 'assigned' && assignedClub && (
            <motion.div
              key="assigned"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 border border-border/50 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
                className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
                  assignedClub === 'alpha' 
                    ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20' 
                    : 'bg-gradient-to-br from-primary/30 to-accent/20'
                }`}
              >
                {assignedClub === 'alpha' ? (
                  <Crown className="w-12 h-12 text-amber-500" />
                ) : (
                  <Shield className="w-12 h-12 text-primary" />
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome to Club {assignedClub.toUpperCase()}!
                </h2>
                <p className="text-muted-foreground mb-6">
                  You've been assigned to the {assignedClub === 'alpha' ? 'Alpha' : 'Omega'} club.
                  Battle alongside your teammates to earn rewards!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <div className={`p-4 rounded-xl ${
                  assignedClub === 'alpha'
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-primary/10 border border-primary/30'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className={`w-5 h-5 ${assignedClub === 'alpha' ? 'text-amber-500' : 'text-primary'}`} />
                    <span className="font-bold">Your Club Benefits</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Stake ARX-P on battles</li>
                    <li>• Earn rewards when your side wins</li>
                    <li>• Build win streaks for bonus multipliers</li>
                  </ul>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs text-muted-foreground mt-6"
              >
                Refreshing in a moment...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ArenaOnboarding;