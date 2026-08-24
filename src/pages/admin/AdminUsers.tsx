import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Eye, Activity, Coins, Users, Calendar, Loader2, ChevronDown, ChevronUp, Zap, RefreshCw, CheckCircle2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminStats, formatNumber } from "@/hooks/useAdminStats";
import { AdminStatCardCompact } from "@/components/admin/AdminStatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface XProfileData {
  id: string;
  username: string;
  profile_url: string;
  boost_percentage: number;
  average_engagement: number;
  viral_bonus: boolean;
  qualified_posts_today: number;
  historical_scanned: boolean;
  historical_posts_count: number;
  historical_arx_p_total: number;
  historical_boost_total: number;
  last_scanned_at: string | null;
  created_at: string;
}

interface BoostBreakdown {
  xScanBoost: number;
  xPostBoost: number;
  referralBoost: number;
  arenaBoost: number;
  totalBoostPercentage: number;
  effectiveMiningRate: number;
  claimedXPostsCount: number;
  referralCount: number;
}

interface UserSnapshot {
  userId: string;
  profile: any;
  points: any;
  wallets: any[];
  referrals: { given: any[]; received: any[]; count: number };
  xProfile: XProfileData | null;
  xRewards: any[];
  socialSubmissions: any[];
  miningSessions: any[];
  arenaVotes: any[];
  arenaBoosts: any[];
  badges: any[];
  boostBreakdown: BoostBreakdown;
  stats: {
    totalPoints: number;
    miningPoints: number;
    taskPoints: number;
    socialPoints: number;
    referralPoints: number;
    dailyStreak: number;
    totalSessions: number;
    activeSessions: number;
    totalArxMined: number;
    arenaVotesCount: number;
    arenaPowerSpent: number;
  };
}

interface UserData {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
  wallet: string | null;
  total_points: number;
  mining_points: number;
  task_points: number;
  social_points: number;
  referral_points: number;
  daily_streak: number;
  referral_code: string | null;
  referral_count: number;
  total_sessions: number;
  active_session: boolean;
  completed_sessions: number;
  last_active: string | null;
  total_arx_mined: number;
  x_profile: XProfileData | null;
  arena_votes: number;
  arena_power_spent: number;
  referral_bonus_percentage: number;
  x_post_boost_percentage: number;
}

interface MiningSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  arx_mined: number;
  is_active: boolean;
}

type SessionFilter = "all" | "active" | "completed" | "never";

const PAGE_SIZE = 50;

const mapAdminUserRow = (row: Record<string, unknown>): UserData => {
  const xProfile = row.x_profile as Record<string, unknown> | null;
  return {
    user_id: String(row.user_id),
    email: String(row.email || "hidden@email.com"),
    username: String(row.username || "Anonymous"),
    created_at: String(row.created_at),
    wallet: (row.wallet as string | null) ?? null,
    total_points: Number(row.total_points || 0),
    mining_points: Number(row.mining_points || 0),
    task_points: Number(row.task_points || 0),
    social_points: Number(row.social_points || 0),
    referral_points: Number(row.referral_points || 0),
    daily_streak: Number(row.daily_streak || 0),
    referral_code: (row.referral_code as string | null) ?? null,
    referral_count: Number(row.referral_count || 0),
    total_sessions: Number(row.total_sessions || 0),
    active_session: Boolean(row.active_session),
    completed_sessions: Number(row.completed_sessions || 0),
    last_active: row.last_active ? String(row.last_active) : null,
    total_arx_mined: Number(row.total_arx_mined || 0),
    x_profile: xProfile ? {
      id: String(xProfile.id),
      username: String(xProfile.username),
      profile_url: String(xProfile.profile_url),
      boost_percentage: Number(xProfile.boost_percentage || 0),
      average_engagement: Number(xProfile.average_engagement || 0),
      viral_bonus: Boolean(xProfile.viral_bonus),
      qualified_posts_today: Number(xProfile.qualified_posts_today || 0),
      historical_scanned: Boolean(xProfile.historical_scanned),
      historical_posts_count: Number(xProfile.historical_posts_count || 0),
      historical_arx_p_total: Number(xProfile.historical_arx_p_total || 0),
      historical_boost_total: Number(xProfile.historical_boost_total || 0),
      last_scanned_at: xProfile.last_scanned_at ? String(xProfile.last_scanned_at) : null,
      created_at: String(xProfile.created_at),
    } : null,
    arena_votes: Number(row.arena_votes || 0),
    arena_power_spent: Number(row.arena_power_spent || 0),
    referral_bonus_percentage: Number(row.referral_bonus_percentage || 0),
    x_post_boost_percentage: Number(row.x_post_boost_percentage || 0),
  };
};

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [sessionFilter]);

  const { data: sessionCounts = { all: 0, active: 0, completed: 0, never: 0 } } = useQuery({
    queryKey: ["admin-user-session-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_user_session_filter_counts" as any);
      if (error) throw error;
      return data as { all: number; active: number; completed: number; never: number };
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ["admin-users", page, debouncedSearch, sessionFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admin_users" as any, {
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
        p_search: debouncedSearch || null,
        p_session_filter: sessionFilter,
      });
      if (error) throw error;
      const payload = data as { users?: Record<string, unknown>[]; total_count?: number };
      return {
        users: (payload.users || []).map(mapAdminUserRow),
        totalCount: Number(payload.total_count || 0),
      };
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const users = usersPage?.users ?? [];
  const totalCount = usersPage?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageStart = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min(totalCount, (page + 1) * PAGE_SIZE);

  // Fetch detailed user snapshot via admin endpoint
  const { data: userSnapshot, isLoading: loadingSnapshot } = useQuery({
    queryKey: ["admin-user-snapshot", selectedUser?.user_id],
    queryFn: async (): Promise<UserSnapshot | null> => {
      if (!selectedUser) return null;
      
      const { data, error } = await supabase.functions.invoke('admin-user-snapshot', {
        body: { userId: selectedUser.user_id }
      });

      if (error) {
        console.error('Error fetching user snapshot:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch user snapshot');
      }
      
      return data.data as UserSnapshot;
    },
    enabled: !!selectedUser,
  });

  // Force rescan mutation
  const forceRescanMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Fetch the user's x_profile
      const { data: xProfile } = await supabase
        .from('x_profiles')
        .select('username, profile_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (!xProfile?.username) {
        throw new Error('User has no connected X profile');
      }

      const { data, error } = await supabase.functions.invoke('scan-x-profile', {
        body: {
          username: xProfile.username,
          profileUrl: xProfile.profile_url,
          isInitialConnect: false,
          forceHistorical: true,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Rescan failed');
      return data;
    },
    onSuccess: () => {
      toast.success('Historical rescan complete! Rewards synced.');
      queryClient.invalidateQueries({ queryKey: ['admin-user-snapshot', selectedUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-session-counts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-session-counts'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Rescan failed');
    },
  });

  // Use centralized admin stats
  const { data: globalStats, isLoading: loadingGlobalStats } = useAdminStats();

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getStatusBadge = (active: boolean) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
    }`}>
      {active ? "Mining" : "Offline"}
    </span>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        title="Users & Miners"
        description="View all users, their stats, and mining activity"
        actions={
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={async () => {
                try {
                  toast.loading('Exporting auth emails...', { id: 'export-emails' });
                  const { data: sessionData } = await supabase.auth.getSession();
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-users-csv`,
                    { headers: { Authorization: `Bearer ${sessionData.session?.access_token}` } }
                  );
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Export failed');
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `auth_users_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success('Auth emails exported!', { id: 'export-emails' });
                } catch (err: any) {
                  toast.error(err.message || 'Export failed', { id: 'export-emails' });
                }
              }}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Auth Emails</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={async () => {
                try {
                  toast.loading('Exporting all user data...', { id: 'export' });
                  const { data: sessionData } = await supabase.auth.getSession();
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data-csv`,
                    { headers: { Authorization: `Bearer ${sessionData.session?.access_token}` } }
                  );
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Export failed');
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `full_user_export_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success('Export complete!', { id: 'export' });
                } catch (err: any) {
                  toast.error(err.message || 'Export failed', { id: 'export' });
                }
              }}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Full CSV</span>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <AdminStatCardCompact
          icon={Users}
          label="Total Users"
          value={formatNumber(globalStats?.totalUsers || 0)}
          tooltip="Total users who have signed up on the app"
          loading={loadingGlobalStats}
        />
        <AdminStatCardCompact
          icon={Activity}
          label="Mining Now"
          value={formatNumber(globalStats?.activeMiners || 0)}
          tooltip="Users with an active mining session right now"
          loading={loadingGlobalStats}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
        <AdminStatCardCompact
          icon={Coins}
          label="Total ARX-P"
          value={formatNumber(globalStats?.totalPoints || 0)}
          tooltip="Combined ARX-P from mining, tasks, referrals, and social"
          loading={loadingGlobalStats}
          iconColor="text-accent"
          iconBgColor="bg-accent/10"
        />
      </div>

      {/* Session Filter Tabs */}
      <Tabs value={sessionFilter} onValueChange={(v) => setSessionFilter(v as SessionFilter)}>
        <TabsList className="bg-muted/50 w-full sm:w-auto grid grid-cols-4 sm:flex gap-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>All</span>
            <span className="hidden sm:inline text-muted-foreground">({sessionCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs sm:text-sm gap-1.5">
            <PlayCircle className="h-3.5 w-3.5 text-green-500" />
            <span>Mining</span>
            <span className="hidden sm:inline text-muted-foreground">({sessionCounts.active})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
            <span>Completed</span>
            <span className="hidden sm:inline text-muted-foreground">({sessionCounts.completed})</span>
          </TabsTrigger>
          <TabsTrigger value="never" className="text-xs sm:text-sm gap-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Never</span>
            <span className="hidden sm:inline text-muted-foreground">({sessionCounts.never})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, ID, wallet, or referral code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted/50 text-sm"
        />
      </div>

      {/* Users list */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No users found</div>
        ) : isMobile ? (
          <div className="divide-y divide-border/50">
            {users.map((user) => (
              <div key={user.user_id} className="p-3 space-y-2">
                <div className="flex items-start gap-3" onClick={() => toggleRow(user.user_id)}>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
                      {getStatusBadge(user.active_session)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.x_profile ? `@${user.x_profile.username}` : "No X linked"}
                    </p>
                    <p className="text-xs font-mono text-primary mt-0.5">{user.user_id.slice(0, 8)}…</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm pl-[52px]">
                  <div>
                    <p className="font-bold text-accent">{formatNumber(user.total_points)} ARX-P</p>
                    <p className="text-[10px] text-muted-foreground">{formatNumber(user.mining_points)} mined · {user.referral_count} refs</p>
                  </div>
                  <button type="button" className="text-muted-foreground p-1" onClick={() => toggleRow(user.user_id)}>
                    {expandedRows.has(user.user_id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                {expandedRows.has(user.user_id) && (
                  <div className="grid grid-cols-2 gap-2 text-xs pl-[52px] pt-1 border-t border-border/30">
                    <div><p className="text-muted-foreground">Sessions</p><p className="font-medium">{user.total_sessions}</p></div>
                    <div><p className="text-muted-foreground">Streak</p><p className="font-medium">{user.daily_streak}d</p></div>
                    <div><p className="text-muted-foreground">Task pts</p><p className="font-medium">{formatNumber(user.task_points)}</p></div>
                    <div><p className="text-muted-foreground">Arena</p><p className="font-medium">{user.arena_votes} votes</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground">Wallet</p><p className="font-mono truncate">{user.wallet ? `${user.wallet.slice(0, 10)}…` : "Not connected"}</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground">Joined</p><p className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Total ARX-P</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Sessions</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Referrals</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <React.Fragment key={user.user_id}>
                      <tr 
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => toggleRow(user.user_id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.username}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.x_profile ? `@${user.x_profile.username}` : "No X linked"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-mono text-primary truncate max-w-[120px]" title={user.user_id}>
                            {user.user_id.slice(0, 8)}...
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-bold text-accent">{formatNumber(user.total_points)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(user.mining_points)} mined
                          </p>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <p className="text-sm text-foreground">{user.total_sessions}</p>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <p className="text-sm text-foreground">{user.referral_count}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.referral_code || "-"}</p>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(user.active_session)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {expandedRows.has(user.user_id) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row Details */}
                      {expandedRows.has(user.user_id) && (
                        <tr>
                          <td colSpan={7} className="bg-muted/10 px-4 py-3 border-b border-border/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Wallet</p>
                                <p className="font-mono text-xs truncate">{user.wallet ? `${user.wallet.slice(0, 8)}...${user.wallet.slice(-6)}` : "Not connected"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Mining Points</p>
                                <p className="font-medium">{formatNumber(user.mining_points)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Task Points</p>
                                <p className="font-medium">{formatNumber(user.task_points)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Social Points</p>
                                <p className="font-medium">{formatNumber(user.social_points)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Referral Points</p>
                                <p className="font-medium">{formatNumber(user.referral_points)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Daily Streak</p>
                                <p className="font-medium">{user.daily_streak} days</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Total Boost</p>
                                <p className="font-medium text-yellow-400">+{(user.referral_bonus_percentage || 0) + (user.x_post_boost_percentage || 0) + (user.x_profile?.boost_percentage || 0)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Arena Votes</p>
                                <p className="font-medium">{user.arena_votes}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Arena Power</p>
                                <p className="font-medium">{formatNumber(user.arena_power_spent)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Last Active</p>
                                <p className="font-medium">{user.last_active ? formatDistanceToNow(new Date(user.last_active), { addSuffix: true }) : "Never"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Joined</p>
                                <p className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Sessions (Active/Completed)</p>
                                <p className="font-medium">
                                  <span className={user.active_session ? "text-green-500" : ""}>
                                    {user.active_session ? 1 : 0}
                                  </span>
                                  <span className="text-muted-foreground"> / </span>
                                  <span className="text-blue-400">{user.completed_sessions}</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Total Mined</p>
                                <p className="font-medium">{formatNumber(user.total_arx_mined)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
        </div>
        )}
        {!isLoading && totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {pageStart.toLocaleString()}–{pageEnd.toLocaleString()} of {totalCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground min-w-[80px] text-center">
                Page {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {selectedUser?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold">{selectedUser?.username}</p>
                <p className="text-sm text-muted-foreground font-mono">{selectedUser?.user_id}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed view of user account and statistics
            </DialogDescription>
          </DialogHeader>

          {loadingSnapshot ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userSnapshot ? (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground">Total ARX-P</p>
                  <p className="text-xl font-bold text-accent">{formatNumber(userSnapshot.stats.totalPoints)}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground">Mining Points</p>
                  <p className="text-xl font-bold">{formatNumber(userSnapshot.stats.miningPoints)}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-xl font-bold">{userSnapshot.stats.totalSessions}</p>
                </div>
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground">Referrals</p>
                  <p className="text-xl font-bold">{userSnapshot.referrals.count}</p>
                </div>
              </div>

              {/* Boost Breakdown - NEW */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Mining Boost Breakdown
                </h3>
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">X Scan</p>
                      <p className="text-lg font-bold text-blue-400">+{userSnapshot.boostBreakdown.xScanBoost}%</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">X Posts ({userSnapshot.boostBreakdown.claimedXPostsCount})</p>
                      <p className="text-lg font-bold text-purple-400">+{userSnapshot.boostBreakdown.xPostBoost}%</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Referrals ({userSnapshot.boostBreakdown.referralCount})</p>
                      <p className="text-lg font-bold text-green-400">+{userSnapshot.boostBreakdown.referralBoost}%</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Arena</p>
                      <p className="text-lg font-bold text-red-400">+{userSnapshot.boostBreakdown.arenaBoost}%</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                      <p className="text-[10px] text-yellow-400 font-medium">TOTAL BOOST</p>
                      <p className="text-lg font-bold text-yellow-400">+{userSnapshot.boostBreakdown.totalBoostPercentage}%</p>
                    </div>
                  </div>
                  <div className="text-center pt-3 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      Effective Mining Rate: <span className="text-yellow-400 font-bold">{userSnapshot.boostBreakdown.effectiveMiningRate.toFixed(1)} ARX-P/hour</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Account Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-mono text-xs">{userSnapshot.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span>{userSnapshot.profile?.username || "Anonymous"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet:</span>
                    <span className="font-mono text-xs">
                      {userSnapshot.wallets.find(w => w.is_primary)?.wallet_address 
                        ? `${userSnapshot.wallets.find(w => w.is_primary)?.wallet_address.slice(0, 8)}...`
                        : "Not connected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined:</span>
                    <span>{userSnapshot.profile?.created_at ? format(new Date(userSnapshot.profile.created_at), "PPP") : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referral Code:</span>
                    <span className="font-mono">{userSnapshot.profile?.referral_code || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">X Account:</span>
                    <span>{userSnapshot.xProfile ? `@${userSnapshot.xProfile.username}` : "Not linked"}</span>
                  </div>
                </div>
              </div>

              {/* X Profile Details */}
              {userSnapshot.xProfile && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center">𝕏</span>
                      X Profile Details
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={forceRescanMutation.isPending}
                      onClick={() => forceRescanMutation.mutate(userSnapshot.userId)}
                    >
                      {forceRescanMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Force Rescan
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Scan Boost</p>
                      <p className="text-lg font-bold text-primary">+{userSnapshot.xProfile.boost_percentage}%</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Avg Engagement</p>
                      <p className="text-lg font-bold">{formatNumber(userSnapshot.xProfile.average_engagement)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Posts Today</p>
                      <p className="text-lg font-bold">{userSnapshot.xProfile.qualified_posts_today}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Viral Bonus</p>
                      <p className="text-lg font-bold">{userSnapshot.xProfile.viral_bonus ? "🔥" : "—"}</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/20 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Historical Data</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Historical Posts</p>
                        <p className="font-medium">{userSnapshot.xProfile.historical_posts_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ARX-P from Posts</p>
                        <p className="font-medium text-accent">{formatNumber(userSnapshot.xProfile.historical_arx_p_total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Boost Earned</p>
                        <p className="font-medium text-primary">+{userSnapshot.xProfile.historical_boost_total}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Scanned</p>
                        <p className="font-medium">{userSnapshot.xProfile.historical_scanned ? "Yes" : "No"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Profile URL</p>
                        <a href={userSnapshot.xProfile.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate block">
                          {userSnapshot.xProfile.profile_url}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Scanned</p>
                        <p className="font-medium text-xs">
                          {userSnapshot.xProfile.last_scanned_at 
                            ? formatDistanceToNow(new Date(userSnapshot.xProfile.last_scanned_at), { addSuffix: true })
                            : "Never"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!userSnapshot.xProfile && (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-sm">No X profile connected</p>
                </div>
              )}

              {/* Points Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Points Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Mining</p>
                    <p className="text-lg font-bold">{formatNumber(userSnapshot.stats.miningPoints)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-lg font-bold">{formatNumber(userSnapshot.stats.taskPoints)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Social</p>
                    <p className="text-lg font-bold">{formatNumber(userSnapshot.stats.socialPoints)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Referrals</p>
                    <p className="text-lg font-bold">{formatNumber(userSnapshot.stats.referralPoints)}</p>
                  </div>
                </div>
              </div>

              {/* Mining Sessions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Recent Mining Sessions</h3>
                {userSnapshot.miningSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No mining sessions</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userSnapshot.miningSessions.map((session: MiningSession) => (
                      <div key={session.id} className="flex items-center justify-between bg-muted/20 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${session.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">{session.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.started_at), "MMM d, HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-accent">{Math.round(session.arx_mined)} ARX-P</p>
                          <p className="text-xs text-muted-foreground">
                            {session.is_active ? "Active" : "Completed"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Submissions */}
              {userSnapshot.socialSubmissions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Social Submissions ({userSnapshot.socialSubmissions.length})</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {userSnapshot.socialSubmissions.slice(0, 5).map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between bg-muted/20 rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            sub.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            sub.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {sub.status}
                          </span>
                          <a href={sub.post_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            {sub.post_url}
                          </a>
                        </div>
                        <span className="text-muted-foreground ml-2">+{sub.points_awarded}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load user data
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
