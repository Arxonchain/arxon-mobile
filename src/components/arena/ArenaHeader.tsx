import { motion } from 'framer-motion';
import { Swords, ArrowLeft, Zap, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ArenaHeaderProps {
  totalPoints: number;
  activeBoost: number;
}

const ArenaHeader = ({ totalPoints, activeBoost }: ArenaHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="relative z-10 border-b border-primary/20 bg-[#0A1F44]/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 212, 255, 0.3)',
                    '0 0 40px rgba(255, 0, 255, 0.3)',
                    '0 0 20px rgba(0, 212, 255, 0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Swords className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Vote-Fi Arena</h1>
                <p className="text-xs text-muted-foreground">Stake • Vote • Win</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Points Display */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border/50">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{totalPoints.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">ARX-P</span>
            </div>

            {/* Boost Display */}
            {activeBoost > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/20 border border-accent/50">
                <Trophy className="w-4 h-4 text-accent" />
                <span className="font-bold text-accent">+{activeBoost}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ArenaHeader;
