 import { motion } from 'framer-motion';
 import { Shield, Sword, Zap, Trophy, Target } from 'lucide-react';
 
 interface ArenaTournamentHeaderProps {
   alphaStaked: number;
   omegaStaked: number;
   alphaMembers: number;
   omegaMembers: number;
 }
 
 const ArenaTournamentHeader = ({
   alphaStaked,
   omegaStaked,
   alphaMembers,
   omegaMembers,
 }: ArenaTournamentHeaderProps) => {
   const totalStaked = alphaStaked + omegaStaked;
   const alphaPercent = totalStaked > 0 ? (alphaStaked / totalStaked) * 100 : 50;
   const omegaPercent = totalStaked > 0 ? (omegaStaked / totalStaked) * 100 : 50;
 
   return (
     <div className="relative overflow-hidden bg-gradient-to-b from-background via-background/95 to-transparent py-6 px-4">
       {/* Background glow effects */}
       <div className="absolute inset-0 pointer-events-none overflow-hidden">
         {/* Team Alpha glow */}
         <motion.div
           className="absolute -left-20 top-1/2 -translate-y-1/2 w-60 h-60 rounded-full opacity-30"
           style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
           animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.1, 0.9] }}
           transition={{ duration: 4, repeat: Infinity }}
         />
         {/* Team Omega glow */}
         <motion.div
           className="absolute -right-20 top-1/2 -translate-y-1/2 w-60 h-60 rounded-full opacity-30"
           style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
           animate={{ opacity: [0.2, 0.4, 0.2], scale: [1.1, 0.9, 1.1] }}
           transition={{ duration: 4, repeat: Infinity }}
         />
       </div>
 
       {/* Main Header Content */}
       <div className="relative z-10">
         {/* Title */}
         <div className="text-center mb-4">
           <motion.p
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-1"
           >
             Prediction Arena
           </motion.p>
           <motion.h1
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-xl font-black text-foreground"
           >
             STAKE • PREDICT • <span className="text-primary">WIN</span>
           </motion.h1>
         </div>
 
         {/* Team VS Section */}
         <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="flex items-stretch gap-3 max-w-lg mx-auto"
         >
           {/* Team Alpha */}
           <div className="flex-1 relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-3">
             <motion.div
               className="absolute inset-0 opacity-20"
               style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, transparent 50%)' }}
             />
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-8 h-8 rounded-lg bg-primary/30 flex items-center justify-center">
                   <Shield className="w-4 h-4 text-primary" />
                 </div>
                 <div>
                   <p className="text-[10px] text-muted-foreground uppercase">Team</p>
                   <p className="text-sm font-black text-primary">ALPHA</p>
                 </div>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-lg font-black text-foreground">
                   {alphaStaked >= 1000000 
                     ? `${(alphaStaked / 1000000).toFixed(1)}M`
                     : alphaStaked >= 1000 
                       ? `${(alphaStaked / 1000).toFixed(0)}K`
                       : alphaStaked.toLocaleString()}
                 </span>
                 <span className="text-[10px] text-muted-foreground">ARX-P</span>
               </div>
               <p className="text-[10px] text-muted-foreground">{alphaMembers} members</p>
             </div>
           </div>
 
           {/* VS Badge */}
           <div className="flex flex-col items-center justify-center">
             <motion.div
               className="w-12 h-12 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center shadow-lg shadow-primary/20"
               animate={{
                 boxShadow: [
                   '0 0 15px hsl(var(--primary) / 0.2)',
                   '0 0 25px hsl(var(--primary) / 0.4)',
                   '0 0 15px hsl(var(--primary) / 0.2)',
                 ],
               }}
               transition={{ duration: 2, repeat: Infinity }}
             >
               <span className="text-sm font-black text-primary">VS</span>
             </motion.div>
           </div>
 
           {/* Team Omega */}
           <div className="flex-1 relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-bl from-primary/20 via-primary/10 to-transparent p-3">
             <motion.div
               className="absolute inset-0 opacity-20"
               style={{ background: 'linear-gradient(225deg, hsl(var(--primary)) 0%, transparent 50%)' }}
             />
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-8 h-8 rounded-lg bg-primary/30 flex items-center justify-center">
                   <Sword className="w-4 h-4 text-primary" />
                 </div>
                 <div>
                   <p className="text-[10px] text-muted-foreground uppercase">Team</p>
                   <p className="text-sm font-black text-primary">OMEGA</p>
                 </div>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-lg font-black text-foreground">
                   {omegaStaked >= 1000000 
                     ? `${(omegaStaked / 1000000).toFixed(1)}M`
                     : omegaStaked >= 1000 
                       ? `${(omegaStaked / 1000).toFixed(0)}K`
                       : omegaStaked.toLocaleString()}
                 </span>
                 <span className="text-[10px] text-muted-foreground">ARX-P</span>
               </div>
               <p className="text-[10px] text-muted-foreground">{omegaMembers} members</p>
             </div>
           </div>
         </motion.div>
 
         {/* Power Bar */}
         <div className="max-w-lg mx-auto mt-4">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold text-primary">{alphaPercent.toFixed(0)}%</span>
             <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden flex">
               <motion.div
                 className="h-full bg-gradient-to-r from-primary to-primary/80"
                 initial={{ width: '50%' }}
                 animate={{ width: `${alphaPercent}%` }}
                 transition={{ duration: 0.8, ease: 'easeOut' }}
               />
               <motion.div
                 className="h-full bg-gradient-to-l from-primary to-primary/80"
                 initial={{ width: '50%' }}
                 animate={{ width: `${omegaPercent}%` }}
                 transition={{ duration: 0.8, ease: 'easeOut' }}
               />
             </div>
             <span className="text-[10px] font-bold text-primary">{omegaPercent.toFixed(0)}%</span>
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 export default ArenaTournamentHeader;