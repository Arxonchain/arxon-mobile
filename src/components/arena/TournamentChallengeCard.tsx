 import { useState, useEffect } from 'react';
 import { motion } from 'framer-motion';
 import { Clock, Users, Trophy, Flame, ChevronRight, Zap } from 'lucide-react';
 import type { ArenaMarket, MarketVote } from '@/hooks/useArenaMarkets';
 
 interface TournamentChallengeCardProps {
   market: ArenaMarket;
   userPosition?: MarketVote;
   onClick: () => void;
   isLive?: boolean;
 }
 
 const TournamentChallengeCard = ({
   market,
   userPosition,
   onClick,
   isLive = true,
 }: TournamentChallengeCardProps) => {
   const [timeLeft, setTimeLeft] = useState('');
   const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
 
   const totalPool = market.side_a_power + market.side_b_power + (market.side_c_power || 0);
   const sideAPercent = totalPool > 0 ? (market.side_a_power / totalPool) * 100 : 50;
   const sideBPercent = totalPool > 0 ? (market.side_b_power / totalPool) * 100 : 50;
 
   useEffect(() => {
     const updateTimer = () => {
       const now = new Date().getTime();
       const target = new Date(market.ends_at).getTime();
       const diff = target - now;
 
       if (diff <= 0) {
         setTimeLeft('Ended');
         setCountdown({ days: 0, hours: 0, mins: 0, secs: 0 });
         return;
       }
 
       const days = Math.floor(diff / (1000 * 60 * 60 * 24));
       const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
       const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
       const secs = Math.floor((diff % (1000 * 60)) / 1000);
 
       setCountdown({ days, hours, mins, secs });
       
       if (days > 0) {
         setTimeLeft(`${days}d ${hours}h`);
       } else if (hours > 0) {
         setTimeLeft(`${hours}h ${mins}m`);
       } else {
         setTimeLeft(`${mins}m ${secs}s`);
       }
     };
 
     updateTimer();
     const interval = setInterval(updateTimer, 1000);
     return () => clearInterval(interval);
   }, [market.ends_at]);
 
   return (
     <motion.button
       whileHover={{ scale: 1.02 }}
       whileTap={{ scale: 0.98 }}
       onClick={onClick}
       className="w-full relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card/80 via-background to-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
     >
       {/* Top Prize Pool Banner */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-primary/5">
          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="flex items-center gap-0.5 px-1.5 py-px rounded-full bg-primary/15 text-primary text-[8px] font-bold uppercase tracking-wide">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                Live
              </span>
            )}
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-black text-primary">
              {market.prize_pool >= 1000000 
                ? `${(market.prize_pool / 1000000).toFixed(1)}M`
                : market.prize_pool >= 1000 
                  ? `${(market.prize_pool / 1000).toFixed(0)}K`
                  : market.prize_pool.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">ARX-P</span>
          </div>
         
         {/* Countdown Timer */}
         <div className="flex items-center gap-1">
           {[
             { value: countdown.days, label: 'DAY' },
             { value: countdown.hours, label: 'HOUR' },
             { value: countdown.mins, label: 'MIN' },
             { value: countdown.secs, label: 'SEC' },
           ].map((unit, idx) => (
             <div key={unit.label} className="text-center">
               <div className="bg-background/80 border border-border/50 rounded px-1.5 py-0.5 min-w-[28px]">
                 <span className="text-xs font-bold text-foreground">
                   {String(unit.value).padStart(2, '0')}
                 </span>
               </div>
               <span className="text-[6px] text-muted-foreground">{unit.label}</span>
             </div>
           ))}
         </div>
       </div>
 
       {/* Main Content */}
       <div className="p-4">
         {/* Challenge Title */}
         <div className="text-center mb-4">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
             {market.category}
           </span>
           <h3 className="text-base font-black text-foreground leading-tight mt-1">
             {market.title}
           </h3>
         </div>
 
         {/* VS Section */}
         <div className="flex items-center justify-between gap-2 mb-4">
           {/* Side A */}
           <div 
             className="flex-1 p-3 rounded-xl text-center"
             style={{ 
               background: `linear-gradient(135deg, ${market.side_a_color}20, ${market.side_a_color}05)`,
               border: `1px solid ${market.side_a_color}40`,
             }}
           >
             <div 
               className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-lg font-black mb-2 shadow-lg"
               style={{ 
                 background: `linear-gradient(135deg, ${market.side_a_color}, ${market.side_a_color}cc)`,
                 color: '#fff',
               }}
             >
               {market.side_a_name.charAt(0)}
             </div>
             <p className="text-xs font-bold truncate mb-1" style={{ color: market.side_a_color }}>
               {market.side_a_name}
             </p>
             <p className="text-lg font-black text-foreground">{sideAPercent.toFixed(0)}%</p>
           </div>
 
           {/* VS */}
           <motion.div
             className="w-10 h-10 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center"
             animate={{
               boxShadow: [
                 '0 0 10px hsl(var(--primary) / 0.2)',
                 '0 0 20px hsl(var(--primary) / 0.4)',
                 '0 0 10px hsl(var(--primary) / 0.2)',
               ],
             }}
             transition={{ duration: 2, repeat: Infinity }}
           >
             <span className="text-[10px] font-black text-primary">VS</span>
           </motion.div>
 
           {/* Side B */}
           <div 
             className="flex-1 p-3 rounded-xl text-center"
             style={{ 
               background: `linear-gradient(135deg, ${market.side_b_color}20, ${market.side_b_color}05)`,
               border: `1px solid ${market.side_b_color}40`,
             }}
           >
             <div 
               className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-lg font-black mb-2 shadow-lg"
               style={{ 
                 background: `linear-gradient(135deg, ${market.side_b_color}, ${market.side_b_color}cc)`,
                 color: '#fff',
               }}
             >
               {market.side_b_name.charAt(0)}
             </div>
             <p className="text-xs font-bold truncate mb-1" style={{ color: market.side_b_color }}>
               {market.side_b_name}
             </p>
             <p className="text-lg font-black text-foreground">{sideBPercent.toFixed(0)}%</p>
           </div>
         </div>
 
         {/* Power Bar */}
         <div className="h-2 rounded-full bg-muted/30 overflow-hidden flex mb-3">
           <motion.div
             className="h-full"
             style={{ backgroundColor: market.side_a_color }}
             initial={{ width: '50%' }}
             animate={{ width: `${sideAPercent}%` }}
             transition={{ duration: 0.5 }}
           />
           <motion.div
             className="h-full"
             style={{ backgroundColor: market.side_b_color }}
             initial={{ width: '50%' }}
             animate={{ width: `${sideBPercent}%` }}
             transition={{ duration: 0.5 }}
           />
         </div>
 
         {/* Bottom Stats */}
         <div className="flex items-center justify-between pt-3 border-t border-border/30">
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 text-xs">
               <Trophy className="w-3.5 h-3.5 text-primary" />
               <span className="font-bold text-foreground">
                 {market.total_participants || 0} prizes
               </span>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             {userPosition ? (
               <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary font-bold">
                 Staked
               </span>
             ) : (
               <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold flex items-center gap-1">
                 <Zap className="w-3 h-3" />
                 Stake Now
               </span>
             )}
             <ChevronRight className="w-4 h-4 text-muted-foreground" />
           </div>
         </div>
       </div>
 
     </motion.button>
   );
 };
 
 export default TournamentChallengeCard;