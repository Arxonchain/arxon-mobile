// Admin Dashboard - centralized stats with tooltips
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, Coins, Server, Clock, CheckCircle, Loader2, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, startOfHour, eachHourOfInterval } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { useAdminStats, formatNumber } from "@/hooks/useAdminStats";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [isExporting, setIsExporting] = useState(false);
  
  // Use centralized stats hook for consistent data
  const { data: stats, isLoading: loadingStats } = useAdminStats();

  const handleExportUsers = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-users-csv`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get the CSV content and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auth_users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Users CSV downloaded successfully!");
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export users');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch 24h miner activity
  const { data: hourlyData = [], isLoading: loadingHourly } = useQuery({
    queryKey: ["admin-hourly-miners"],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subHours(endDate, 23);
      
      const { data: sessions, error } = await supabase
        .from("mining_sessions")
        .select("user_id, started_at")
        .gte("started_at", startDate.toISOString());

      if (error) throw error;

      const hours = eachHourOfInterval({ start: startDate, end: endDate });
      return hours.map((hour) => {
        const hourStart = startOfHour(hour);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        const uniqueUsers = new Set(
          sessions?.filter((s) => {
            const sessionDate = new Date(s.started_at);
            return sessionDate >= hourStart && sessionDate < hourEnd;
          }).map((s) => s.user_id)
        );

        return {
          time: format(hour, "HH:mm"),
          miners: uniqueUsers.size,
        };
      });
    },
    refetchInterval: 60000,
  });

  // Fetch recent mining sessions
  const { data: recentSessions = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ["admin-recent-sessions"],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("mining_sessions")
        .select("id, user_id, arx_mined, started_at, is_active")
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get profiles for usernames
      const userIds = sessions?.map((s) => s.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);

      // Get wallets
      const { data: wallets } = await supabase
        .from("user_wallets")
        .select("user_id, wallet_address")
        .in("user_id", userIds)
        .eq("is_primary", true);

      const walletMap = new Map(wallets?.map((w) => [w.user_id, w.wallet_address]) || []);

      return sessions?.map((session) => {
        const wallet = walletMap.get(session.user_id) || "No wallet";
        const shortWallet = wallet.length > 12 
          ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` 
          : wallet;
        
        return {
          id: session.id.slice(0, 8),
          miner: shortWallet,
          username: profileMap.get(session.user_id) || "Anonymous",
          earned: `${Math.round(Number(session.arx_mined || 0)).toLocaleString()} ARX-P`,
          time: formatDistanceToNow(new Date(session.started_at), { addSuffix: true }),
          status: session.is_active ? "active" : "completed",
        };
      }) || [];
    },
    refetchInterval: 60000,
  });

  // Points distribution for chart
  const { data: pointsDistribution = [] } = useQuery({
    queryKey: ["admin-points-distribution"],
    queryFn: async () => {
      const { data: points, error } = await supabase
        .from("user_points")
        .select("mining_points, task_points, social_points, referral_points")
        .limit(100);

      if (error) throw error;

      const totals = {
        mining: points?.reduce((sum, p) => sum + Number(p.mining_points || 0), 0) || 0,
        tasks: points?.reduce((sum, p) => sum + Number(p.task_points || 0), 0) || 0,
        social: points?.reduce((sum, p) => sum + Number(p.social_points || 0), 0) || 0,
        referrals: points?.reduce((sum, p) => sum + Number(p.referral_points || 0), 0) || 0,
      };

      return [
        { name: "Mining", points: totals.mining },
        { name: "Tasks", points: totals.tasks },
        { name: "Social", points: totals.social },
        { name: "Referrals", points: totals.referrals },
      ];
    },
    refetchInterval: 30000,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">ARXON Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Monitor ARX-P mining activity and user engagement</p>
        </div>
        <Button 
          onClick={handleExportUsers} 
          disabled={isExporting}
          variant="outline"
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting ? "Exporting..." : "Download Users CSV"}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <AdminStatCard 
          icon={Users} 
          label="Total Users" 
          value={formatNumber(stats?.totalUsers || 0)} 
          subtext="Registered users"
          loading={loadingStats}
          tooltip="Total users who have signed up on the app"
        />
        <AdminStatCard 
          icon={Activity} 
          label="Active Sessions" 
          value={formatNumber(stats?.activeMiners || 0)} 
          trend={stats?.activeMiners ? "up" : "neutral"}
          subtext="Currently mining"
          loading={loadingStats}
          tooltip="Users currently running an active mining session"
        />
        <AdminStatCard 
          icon={Coins} 
          label="Mining ARX-P" 
          value={formatNumber(stats?.totalMiningPoints || 0)} 
          subtext="From mining only"
          loading={loadingStats}
          tooltip="Total ARX-P earned from mining sessions only"
        />
        <AdminStatCard 
          icon={Coins} 
          label="Total ARX-P" 
          value={formatNumber(stats?.totalPoints || 0)} 
          subtext="All sources"
          loading={loadingStats}
          tooltip="Combined ARX-P from mining, tasks, referrals, and social"
        />
        <AdminStatCard 
          icon={CheckCircle} 
          label="$ARX Claiming" 
          value={stats?.claimingEnabled ? "Enabled" : "Disabled"} 
          subtext="Token conversion"
          loading={loadingStats}
          tooltip="Whether users can convert ARX-P to $ARX tokens"
        />
        <AdminStatCard 
          icon={Server} 
          label="Referrals" 
          value={formatNumber(stats?.totalReferrals || 0)} 
          subtext="Total signups"
          loading={loadingStats}
          tooltip="Total successful referrals on the platform"
        />
      </div>

      {/* Mining Info Banner */}
      <div className="glass-card p-3 md:p-4 border-primary/30 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm md:text-base text-foreground">Mining Rate: +10 ARX-P/hour</p>
            <p className="text-xs md:text-sm text-muted-foreground">Max session: 8 hours | ARX-P converts to $ARX tokens at TGE</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-primary">{stats?.blockReward || 1000}</p>
              <p className="text-muted-foreground text-xs">Block Reward</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* 24h Active Miners */}
        <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h3 className="font-semibold text-sm md:text-base text-foreground">24h Active Miners</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Hourly mining activity</p>
          </div>
          <div className="h-48 md:h-64">
            {loadingHourly ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hourlyData.every(d => d.miners === 0) ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No mining activity in the last 24h
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="minersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value} miners`, 'Active']}
                  />
                  <Area
                    type="monotone"
                    dataKey="miners"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#minersGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ARX-P Distribution */}
        <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm md:text-base text-foreground">ARX-P Distribution</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Points by source</p>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <span className="text-muted-foreground">All time</span>
            </div>
          </div>
          <div className="h-48 md:h-64">
            {pointsDistribution.every(d => d.points === 0) ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No points data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pointsDistribution}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => formatNumber(value)}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ARX-P`, 'Points']}
                  />
                  <Bar 
                    dataKey="points" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
        <div>
          <h3 className="font-semibold text-sm md:text-base text-foreground">Recent Mining Sessions</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Latest ARX-P mining activity</p>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          {loadingBlocks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No mining sessions yet
            </div>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Session ID</th>
                  <th className="text-left py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground hidden sm:table-cell">Username</th>
                  <th className="text-left py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">ARX-P</th>
                  <th className="text-left py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground hidden md:table-cell">Started</th>
                  <th className="text-left py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-mono text-primary">{session.id}</td>
                    <td className="py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-mono text-foreground">{session.miner}</td>
                    <td className="py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm text-foreground hidden sm:table-cell">{session.username}</td>
                    <td className="py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm text-accent font-medium">{session.earned}</td>
                    <td className="py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm text-muted-foreground hidden md:table-cell">{session.time}</td>
                    <td className="py-2 md:py-3 px-3 md:px-4">
                      <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                        session.status === "active" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {session.status === "active" ? "Mining" : "Done"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
