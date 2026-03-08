import { motion } from 'framer-motion';
import { LayoutGrid, Trophy, Wallet, Flame } from 'lucide-react';

export type ArenaTab = 'markets' | 'leaderboard' | 'votes' | 'vote';

interface ArenaBottomNavProps {
  activeTab: ArenaTab;
  onTabChange: (tab: ArenaTab) => void;
}

const tabs = [
  { id: 'markets' as const, label: 'Markets', icon: LayoutGrid },
  { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
  { id: 'votes' as const, label: 'My Votes', icon: Wallet },
  { id: 'vote' as const, label: 'Battle', icon: Flame },
];

const ArenaBottomNav = ({ activeTab, onTabChange }: ArenaBottomNavProps) => {
  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all
              ${activeTab === tab.id 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground active:bg-secondary/50'}
            `}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ArenaBottomNav;
