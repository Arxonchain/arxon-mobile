import { motion } from 'framer-motion';
import { Shield, Star, Flame, Zap, Crown, Trophy } from 'lucide-react';
import { UserBadge } from '@/hooks/useArena';

interface UserBadgesProps {
  badges: UserBadge[];
}

const getBadgeIcon = (badgeType: string) => {
  switch (badgeType) {
    case 'winner':
      return <Trophy className="w-6 h-6" />;
    case 'legend':
      return <Crown className="w-6 h-6" />;
    case 'power':
      return <Zap className="w-6 h-6" />;
    case 'streak':
      return <Flame className="w-6 h-6" />;
    case 'early':
      return <Star className="w-6 h-6" />;
    default:
      return <Shield className="w-6 h-6" />;
  }
};

const getBadgeColor = (badgeType: string) => {
  switch (badgeType) {
    case 'winner':
      return '#FFD700';
    case 'legend':
      return '#FF00FF';
    case 'power':
      return '#00D4FF';
    case 'streak':
      return '#FF6B00';
    case 'early':
      return '#00FF88';
    default:
      return '#A0A0FF';
  }
};

const UserBadges = ({ badges }: UserBadgesProps) => {
  if (badges.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">No badges earned yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Vote in Arena battles to earn permanent badges!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border border-primary/20">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Your Badges
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {badges.map((badge, index) => {
          const color = getBadgeColor(badge.badge_type);

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-xl text-center group cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${color}10, ${color}05)`,
                border: `1px solid ${color}30`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  boxShadow: `0 0 30px ${color}40`,
                }}
              />

              <div
                className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                  color,
                }}
              >
                {getBadgeIcon(badge.badge_type)}
              </div>

              <h4 className="font-bold text-foreground text-sm">{badge.badge_name}</h4>
              {badge.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {badge.description}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default UserBadges;
