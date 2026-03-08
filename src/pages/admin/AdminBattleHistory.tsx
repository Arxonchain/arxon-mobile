import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Zap, TrendingUp, Clock, CheckCircle, XCircle, RefreshCw, Crown, Medal, Target, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ResolvedBattle {
  id: string;
  title: string;
  description: string | null;
  side_a_name: string;
  side_a_color: string;
  side_b_name: string;
  side_b_color: string;
  side_a_power: number;
  side_b_power: number;
  side_c_name: string | null;
  side_c_power: number;
  winner_side: string;
  prize_pool: number;
  bonus_percentage: number;
  total_participants: number;
  total_rewards_distributed: number;
  category: string;
  starts_at: string;
  ends_at: string;
  outcome_verified: boolean;
  created_at: string;
}

interface BattleEarning {
  id: string;
  user_id: string;
  battle_id: string;
  stake_amount: number;
  total_earned: number;
  bonus_earned: number;
  pool_share_earned: number;
  streak_bonus: number;
  is_winner: boolean;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

const AdminBattleHistory = () => {
  const [battles, setBattles] = useState<ResolvedBattle[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<ResolvedBattle | null>(null);
  const [earnings, setEarnings] = useState<BattleEarning[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchBattles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('arena_battles')
        .select('*')
        .not('winner_side', 'is', null)
        .order('ends_at', { ascending: false });

      if (error) throw error;
      setBattles((data || []) as ResolvedBattle[]);
    } catch (err) {
      toast.error('Failed to load resolved battles');
    } finally {
      setLoading(false);
    }
  };

  const fetchBattleEarnings = async (battleId: string) => {
    setLoadingEarnings(true);
    try {
      const { data, error } = await supabase
        .from('arena_earnings')
        .select('*')
        .eq('battle_id', battleId)
        .order('total_earned', { ascending: false });

      if (error) throw error;
      setEarnings(data || []);

      // Fetch profiles for earnings users
      const userIds = [...new Set((data || []).map(e => e.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        
        const map = new Map<string, UserProfile>();
        (profileData || []).forEach(p => map.set(p.user_id, p));
        setProfiles(map);
      }
    } catch (err) {
      toast.error('Failed to load battle earnings');
    } finally {
      setLoadingEarnings(false);
    }
  };

  useEffect(() => { fetchBattles(); }, []);

  useEffect(() => {
    if (selectedBattle) {
      fetchBattleEarnings(selectedBattle.id);
    }
  }, [selectedBattle?.id]);

  // Stats
  const totalDistributed = battles.reduce((sum, b) => sum + (b.total_rewards_distributed || 0), 0);
  const totalParticipants = battles.reduce((sum, b) => sum + (b.total_participants || 0), 0);
  const totalStaked = battles.reduce((sum, b) => sum + b.side_a_power + b.side_b_power + (b.side_c_power || 0), 0);
  const avgRewardPerBattle = battles.length > 0 ? totalDistributed / battles.length : 0;

  const getWinnerName = (battle: ResolvedBattle) => {
    if (battle.winner_side === 'a') return battle.side_a_name;
    if (battle.winner_side === 'c') return battle.side_c_name || 'Draw';
    if (battle.winner_side === 'b') return battle.side_b_name;
    return 'No Winner';
  };

  const getWinnerColor = (battle: ResolvedBattle) => {
    if (battle.winner_side === 'a') return battle.side_a_color;
    if (battle.winner_side === 'b') return battle.side_b_color;
    return '#FFD700';
  };

  const winnersInBattle = earnings.filter(e => e.is_winner);
  const losersInBattle = earnings.filter(e => !e.is_winner);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Battle History</h1>
          <p className="text-muted-foreground">Resolved battles, rewards & statistics</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchBattles}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{battles.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Math.round(totalDistributed).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Distributed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Target className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Math.round(totalStaked).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Staked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalParticipants}</p>
                <p className="text-sm text-muted-foreground">Total Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Battle List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Resolved Battles</CardTitle>
            <CardDescription>{battles.length} battles</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : battles.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No resolved battles yet</p>
            ) : (
              battles.map(battle => (
                <motion.div
                  key={battle.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedBattle(battle)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedBattle?.id === battle.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getWinnerColor(battle) }} />
                    <span className="text-xs font-medium" style={{ color: getWinnerColor(battle) }}>
                      {getWinnerName(battle)} Won
                    </span>
                    {(battle.total_rewards_distributed || 0) === 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">No rewards</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{battle.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{battle.total_participants || 0} voters</span>
                    <span>{Math.round(battle.total_rewards_distributed || 0).toLocaleString()} distributed</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(battle.ends_at), 'MMM d, yyyy')}
                  </p>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Battle Detail */}
        <Card className="lg:col-span-2">
          {selectedBattle ? (
            <>
              <CardHeader>
                <CardTitle className="text-lg">{selectedBattle.title}</CardTitle>
                <CardDescription>
                  Resolved {format(new Date(selectedBattle.ends_at), 'MMM d, yyyy HH:mm')} UTC
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="winners">Winners ({winnersInBattle.length})</TabsTrigger>
                    <TabsTrigger value="losers">Losers ({losersInBattle.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <div className="space-y-4">
                      {/* Result Banner */}
                      <div className="p-4 rounded-xl border-2" style={{ borderColor: getWinnerColor(selectedBattle) + '60', background: getWinnerColor(selectedBattle) + '10' }}>
                        <div className="flex items-center gap-3">
                          <Crown className="w-6 h-6" style={{ color: getWinnerColor(selectedBattle) }} />
                          <div>
                            <p className="font-bold text-foreground">{getWinnerName(selectedBattle)} Won!</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedBattle.outcome_verified ? 'Admin verified' : 'Auto resolved'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pool Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Side A ({selectedBattle.side_a_name})</p>
                          <p className="text-lg font-bold text-foreground">{Math.round(selectedBattle.side_a_power).toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Side B ({selectedBattle.side_b_name})</p>
                          <p className="text-lg font-bold text-foreground">{Math.round(selectedBattle.side_b_power).toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Prize Pool</p>
                          <p className="text-lg font-bold text-primary">{Math.round(selectedBattle.prize_pool || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Total Distributed</p>
                          <p className="text-lg font-bold text-green-500">{Math.round(selectedBattle.total_rewards_distributed || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Bonus %</p>
                          <p className="text-lg font-bold text-foreground">{selectedBattle.bonus_percentage}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Participants</p>
                          <p className="text-lg font-bold text-foreground">{selectedBattle.total_participants || 0}</p>
                        </div>
                      </div>

                      {/* Power Distribution Bar */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Power Distribution</p>
                        <div className="h-6 rounded-full overflow-hidden flex">
                          {selectedBattle.side_a_power > 0 && (
                            <div 
                              className="h-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ 
                                width: `${(selectedBattle.side_a_power / (selectedBattle.side_a_power + selectedBattle.side_b_power)) * 100}%`,
                                backgroundColor: selectedBattle.side_a_color 
                              }}
                            >
                              {Math.round((selectedBattle.side_a_power / (selectedBattle.side_a_power + selectedBattle.side_b_power)) * 100)}%
                            </div>
                          )}
                          {selectedBattle.side_b_power > 0 && (
                            <div 
                              className="h-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ 
                                width: `${(selectedBattle.side_b_power / (selectedBattle.side_a_power + selectedBattle.side_b_power)) * 100}%`,
                                backgroundColor: selectedBattle.side_b_color 
                              }}
                            >
                              {Math.round((selectedBattle.side_b_power / (selectedBattle.side_a_power + selectedBattle.side_b_power)) * 100)}%
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{selectedBattle.side_a_name}</span>
                          <span>{selectedBattle.side_b_name}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="winners">
                    {loadingEarnings ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />)}
                      </div>
                    ) : winnersInBattle.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No winners</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {winnersInBattle.map((earning, idx) => {
                          const profile = profiles.get(earning.user_id);
                          return (
                            <div key={earning.id} className="flex items-center gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                              <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{idx + 1}</span>
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {profile?.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{profile?.username || 'Anonymous'}</p>
                                <p className="text-xs text-muted-foreground">Staked: {Math.round(earning.stake_amount).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-500">+{Math.round(earning.total_earned).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                  {earning.stake_amount > 0 ? `${(earning.total_earned / earning.stake_amount).toFixed(1)}x` : '0x'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="losers">
                    {loadingEarnings ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />)}
                      </div>
                    ) : losersInBattle.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No losers</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {losersInBattle.map((earning, idx) => {
                          const profile = profiles.get(earning.user_id);
                          return (
                            <div key={earning.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-500/10 bg-red-500/5">
                              <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{idx + 1}</span>
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {profile?.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{profile?.username || 'Anonymous'}</p>
                                <p className="text-xs text-muted-foreground">Lost: {Math.round(earning.stake_amount).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-red-400">-{Math.round(earning.stake_amount).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">0x return</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Select a battle to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminBattleHistory;
