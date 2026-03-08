 import { ArrowRight, ArrowLeft, Copy, Users, Activity, UserX, Share2, Gift, Sparkles } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { toast } from "@/hooks/use-toast";
 import { useReferrals } from "@/hooks/useReferrals";
 import { useAuth } from "@/contexts/AuthContext";
 import { format } from "date-fns";
 import { useMemo } from "react";
 import ResendBackground from "@/components/effects/ResendBackground";
 import ScrollReveal from "@/components/effects/ScrollReveal";
 import GlowCard from "@/components/effects/GlowCard";
 import { Button } from "@/components/ui/button";

 const Referrals = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { referralCode, referrals, stats, loading, getReferralLink } = useReferrals(user);
 
   const { activeReferrals, inactiveReferrals } = useMemo(() => {
     const active = referrals.filter(r => r.is_active === true);
     const inactive = referrals.filter(r => r.is_active !== true);
     return { activeReferrals: active, inactiveReferrals: inactive };
   }, [referrals]);
 
   const copyReferralCode = () => {
     if (referralCode) {
       navigator.clipboard.writeText(referralCode);
       toast({
         title: "Code Copied!",
         description: `Referral code ${referralCode} copied to clipboard`,
       });
     }
   };
 
   const shareReferralLink = async () => {
     const link = getReferralLink();
     if (!link) return;
 
     if (navigator.share) {
       try {
         await navigator.share({
           title: 'Join ARXON',
           text: `Join me on ARXON and start mining! Use my referral code: ${referralCode}`,
           url: link,
         });
       } catch (err) {
         if ((err as Error).name !== 'AbortError') {
           navigator.clipboard.writeText(link);
           toast({ title: "Link Copied!", description: "Referral link copied to clipboard" });
         }
       }
     } else {
       navigator.clipboard.writeText(link);
       toast({ title: "Link Copied!", description: "Referral link copied to clipboard" });
     }
   };
 
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
         <h1 className="font-bold text-foreground text-lg">Referrals</h1>
         <div className="w-10" />
       </header>
 
       <main className="relative z-10 px-4 py-6 space-y-6 max-w-lg mx-auto">
         {/* Hero */}
         <ScrollReveal>
           <div className="text-center mb-4">
             <motion.div
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4"
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
             >
               <Sparkles className="w-4 h-4 text-accent" />
               <span className="text-sm font-medium text-accent">100 ARX-P per referral</span>
             </motion.div>
             <h2 className="text-2xl font-bold text-foreground mb-2">Invite Friends & Earn</h2>
             <p className="text-muted-foreground text-sm">Share your code and earn when friends join</p>
           </div>
         </ScrollReveal>
 
         {/* Referral Code Card */}
         {user && (
           <ScrollReveal delay={0.1}>
             <GlowCard glowColor="primary" className="p-5">
               <div className="text-center mb-4">
                 <p className="text-xs text-muted-foreground mb-2">Your Referral Code</p>
                 <motion.div 
                   className="text-3xl font-bold text-primary tracking-widest mb-3"
                   initial={{ scale: 0.9 }}
                   animate={{ scale: 1 }}
                 >
                   {loading && !referralCode ? "..." : referralCode || "..."}
                 </motion.div>
               </div>
               
               <div className="flex gap-2">
                 <Button
                   onClick={copyReferralCode}
                   variant="outline"
                   className="flex-1 border-primary/30"
                   disabled={!referralCode}
                 >
                   <Copy className="w-4 h-4 mr-2" />
                   Copy Code
                 </Button>
                 <Button
                   onClick={shareReferralLink}
                   className="flex-1 bg-primary text-primary-foreground"
                   disabled={!referralCode}
                 >
                   <Share2 className="w-4 h-4 mr-2" />
                   Share Link
                 </Button>
               </div>
             </GlowCard>
           </ScrollReveal>
         )}
 
         {/* Stats */}
         <ScrollReveal delay={0.15}>
           <div className="grid grid-cols-2 gap-3">
             <GlowCard glowColor="accent" className="p-4 text-center">
               <Users className="w-5 h-5 mx-auto mb-2 text-accent" />
               <p className="text-2xl font-bold text-foreground">{stats.totalReferrals}</p>
               <p className="text-xs text-muted-foreground">Total Referrals</p>
             </GlowCard>
             <GlowCard glowColor="green" className="p-4 text-center">
               <Activity className="w-5 h-5 mx-auto mb-2 text-green-400" />
               <p className="text-2xl font-bold text-green-400">{stats.activeMiners}</p>
               <p className="text-xs text-muted-foreground">Active Miners</p>
             </GlowCard>
             <GlowCard glowColor="primary" className="p-4 text-center">
               <UserX className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
               <p className="text-2xl font-bold text-foreground">{stats.inactiveMiners}</p>
               <p className="text-xs text-muted-foreground">Inactive</p>
             </GlowCard>
             <GlowCard glowColor="amber" className="p-4 text-center">
               <Gift className="w-5 h-5 mx-auto mb-2 text-amber-400" />
               <p className="text-2xl font-bold text-amber-400">{stats.totalEarnings}</p>
               <p className="text-xs text-muted-foreground">ARX-P Earned</p>
             </GlowCard>
           </div>
         </ScrollReveal>
 
         {/* Referrals List */}
         <ScrollReveal delay={0.2}>
           {referrals.length === 0 ? (
             <div className="glass-card p-8 text-center">
               <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
               <p className="text-foreground font-medium mb-1">No referrals yet</p>
               <p className="text-xs text-muted-foreground">Share your code to start earning!</p>
             </div>
           ) : (
             <div className="space-y-4">
               {/* Active */}
               <div className="glass-card overflow-hidden">
                 <div className="p-4 border-b border-border/50 flex items-center gap-2">
                   <Activity className="h-4 w-4 text-green-400" />
                   <h3 className="font-semibold text-foreground">Active ({activeReferrals.length})</h3>
                   <span className="ml-auto text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Mining</span>
                 </div>
                 {activeReferrals.length === 0 ? (
                   <div className="p-6 text-center">
                     <p className="text-muted-foreground text-sm">No active miners</p>
                   </div>
                 ) : (
                   <div className="divide-y divide-border/30">
                     {activeReferrals.map((r, i) => (
                       <motion.div 
                         key={r.id} 
                         className="p-4 flex items-center justify-between"
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: i * 0.05 }}
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                             {(r.referred_username || 'A').charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <p className="text-sm font-medium text-foreground">{r.referred_username || 'Anonymous'}</p>
                             <p className="text-xs text-muted-foreground">
                               {r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : 'N/A'}
                             </p>
                           </div>
                         </div>
                         <span className="text-sm font-bold text-green-400">+{r.points_awarded || 0}</span>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </div>
 
               {/* Inactive */}
               {inactiveReferrals.length > 0 && (
                 <div className="glass-card overflow-hidden">
                   <div className="p-4 border-b border-border/50 flex items-center gap-2">
                     <UserX className="h-4 w-4 text-muted-foreground" />
                     <h3 className="font-semibold text-foreground">Inactive ({inactiveReferrals.length})</h3>
                   </div>
                   <div className="divide-y divide-border/30">
                     {inactiveReferrals.map((r, i) => (
                       <motion.div 
                         key={r.id} 
                         className="p-4 flex items-center justify-between opacity-60"
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 0.6, x: 0 }}
                         transition={{ delay: i * 0.05 }}
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                             {(r.referred_username || 'A').charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <p className="text-sm font-medium text-foreground">{r.referred_username || 'Anonymous'}</p>
                             <p className="text-xs text-muted-foreground">
                               {r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : 'N/A'}
                             </p>
                           </div>
                         </div>
                         <span className="text-sm text-muted-foreground">+{r.points_awarded || 0}</span>
                       </motion.div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           )}
         </ScrollReveal>
       </main>
     </div>
   );
 };
 
 export default Referrals;
