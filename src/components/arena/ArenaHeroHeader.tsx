import { motion } from 'framer-motion';
import { Swords, Trophy, Shield, Zap, Target, Crown, Flame, ChevronDown } from 'lucide-react';
import arxonLogo from '@/assets/arxon-logo.jpg';

interface ArenaHeroHeaderProps {
  onScrollToContent?: () => void;
}

const ArenaHeroHeader = ({ onScrollToContent }: ArenaHeroHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-background via-background/95 to-background/80">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating warrior particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        {/* Cinematic light beams */}
        <motion.div
          className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-primary/20 via-accent/10 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-accent/20 via-primary/10 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 2 }}
        />
        
        {/* Radial glow behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-primary/10 via-accent/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Logo and Branding Row */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <motion.img
            src={arxonLogo}
            alt="Arxon"
            className="w-10 h-10 rounded-xl object-cover border border-primary/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-xl font-black text-foreground tracking-tight">
              ARXON <span className="text-primary">BATTLE ARENA</span>
            </h1>
          </motion.div>
        </div>

        {/* Warrior Icons with Crossed Swords */}
        <motion.div 
          className="flex items-center justify-center gap-4 mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="relative"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Shield className="w-8 h-8 text-blue-400" />
            <motion.div
              className="absolute inset-0"
              animate={{ 
                boxShadow: ['0 0 10px rgba(59, 130, 246, 0.3)', '0 0 20px rgba(59, 130, 246, 0.5)', '0 0 10px rgba(59, 130, 246, 0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          
          <motion.div
            className="relative"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="relative w-14 h-14 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 212, 255, 0.4)',
                    '0 0 40px rgba(255, 0, 255, 0.4)',
                    '0 0 20px rgba(0, 212, 255, 0.4)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Swords className="w-8 h-8 text-primary relative z-10" />
            </div>
          </motion.div>

          <motion.div
            className="relative"
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Trophy className="w-8 h-8 text-amber-400" />
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className="w-4 h-4 text-orange-500" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-center text-muted-foreground text-sm max-w-xs mx-auto mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Predict outcomes. Stake your position. Win big rewards.
        </motion.p>

        {/* Feature badges */}
        <motion.div
          className="flex items-center justify-center gap-2 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Predictions</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">Early Staker Bonus</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-green-400">+25% Mining Boost</span>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        {onScrollToContent && (
          <motion.button
            onClick={onScrollToContent}
            className="flex flex-col items-center gap-1 mx-auto mt-4 text-muted-foreground hover:text-foreground transition-colors"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-xs">Explore Markets</span>
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default ArenaHeroHeader;