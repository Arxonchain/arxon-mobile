 import { memo } from "react";
import { Zap, Trophy, ArrowLeft, Medal, Crown, Award } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { useLeaderboard } from "@/hooks/useLeaderboard";
 import { usePoints } from "@/hooks/usePoints";
 import { useAuth } from "@/contexts/AuthContext";
 import ResendBackground from "@/components/effects/ResendBackground";
 import ScrollReveal from "@/components/effects/ScrollReveal";
 import GlowCard from "@/components/effects/GlowCard";
 
 const getRankIcon = (index: number) => {
   if (index === 0) return <Crown className="w-5 h-5 text-amber-400" />;
   if (index === 1) return <Medal className="w-5 h-5 text-slate-300" />;
   if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
   return <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>;
 };
 
 const formatPoints = (value: number | string | undefined | null): string => {
   if (value === undefined || value === null) return "0";
   const num = typeof value === "string" ? parseFloat(value) : value;
   if (!isFinite(num) || isNaN(num)) return "0";
   const capped = Math.min(Math.max(num, 0), 1_000_000_000);
   return capped.toLocaleString();
 };
 
 const MinerEntry = memo(({ user, index }: { user: any; index: number }) => {
   const isTop3 = index < 3;
   
   return (
     <motion.div
       initial={{ opacity: 0, x: -20 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ delay: index * 0.03 }}
      className={`p-2.5 sm:p-3 rounded-lg border transition-all ${
         isTop3 
           ? 'bg-gradient-to-r from-primary/10 to-accent/5 border-primary/30' 
           : 'bg-card/40 border-border/30 hover:border-primary/30'
       }`}
     >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
           {/* Rank */}
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
             index === 0 ? 'bg-amber-500/20' :
             index === 1 ? 'bg-slate-400/20' :
             index === 2 ? 'bg-amber-700/20' :
             'bg-muted'
           }`}>
             {getRankIcon(index)}
           </div>
           
           {/* Avatar & Name */}
          <div className="flex items-center gap-2">
            <Avatar className={`w-7 h-7 sm:w-8 sm:h-8 border-2 flex-shrink-0 ${
               index === 0 ? 'border-amber-400' :
               index === 1 ? 'border-slate-300' :
               index === 2 ? 'border-amber-600' :
               'border-border/50'
             }`}>
               <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-xs">
                 {user.username?.charAt(0)?.toUpperCase() || "M"}
               </AvatarFallback>
             </Avatar>
            <div className="min-w-0">
              <p className={`font-medium text-sm truncate ${isTop3 ? 'text-foreground' : 'text-foreground/90'}`}>
                {user.username || `Miner`}
               </p>
               {isTop3 && (
                <p className="text-[10px] text-primary">Top Miner</p>
               )}
             </div>
           </div>
         </div>
         
         {/* Points */}
        <div className="text-right flex-shrink-0">
           <div className="flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${isTop3 ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`font-bold text-sm ${isTop3 ? 'text-foreground' : 'text-foreground/90'}`}>
               {formatPoints(user.total_points)}
             </span>
           </div>
         </div>
       </div>
     </motion.div>
   );
 });
 MinerEntry.displayName = "MinerEntry";
 
 const Leaderboard = () => {
   const navigate = useNavigate();
   const { leaderboard: minerEntries, loading } = useLeaderboard(100);
   const { points, rank } = usePoints();
   const { user } = useAuth();
 
   const userInTop100 = user ? minerEntries.find(e => e.user_id === user.id) : null;
 
   return (
     <div className="min-h-screen bg-background relative overflow-hidden">
       <ResendBackground variant="subtle" />
       
       {/* Header */}
       <header className="relative z-20 flex items-center justify-between px-4 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl">
         <motion.button 
           onClick={() => navigate('/')} 
           className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
           whileHover={{ x: -3 }}
         >
           <ArrowLeft className="w-6 h-6" />
         </motion.button>
         <h1 className="font-bold text-foreground text-lg">Leaderboard</h1>
         <div className="w-10" />
       </header>
 
       <main className="relative z-10 px-4 py-6 space-y-6 max-w-2xl mx-auto">
         {/* Your Rank Card */}
         {user && points && (
           <ScrollReveal>
            <GlowCard glowColor="accent" className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                   </div>
                   <div>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                       #{rank || '—'}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                  <p className="text-xs text-muted-foreground">Points</p>
                  <p className="text-lg sm:text-xl font-bold text-primary flex items-center gap-1 justify-end">
                    <Zap className="h-4 w-4" />
                     {formatPoints(points.total_points)}
                   </p>
                 </div>
               </div>
             </GlowCard>
           </ScrollReveal>
         )}
 
         {/* Leaderboard List */}
        <ScrollReveal delay={0.1}>
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
               <Crown className="h-5 w-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">Top 100 Miners</h2>
             </div>
 
            <div className="space-y-1.5">
               {loading ? (
                <div className="flex items-center justify-center py-8">
                   <motion.div
                     animate={{ rotate: 360 }}
                     transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                   >
                    <Zap className="h-6 w-6 text-primary" />
                   </motion.div>
                 </div>
               ) : minerEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No miners yet</p>
                 </div>
               ) : (
                 minerEntries.map((miner, index) => (
                   <MinerEntry 
                     key={miner.user_id} 
                     user={miner} 
                     index={index} 
                   />
                 ))
               )}
             </div>
           </div>
         </ScrollReveal>
       </main>
     </div>
   );
 };
 
 export default Leaderboard;
