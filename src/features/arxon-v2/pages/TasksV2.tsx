import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, Check, Flame, ListChecks, Star, Users, Youtube,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useCheckin } from '@/hooks/useCheckin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import AuthDialog from '@/components/auth/AuthDialog';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { neon } from '../design/neonTokens';
import { V2Page } from '../design/Kit';
import { MineLoad } from '../components/MineLoad';
import {
  Body,
  EmptyCopy,
  FrostPanel,
  GlassSheet,
  pc,
  ProfileHead,
  SegmentTabs,
  TokenRow,
} from '../design/ProfileChrome';

type TaskTab = 'new' | 'todo' | 'done';

const NEW_MS = 7 * 24 * 60 * 60 * 1000;
const LIST_CAP = 5;

interface Task {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  external_url: string | null;
  task_type: string;
  is_active: boolean;
  created_at: string;
}

interface UserTask {
  id: string;
  task_id: string;
  status: string;
  points_awarded: number;
  completed_at: string | null;
}

function typeIcon(type: string) {
  if (type === 'social') return <Users size={14} />;
  if (type === 'youtube') return <Youtube size={14} />;
  if (type === 'daily') return <CalendarDays size={14} />;
  if (type === 'referral') return <Users size={14} />;
  if (type === 'special') return <Star size={14} />;
  return <ListChecks size={14} />;
}

function isFresh(task: Task) {
  const t = new Date(task.created_at).getTime();
  return Number.isFinite(t) && Date.now() - t < NEW_MS;
}

function Chip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 12,
        border: 'none',
        background: pc.cream,
        color: pc.ink,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: neon.font,
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function TasksV2() {
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
  const [tab, setTab] = useState<TaskTab>('todo');
  const [showAll, setShowAll] = useState(false);
  const tabReady = useRef(false);

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
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

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);
  useEffect(() => {
    void fetchUserTasks();
  }, [fetchUserTasks]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCheckin();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshCheckin]);

  const pull = usePullRefresh(async () => {
    await Promise.all([fetchTasks(), fetchUserTasks(), refreshPoints(), refreshCheckin()]);
  }, { threshold: 28 });

  const initiateTask = (task: Task) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (userTasks.get(task.id)?.status === 'completed') return;
    if (task.external_url) {
      window.open(task.external_url, '_blank');
      setPendingConfirm(task.id);
    } else {
      void confirmComplete(task);
    }
  };

  const confirmComplete = async (task: Task) => {
    if (!user) return;
    setPendingConfirm(null);
    setCompleting(task.id);
    try {
      if (userTasks.get(task.id)?.status === 'completed') {
        toast({ title: 'Already completed', description: 'This task is already done.', variant: 'destructive' });
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
          id: task.id,
          task_id: task.id,
          status: 'completed',
          points_awarded: task.points_reward,
          completed_at: new Date().toISOString(),
        });
        return next;
      });
      if (awarded > 0) {
        triggerConfetti();
        window.dispatchEvent(new CustomEvent('arxon-tour-task-claimed'));
        toast({ title: 'Task completed', description: `+${awarded.toLocaleString()} ARX-P` });
      } else {
        toast({ title: 'Already completed', description: 'Points were already credited for this task.' });
      }
    } catch (err: unknown) {
      toast(publicErrorToast(err, 'claim'));
    } finally {
      setCompleting(null);
    }
  };

  const totalRewards = Array.from(userTasks.values()).reduce((s, ut) => s + (ut.points_awarded || 0), 0);
  const streakDots = currentStreak % 7 || (currentStreak > 0 ? 7 : 0);

  const { fresh, todo, done } = useMemo(() => {
    const open: Task[] = [];
    const finished: Task[] = [];
    for (const task of tasks) {
      if (userTasks.get(task.id)?.status === 'completed') finished.push(task);
      else open.push(task);
    }
    return {
      fresh: open.filter(isFresh),
      todo: open.filter((t) => !isFresh(t)),
      done: finished,
    };
  }, [tasks, userTasks]);

  useEffect(() => {
    if (loading || tabReady.current) return;
    tabReady.current = true;
    if (todo.length === 0 && fresh.length > 0) setTab('new');
  }, [loading, todo.length, fresh.length]);

  const shown = tab === 'new' ? fresh : tab === 'done' ? done : todo;
  const visible = showAll ? shown : shown.slice(0, LIST_CAP);
  const hiddenCount = Math.max(0, shown.length - visible.length);
  const sheetTitle = tab === 'new' ? 'Added this week' : tab === 'done' ? 'Completed' : 'Still open';
  const emptyTitle = tab === 'new' ? 'Nothing new' : tab === 'done' ? 'None done yet' : 'Caught up';
  const emptyBody =
    tab === 'new'
      ? 'New tasks from the last 7 days will land here.'
      : tab === 'done'
        ? 'Finished tasks move here so the open list stays short.'
        : 'No older open tasks. Check New for anything just added.';

  const handleCheckin = async () => {
    setCheckingIn(true);
    await performCheckin();
    setCheckingIn(false);
  };

  return (
    <V2Page pull={pull}>
      <ProfileHead
        title="Tasks"
        subtitle="Complete work. Earn ARX-P."
      />
      <div style={{ padding: '0 16px 12px' }}>
        <MineLoad waiting={loading} extra={pull.busy} frost kind="card" radius={22}>
          <FrostPanel>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
              Earned from tasks
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 32,
                fontWeight: 750,
                letterSpacing: '-0.8px',
                color: pc.ink,
                fontFamily: neon.font,
                lineHeight: 1,
              }}
            >
              {totalRewards.toLocaleString()}
              <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 650, letterSpacing: 0 }}>ARX-P</span>
            </p>
            <Body ink>
              {todo.length} to do · {fresh.length} new · {done.length} done
            </Body>
          </FrostPanel>
        </MineLoad>

        {user ? (
          <div data-tour="tasks-claim">
            <MineLoad extra={pull.busy} frost kind="card" radius={22}>
              <FrostPanel>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
                  Daily check-in
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 22,
                    fontWeight: 750,
                    letterSpacing: '-0.4px',
                    color: pc.ink,
                    fontFamily: neon.font,
                    lineHeight: 1.15,
                  }}
                >
                  {currentStreak > 0 ? `${currentStreak}-day streak` : 'Start your streak'}
                </p>
                <Body ink>
                  {currentStreak > 0
                    ? `+${streakBoost}% mining boost is on.`
                    : 'Check in every day to raise your mining rate.'}
                </Body>
                <div style={{ display: 'flex', gap: 5, margin: '14px 0 0' }}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: i < streakDots ? pc.ink : 'rgba(12,16,24,0.16)',
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCheckin()}
                  disabled={!canCheckin || checkingIn || checkinLoading}
                  style={{
                    marginTop: 14,
                    width: '100%',
                    height: 40,
                    borderRadius: 12,
                    border: 'none',
                    background: pc.ink,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: neon.font,
                    cursor: canCheckin && !checkingIn ? 'pointer' : 'default',
                    opacity: canCheckin && !checkingIn ? 1 : 0.45,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Flame size={14} />
                  {checkingIn ? 'Checking in…' : canCheckin ? 'Check in' : 'Done today'}
                </button>
              </FrostPanel>
            </MineLoad>
          </div>
        ) : null}

        <div data-tour="tasks-list">
        <SegmentTabs
          tabs={[
            { id: 'todo' as TaskTab, label: `To do${todo.length ? ` ${todo.length}` : ''}` },
            { id: 'new' as TaskTab, label: `New${fresh.length ? ` ${fresh.length}` : ''}` },
            { id: 'done' as TaskTab, label: `Done${done.length ? ` ${done.length}` : ''}` },
          ]}
          active={tab}
          onChange={(id) => {
            setTab(id);
            setShowAll(false);
          }}
        />

        <MineLoad waiting={loading} extra={pull.busy} kind="rows" rowCount={5} radius={22}>
          {shown.length === 0 && !loading ? (
            <GlassSheet>
              <EmptyCopy
                title={tasks.length === 0 ? 'No tasks yet' : emptyTitle}
                body={tasks.length === 0 ? 'New tasks will show here when the team adds them.' : emptyBody}
              />
            </GlassSheet>
          ) : (
            <GlassSheet title={sheetTitle}>
              {visible.map((task) => {
                const isCompleted = userTasks.get(task.id)?.status === 'completed';
                const isCompleting = completing === task.id;
                const isPending = pendingConfirm === task.id;
                return (
                  <div key={task.id}>
                    <TokenRow
                      wrap
                      icon={isCompleted ? <Check size={14} /> : typeIcon(task.task_type)}
                      glyphBg={isCompleted ? pc.good : pc.glyph}
                      title={task.title}
                      sub={
                        <>
                          +{task.points_reward.toLocaleString()} ARX-P
                          {task.description ? ` · ${task.description}` : ''}
                          {task.external_url ? ' · External' : ''}
                        </>
                      }
                      onClick={isCompleted || isCompleting ? undefined : () => initiateTask(task)}
                      trailing={
                        isCompleted ? (
                          <Check size={16} color={pc.good} />
                        ) : isCompleting ? (
                          <span style={{ fontSize: 11, fontWeight: 650, color: pc.soft, fontFamily: neon.font }}>
                            Claiming…
                          </span>
                        ) : (
                          <Chip
                            label={task.external_url ? 'Go' : 'Claim'}
                            onClick={() => initiateTask(task)}
                          />
                        )
                      }
                    />
                    {isPending ? (
                      <div style={{ padding: '4px 0 12px' }}>
                        <Body>Did you finish this? Points credit when you confirm.</Body>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            type="button"
                            onClick={() => setPendingConfirm(null)}
                            style={{
                              flex: 1, height: 40, borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.14)',
                              background: 'transparent', color: '#fff',
                              fontSize: 13, fontWeight: 700, fontFamily: neon.font, cursor: 'pointer',
                            }}
                          >
                            Not yet
                          </button>
                          <button
                            type="button"
                            onClick={() => void confirmComplete(task)}
                            style={{
                              flex: 1, height: 40, borderRadius: 12, border: 'none',
                              background: pc.cream, color: pc.ink,
                              fontSize: 13, fontWeight: 700, fontFamily: neon.font, cursor: 'pointer',
                            }}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {shown.length > LIST_CAP ? (
                <TokenRow
                  title={showAll ? 'See less' : 'See more'}
                  sub={showAll ? 'Show the first 5' : `${hiddenCount} more in this list`}
                  onClick={() => setShowAll((v) => !v)}
                />
              ) : null}
            </GlassSheet>
          )}
        </MineLoad>
        </div>
      </div>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </V2Page>
  );
}
