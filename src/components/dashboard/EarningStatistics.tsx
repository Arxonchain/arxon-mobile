import { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheGet, cacheSet } from "@/lib/localCache";

interface DayEarning {
  day: string;
  date: string;
  mining: number;
  tasks: number;
  social: number;
  checkin: number;
}

const earningsCacheKey = (userId: string) => `arxon:earnings_stats:v1:${userId}`;

const EarningStatistics = memo(() => {
  const { user } = useAuth();
  const [earningData, setEarningData] = useState<DayEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hydratedRef = useRef(false);

  const fetchEarnings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const days: DayEarning[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        days.push({
          day: dayNames[date.getDay()],
          date: dateStr,
          mining: 0,
          tasks: 0,
          social: 0,
          checkin: 0
        });
      }

      const startDate = days[0].date;
      const endDate = days[6].date + 'T23:59:59';

      // Parallel fetch all data
      const [miningRes, checkinRes, taskRes, socialRes] = await Promise.all([
        supabase
          .from('mining_sessions')
          .select('started_at, arx_mined')
          .eq('user_id', user.id)
          .gte('started_at', startDate)
          .lte('started_at', endDate),
        supabase
          .from('daily_checkins')
          .select('checkin_date, points_awarded')
          .eq('user_id', user.id)
          .gte('checkin_date', startDate)
          .lte('checkin_date', endDate),
        supabase
          .from('user_tasks')
          .select('completed_at, points_awarded')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', startDate)
          .lte('completed_at', endDate),
        supabase
          .from('social_submissions')
          .select('reviewed_at, points_awarded')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .gte('reviewed_at', startDate)
          .lte('reviewed_at', endDate)
      ]);

      // Aggregate by day
      miningRes.data?.forEach(session => {
        const sessionDate = session.started_at.split('T')[0];
        const dayEntry = days.find(d => d.date === sessionDate);
        if (dayEntry) {
          // Cap each session's arx_mined at 480 for display
          dayEntry.mining += Math.min(Number(session.arx_mined) || 0, 480);
        }
      });

      checkinRes.data?.forEach(checkin => {
        const dayEntry = days.find(d => d.date === checkin.checkin_date);
        if (dayEntry) {
          dayEntry.checkin += Number(checkin.points_awarded) || 0;
        }
      });

      taskRes.data?.forEach(task => {
        if (task.completed_at) {
          const taskDate = task.completed_at.split('T')[0];
          const dayEntry = days.find(d => d.date === taskDate);
          if (dayEntry) {
            dayEntry.tasks += Number(task.points_awarded) || 0;
          }
        }
      });

      socialRes.data?.forEach(submission => {
        if (submission.reviewed_at) {
          const subDate = submission.reviewed_at.split('T')[0];
          const dayEntry = days.find(d => d.date === subDate);
          if (dayEntry) {
            dayEntry.social += Number(submission.points_awarded) || 0;
          }
        }
      });

      setEarningData(days);
      cacheSet(earningsCacheKey(user.id), days);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Debounced fetch for real-time updates
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchEarnings();
    }, 2000); // 2 second debounce for real-time updates
  }, [fetchEarnings]);

  // Initial fetch with cache hydration
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Hydrate from cache instantly
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const cached = cacheGet<DayEarning[]>(earningsCacheKey(user.id), { maxAgeMs: 5 * 60_000 });
      if (cached?.data && cached.data.length > 0) {
        setEarningData(cached.data);
        setLoading(false);
      }
    }

    // Background refresh
    fetchEarnings();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchEarnings, user]);

  // Single consolidated real-time subscription with debounce
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('earnings-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mining_sessions',
        filter: `user_id=eq.${user.id}`
      }, debouncedFetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_checkins',
        filter: `user_id=eq.${user.id}`
      }, debouncedFetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_tasks',
        filter: `user_id=eq.${user.id}`
      }, debouncedFetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_submissions',
        filter: `user_id=eq.${user.id}`
      }, debouncedFetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, debouncedFetch]);

  // Memoize computed values
  const { totalMining, totalTasks, totalSocial, chartData } = useMemo(() => {
    const mining = earningData.reduce((sum, d) => sum + d.mining, 0);
    const tasks = earningData.reduce((sum, d) => sum + d.tasks + d.checkin, 0);
    const social = earningData.reduce((sum, d) => sum + d.social, 0);
    const data = earningData.map(d => ({
      day: d.day,
      mining: d.mining,
      activities: d.tasks + d.checkin + d.social
    }));
    return { totalMining: mining, totalTasks: tasks, totalSocial: social, chartData: data };
  }, [earningData]);

  if (loading) {
    return (
      <div className="glass-card p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-1" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  return (
    <div className="glass-card p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4">
        <div>
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground">Earning statistics</h3>
          <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Your revenue graph based on activity (last 7 days)</p>
        </div>
        <div className="flex gap-3 sm:gap-4 lg:gap-6">
          <div>
            <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground">Mining</p>
            <p className="text-xs sm:text-sm lg:text-lg font-bold text-primary">{totalMining.toLocaleString()} ARX-P</p>
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground">Tasks & Social</p>
            <p className="text-xs sm:text-sm lg:text-lg font-bold text-accent">{(totalTasks + totalSocial).toLocaleString()} ARX-P</p>
          </div>
        </div>
      </div>

      <div className="h-36 sm:h-44 md:h-52 lg:h-64 w-full -ml-1 sm:-ml-2 lg:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="miningGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="activitiesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 9 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 9 }}
              width={30}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(222 47% 11%)', 
                border: '1px solid hsl(217 33% 17%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)',
                fontSize: '11px',
                padding: '6px 10px'
              }}
              labelStyle={{ color: 'hsl(215 20% 65%)' }}
              formatter={(value: number) => [`${value} ARX-P`, undefined]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '8px', fontSize: '10px' }}
              formatter={(value) => <span className="text-muted-foreground text-[10px] sm:text-xs lg:text-sm">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="mining"
              name="Mining"
              stroke="hsl(217 91% 60%)"
              strokeWidth={1.5}
              fill="url(#miningGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="activities"
              name="Activities"
              stroke="hsl(142 76% 36%)"
              strokeWidth={1.5}
              fill="url(#activitiesGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

EarningStatistics.displayName = "EarningStatistics";

export default EarningStatistics;
