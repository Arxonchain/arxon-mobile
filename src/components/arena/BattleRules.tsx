import { motion } from 'framer-motion';
import { Shield, Zap, Trophy, Clock, Users, Target } from 'lucide-react';

const BattleRules = () => {
  const rules = [
    {
      icon: Users,
      title: 'Automatic Club Assignment',
      description: 'Upon entering the Arena, you are automatically assigned to either ALPHA or OMEGA club. Your club is permanent.',
    },
    {
      icon: Target,
      title: 'Stake to Vote',
      description: 'Use your ARX-P points to stake and vote for your club. The more you stake, the more power your club gains.',
    },
    {
      icon: Clock,
      title: 'Battle Duration',
      description: 'Each battle runs for a set period. Once the timer ends, the club with more total power wins.',
    },
    {
      icon: Zap,
      title: 'Winner Rewards',
      description: 'Members of the winning club receive a mining boost for 7 days, increasing their earning rate.',
    },
    {
      icon: Shield,
      title: 'Fingerprint Verification',
      description: 'All votes are verified using fingerprint authentication to ensure fair play and prevent abuse.',
    },
    {
      icon: Trophy,
      title: 'Earn Badges',
      description: 'Win battles and climb the leaderboard to earn exclusive badges and recognition.',
    },
  ];

  return (
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-foreground mb-4">Battle Rules</h2>
      
      {rules.map((rule, index) => (
        <motion.div
          key={rule.title}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <rule.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-1">{rule.title}</h3>
            <p className="text-sm text-muted-foreground">{rule.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BattleRules;
