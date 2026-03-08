import { useState, useEffect, useCallback } from "react";
import { User, Wallet, Zap, Clock, Calendar, Trophy, History, Edit2, Check, Copy, ArrowLeftRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePoints } from "@/hooks/usePoints";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthDialog from "@/components/auth/AuthDialog";
import { toast } from "@/hooks/use-toast";
import { cacheGet, cacheSet } from "@/lib/localCache";
import { withTimeout } from "@/lib/utils";

interface MiningHistory {
  id: string;
  started_at: string;
  ended_at: string | null;
  arx_mined: number;
  is_active: boolean;
}

const miningHistoryCacheKey = (userId: string) => `arxon:mining_history:v1:${userId}`;

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { points, rank, loading: pointsLoading } = usePoints();
  const { primaryWallet } = useWallet();
  const [showAuth, setShowAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [nexusAddress, setNexusAddress] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [miningHistory, setMiningHistory] = useState<MiningHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const copyNexusAddress = async () => {
    if (!nexusAddress) return;
    try {
      await navigator.clipboard.writeText(nexusAddress);
      toast({ title: "Nexus address copied!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await withTimeout(
        supabase.from('profiles').select('username, nexus_address').eq('user_id', user.id).maybeSingle(),
        12_000
      );

      if (data?.username) {
        setUsername(data.username);
      }
      if (data?.nexus_address) {
        setNexusAddress(data.nexus_address);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const fetchMiningHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('mining_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(10),
        12_000
      );

      if (!error && data) {
        setMiningHistory(data as any);
        cacheSet(miningHistoryCacheKey(user.id), data);
      }
    } catch {
      // keep cached UI
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Initial fetch (hydrate from cache first)
  useEffect(() => {
    if (!user) return;

    const cached = cacheGet<MiningHistory[]>(miningHistoryCacheKey(user.id), { maxAgeMs: 5 * 60_000 });
    if (cached?.data) {
      setMiningHistory(cached.data);
      setHistoryLoading(false);
    }

    // Fail-safe: never spin forever
    const failSafe = window.setTimeout(() => {
      setHistoryLoading(false);
    }, 4000);

    fetchProfile();
    fetchMiningHistory().finally(() => window.clearTimeout(failSafe));

    return () => window.clearTimeout(failSafe);
  }, [user, fetchProfile, fetchMiningHistory]);

  // Real-time subscription for mining history
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-mining')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchMiningHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMiningHistory]);

  // Real-time subscription for profile changes (username, etc)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'username' in payload.new) {
            setUsername((payload.new as any).username || '');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const saveUsername = async () => {
    if (!user || !username.trim()) return;
    
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Username Updated",
        description: "Your profile has been saved",
      });
      setEditingUsername(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile</h1>
        
        <div className="glass-card p-8 text-center">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-medium text-foreground mb-2">Not Signed In</h2>
          <p className="text-muted-foreground mb-4">
            Sign in to view your profile and mining stats
          </p>
          <Button onClick={() => setShowAuth(true)} className="btn-mining">
            Sign In
          </Button>
        </div>

        <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile</h1>
        </div>
        <Button onClick={signOut} variant="outline" size="sm">
          Sign Out
        </Button>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'M'}
          </div>
          <div className="flex-1">
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="max-w-xs bg-input"
                />
                <Button 
                  onClick={saveUsername} 
                  disabled={savingUsername}
                  size="sm"
                  className="btn-mining"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {username || 'Arxon Miner'}
                </h2>
                <button 
                  onClick={() => setEditingUsername(true)}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {nexusAddress && (
              <div className="flex items-center gap-2 mt-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                  {nexusAddress}
                </code>
                <button 
                  onClick={copyNexusAddress}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 text-center">
          <Zap className="h-6 w-6 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {pointsLoading ? '...' : points?.total_points?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-muted-foreground">Total ARX-P</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {rank ? `#${rank}` : '-'}
          </p>
          <p className="text-xs text-muted-foreground">Rank</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Calendar className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {points?.daily_streak || 0}
          </p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {points?.mining_points?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-muted-foreground">Mining Points</p>
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-foreground mb-4">Points Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Mining Points</span>
            <span className="font-medium text-foreground">{points?.mining_points?.toLocaleString() || 0} ARX-P</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Task Points</span>
            <span className="font-medium text-foreground">{points?.task_points?.toLocaleString() || 0} ARX-P</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Social Points</span>
            <span className="font-medium text-foreground">{points?.social_points?.toLocaleString() || 0} ARX-P</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Referral Points</span>
            <span className="font-medium text-foreground">{points?.referral_points?.toLocaleString() || 0} ARX-P</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-bold text-accent">{points?.total_points?.toLocaleString() || 0} ARX-P</span>
          </div>
        </div>
      </div>

      {/* Connected Wallet */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Airdrop Wallet
        </h3>
        {primaryWallet ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-foreground">
                {primaryWallet.wallet_address.slice(0, 12)}...{primaryWallet.wallet_address.slice(-12)}
              </p>
              <p className="text-xs text-muted-foreground capitalize mt-1">
                {primaryWallet.wallet_type}
              </p>
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Connected
            </span>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm mb-3">No wallet connected</p>
            <Button onClick={() => window.location.href = '/wallet'} variant="outline" size="sm">
              Connect Wallet
            </Button>
          </div>
        )}
      </div>

      {/* Mining History */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <History className="h-5 w-5" />
          Mining History
        </h3>
        {historyLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full mx-auto" />
          </div>
        ) : miningHistory.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No mining sessions yet</p>
        ) : (
          <div className="space-y-2">
            {miningHistory.map((session) => (
              <div 
                key={session.id}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <div>
                  <p className="text-sm text-foreground">
                    {formatDate(session.started_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.is_active ? 'In Progress' : session.ended_at ? `Ended ${formatDate(session.ended_at)}` : 'Completed'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-accent">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">+{session.arx_mined}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
