 import { motion } from 'framer-motion';
 import { LayoutGrid, Trophy, Wallet, Flame } from 'lucide-react';
 
 export type ArenaTournamentTab = 'challenges' | 'leaderboard' | 'my-stakes' | 'battle';
 
 interface ArenaTournamentNavProps {
   activeTab: ArenaTournamentTab;
   onTabChange: (tab: ArenaTournamentTab) => void;
 }
 
 const tabs = [
   { id: 'challenges' as const, label: 'Challenges', icon: LayoutGrid },
   { id: 'leaderboard' as const, label: 'Rankings', icon: Trophy },
   { id: 'my-stakes' as const, label: 'My Stakes', icon: Wallet },
   { id: 'battle' as const, label: 'Battle', icon: Flame },
 ];
 
 const ArenaTournamentNav = ({ activeTab, onTabChange }: ArenaTournamentNavProps) => {
   return (
     <div className="border-t border-primary/20 bg-background/95 backdrop-blur-xl safe-area-pb">
       <div className="flex items-center justify-around px-1 py-1.5">
         {tabs.map((tab) => (
           <button
             key={tab.id}
             onClick={() => onTabChange(tab.id)}
             className={`
               relative flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200
               ${activeTab === tab.id 
                 ? 'text-primary' 
                 : 'text-muted-foreground active:bg-secondary/50 hover:text-foreground'}
             `}
           >
             {/* Active indicator glow */}
             {activeTab === tab.id && (
               <motion.div
                 layoutId="activeTabGlow"
                 className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/30"
                 transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
               />
             )}
             
             <tab.icon className={`w-5 h-5 relative z-10 ${activeTab === tab.id ? 'text-primary' : ''}`} />
             <span className="text-[10px] font-bold relative z-10">{tab.label}</span>
             
             {/* Active dot */}
             {activeTab === tab.id && (
               <motion.div
                 layoutId="activeTabDot"
                 className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
               />
             )}
           </button>
         ))}
       </div>
     </div>
   );
 };
 
 export default ArenaTournamentNav;