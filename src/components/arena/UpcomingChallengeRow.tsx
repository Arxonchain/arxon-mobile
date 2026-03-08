 import { useState, useEffect } from 'react';
 import { motion } from 'framer-motion';
 import { Clock, Trophy, ChevronRight, Zap } from 'lucide-react';
 import type { ArenaMarket } from '@/hooks/useArenaMarkets';
 
 interface UpcomingChallengeRowProps {
   market: ArenaMarket;
   onClick: () => void;
 }
 
 const UpcomingChallengeRow = ({ market, onClick }: UpcomingChallengeRowProps) => {
   const [timeUntilStart, setTimeUntilStart] = useState('');
 
   useEffect(() => {
     const updateTimer = () => {
       const now = new Date().getTime();
       const target = new Date(market.starts_at).getTime();
       const diff = target - now;
 
       if (diff <= 0) {
         setTimeUntilStart('Starting...');
         return;
       }
 
       const hours = Math.floor(diff / (1000 * 60 * 60));
       const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
       const secs = Math.floor((diff % (1000 * 60)) / 1000);
 
       if (hours > 0) {
         setTimeUntilStart(`${hours}H : ${mins}M : ${secs}S`);
       } else {
         setTimeUntilStart(`${mins}M : ${secs}S`);
       }
     };
 
     updateTimer();
     const interval = setInterval(updateTimer, 1000);
     return () => clearInterval(interval);
   }, [market.starts_at]);
 
   return (
     <motion.button
       whileHover={{ scale: 1.01 }}
       whileTap={{ scale: 0.99 }}
       onClick={onClick}
       className="w-full relative overflow-hidden rounded-xl border border-border/30 bg-gradient-to-r from-card/60 via-background to-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 group"
     >
       {/* Left accent border */}
       <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
 
       <div className="flex items-center gap-3 p-3 pl-4">
         {/* Logo/Icon */}
         <div 
           className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
           style={{ 
             background: `linear-gradient(135deg, ${market.side_a_color}, ${market.side_a_color}cc)`,
             color: '#fff',
           }}
         >
           {market.side_a_name.substring(0, 2).toUpperCase()}
         </div>
 
         {/* Title & Status */}
         <div className="flex-1 min-w-0 text-left">
           <p className="text-sm font-bold text-foreground truncate">{market.title}</p>
           <div className="flex items-center gap-1.5 mt-0.5">
             <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
               <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               Upcoming
             </span>
           </div>
         </div>
 
         {/* Prize */}
         <div className="text-center shrink-0">
           <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
           <p className="text-sm font-bold text-primary">
             {market.prize_pool >= 1000 
               ? `${(market.prize_pool / 1000).toFixed(0)}K`
               : market.prize_pool.toLocaleString()}
           </p>
         </div>
 
         {/* Time */}
         <div className="text-center shrink-0 px-3 border-x border-border/30">
           <p className="text-[10px] text-muted-foreground uppercase">Starts In</p>
           <p className="text-xs font-bold text-foreground">{timeUntilStart}</p>
         </div>
 
         {/* Action */}
         <div className="shrink-0">
           <div className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold flex items-center gap-1 group-hover:bg-primary/20 transition-colors">
             <Clock className="w-3 h-3" />
             Soon
           </div>
         </div>
 
         <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
       </div>
     </motion.button>
   );
 };
 
 export default UpcomingChallengeRow;