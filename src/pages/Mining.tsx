 import { Copy, ArrowLeft, Play, Square, Clock, Zap, RefreshCw } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { toast } from "@/hooks/use-toast";
 import { useMining } from "@/hooks/useMining";
 import { useAuth } from "@/contexts/AuthContext";
 import { usePoints } from "@/hooks/usePoints";
 import { useProfile } from "@/hooks/useProfile";
 import { Button } from "@/components/ui/button";
 import AuthDialog from "@/components/auth/AuthDialog";
 import { useState, useMemo } from "react";
 
 const Mining = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { points } = usePoints();
   const { profile } = useProfile();
   const { 
     isMining, 
     loading, 
     settingsLoading,
     elapsedTime, 
     remainingTime, 
     earnedPoints, 
     maxTimeSeconds,
     startMining, 
     stopMining,
     claimPoints,
     formatTime,
     pointsPerSecond,
     pointsPerHour,
     totalBoostPercentage,
     miningSettings
   } = useMining({ tickMs: 250 });
   const [showAuth, setShowAuth] = useState(false);
 
   const miningDisabled = !settingsLoading && !miningSettings.publicMiningEnabled;
   const hasBoost = totalBoostPercentage > 0;
 
   const copyReferralCode = () => {
     const code = profile?.referral_code || "Loading...";
     if (!profile?.referral_code) {
       toast({
         title: "Not Ready",
         description: "Your referral code is still loading",
         variant: "destructive"
       });
       return;
     }
     navigator.clipboard.writeText(code);
     toast({
       title: "Copied!",
       description: "Referral code copied to clipboard",
     });
   };
 
   const handleStartMining = () => {
     if (!user) {
       setShowAuth(true);
       return;
     }
     startMining();
   };
 
   const progressPercentage = useMemo(() => {
     return isMining ? Math.min((elapsedTime / maxTimeSeconds) * 100, 100) : 0;
   }, [isMining, elapsedTime, maxTimeSeconds]);
 
   const isSessionComplete = elapsedTime >= maxTimeSeconds && !isMining;
 
   const formattedRemainingTime = useMemo(() => formatTime(remainingTime), [remainingTime, formatTime]);
   const formattedElapsedTime = useMemo(() => formatTime(elapsedTime), [elapsedTime, formatTime]);
 
   const formattedEarnedPoints = useMemo(() => {
     if (earnedPoints < 0.01) {
       return earnedPoints.toFixed(6);
     } else if (earnedPoints < 1) {
       return earnedPoints.toFixed(4);
     } else if (earnedPoints < 10) {
       return earnedPoints.toFixed(3);
     } else {
       return earnedPoints.toFixed(2);
     }
   }, [earnedPoints]);
 
   return (
      <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center px-4">
        {/* Sleek animated background */}
        <div className="absolute inset-0 z-0">
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          
          {/* Primary glow - only intense when mining */}
          <motion.div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
            animate={isMining ? {
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            } : {
              scale: 1,
              opacity: 0.2,
            }}
            transition={{
              duration: 4,
              repeat: isMining ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />
          
          {/* Accent glow orb - animated when mining */}
          <motion.div
            className="absolute bottom-1/4 right-1/4"
            style={{
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, hsl(var(--accent) / 0.1) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={isMining ? {
              x: [0, 50, 0],
              y: [0, -30, 0],
              opacity: [0.2, 0.4, 0.2],
            } : {
              x: 0,
              y: 0,
              opacity: 0.1,
            }}
            transition={{
              duration: 6,
              repeat: isMining ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />
          
          {/* Particle effect when mining */}
          {isMining && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-primary/50"
                  style={{
                    left: `${20 + i * 12}%`,
                    top: '50%',
                  }}
                  animate={{
                    y: [0, -100, -200],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </div>
 
       {/* Back Button */}
       <motion.button 
         onClick={() => navigate('/')}
         className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-20"
         whileHover={{ x: -3 }}
         whileTap={{ scale: 0.95 }}
       >
         <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
         <span className="text-sm md:text-base font-medium">Back</span>
       </motion.button>
 
       {/* Main Content */}
       <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md">
 
         {/* Total Balance Card */}
         <motion.div 
           className="glass-card px-6 sm:px-10 md:px-20 py-4 sm:py-6 md:py-8 mb-4 sm:mb-6 md:mb-8 text-center w-full"
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <p className="text-muted-foreground text-xs sm:text-sm md:text-base mb-1">Total Balance</p>
           <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
             {points?.total_points?.toLocaleString() || 0} <span className="text-lg sm:text-2xl md:text-3xl text-accent">ARX-P</span>
           </h2>
         </motion.div>
 
         {/* Session Earnings */}
         {isMining && (
           <motion.div 
             className="glass-card px-4 sm:px-6 py-3 sm:py-4 mb-4 sm:mb-6 text-center w-full"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             style={{
               borderColor: 'hsl(142 76% 36% / 0.3)',
               background: 'linear-gradient(135deg, hsl(142 76% 36% / 0.1), transparent)',
             }}
           >
             <div className="flex items-center justify-center gap-2 mb-1">
               <motion.div
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 1, repeat: Infinity }}
               >
                 <Zap className="h-4 w-4 text-green-400" />
               </motion.div>
               <p className="text-xs sm:text-sm text-green-400">Session Earnings</p>
             </div>
             <motion.p 
               className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 font-mono tabular-nums"
               key={formattedEarnedPoints}
               initial={{ scale: 1.05 }}
               animate={{ scale: 1 }}
             >
               +{formattedEarnedPoints} ARX-P
             </motion.p>
             <p className="text-[10px] text-muted-foreground mt-1">
               +{pointsPerSecond.toFixed(6)} ARX-P/sec
               {hasBoost && <span className="text-amber-400 ml-1">• {totalBoostPercentage}% boost</span>}
             </p>
             
              {earnedPoints >= 10 && (
                <Button
                  onClick={claimPoints}
                  className="mt-3 bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm"
                  size="sm"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Claim {Math.floor(earnedPoints)} ARX-P
                </Button>
              )}
           </motion.div>
         )}
 
         {/* Mining Circle */}
         <motion.div 
           className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 mb-4 sm:mb-6"
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
         >
           {/* Glow effect when mining */}
           {isMining && (
             <motion.div
               className="absolute inset-0 rounded-full"
               style={{
                 background: 'radial-gradient(circle, hsl(142 76% 36% / 0.4) 0%, transparent 70%)',
                 filter: 'blur(20px)',
               }}
               animate={{
                 scale: [1, 1.2, 1],
                 opacity: [0.5, 0.8, 0.5],
               }}
               transition={{
                 duration: 2,
                 repeat: Infinity,
                 ease: 'easeInOut',
               }}
             />
           )}
           
           {/* Progress Ring */}
           <svg className="absolute inset-0 w-full h-full -rotate-90">
             <circle
               cx="50%"
               cy="50%"
               r="45%"
               fill="none"
               stroke="hsl(var(--muted))"
               strokeWidth="4"
             />
             <motion.circle
               cx="50%"
               cy="50%"
               r="45%"
               fill="none"
               stroke={isMining ? "hsl(142 76% 36%)" : "hsl(var(--primary))"}
               strokeWidth="4"
               strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
               strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
               strokeLinecap="round"
               initial={false}
               animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - progressPercentage / 100)}` }}
               transition={{ duration: 0.5, ease: 'linear' }}
             />
           </svg>
           
           {/* Center Content */}
           <div className="absolute inset-0 flex flex-col items-center justify-center glass-card rounded-full border-2 border-border/50">
             {loading ? (
               <motion.div 
                 className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full"
                 animate={{ rotate: 360 }}
                 transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
               />
             ) : isMining ? (
               <>
                 <p className="text-muted-foreground text-[10px] sm:text-xs mb-0.5 sm:mb-1">Time Remaining</p>
                 <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight font-mono">
                   {formattedRemainingTime}
                 </p>
                 <div className="flex items-center gap-1 mt-1 sm:mt-2">
                   <motion.span 
                     className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400"
                     animate={{ opacity: [1, 0.5, 1] }}
                     transition={{ duration: 1, repeat: Infinity }}
                   />
                   <span className="text-[10px] sm:text-xs text-green-400">Mining Active</span>
                 </div>
               </>
             ) : (
               <>
                 <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-1 sm:mb-2" />
                 <p className="text-muted-foreground text-[10px] sm:text-xs">Session Duration</p>
                 <p className="text-base sm:text-lg md:text-xl font-bold text-foreground">8 Hours Max</p>
                 <p className="text-[10px] sm:text-xs text-accent mt-0.5 sm:mt-1">
                   +{pointsPerHour.toFixed(hasBoost ? 1 : 0)} ARX-P/hour
                   {hasBoost && <span className="text-amber-400 ml-1">🔥</span>}
                 </p>
               </>
             )}
           </div>
         </motion.div>
 
         {/* Mining Stats */}
         {isMining && (
           <motion.div 
             className="grid grid-cols-2 gap-2 sm:gap-3 w-full mb-4 sm:mb-6"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
           >
             <div className="glass-card p-2 sm:p-3 text-center">
               <p className="text-[10px] sm:text-xs text-muted-foreground">Elapsed Time</p>
               <p className="text-sm sm:text-lg font-bold text-foreground font-mono">{formattedElapsedTime}</p>
             </div>
             <div className="glass-card p-2 sm:p-3 text-center">
               <p className="text-[10px] sm:text-xs text-muted-foreground">Rate</p>
               <p className="text-sm sm:text-lg font-bold text-accent">
                 +{pointsPerHour.toFixed(hasBoost ? 1 : 0)} ARX-P/hr
                 {hasBoost && <span className="text-amber-400 ml-1">🔥</span>}
               </p>
             </div>
           </motion.div>
         )}
 
         {/* Start/Stop Button */}
         <motion.div 
           className="w-full mb-4 sm:mb-6"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
         >
           {miningDisabled ? (
             <div className="glass-card p-4 text-center border-destructive/30 bg-destructive/5">
               <p className="text-sm text-destructive font-medium mb-1">Mining Temporarily Disabled</p>
               <p className="text-xs text-muted-foreground">Public mining is currently paused by the admin. Check back later.</p>
             </div>
           ) : isMining ? (
             <Button
               onClick={stopMining}
               className="w-full py-4 sm:py-6 text-base sm:text-lg font-semibold bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30"
               size="lg"
             >
               <Square className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
               Stop Mining & Collect
             </Button>
           ) : (
             <motion.div
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
             >
               <Button
                 onClick={handleStartMining}
                 className="w-full py-4 sm:py-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
                 size="lg"
               >
                 {isSessionComplete ? (
                   <>
                     <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                     Start New Session
                   </>
                 ) : (
                   <>
                     <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                     Start Mining
                   </>
                 )}
               </Button>
             </motion.div>
           )}
         </motion.div>
 
         {/* Info Card */}
         <motion.div 
           className="glass-card p-3 sm:p-4 w-full text-center mb-4 sm:mb-6"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
         >
           <p className="text-[10px] sm:text-xs text-muted-foreground">
             Mine for up to 8 hours per session. Earn {hasBoost ? `${pointsPerHour.toFixed(1)}` : '10'} ARX-P per hour. 
             {isMining ? " Stop anytime to collect your points." : " Start a new session after completion."}
           </p>
         </motion.div>
 
         {/* Copy Referral */}
         <motion.button
           onClick={copyReferralCode}
           className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
         >
           <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
           <span className="text-[10px] sm:text-xs md:text-sm font-medium">
             {profile?.referral_code || "Generating code..."}
           </span>
         </motion.button>
       </div>
 
       <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
     </div>
   );
 };
 
 export default Mining;
