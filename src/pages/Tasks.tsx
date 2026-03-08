 import { useState, useEffect } from 'react';
 import { ArrowLeft, CheckCircle, Clock, ExternalLink, Gift, Target, Star, Zap, Sparkles, Flame } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 import { motion, AnimatePresence } from 'framer-motion';
 import { useAuth } from '@/contexts/AuthContext';
 import { usePoints } from '@/hooks/usePoints';
 import { useCheckin } from '@/hooks/useCheckin';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from '@/hooks/use-toast';
 import { Button } from '@/components/ui/button';
 import ResendBackground from '@/components/effects/ResendBackground';
 import ScrollReveal from '@/components/effects/ScrollReveal';
 import GlowCard from '@/components/effects/GlowCard';
 import AuthDialog from '@/components/auth/AuthDialog';
 
 interface Task {
   id: string;
   title: string;
   description: string | null;
   points_reward: number;
   external_url: string | null;
   task_type: string;
   is_active: boolean;
 }
 
 interface UserTask {
   id: string;
   task_id: string;
   status: string;
   points_awarded: number;
   completed_at: string | null;
 }
 
const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshPoints, triggerConfetti, addPoints } = usePoints();
  const { canCheckin, loading: checkinLoading, performCheckin, currentStreak, streakBoost } = useCheckin();
  const [showAuth, setShowAuth] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Map<string, UserTask>>(new Map());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('is_active', true)
          .order('points_reward', { ascending: false });

        if (!error && data) {
          setTasks(data);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUserTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('user_tasks')
          .select('*')
          .eq('user_id', user.id);

        if (!error && data) {
          const map = new Map<string, UserTask>();
          data.forEach((ut) => map.set(ut.task_id, ut));
          setUserTasks(map);
        }
      } catch (err) {
        console.error('Error fetching user tasks:', err);
      }
    };

    fetchUserTasks();
  }, [user]);

  const completeTask = async (task: Task) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const existing = userTasks.get(task.id);
    if (existing?.status === 'completed') {
      toast({ title: 'Already Completed', description: "You've already completed this task", variant: 'destructive' });
      return;
    }

    if (task.external_url) {
      window.open(task.external_url, '_blank');
    }

    setCompleting(task.id);
    try {
      // First check if task already completed (safer than upsert onConflict issues)
      const { data: existingTask } = await supabase
        .from('user_tasks')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('task_id', task.id)
        .maybeSingle();

      if (existingTask?.status === 'completed') {
        toast({ title: 'Already Completed', description: "You've already completed this task", variant: 'destructive' });
        setCompleting(null);
        return;
      }

      // Insert new task completion (or update if exists but not completed)
      let error;
      if (existingTask) {
        const { error: updateError } = await supabase
          .from('user_tasks')
          .update({
            status: 'completed',
            points_awarded: task.points_reward,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingTask.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_tasks')
          .insert({
            user_id: user.id,
            task_id: task.id,
            status: 'completed',
            points_awarded: task.points_reward,
            completed_at: new Date().toISOString(),
          });
        error = insertError;
      }

      if (error) throw error;

      const credited = await addPoints(task.points_reward, 'task');
      if (!credited.success) {
        throw new Error(credited.error || 'Failed to credit points');
      }

       setUserTasks((prev) => {
         const next = new Map(prev);
         next.set(task.id, {
           id: task.id,
           task_id: task.id,
           status: 'completed',
           points_awarded: task.points_reward,
           completed_at: new Date().toISOString(),
         });
         return next;
       });
 
       triggerConfetti();
       toast({
         title: 'Task Completed! 🎉',
         description: `You earned ${task.points_reward} ARX-P!`,
       });
 
       await refreshPoints();
     } catch (err: any) {
       toast({ title: 'Error', description: err.message, variant: 'destructive' });
     } finally {
       setCompleting(null);
     }
   };
 
   const getTaskIcon = (type: string) => {
     switch (type) {
       case 'social': return '📱';
       case 'daily': return '📅';
       case 'referral': return '👥';
       case 'special': return '⭐';
       default: return '📋';
     }
   };
 
   const completedCount = Array.from(userTasks.values()).filter(ut => ut.status === 'completed').length;
   const totalRewards = Array.from(userTasks.values()).reduce((sum, ut) => sum + (ut.points_awarded || 0), 0);
   const availableRewards = tasks.reduce((sum, t) => sum + t.points_reward, 0);
 
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
         <h1 className="font-bold text-foreground text-lg">Tasks</h1>
         <div className="w-10" />
       </header>
 
       <main className="relative z-10 px-4 py-6 space-y-6 max-w-lg mx-auto">
         {/* Hero Section */}
         <ScrollReveal>
           <div className="text-center mb-6">
             <motion.div
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4"
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
             >
               <Sparkles className="w-4 h-4 text-primary" />
               <span className="text-sm font-medium text-primary">Earn rewards</span>
             </motion.div>
             <h2 className="text-2xl font-bold text-foreground mb-2">Complete Tasks, Earn ARX-P</h2>
             <p className="text-muted-foreground text-sm">Up to {availableRewards.toLocaleString()} ARX-P available</p>
           </div>
         </ScrollReveal>
 
         {/* Stats */}
         <ScrollReveal delay={0.1}>
           <div className="grid grid-cols-2 gap-3">
             <GlowCard glowColor="green" className="p-4 text-center">
               <div className="flex items-center justify-center gap-2 mb-2">
                 <CheckCircle className="w-5 h-5 text-green-400" />
               </div>
               <p className="text-2xl font-bold text-foreground">{completedCount}/{tasks.length}</p>
               <p className="text-xs text-muted-foreground">Completed</p>
             </GlowCard>
             <GlowCard glowColor="accent" className="p-4 text-center">
               <div className="flex items-center justify-center gap-2 mb-2">
                 <Gift className="w-5 h-5 text-accent" />
               </div>
               <p className="text-2xl font-bold text-accent">{totalRewards}</p>
               <p className="text-xs text-muted-foreground">ARX-P Earned</p>
             </GlowCard>
           </div>
         </ScrollReveal>
 
          {/* Daily Check-in Card */}
          {user && (
            <ScrollReveal delay={0.12}>
              <GlowCard glowColor="accent" className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Daily Check-in</h3>
                      <p className="text-xs text-muted-foreground">
                        {currentStreak > 0 ? `🔥 ${currentStreak}-day streak • +${streakBoost}% mining boost` : 'Start your streak today!'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!canCheckin || checkingIn || checkinLoading}
                    onClick={async () => {
                      setCheckingIn(true);
                      await performCheckin();
                      setCheckingIn(false);
                    }}
                    className={canCheckin ? 'bg-primary text-primary-foreground' : 'bg-green-500/20 text-green-400'}
                  >
                    {checkingIn ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Clock className="w-4 h-4" />
                      </motion.div>
                    ) : canCheckin ? (
                      'Check In'
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {/* Streak progress */}
                <div className="flex gap-1">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < (currentStreak % 7 || (currentStreak > 0 ? 7 : 0))
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </GlowCard>
            </ScrollReveal>
          )}

          {/* Task List */}
          <ScrollReveal delay={0.15}>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Available Tasks</h2>
              </div>
 
             {loading ? (
               <div className="space-y-3">
                 {[1, 2, 3].map((i) => (
                   <motion.div 
                     key={i} 
                     className="h-24 rounded-xl bg-card/50 border border-border/30"
                     animate={{ opacity: [0.5, 1, 0.5] }}
                     transition={{ duration: 1.5, repeat: Infinity }}
                   />
                 ))}
               </div>
             ) : tasks.length === 0 ? (
               <div className="glass-card p-8 text-center">
                 <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                 <p className="text-foreground font-medium mb-1">No tasks available</p>
                 <p className="text-xs text-muted-foreground">Check back later for new tasks!</p>
               </div>
             ) : (
               <AnimatePresence>
                 {tasks.map((task, index) => {
                   const userTask = userTasks.get(task.id);
                   const isCompleted = userTask?.status === 'completed';
                   const isCompletingThis = completing === task.id;
 
                   return (
                     <motion.div
                       key={task.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: index * 0.05 }}
                       className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                         isCompleted 
                           ? 'bg-green-500/5 border-green-500/30' 
                           : 'bg-card/50 border-border/40 hover:border-primary/30 hover:bg-card/60'
                       }`}
                       whileHover={!isCompleted ? { scale: 1.01 } : {}}
                     >
                       <div className="flex items-start gap-3">
                         <div className="text-2xl mt-0.5">{getTaskIcon(task.task_type)}</div>
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-bold text-foreground truncate">{task.title}</h3>
                             {isCompleted && (
                               <motion.span 
                                 className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1"
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                               >
                                 <CheckCircle className="w-3 h-3" />
                                 Done
                               </motion.span>
                             )}
                           </div>
                           
                           {task.description && (
                             <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                           )}
                           
                           <div className="flex items-center gap-3">
                             <span className="text-xs font-bold text-accent flex items-center gap-1">
                               <Zap className="w-3 h-3" />
                               +{task.points_reward} ARX-P
                             </span>
                             {task.external_url && (
                               <span className="text-xs text-muted-foreground flex items-center gap-1">
                                 <ExternalLink className="w-3 h-3" />
                                 External
                               </span>
                             )}
                           </div>
                         </div>
 
                         <Button
                           size="sm"
                           onClick={() => completeTask(task)}
                           disabled={isCompleted || isCompletingThis}
                           className={isCompleted 
                             ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' 
                             : 'bg-primary text-primary-foreground hover:bg-primary/90'
                           }
                         >
                           {isCompletingThis ? (
                             <motion.div
                               animate={{ rotate: 360 }}
                               transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                             >
                               <Clock className="w-4 h-4" />
                             </motion.div>
                           ) : isCompleted ? (
                             <CheckCircle className="w-4 h-4" />
                           ) : (
                             'Claim'
                           )}
                         </Button>
                       </div>
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
             )}
           </div>
         </ScrollReveal>
 
         {/* Info */}
         <ScrollReveal delay={0.2}>
           <div className="glass-card p-4 border border-primary/20">
             <p className="text-xs text-muted-foreground text-center">
               Complete tasks to earn ARX-P points. Some tasks require external actions. 
               Points are awarded immediately upon completion.
             </p>
           </div>
         </ScrollReveal>
       </main>
 
       <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
     </div>
   );
 };
 
 export default Tasks;
