/**
 * Tasks.tsx — FIXED VERSION
 *
 * FIX BUG-04: Removed hardcoded YouTube/Video tasks that used localStorage.
 *             All tasks now come from the admin Task Manager in Supabase.
 *             Add your YouTube tasks via Admin → Task Manager with the correct URL.
 *
 * FIX BUG-11: Rewritten in mobile inline-style pattern (consistent with MobileMining,
 *             MobileArena etc.) instead of Tailwind className web-style.
 *
 * FIX BUG-16: External URL tasks now show a "I've Completed This" confirmation button
 *             AFTER opening the link, before awarding points. Prevents instant farming.
 */
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, ExternalLink, Gift, Target, Star, Zap, Flame, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useCheckin } from '@/hooks/useCheckin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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

const CSS = `
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{left:-100%}100%{left:200%}}
`;

function TaskTypeIcon(type: string) {
  const map: Record<string, string> = {
    social: '🐦', youtube: '▶️', daily: '📅',
    referral: '👥', special: '⭐', general: '📋',
  };
  return map[type] || '📋';
}

function TaskTypeColor(type: string) {
  const map: Record<string, string> = {
    social:   'hsl(207 90% 54%)',
    youtube:  'hsl(0 70% 55%)',
    daily:    'hsl(38 55% 52%)',
    referral: 'hsl(155 45% 50%)',
    special:  'hsl(255 50% 65%)',
    general:  'hsl(215 35% 62%)',
  };
  return map[type] || 'hsl(215 35% 62%)';
}

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshPoints, triggerConfetti, addPoints } = usePoints();
  const { canCheckin, loading: checkinLoading, performCheckin, currentStreak, streakBoost } = useCheckin();
  const [showAuth,       setShowAuth]       = useState(false);
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [userTasks,      setUserTasks]      = useState<Map<string, UserTask>>(new Map());
  const [loading,        setLoading]        = useState(true);
  const [completing,     setCompleting]     = useState<string | null>(null);
  const [checkingIn,     setCheckingIn]     = useState(false);
  // FIX BUG-16: Track which tasks are in "confirm" state (link opened, awaiting user confirm)
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('is_active', true)
          .order('points_reward', { ascending: false });
        if (!error && data) setTasks(data);
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
          .from('user_tasks').select('*').eq('user_id', user.id);
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

  // Step 1: Open external link and enter "confirm" state
  const initiateTask = (task: Task) => {
    if (!user) { setShowAuth(true); return; }
    const existing = userTasks.get(task.id);
    if (existing?.status === 'completed') return;

    if (task.external_url) {
      window.open(task.external_url, '_blank');
      // Enter confirm state — user must tap "I've Done This" to get points
      setPendingConfirm(task.id);
    } else {
      // No external URL — complete directly (e.g. daily tasks)
      confirmComplete(task);
    }
  };

  // Step 2: User confirms they completed the external task
  const confirmComplete = async (task: Task) => {
    if (!user) return;
    setPendingConfirm(null);
    setCompleting(task.id);

    try {
      const { data: existingTask } = await supabase
        .from('user_tasks').select('id, status')
        .eq('user_id', user.id).eq('task_id', task.id).maybeSingle();

      if (existingTask?.status === 'completed') {
        toast({ title: 'Already Completed', description: "You've already completed this task", variant: 'destructive' });
        setCompleting(null);
        return;
      }

      let error;
      if (existingTask) {
        const { error: e } = await supabase.from('user_tasks').update({
          status: 'completed', points_awarded: task.points_reward,
          completed_at: new Date().toISOString(),
        }).eq('id', existingTask.id);
        error = e;
      } else {
        const { error: e } = await supabase.from('user_tasks').insert({
          user_id: user.id, task_id: task.id, status: 'completed',
          points_awarded: task.points_reward, completed_at: new Date().toISOString(),
        });
        error = e;
      }

      if (error) throw error;

      const credited = await addPoints(task.points_reward, 'task');
      if (!credited.success) throw new Error(credited.error || 'Failed to credit points');

      setUserTasks((prev) => {
        const next = new Map(prev);
        next.set(task.id, {
          id: task.id, task_id: task.id, status: 'completed',
          points_awarded: task.points_reward, completed_at: new Date().toISOString(),
        });
        return next;
      });

      triggerConfetti();
      toast({ title: '🎉 Task Completed!', description: `+${task.points_reward.toLocaleString()} ARX-P added to your balance!` });
      await refreshPoints();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = Array.from(userTasks.values()).filter(ut => ut.status === 'completed').length;
  const totalRewards   = Array.from(userTasks.values()).reduce((s, ut) => s + (ut.points_awarded || 0), 0);
  const availableRewards = tasks.reduce((s, t) => s + t.points_reward, 0);

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'52px 20px 0'}}>
        <button onClick={()=>navigate('/')} style={{width:40,height:40,borderRadius:14,
          background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <h1 style={{fontSize:18,fontWeight:700,color:'hsl(215 20% 93%)'}}>Tasks</h1>
        <div style={{width:40}}/>
      </div>

      <div style={{padding:'16px 20px 0'}}>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {[
            {icon:'✓', label:'Completed', value:`${completedCount}/${tasks.length}`, col:'hsl(155 45% 50%)'},
            {icon:'⚡',label:'ARX-P Earned', value:totalRewards.toLocaleString(), col:'hsl(38 55% 52%)'},
          ].map((s,i)=>(
            <div key={i} style={{borderRadius:18,padding:'14px',
              background:'hsl(215 26% 10%)',border:'1px solid hsl(215 22% 16%)',textAlign:'center'}}>
              <p style={{fontSize:22,fontWeight:900,color:s.col}}>{s.value}</p>
              <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:3}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Daily Check-in */}
        {user && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
            style={{borderRadius:20,padding:'16px',marginBottom:14,
              background:'linear-gradient(135deg,hsl(38 55% 52%/0.1),hsl(38 55% 52%/0.05))',
              border:'1px solid hsl(38 55% 52%/0.25)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:42,height:42,borderRadius:14,
                  background:'hsl(38 55% 52%/0.15)',border:'1px solid hsl(38 55% 52%/0.25)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                  🔥
                </div>
                <div>
                  <p style={{fontSize:14,fontWeight:700,color:'hsl(215 18% 90%)'}}>Daily Check-in</p>
                  <p style={{fontSize:11,color:'hsl(215 14% 42%)',marginTop:2}}>
                    {currentStreak > 0
                      ? `🔥 ${currentStreak}-day streak · +${streakBoost}% mining boost`
                      : 'Start your streak today!'}
                  </p>
                </div>
              </div>
              <motion.button whileTap={{scale:0.95}}
                onClick={async()=>{setCheckingIn(true);await performCheckin();setCheckingIn(false);}}
                disabled={!canCheckin||checkingIn||checkinLoading}
                style={{padding:'9px 16px',borderRadius:14,border:'none',cursor:canCheckin?'pointer':'default',
                  fontFamily:"'Creato Display',-apple-system,sans-serif",fontSize:12,fontWeight:700,
                  background:canCheckin?'hsl(38 55% 52%)':'hsl(215 22% 12%)',
                  color:canCheckin?'white':'hsl(215 18% 38%)',outline:'none'}}>
                {checkingIn ? '...' : canCheckin ? 'Check In' : '✓ Done'}
              </motion.button>
            </div>
            {/* Streak dots */}
            <div style={{display:'flex',gap:5,marginTop:12}}>
              {Array.from({length:7},(_,i)=>(
                <div key={i} style={{flex:1,height:4,borderRadius:2,
                  background:i<(currentStreak%7||(currentStreak>0?7:0))
                    ?'hsl(38 55% 52%)':'hsl(215 22% 16%)'}}/>
              ))}
            </div>
          </motion.div>
        )}

        {/* Section header */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <Target size={16} color="hsl(215 35% 62%)"/>
          <p style={{fontSize:13,fontWeight:700,color:'hsl(215 18% 65%)',textTransform:'uppercase',letterSpacing:'0.1em'}}>
            Available Tasks
          </p>
          {availableRewards > 0 && (
            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
              background:'hsl(215 35% 62%/0.1)',color:'hsl(215 35% 62%)'}}>
              Up to {availableRewards.toLocaleString()} ARX-P
            </span>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[1,2,3].map(i=>(
              <div key={i} style={{height:80,borderRadius:18,background:'hsl(215 22% 10%)',
                border:'1px solid hsl(215 20% 14%)',animation:'pulse 1.5s ease-in-out infinite',opacity:1-i*0.2}}/>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div style={{borderRadius:20,padding:'40px 20px',textAlign:'center',
            background:'hsl(215 22% 8%)',border:'1px solid hsl(215 20% 12%)'}}>
            <div style={{fontSize:40,marginBottom:12}}>🎯</div>
            <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 45%)',marginBottom:6}}>No tasks available</p>
            <p style={{fontSize:12,color:'hsl(215 14% 30%)'}}>New tasks will appear here when added by the admin</p>
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map((task, index) => {
              const userTask    = userTasks.get(task.id);
              const isCompleted = userTask?.status === 'completed';
              const isCompleting = completing === task.id;
              const isPending   = pendingConfirm === task.id;
              const col         = TaskTypeColor(task.task_type);

              return (
                <motion.div key={task.id}
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                  transition={{delay:index*0.04}}
                  style={{marginBottom:10}}>

                  {/* Main task card */}
                  <div style={{borderRadius:18,padding:'14px 16px',
                    background:isCompleted?'hsl(155 45% 43%/0.06)':'hsl(215 26% 10%)',
                    border:`1.5px solid ${isCompleted?'hsl(155 45% 43%/0.25)':isPending?`${col}55`:'hsl(215 22% 16%)'}`,
                    transition:'all 0.2s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      {/* Icon */}
                      <div style={{width:44,height:44,borderRadius:14,flexShrink:0,
                        background:isCompleted?'hsl(155 45% 43%/0.12)':`${col}15`,
                        border:`1px solid ${isCompleted?'hsl(155 45% 43%/0.2)':`${col}30`}`,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                        {isCompleted ? '✓' : TaskTypeIcon(task.task_type)}
                      </div>

                      {/* Text */}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:700,color:isCompleted?'hsl(155 45% 55%)':'hsl(215 18% 88%)',
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p style={{fontSize:11,color:'hsl(215 14% 40%)',marginBottom:4,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {task.description}
                          </p>
                        )}
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:isCompleted?'hsl(155 45% 50%)':col,
                            display:'flex',alignItems:'center',gap:3}}>
                            <Zap size={10}/> +{task.points_reward.toLocaleString()} ARX-P
                          </span>
                          {task.external_url && (
                            <span style={{fontSize:10,color:'hsl(215 14% 36%)',display:'flex',alignItems:'center',gap:3}}>
                              <ExternalLink size={10}/> External
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action button */}
                      {isCompleted ? (
                        <div style={{width:36,height:36,borderRadius:12,flexShrink:0,
                          background:'hsl(155 45% 43%/0.12)',border:'1px solid hsl(155 45% 43%/0.25)',
                          display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <CheckCircle size={16} color="hsl(155 45% 55%)"/>
                        </div>
                      ) : isCompleting ? (
                        <div style={{width:36,height:36,borderRadius:12,flexShrink:0,
                          background:'hsl(215 26% 12%)',border:'1px solid hsl(215 22% 18%)',
                          display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{width:14,height:14,borderRadius:'50%',
                            border:'2px solid hsl(215 35% 62%/0.2)',borderTopColor:'hsl(215 35% 62%)',
                            animation:'spin 0.8s linear infinite'}}/>
                        </div>
                      ) : (
                        <motion.button whileTap={{scale:0.94}}
                          onClick={()=>initiateTask(task)}
                          style={{padding:'9px 14px',borderRadius:14,border:'none',cursor:'pointer',
                            fontFamily:"'Creato Display',-apple-system,sans-serif",
                            fontSize:12,fontWeight:700,outline:'none',flexShrink:0,
                            background:`linear-gradient(135deg,${col},${col}99)`,
                            color:'white',
                            boxShadow:`0 4px 12px ${col}40`}}>
                          {task.external_url ? 'Go →' : 'Claim'}
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* FIX BUG-16: Confirm panel appears AFTER opening external link */}
                  <AnimatePresence>
                    {isPending && (
                      <motion.div
                        initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                        style={{overflow:'hidden'}}>
                        <div style={{marginTop:6,borderRadius:16,padding:'14px 16px',
                          background:`${col}10`,border:`1.5px solid ${col}40`,
                          display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                          <div>
                            <p style={{fontSize:12,fontWeight:700,color:'hsl(215 18% 80%)'}}>
                              Did you complete this task?
                            </p>
                            <p style={{fontSize:10,color:'hsl(215 14% 40%)',marginTop:2}}>
                              Points are awarded on confirmation
                            </p>
                          </div>
                          <div style={{display:'flex',gap:8,flexShrink:0}}>
                            <button onClick={()=>setPendingConfirm(null)}
                              style={{padding:'8px 12px',borderRadius:12,border:'1px solid hsl(215 22% 20%)',
                                background:'hsl(215 22% 12%)',color:'hsl(215 18% 45%)',
                                fontSize:12,fontWeight:600,cursor:'pointer',outline:'none'}}>
                              Not yet
                            </button>
                            <motion.button whileTap={{scale:0.95}}
                              onClick={()=>confirmComplete(task)}
                              style={{padding:'8px 14px',borderRadius:12,border:'none',
                                background:`linear-gradient(135deg,${col},${col}99)`,
                                color:'white',fontSize:12,fontWeight:700,cursor:'pointer',outline:'none',
                                boxShadow:`0 4px 12px ${col}40`}}>
                              ✓ Done!
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}
