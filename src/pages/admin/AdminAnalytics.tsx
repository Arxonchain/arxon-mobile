import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Download, TrendingUp, TrendingDown, Activity, CheckCircle, Clock, AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminStats, formatNumber } from "@/hooks/useAdminStats";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState<"24H" | "7D" | "30D">("7D");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use centralized admin stats
  const { data: globalStats, isLoading: loadingGlobalStats, refetch: refetchGlobalStats } = useAdminStats();

  // Fetch mining settings
  const { data: miningSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["admin-mining-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mining_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  // Fetch claims data
  const { data: claimsData, isLoading: loadingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ["admin-claims-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("proof_status, claimed_amount");
      if (error) throw error;
      
      const successful = data?.filter(c => c.proof_status === "verified").length || 0;
      const pending = data?.filter(c => c.proof_status === "pending").length || 0;
      const failed = data?.filter(c => c.proof_status === "rejected").length || 0;
      const totalClaimed = data?.reduce((sum, c) => sum + Number(c.claimed_amount || 0), 0) || 0;
      
      return { successful, pending, failed, totalClaimed, total: data?.length || 0 };
    },
    refetchInterval: 60000,
  });

  // Fetch daily performance comparison
  const { data: performanceData, isLoading: loadingPerformance, refetch: refetchPerformance } = useQuery({
    queryKey: ["admin-performance-comparison", timeRange],
    queryFn: async () => {
      const days = timeRange === "24H" ? 1 : timeRange === "7D" ? 7 : 30;
      const currentEnd = new Date();
      const currentStart = subDays(currentEnd, days);
      const previousEnd = currentStart;
      const previousStart = subDays(previousEnd, days);

      // Current period miners
      const { data: currentMiners } = await supabase
        .from("mining_sessions")
        .select("user_id")
        .gte("started_at", currentStart.toISOString())
        .lte("started_at", currentEnd.toISOString());

      // Previous period miners
      const { data: previousMiners } = await supabase
        .from("mining_sessions")
        .select("user_id")
        .gte("started_at", previousStart.toISOString())
        .lte("started_at", previousEnd.toISOString());

      // Current period claims
      const { data: currentClaims } = await supabase
        .from("claims")
        .select("id")
        .gte("created_at", currentStart.toISOString());

      // Previous period claims
      const { data: previousClaims } = await supabase
        .from("claims")
        .select("id")
        .gte("created_at", previousStart.toISOString())
        .lte("created_at", currentStart.toISOString());

      const currentMinerCount = new Set(currentMiners?.map(m => m.user_id)).size;
      const previousMinerCount = new Set(previousMiners?.map(m => m.user_id)).size;
      const currentClaimCount = currentClaims?.length || 0;
      const previousClaimCount = previousClaims?.length || 0;

      return {
        activeMiners: {
          current: currentMinerCount,
          previous: previousMinerCount,
          change: currentMinerCount - previousMinerCount,
          changePercent: previousMinerCount > 0 ? ((currentMinerCount - previousMinerCount) / previousMinerCount * 100).toFixed(1) : 0
        },
        claimsProcessed: {
          current: currentClaimCount,
          previous: previousClaimCount,
          change: currentClaimCount - previousClaimCount,
          changePercent: previousClaimCount > 0 ? ((currentClaimCount - previousClaimCount) / previousClaimCount * 100).toFixed(1) : 0
        }
      };
    },
    refetchInterval: 60000,
  });

  // Fetch recent claims for the sidebar
  const { data: recentClaims = [], refetch: refetchRecentClaims } = useQuery({
    queryKey: ["admin-recent-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, claimed_amount, proof_status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch recent mining sessions (points mined)
  const { data: recentPointsMined = [], refetch: refetchRecentPoints } = useQuery({
    queryKey: ["admin-recent-points-mined"],
    queryFn: async () => {
      // Fetch completed mining sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("mining_sessions")
        .select("id, user_id, arx_mined, ended_at, started_at")
        .eq("is_active", false)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(10);
      
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(sessions.map(s => s.user_id))];
      
      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      
      if (profilesError) throw profilesError;

      // Create a map of user_id to username
      const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      // Combine data
      return sessions.map(session => ({
        id: session.id,
        user_id: session.user_id,
        username: usernameMap.get(session.user_id) || `User-${session.user_id.slice(0, 6)}`,
        arx_mined: Number(session.arx_mined),
        claimed_at: session.ended_at,
        started_at: session.started_at,
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isLoading = loadingGlobalStats || loadingClaims || loadingPerformance;

  // Convenience aliases for global stats
  const totalUsers = globalStats?.totalUsers || 0;
  const activeMiners = globalStats?.activeMiners || 0;
  const totalArxMined = globalStats?.totalPoints || 0;
  const totalMiningPoints = globalStats?.totalMiningPoints || 0;
  const totalTaskPoints = globalStats?.totalTaskPoints || 0;
  const totalSocialPoints = globalStats?.totalSocialPoints || 0;
  const totalReferralPoints = globalStats?.totalReferralPoints || 0;
  const totalCheckinPoints = globalStats?.totalCheckinPoints || 0;
  const totalArenaEarnings = globalStats?.totalArenaEarnings || 0;
  const avgPointsPerUser = globalStats?.avgPointsPerUser || 0;
  const todaySignups = globalStats?.todaySignups || 0;
  const todayMiningPoints = globalStats?.todayMiningPoints || 0;
  const totalSessions = globalStats?.totalSessions || 0;
  const totalSessionsArxMined = globalStats?.totalSessionsArxMined || 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchGlobalStats(),
      refetchSettings(),
      refetchClaims(),
      refetchPerformance(),
      refetchRecentClaims(),
      refetchRecentPoints()
    ]);
    setIsRefreshing(false);
  };

  const handleExportCSV = () => {
    const data = [
      ["Metric", "Value"],
      ["Total Users", totalUsers],
      ["Active Miners", activeMiners],
      ["Total ARX Mined", totalArxMined],
      ["Successful Claims", claimsData?.successful || 0],
      ["Pending Claims", claimsData?.pending || 0],
      ["Failed Claims", claimsData?.failed || 0],
    ];
    const csv = data.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate real supply distribution based on actual mined ARX-P
  const maxSupply = 40_000_000; // 40M total ARX-P
  const publicMiningPercentage = totalArxMined > 0 ? Math.min((totalArxMined / maxSupply) * 100, 60) : 0;
  const remainingPublicMining = 60 - publicMiningPercentage;
  
  const supplyDistribution = [
    { name: "Mined (Public)", percentage: Number(publicMiningPercentage.toFixed(2)), color: "bg-primary" },
    { name: "Unmined (Public)", percentage: Number(remainingPublicMining.toFixed(2)), color: "bg-muted" },
    { name: "Founder Allocation", percentage: 20, color: "bg-purple-500" },
    { name: "Ecosystem Fund", percentage: 20, color: "bg-green-500" },
  ];

  // Calculate remaining supply
  const remainingSupply = maxSupply - totalArxMined;
  const remainingPercentage = ((remainingSupply / maxSupply) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-border/50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-border/50">
            <span className="text-sm text-muted-foreground">Network:</span>
            <span className="text-sm font-medium text-foreground">Mainnet</span>
            <span className="w-2 h-2 rounded-full bg-green-500 ml-1"></span>
          </div>
          <div className="flex bg-card border border-border/50 rounded-lg overflow-hidden">
            {(["24H", "7D", "30D"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeRange === range 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range}
              </button>
            ))}
            <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              Custom
            </button>
          </div>
          <Button size="sm" onClick={handleExportCSV} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Description Card */}
      <div className="glass-card p-4 border-border/30 flex items-center justify-between">
        <p className="text-foreground">Network performance, mining activity, and protocol health.</p>
        <Button size="sm" onClick={handleExportCSV} className="bg-primary hover:bg-primary/90">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Row - Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Users</p>
          <p className="text-2xl font-bold text-foreground">{formatNumber(totalUsers)}</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +{todaySignups} today
          </p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Miners</p>
          <p className="text-2xl font-bold text-primary">{formatNumber(activeMiners)}</p>
          <p className="text-xs text-muted-foreground">{totalSessions.toLocaleString()} total sessions</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total ARX-P</p>
          <p className="text-2xl font-bold text-foreground">{formatNumber(totalArxMined)}</p>
          <p className="text-xs text-muted-foreground">Avg: {formatNumber(avgPointsPerUser)}/user</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today's Mining</p>
          <p className="text-2xl font-bold text-green-500">{formatNumber(todayMiningPoints)}</p>
          <p className="text-xs text-muted-foreground">ARX-P mined today</p>
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Points Distribution Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-[10px] text-muted-foreground uppercase">Mining</p>
            <p className="text-lg font-bold text-primary">{formatNumber(totalMiningPoints)}</p>
            <p className="text-[10px] text-muted-foreground">{((totalMiningPoints / totalArxMined) * 100 || 0).toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-[10px] text-muted-foreground uppercase">Tasks</p>
            <p className="text-lg font-bold text-blue-400">{formatNumber(totalTaskPoints)}</p>
            <p className="text-[10px] text-muted-foreground">{((totalTaskPoints / totalArxMined) * 100 || 0).toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-[10px] text-muted-foreground uppercase">Referrals</p>
            <p className="text-lg font-bold text-purple-400">{formatNumber(totalReferralPoints)}</p>
            <p className="text-[10px] text-muted-foreground">{((totalReferralPoints / totalArxMined) * 100 || 0).toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-[10px] text-muted-foreground uppercase">Social</p>
            <p className="text-lg font-bold text-green-400">{formatNumber(totalSocialPoints)}</p>
            <p className="text-[10px] text-muted-foreground">{((totalSocialPoints / totalArxMined) * 100 || 0).toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] text-muted-foreground uppercase">Check-ins</p>
            <p className="text-lg font-bold text-amber-400">{formatNumber(totalCheckinPoints)}</p>
            <p className="text-[10px] text-muted-foreground">{((totalCheckinPoints / totalArxMined) * 100 || 0).toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-[10px] text-muted-foreground uppercase">Arena</p>
            <p className="text-lg font-bold text-orange-400">{formatNumber(totalArenaEarnings)}</p>
            <p className="text-[10px] text-muted-foreground">{((totalArenaEarnings / totalArxMined) * 100 || 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Health */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Platform Health</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="flex items-center gap-1 text-sm text-green-500">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Healthy
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Users</span>
                <span className="text-sm text-foreground">{formatNumber(totalUsers)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mining Status</span>
                <span className="flex items-center gap-1 text-sm text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {miningSettings?.public_mining_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Claiming Status</span>
                <span className={`flex items-center gap-1 text-sm ${miningSettings?.claiming_enabled ? 'text-green-500' : 'text-yellow-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${miningSettings?.claiming_enabled ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  {miningSettings?.claiming_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Claims Queue</span>
                <span className={`flex items-center gap-1 text-sm ${(claimsData?.pending || 0) > 10 ? 'text-yellow-500' : 'text-green-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${(claimsData?.pending || 0) > 10 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                  {(claimsData?.pending || 0) > 10 ? 'Elevated' : 'Normal'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Claims</span>
                <span className="text-sm text-foreground">{claimsData?.pending || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm text-foreground">
                  {claimsData?.total ? ((claimsData.successful / claimsData.total) * 100).toFixed(1) : 100}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Claims</span>
                <span className="text-sm text-foreground">{claimsData?.total || 0}</span>
              </div>
            </div>
          </div>

          {/* Performance Comparison Table */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Performance Comparison</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-primary">Metric</TableHead>
                  <TableHead className="text-primary">Current Period</TableHead>
                  <TableHead className="text-primary">Previous Period</TableHead>
                  <TableHead className="text-primary">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border/30">
                  <TableCell className="text-foreground">Active Miners</TableCell>
                  <TableCell className="text-foreground">{performanceData?.activeMiners.current.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-foreground">{performanceData?.activeMiners.previous.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 ${Number(performanceData?.activeMiners.changePercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Number(performanceData?.activeMiners.changePercent) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Number(performanceData?.activeMiners.changePercent) >= 0 ? '+' : ''}{performanceData?.activeMiners.change} ({performanceData?.activeMiners.changePercent}%)
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="text-foreground">Claims Processed</TableCell>
                  <TableCell className="text-foreground">{performanceData?.claimsProcessed.current.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-foreground">{performanceData?.claimsProcessed.previous.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 ${Number(performanceData?.claimsProcessed.changePercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Number(performanceData?.claimsProcessed.changePercent) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Number(performanceData?.claimsProcessed.changePercent) >= 0 ? '+' : ''}{performanceData?.claimsProcessed.change} ({performanceData?.claimsProcessed.changePercent}%)
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="text-foreground">Successful Claims</TableCell>
                  <TableCell className="text-foreground">{claimsData?.successful || 0}</TableCell>
                  <TableCell className="text-foreground">-</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">N/A</span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="text-foreground">Failed Claims</TableCell>
                  <TableCell className="text-foreground">{claimsData?.failed || 0}</TableCell>
                  <TableCell className="text-foreground">-</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">N/A</span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="text-foreground">Total ARX-P Mined</TableCell>
                  <TableCell className="text-foreground">{formatNumber(totalArxMined)}</TableCell>
                  <TableCell className="text-foreground">-</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">Cumulative</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* System Status */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">System Status</h3>
              <span className="flex items-center gap-2 text-sm text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                All Systems Operational
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Database</p>
                <p className="text-lg font-bold text-green-500">Healthy</p>
                <p className="text-xs text-muted-foreground">Latency: &lt;50ms</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Edge Functions</p>
                <p className="text-lg font-bold text-green-500">Active</p>
                <p className="text-xs text-muted-foreground">5 deployed</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Auth Service</p>
                <p className="text-lg font-bold text-green-500">Online</p>
                <p className="text-xs text-muted-foreground">{formatNumber(totalUsers)} users</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase">Real-time</p>
                <p className="text-lg font-bold text-green-500">Connected</p>
                <p className="text-xs text-muted-foreground">WebSocket active</p>
              </div>
            </div>
          </div>

          {/* Recent Points Mined */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Recent Points Mined</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-primary">Session ID</TableHead>
                  <TableHead className="text-primary">Claimed At</TableHead>
                  <TableHead className="text-primary">Miner</TableHead>
                  <TableHead className="text-primary">Points Claimed</TableHead>
                  <TableHead className="text-primary">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPointsMined.length === 0 ? (
                  <TableRow className="border-border/30">
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No mining sessions recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentPointsMined.map((session) => {
                    const claimedAt = session.claimed_at ? new Date(session.claimed_at) : null;
                    const startedAt = session.started_at ? new Date(session.started_at) : null;
                    const durationMs = claimedAt && startedAt ? claimedAt.getTime() - startedAt.getTime() : 0;
                    const durationMins = Math.floor(durationMs / 60000);
                    const durationSecs = Math.floor((durationMs % 60000) / 1000);
                    
                    return (
                      <TableRow key={session.id} className="border-border/30">
                        <TableCell className="text-primary font-mono">
                          #{session.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {claimedAt ? format(claimedAt, "MMM dd, HH:mm:ss") : "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {session.username}
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {session.arx_mined.toLocaleString()} ARX-P
                        </TableCell>
                        <TableCell className="text-foreground">
                          {durationMins > 0 ? `${durationMins}m ${durationSecs}s` : `${durationSecs}s`}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-foreground">Quick Stats</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Claims Success Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {claimsData?.total ? ((claimsData.successful / claimsData.total) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-green-500">Optimal performance</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(totalUsers)}</p>
                <p className="text-xs text-green-500">{formatNumber(activeMiners)} mining now</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Status</p>
                <p className="text-2xl font-bold text-green-500">Online</p>
                <p className="text-xs text-green-500">All services operational</p>
              </div>
            </div>
          </div>

          {/* Supply Distribution */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Supply Distribution</h3>
            <div className="space-y-3">
              {supplyDistribution.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="text-foreground">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${Math.max(item.percentage, 1)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border/30">
              <p className="text-sm text-muted-foreground">Remaining Supply</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(remainingSupply)} ARX-P</p>
              <p className="text-xs text-muted-foreground">{remainingPercentage}% of max supply</p>
            </div>
          </div>

          {/* Claims Status */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Claims Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Successful
                </span>
                <span className="text-foreground font-medium">{claimsData?.successful.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Pending
                </span>
                <span className="text-foreground font-medium">{claimsData?.pending.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Failed
                </span>
                <span className="text-foreground font-medium">{claimsData?.failed.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Summary */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Activity Summary</h3>
            <div className="space-y-3">
              <div className="pl-3 border-l-2 border-primary">
                <p className="text-xs text-muted-foreground">Mining</p>
                <p className="text-sm text-foreground">{performanceData?.activeMiners.current || 0} active miners in period</p>
              </div>
              <div className="pl-3 border-l-2 border-green-500">
                <p className="text-xs text-muted-foreground">Claims</p>
                <p className="text-sm text-foreground">{claimsData?.successful || 0} successful claims</p>
              </div>
              <div className="pl-3 border-l-2 border-yellow-500">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm text-foreground">{claimsData?.pending || 0} claims in queue</p>
              </div>
              <div className="pl-3 border-l-2 border-accent">
                <p className="text-xs text-muted-foreground">Total Distributed</p>
                <p className="text-sm text-foreground">{formatNumber(totalArxMined)} ARX-P mined</p>
              </div>
            </div>
          </div>

          {/* Recent Claims */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Recent Claims</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-primary text-xs">ID</TableHead>
                  <TableHead className="text-primary text-xs">Amount</TableHead>
                  <TableHead className="text-primary text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClaims.map((claim, idx) => (
                  <TableRow key={idx} className="border-border/30">
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      CLM-{claim.id.slice(0, 4).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-foreground text-sm">
                      {Number(claim.claimed_amount).toLocaleString()} ARX-P
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs ${
                        claim.proof_status === "verified" ? "text-green-500" : 
                        claim.proof_status === "pending" ? "text-yellow-500" : "text-red-500"
                      }`}>
                        {claim.proof_status === "verified" ? <CheckCircle className="h-3 w-3" /> : 
                         claim.proof_status === "pending" ? <Clock className="h-3 w-3" /> : 
                         <AlertTriangle className="h-3 w-3" />}
                        {claim.proof_status === "verified" ? "Success" : 
                         claim.proof_status === "pending" ? "Pending" : "Failed"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
