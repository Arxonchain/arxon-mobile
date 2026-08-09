import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, ExternalLink, Zap, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useCheckin } from '@/hooks/useCheckin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AuthDialog from '@/components/auth/AuthDialog';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/mobile/PullToRefreshIndicator';
import {
  V2Page, V2Header, V2HeroCard, V2Card, V2SectionHeader,
  V2Button, V2ButtonGhost, V2Eyebrow, V2StatGrid, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

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

function taskTypeIcon(type: string) {
  const map: Record<string, string> = {
    social: '🐦', youtube: '▶️', daily: '📅',
    referral: '👥', special: '⭐', general: '📋',
  };
  return map[type] || '📋';
}

function taskTypeColor(type: string) {
  const map: Record<string, string> = {
    social: v2.accent.cyan, youtube: v2.accent.danger, daily: v2.accent.gold,
    referral: v2.accent.mining, special: v2.accent.purple, general: v2.brand.steel,
  };
  return map[type] || v2.brand.steel;
}

export default function TasksV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshPoints, triggerConfetti } = usePoints();
  const { canCheckin, loading: checkinLoading, performCheckin, currentStreak, streakBoost, refreshCheckin } = useCheckin();
  const [showAuth, setShowAuth] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Map<string, UserTask>>(new Map());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks').select('*').eq('is_active', true)
        .order('created_at', { ascending: false })
        .order('points_reward', { ascending: false });
      if (!error && data) setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserTasks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('user_tasks').select('*').eq('user_id', user.id);
      if (!error && data) {
        const map = new Map<string, UserTask>();
        data.forEach((ut) => map.set(ut.task_id, ut));
        setUserTasks(map);
      }
    } catch (err) {
      console.error('Error fetching user tasks:', err);
    }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchUserTasks(); }, [fetchUserTasks]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCheckin();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshCheckin]);

  const ptr = usePullToRefresh(async () => {
    await Promise.all([fetchTasks(), fetchUserTasks(), refreshPoints()]);
  });

  const initiateTask = (task: Task) => {
    if (!user) { setShowAuth(true); return; }
    if (userTasks.get(task.id)?.status === 'completed') return;
    if (task.external_url) {
      window.open(task.external_url, '_blank');
      setPendingConfirm(task.id);
    } else {
      confirmComplete(task);
    }
  };

  const confirmComplete = async (task: Task) => {
    if (!user) return;
    setPendingConfirm(null);
    setCompleting(task.id);
    try {
      if (userTasks.get(task.id)?.status === 'completed') {
        toast({ title: 'Already Completed', description: "You've already completed this task", variant: 'destructive' });
        return;
      }
      const { data, error } = await supabase.rpc('complete_task_and_award_points' as any, { p_task_id: task.id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to credit points');

      const awarded = Math.ceil(Number(data?.points ?? 0));
      await refreshPoints();
      setUserTasks((prev) => {
        const next = new Map(prev);
        next.set(task.id, {
          id: task.id, task_id: task.id, status: 'completed',
          points_awarded: task.points_reward, completed_at: new Date().toISOString(),
        });
        return next;
      });
      if (awarded > 0) {
        triggerConfetti();
        toast({ title: '🎉 Task Completed!', description: `+${awarded.toLocaleString()} ARX-P added to your balance!` });
      } else {
        toast({ title: 'Already Completed', description: 'Points were already credited for this task' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = Array.from(userTasks.values()).filter((ut) => ut.status === 'completed').length;
  const totalRewards = Array.from(userTasks.values()).reduce((s, ut) => s + (ut.points_awarded || 0), 0);
  const availableRewards = tasks.reduce((s, t) => s + t.points_reward, 0);

  const handleCheckin = async () => {
    setCheckingIn(true);
    await performCheckin();
    setCheckingIn(false);
  };

  return (
    <V2Page
      style={{ minHeight: '100vh', overflowY: 'auto', position: 'relative' }}
    >
      <div
        ref={ptr.scrollRef}
        onTouchStart={ptr.onTouchStart}
        onTouchMove={ptr.onTouchMove}
        onTouchEnd={ptr.onTouchEnd}
        style={{ position: 'relative' }}
      >
        <PullToRefreshIndicator pullDistance={ptr.pullDistance} isRefreshing={ptr.isRefreshing} />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{
            transform: `translateY(${ptr.isRefreshing ? 60 : ptr.pullDistance * 0.7}px)`,
            transition: ptr.pullDistance === 0 && !ptr.isRefreshing ? 'transform 0.2s ease' : 'none',
          }}
        >
          <V2Header eyebrow="Rewards" title="Tasks" subtitle="Complete & earn ARX-P" onBack={() => navigate('/')} />

          <div style={{ padding: '0 16px 0' }}>
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <V2Card accent={v2.accent.mining} padding="16px 18px">
                <V2StatGrid stats={[
                  { label: 'Completed', value: `${completedCount}/${tasks.length}`, accent: v2.accent.mining },
                  { label: 'ARX-P Earned', value: totalRewards.toLocaleString(), accent: v2.accent.gold },
                ]} />
              </V2Card>
            </motion.div>

            {user && (
              <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
                <V2HeroCard
                  eyebrow="Daily Check-in"
                  title={currentStreak > 0 ? `${currentStreak}-Day Streak` : 'Start Your Streak'}
                  subtitle={
                    currentStreak > 0
                      ? `+${streakBoost}% mining boost active`
                      : 'Check in daily to boost your mining rate'
                  }
                  cta={checkingIn ? 'Checking…' : canCheckin ? 'Check In' : '✓ Done Today'}
                  onCta={canCheckin && !checkingIn && !checkinLoading ? handleCheckin : undefined}
                  accent={v2.accent.gold}
                  gradient={`linear-gradient(135deg, hsl(38 55% 22%), hsl(38 45% 14%), hsl(225 35% 10%))`}
                  icon={<Flame size={10} />}
                  compact
                />
                <div style={{ display: 'flex', gap: 5, marginTop: 10, padding: '0 4px' }}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i < (currentStreak % 7 || (currentStreak > 0 ? 7 : 0))
                          ? v2.accent.gold : v2.brand.border,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <V2SectionHeader
                title="Available Tasks"
                badge={availableRewards > 0 ? `Up to ${availableRewards.toLocaleString()} ARX-P` : undefined}
              />
            </motion.div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 80, borderRadius: v2.radius.lg, background: v2.brand.raised, opacity: 1 - i * 0.2 }} />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <V2Card padding="40px 20px" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: v2.brand.mutedSoft, marginBottom: 6 }}>No tasks available</p>
                <p style={{ fontSize: 12, color: v2.brand.muted }}>New tasks will appear here when added by the admin</p>
              </V2Card>
            ) : (
              <AnimatePresence>
                {tasks.map((task, index) => {
                  const userTask = userTasks.get(task.id);
                  const isCompleted = userTask?.status === 'completed';
                  const isCompleting = completing === task.id;
                  const isPending = pendingConfirm === task.id;
                  const col = taskTypeColor(task.task_type);

                  return (
                    <motion.div
                      key={task.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: index * 0.04 }}
                      style={{ marginBottom: 10 }}
                    >
                      <V2Card
                        accent={isCompleted ? v2.accent.success : col}
                        padding="14px 16px"
                        style={isPending ? { boxShadow: v2.shadow(col, 0.18) } : undefined}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: v2.radius.sm, flexShrink: 0,
                            background: isCompleted ? `${v2.accent.success}18` : `${col}15`,
                            border: `1px solid ${isCompleted ? `${v2.accent.success}33` : `${col}30`}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                          }}>
                            {isCompleted ? '✓' : taskTypeIcon(task.task_type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 13, fontWeight: 700, margin: 0,
                              color: isCompleted ? v2.accent.success : v2.brand.steelBright,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p style={{ fontSize: 11, color: v2.brand.muted, margin: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: isCompleted ? v2.accent.mining : col, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Zap size={10} /> +{task.points_reward.toLocaleString()} ARX-P
                              </span>
                              {task.external_url && (
                                <span style={{ fontSize: 10, color: v2.brand.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <ExternalLink size={10} /> External
                                </span>
                              )}
                            </div>
                          </div>
                          {isCompleted ? (
                            <CheckCircle size={20} color={v2.accent.success} style={{ flexShrink: 0 }} />
                          ) : isCompleting ? (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${v2.brand.steel}33`, borderTopColor: v2.brand.steel, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                          ) : (
                            <V2Button size="sm" accent={col} onClick={() => initiateTask(task)} style={{ flexShrink: 0, padding: '9px 14px' }}>
                              {task.external_url ? 'Go' : 'Claim'}
                            </V2Button>
                          )}
                        </div>
                      </V2Card>

                      <AnimatePresence>
                        {isPending && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <V2Card accent={col} padding="14px 16px" style={{ marginTop: 6 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: v2.brand.steelLight, margin: '0 0 4px' }}>
                                Did you complete this task?
                              </p>
                              <p style={{ fontSize: 10, color: v2.brand.muted, margin: '0 0 12px' }}>
                                Points are awarded on confirmation
                              </p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <V2ButtonGhost onClick={() => setPendingConfirm(null)}>Not yet</V2ButtonGhost>
                                <V2Button size="sm" accent={col} onClick={() => confirmComplete(task)}>Done!</V2Button>
                              </div>
                            </V2Card>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </V2Page>
  );
}
