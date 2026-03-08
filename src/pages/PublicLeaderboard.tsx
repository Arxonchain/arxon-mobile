import { memo } from "react";
import { Clock, Zap, Trophy, TrendingUp, LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { usePoints } from "@/hooks/usePoints";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import AnimatedBackground from "@/components/layout/AnimatedBackground";

const getRankIcon = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
};

const formatPoints = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(num) || isNaN(num)) return "0";
  const capped = Math.min(Math.max(num, 0), 1_000_000_000);
  return capped.toLocaleString();
};

const MinerEntry = memo(({ user, index, isCurrentUser }: { user: any; index: number; isCurrentUser?: boolean }) => (
  <div className={`glass-card p-3 sm:p-4 ${isCurrentUser ? 'border-2 border-accent/50 bg-accent/5' : ''}`}>
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 border-accent/30">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-steel to-steel-light text-white font-bold text-sm sm:text-base">
              {user.username?.charAt(0)?.toUpperCase() || "M"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-background border border-border flex items-center justify-center text-[10px] sm:text-xs font-bold">
            {getRankIcon(index)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-semibold text-sm sm:text-base text-foreground">
              {user.username || `Miner ${user.user_id.slice(0, 6)}`}
            </span>
            {isCurrentUser && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">You</span>
            )}
          </div>
          <span className="text-muted-foreground text-xs sm:text-sm">Rank #{index + 1}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-xs lg:text-sm text-muted-foreground w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-accent" />
          <span className="text-foreground font-semibold">{formatPoints(user.total_points)}</span> pts
        </div>
      </div>
    </div>
  </div>
));
MinerEntry.displayName = "MinerEntry";

const PublicLeaderboard = () => {
  const { leaderboard: minerEntries, loading } = useLeaderboard(100);
  const { points, rank } = usePoints();
  const { user } = useAuth();

  const userInTop100 = user ? minerEntries.find(e => e.user_id === user.id) : null;

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />
      
      <main className="relative z-10 p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Mining Leaderboard</h1>

          {/* User's own rank card - visible for logged-in users */}
          {user && points && (
            <div className="glass-card p-4 border-2 border-accent/50 bg-accent/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-2xl font-bold text-foreground">
                      #{rank || '—'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Your Points</p>
                  <p className="text-xl font-bold text-accent flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    {formatPoints(points.total_points)}
                  </p>
                </div>
                {!userInTop100 && rank && rank > 100 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">{rank - 100} positions to Top 100</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA for non-authenticated users */}
          {!user && (
            <div className="glass-card p-4 border border-accent/30 bg-accent/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Join the Competition!</h3>
                  <p className="text-sm text-muted-foreground">Sign up to start mining and climb the leaderboard</p>
                </div>
                <Button className="btn-glow btn-mining">
                  <LogIn className="h-4 w-4 mr-2" />
                  Start Mining
                </Button>
              </div>
            </div>
          )}

          <div className="glass-card p-3 sm:p-4 flex items-center gap-2 border-solid">
            <Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-accent shrink-0" />
            <span className="text-xs sm:text-sm lg:text-base text-foreground">Arena Battles coming soon! Stay tuned for epic competitions.</span>
          </div>

          <div className="glass-card p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5 lg:mb-6">
              <Zap className="h-5 w-5 text-accent" />
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">
                Top 100 Miners
              </h2>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              ) : minerEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No miners yet. Start mining to join the leaderboard!</p>
                </div>
              ) : (
                minerEntries.map((miner, index) => (
                  <MinerEntry 
                    key={miner.user_id} 
                    user={miner} 
                    index={index}
                    isCurrentUser={user?.id === miner.user_id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicLeaderboard;
