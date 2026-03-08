import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Share2, Flame, Target, Zap } from 'lucide-react';
import type { ArenaBattle } from '@/hooks/useArena';

interface BattleHeroProps {
  battle: ArenaBattle | null;
  userClub: 'alpha' | 'omega';
  hasVoted: boolean;
  onEnterBattle: () => void;
  isRegistered: boolean;
}

const BattleHero = ({ battle, userClub, hasVoted, onEnterBattle, isRegistered }: BattleHeroProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!battle) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(battle.ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [battle]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Arxon Arena - ${battle?.title || 'Boost Battle'}`,
          text: `I'm betting on ${userClub.toUpperCase()}! Join me in the Arena and stake your prediction!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  // Map user's club to the battle side
  const userSideName = battle 
    ? (userClub === 'alpha' ? battle.side_a_name : battle.side_b_name)
    : userClub.toUpperCase();

  return (
    <div className="relative flex flex-col items-center px-4 py-6">
      {/* Spotlight Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-32 h-96 opacity-20"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, transparent 100%)',
            transform: 'rotate(-15deg)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-96 opacity-30"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, transparent 100%)',
            filter: 'blur(50px)',
          }}
        />
        <div 
          className="absolute top-0 right-1/4 w-32 h-96 opacity-20"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, transparent 100%)',
            transform: 'rotate(15deg)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Trophy Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="relative z-10 mb-4"
      >
        <div 
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-6 rounded-full opacity-50"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />
        
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                '0 0 40px hsl(var(--primary) / 0.3)',
                '0 0 80px hsl(var(--primary) / 0.5)',
                '0 0 40px hsl(var(--primary) / 0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-card via-secondary to-card border border-primary/30 flex items-center justify-center relative overflow-hidden">
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.3) 0%, transparent 60%)',
              }}
            />
            <Trophy className="w-16 h-16 text-primary relative z-10" strokeWidth={1.5} />
          </div>

          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary"
              style={{
                left: `${50 + Math.cos((i / 6) * Math.PI * 2) * 55}%`,
                top: `${50 + Math.sin((i / 6) * Math.PI * 2) * 55}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Battle Topic */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-4 relative z-10 max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Prediction Battle</span>
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">
          {battle?.title || 'Boost Battle'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {battle?.description || 'Stake your power on the outcome you believe in!'}
        </p>
      </motion.div>

      {/* VS Section - Teams */}
      {battle && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm mb-4 relative z-10"
        >
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary/30 border border-border/30">
            <div className="flex-1 text-center p-2 rounded-lg" style={{ backgroundColor: `${battle.side_a_color}20` }}>
              <p className="text-xs text-muted-foreground mb-1">ALPHA</p>
              <p className="font-bold text-sm" style={{ color: battle.side_a_color }}>
                {battle.side_a_name}
              </p>
            </div>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 text-center p-2 rounded-lg" style={{ backgroundColor: `${battle.side_b_color}20` }}>
              <p className="text-xs text-muted-foreground mb-1">OMEGA</p>
              <p className="font-bold text-sm" style={{ color: battle.side_b_color }}>
                {battle.side_b_name}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Countdown Timer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center mb-6 relative z-10"
      >
        <p className="text-muted-foreground text-xs mb-2">Stakes lock in:</p>
        <div className="flex items-center justify-center gap-1">
          <TimerBlock value={timeLeft.days} label="D" />
          <TimerBlock value={timeLeft.hours} label="H" />
          <TimerBlock value={timeLeft.minutes} label="M" />
          <TimerBlock value={timeLeft.seconds} label="S" />
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-3 relative z-10"
      >
        <button
          onClick={onEnterBattle}
          disabled={!battle}
          className="w-full py-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <Zap className="w-5 h-5" />
          {hasVoted ? 'View My Stake' : 'Stake Now'}
        </button>

        <button
          onClick={handleShare}
          className="w-full py-3 bg-transparent border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Battle
        </button>
      </motion.div>

      {/* Your Side Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 relative z-10"
      >
        <div className={`px-4 py-2 rounded-full border ${
          userClub === 'alpha' 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-primary/10 border-primary/30'
        }`}>
          <span className="text-xs text-muted-foreground">You're voting: </span>
          <span className={`font-bold text-sm ${userClub === 'alpha' ? 'text-amber-500' : 'text-primary'}`}>
            {userSideName}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

// Timer block component
const TimerBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="flex items-center gap-0.5">
    <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
      <span className="text-lg font-black text-foreground">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-muted-foreground text-xs font-medium">{label}</span>
  </div>
);

export default BattleHero;