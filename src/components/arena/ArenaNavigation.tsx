import { motion } from 'framer-motion';
import { Swords, Users, Trophy, History, BarChart3 } from 'lucide-react';

type ArenaTab = 'battle' | 'explorer' | 'leaderboard' | 'history' | 'analytics';

interface ArenaNavigationProps {
  activeTab: ArenaTab;
  onTabChange: (tab: ArenaTab) => void;
  participantCount?: number;
}

const ArenaNavigation = ({ activeTab, onTabChange, participantCount = 0 }: ArenaNavigationProps) => {
  const tabs = [
    { id: 'battle' as ArenaTab, label: 'Battle', icon: <Swords className="w-4 h-4" /> },
    { id: 'explorer' as ArenaTab, label: 'Explorer', icon: <Users className="w-4 h-4" />, badge: participantCount },
    { id: 'leaderboard' as ArenaTab, label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { id: 'history' as ArenaTab, label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'analytics' as ArenaTab, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="glass-card p-2 border border-primary/20">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-lg"
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}
            <span className="relative z-10">{tab.icon}</span>
            <span className="relative z-10 hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="relative z-10 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ArenaNavigation;
