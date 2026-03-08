 import { useState, useEffect } from 'react';
 import { ArrowLeft, Send, Users, Zap, Shield, Gift, ArrowUpRight, ArrowDownLeft, Copy, Check, Sparkles, History, RefreshCw } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 import { motion } from 'framer-motion';
 import { useAuth } from '@/contexts/AuthContext';
 import { usePoints } from '@/hooks/usePoints';
 import { useProfile } from '@/hooks/useProfile';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from '@/hooks/use-toast';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import ResendBackground from '@/components/effects/ResendBackground';
 import ScrollReveal from '@/components/effects/ScrollReveal';
 import GlowCard from '@/components/effects/GlowCard';
 import AuthDialog from '@/components/auth/AuthDialog';
 import { ensureProfileFields } from '@/lib/profile/ensureProfileFields';
 
 const Nexus = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { points, refreshPoints } = usePoints();
   const { profile, loading: profileLoading, fetchProfile } = useProfile();
   const [showAuth, setShowAuth] = useState(false);
   const [receiverAddress, setReceiverAddress] = useState('');
   const [amount, setAmount] = useState('');
   const [sending, setSending] = useState(false);
   const [transactions, setTransactions] = useState<any[]>([]);
   const [loadingTx, setLoadingTx] = useState(false);
   const [copied, setCopied] = useState(false);
   const [generatingAddress, setGeneratingAddress] = useState(false);
   const [activeTab, setActiveTab] = useState('send');
   const [allTransactions, setAllTransactions] = useState<any[]>([]);
   const [loadingAllTx, setLoadingAllTx] = useState(false);
 
   useEffect(() => {
     if (!user || profileLoading) return;
     if (profile && !profile.nexus_address) {
       setGeneratingAddress(true);
       ensureProfileFields(user.id, { usernameHint: profile.username })
         .then(() => fetchProfile())
         .finally(() => setGeneratingAddress(false));
     }
   }, [user, profile, profileLoading, fetchProfile]);
 
   const copyAddress = async () => {
     if (!profile?.nexus_address) return;
     try {
       await navigator.clipboard.writeText(profile.nexus_address);
       setCopied(true);
       toast({ title: 'Copied!', description: 'Nexus UID copied to clipboard' });
       setTimeout(() => setCopied(false), 2000);
     } catch {
       toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
     }
   };
 
   const fetchTransactions = async () => {
     if (!user) return;
     setLoadingTx(true);
     try {
       const { data, error } = await supabase
         .from('nexus_transactions')
         .select('*')
         .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
         .order('created_at', { ascending: false })
         .limit(20);
       if (!error && data) setTransactions(data);
     } catch (err) {
       console.error('Error fetching transactions:', err);
     } finally {
       setLoadingTx(false);
     }
   };
 
   const fetchAllTransactions = async () => {
     setLoadingAllTx(true);
     try {
       const { data, error } = await supabase
         .from('nexus_transactions')
         .select('*')
         .eq('private_mode', false)
         .order('created_at', { ascending: false })
         .limit(50);
       if (!error && data) setAllTransactions(data);
     } catch (err) {
       console.error('Error fetching all transactions:', err);
     } finally {
       setLoadingAllTx(false);
     }
   };
 
   useEffect(() => {
     if (user) {
       fetchTransactions();
       fetchAllTransactions();
     }
   }, [user]);
 
   const handleSend = async () => {
     if (!user) { setShowAuth(true); return; }
     if (!receiverAddress.trim()) {
       toast({ title: 'Error', description: 'Enter a receiver UID', variant: 'destructive' });
       return;
     }
     const numAmount = Number(amount);
     if (!Number.isInteger(numAmount) || numAmount < 1 || numAmount > 10) {
       toast({ title: 'Error', description: 'Amount must be 1-10 ARX-P', variant: 'destructive' });
       return;
     }
     if ((points?.total_points || 0) < numAmount) {
       toast({ title: 'Insufficient Balance', description: "You don't have enough ARX-P", variant: 'destructive' });
       return;
     }
 
      setSending(true);
      try {
        // Call RPC with explicit type casting to avoid schema cache issues
        const { data, error } = await supabase.rpc('send_nexus_transfer' as any, {
          p_sender_id: user.id,
          p_receiver_address: receiverAddress.trim(),
          p_amount: numAmount,
        });
        if (error) throw error;
       const result = data as any;
       if (!result?.success) {
         toast({ title: 'Transfer Failed', description: result?.error || 'Unknown error', variant: 'destructive' });
         return;
       }
       toast({ title: 'Transfer Sent! 🎉', description: `Sent ${numAmount} ARX-P. You earned a 20% mining boost!` });
       setReceiverAddress('');
       setAmount('');
       await refreshPoints();
       await fetchTransactions();
       await fetchAllTransactions();
     } catch (err: any) {
       toast({ title: 'Error', description: err.message, variant: 'destructive' });
     } finally {
       setSending(false);
     }
   };
 
   if (!user) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
         <ResendBackground variant="subtle" />
         <div className="relative z-10 text-center p-8 glass-card border border-primary/20 max-w-md mx-4">
           <Shield className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
           <h1 className="text-2xl font-bold text-foreground mb-2">Join the Nexus</h1>
           <p className="text-muted-foreground mb-6">Sign in to send and receive ARX-P</p>
           <button onClick={() => setShowAuth(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold">
             Sign In to Enter
           </button>
         </div>
         <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background relative overflow-hidden">
       <ResendBackground variant="subtle" />
       
       <header className="relative z-20 flex items-center justify-between px-4 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl">
         <motion.button onClick={() => navigate('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground" whileHover={{ x: -3 }}>
           <ArrowLeft className="w-6 h-6" />
         </motion.button>
         <h1 className="font-bold text-foreground text-lg">Nexus</h1>
         <div className="w-10" />
       </header>
 
       <main className="relative z-10 px-4 py-6 space-y-6 max-w-lg mx-auto">
         <ScrollReveal>
           <div className="text-center mb-4">
             <motion.div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
               <Sparkles className="w-4 h-4 text-cyan-400" />
               <span className="text-sm font-medium text-cyan-400">Earn 20% mining boost</span>
             </motion.div>
             <h2 className="text-2xl font-bold text-foreground mb-2">Send & Earn</h2>
             <p className="text-muted-foreground text-sm">Transfer ARX-P to other miners and earn rewards</p>
           </div>
         </ScrollReveal>
 
         <ScrollReveal delay={0.1}>
           <GlowCard glowColor="accent" className="p-4">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <Shield className="w-4 h-4 text-cyan-400" />
                 <span className="text-xs text-muted-foreground">Your Nexus UID</span>
               </div>
               <button onClick={copyAddress} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-bold">
                 {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
               </button>
             </div>
             <p className="text-sm md:text-lg font-bold text-cyan-400 font-mono break-all">
               {profileLoading || generatingAddress ? 'Generating...' : profile?.nexus_address || 'Unavailable'}
             </p>
           </GlowCard>
         </ScrollReveal>
 
         <ScrollReveal delay={0.15}>
           <div className="glass-card p-5 text-center">
             <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
             <p className="text-3xl font-bold text-foreground">{points?.total_points?.toLocaleString() || 0}<span className="text-lg text-accent ml-2">ARX-P</span></p>
           </div>
         </ScrollReveal>
 
         <ScrollReveal delay={0.2}>
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <TabsList className="grid w-full grid-cols-3 bg-secondary/50 border border-border/30">
               <TabsTrigger value="send" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Send className="w-4 h-4 mr-2" />Send</TabsTrigger>
               <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><History className="w-4 h-4 mr-2" />History</TabsTrigger>
               <TabsTrigger value="explorer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="w-4 h-4 mr-2" />Explorer</TabsTrigger>
             </TabsList>
 
             <TabsContent value="send" className="mt-4">
               <div className="glass-card p-4 space-y-4">
                 <div>
                   <label className="text-xs text-muted-foreground mb-1 block">Receiver UID</label>
                   <Input placeholder="ARX-P-username1234" value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} className="bg-secondary/50 font-mono" />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground mb-1 block">Amount (1-10 ARX-P)</label>
                   <Input type="number" placeholder="5" min={1} max={10} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/50" />
                 </div>
                 <Button onClick={handleSend} disabled={sending || !receiverAddress || !amount} className="w-full bg-gradient-to-r from-cyan-500 to-primary text-primary-foreground">
                   {sending ? 'Sending...' : 'Send & Earn Boost'}
                 </Button>
                 <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                   <Gift className="w-4 h-4 text-cyan-400" />
                   <p className="text-xs text-cyan-400">Each transfer earns you a <strong>20% mining boost</strong> for 3 days!</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-2">
                   <div className="p-3 rounded-lg bg-secondary/30 text-center">
                     <p className="text-xl font-bold text-foreground">5</p>
                     <p className="text-xs text-muted-foreground">Daily Limit</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/30 text-center">
                     <p className="text-xl font-bold text-cyan-400">20%</p>
                     <p className="text-xs text-muted-foreground">Boost/Send</p>
                   </div>
                 </div>
               </div>
             </TabsContent>
 
             <TabsContent value="history" className="mt-4">
               <div className="glass-card p-4">
                 <div className="flex items-center justify-between mb-3">
                   <h3 className="font-bold text-foreground text-sm">Your Transactions</h3>
                   <button onClick={fetchTransactions} className="text-xs text-primary flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
                 </div>
                 {loadingTx ? (
                   <div className="flex items-center justify-center py-8"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Zap className="w-6 h-6 text-primary" /></motion.div></div>
                 ) : transactions.length === 0 ? (
                   <div className="text-center py-8"><History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground text-sm">No transactions yet</p></div>
                 ) : (
                   <div className="space-y-2">
                     {transactions.map((tx) => {
                       const isSender = tx.sender_id === user.id;
                       return (
                         <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30">
                           <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSender ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                               {isSender ? <ArrowUpRight className="w-4 h-4 text-red-400" /> : <ArrowDownLeft className="w-4 h-4 text-green-400" />}
                             </div>
                             <div>
                               <p className="text-sm font-medium text-foreground">{isSender ? 'Sent' : 'Received'}</p>
                               <p className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">{isSender ? tx.receiver_address : tx.sender_address}</p>
                             </div>
                           </div>
                           <span className={`text-sm font-bold ${isSender ? 'text-red-400' : 'text-green-400'}`}>{isSender ? '-' : '+'}{tx.amount} ARX-P</span>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
             </TabsContent>
 
             <TabsContent value="explorer" className="mt-4">
               <div className="glass-card p-4">
                 <div className="flex items-center justify-between mb-3">
                   <h3 className="font-bold text-foreground text-sm">Public Transactions</h3>
                   <button onClick={fetchAllTransactions} className="text-xs text-primary flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
                 </div>
                 {loadingAllTx ? (
                   <div className="flex items-center justify-center py-8"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Zap className="w-6 h-6 text-primary" /></motion.div></div>
                 ) : allTransactions.length === 0 ? (
                   <div className="text-center py-8"><Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground text-sm">No public transactions</p></div>
                 ) : (
                   <div className="space-y-2 max-h-[400px] overflow-y-auto">
                     {allTransactions.map((tx, index) => (
                       <motion.div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Send className="w-4 h-4 text-primary" /></div>
                           <div className="text-xs text-muted-foreground">
                             <p className="font-mono truncate max-w-[80px]">{tx.hide_usernames ? '***' : tx.sender_address?.slice(0, 10) + '...'}</p>
                             <p>→</p>
                             <p className="font-mono truncate max-w-[80px]">{tx.hide_usernames ? '***' : tx.receiver_address?.slice(0, 10) + '...'}</p>
                           </div>
                         </div>
                         <span className="text-sm font-bold text-accent">{tx.hide_amount ? '***' : tx.amount} ARX-P</span>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </div>
             </TabsContent>
           </Tabs>
         </ScrollReveal>
 
         <ScrollReveal delay={0.25}>
           <div className="glass-card p-4 border border-primary/20">
             <h4 className="font-bold text-foreground mb-3 text-sm">How Nexus Works</h4>
             <div className="space-y-2 text-xs text-muted-foreground">
               <p>• Send 1-10 ARX-P to any Nexus UID</p>
               <p>• Earn a 20% mining boost for 3 days per transfer</p>
               <p>• Maximum 5 transfers per day</p>
               <p>• Each user pair can only transact once</p>
             </div>
           </div>
         </ScrollReveal>
       </main>
 
       <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
     </div>
   );
 };
 
 export default Nexus;