import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Users, Zap, Shield, Sword, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EarningsLeaderboardEntry } from '@/hooks/useArenaMarkets';

interface ArenaTeamLeaderboardProps {
  leaderboard: EarningsLeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
};

const ArenaTeamLeaderboard = ({
  leaderboard,
  currentUserId,
  loading = false,
}: ArenaTeamLeaderboardProps) => {
  const [activeTeam, setActiveTeam] = useState<'alpha' | 'omega'>('alpha');

  const getSortedTeam = (club: 'alpha' | 'omega') => {
    return [...leaderboard]
      .filter((e) => e.club === club)
      .sort((a, b) => {
        const scoreA = (Number(a.total_staked) || 0) + (Number(a.net_profit) || 0);
        const scoreB = (Number(b.total_staked) || 0) + (Number(b.net_profit) || 0);
        return scoreB - scoreA;
      });
  };

  const alphaTeam = getSortedTeam('alpha');
  const omegaTeam = getSortedTeam('omega');

  const alphaStats = {
    totalStaked: alphaTeam.reduce((s, e) => s + (Number(e.total_staked) || 0), 0),
    members: alphaTeam.length,
    totalWins: alphaTeam.reduce((s, e) => s + (Number(e.total_wins) || 0), 0),
  };
  const omegaStats = {
    totalStaked: omegaTeam.reduce((s, e) => s + (Number(e.total_staked) || 0), 0),
    members: omegaTeam.length,
    totalWins: omegaTeam.reduce((s, e) => s + (Number(e.total_wins) || 0), 0),
  };

  const getScore = (e: EarningsLeaderboardEntry) =>
    (Number(e.total_staked) || 0) + (Number(e.net_profit) || 0);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-3"
          style={{ background: 'hsl(215 35% 62% / 0.12)', borderColor: 'hsl(215 35% 62% / 0.3)' }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: 'hsl(215 35% 62%)' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(215 35% 62%)' }}>
            Team Leaderboards
          </span>
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">Alpha vs Omega</h2>
        <p className="text-xs text-muted-foreground mt-1">Ranked by stakes + profit</p>
      </div>

      {/* Team Stats Cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        <motion.div
          whileTap={{ scale: 0.97 }}
          className="rounded-2xl p-4 border cursor-pointer transition-all"
          style={{
            background: 'linear-gradient(135deg, hsl(195 80% 50% / 0.12), hsl(195 80% 50% / 0.04))',
            borderColor: activeTeam === 'alpha' ? 'hsl(195 80% 50% / 0.6)' : 'hsl(195 80% 50% / 0.2)',
          }}
          onClick={() => setActiveTeam('alpha')}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(195 80% 50% / 0.2)' }}>
              <Shield className="w-3.5 h-3.5" style={{ color: 'hsl(195 80% 50%)' }} />
            </div>
            <span className="text-xs font-black" style={{ color: 'hsl(195 80% 50%)' }}>Team Alpha</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Members</span>
              <span className="font-bold text-foreground">{alphaStats.members}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Staked</span>
              <span className="font-bold" style={{ color: 'hsl(195 80% 50%)' }}>{fmt(alphaStats.totalStaked)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Wins</span>
              <span className="font-bold text-green-400">{alphaStats.totalWins}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.97 }}
          className="rounded-2xl p-4 border cursor-pointer transition-all"
          style={{
            background: 'linear-gradient(135deg, hsl(255 60% 65% / 0.12), hsl(255 60% 65% / 0.04))',
            borderColor: activeTeam === 'omega' ? 'hsl(255 60% 65% / 0.6)' : 'hsl(255 60% 65% / 0.2)',
          }}
          onClick={() => setActiveTeam('omega')}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(255 60% 65% / 0.2)' }}>
              <Sword className="w-3.5 h-3.5" style={{ color: 'hsl(255 60% 65%)' }} />
            </div>
            <span className="text-xs font-black" style={{ color: 'hsl(255 60% 65%)' }}>Team Omega</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Members</span>
              <span className="font-bold text-foreground">{omegaStats.members}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Staked</span>
              <span className="font-bold" style={{ color: 'hsl(255 60% 65%)' }}>{fmt(omegaStats.totalStaked)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Wins</span>
              <span className="font-bold text-green-400">{omegaStats.totalWins}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Team Selector Tab Strip */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden border" style={{ borderColor: 'hsl(225 20% 13%)' }}>
          {(['alpha', 'omega'] as const).map((team) => {
            const isActive = activeTeam === team;
            const color = team === 'alpha' ? 'hsl(195 80% 50%)' : 'hsl(255 60% 65%)';
            const Icon = team === 'alpha' ? Shield : Sword;
            const count = team === 'alpha' ? alphaTeam.length : omegaTeam.length;
            return (
              <button
                key={team}
                onClick={() => setActiveTeam(team)}
                className="flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 text-sm font-bold"
                style={{
                  background: isActive ? `${color.replace(')', '')} / 0.12)`.replace('hsl(', 'hsl(') : 'transparent',
                  color: isActive ? color : 'hsl(215 14% 38%)',
                  boxShadow: isActive ? `inset 0 -2px 0 ${color}` : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                {team === 'alpha' ? 'Alpha' : 'Omega'} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Animated Team Roster */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTeam}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="px-4"
        >
          <TeamRoster
            team={activeTeam === 'alpha' ? alphaTeam : omegaTeam}
            isAlpha={activeTeam === 'alpha'}
            currentUserId={currentUserId}
            getScore={getScore}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface TeamRosterProps {
  team: EarningsLeaderboardEntry[];
  isAlpha: boolean;
  currentUserId?: string;
  getScore: (e: EarningsLeaderboardEntry) => number;
}

const TeamRoster = ({ team, isAlpha, currentUserId, getScore }: TeamRosterProps) => {
  const color = isAlpha ? 'hsl(195 80% 50%)' : 'hsl(255 60% 65%)';
  const colorMuted = isAlpha ? 'hsl(195 80% 50% / 0.15)' : 'hsl(255 60% 65% / 0.15)';

  if (team.length === 0) {
    return (
      <div className="py-16 text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No {isAlpha ? 'Alpha' : 'Omega'} members yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Be the first to join and stake!</p>
      </div>
    );
  }

  const top3 = team.slice(0, Math.min(3, team.length));
  const rest = team.slice(top3.length);
  const hasTop3 = top3.length >= 3;

  return (
    <div className="space-y-4">
      {/* Podium */}
      {hasTop3 && (
        <div className="flex items-end justify-center gap-3 pt-4 pb-2">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-1.5"
          >
            <Avatar className="w-12 h-12" style={{ outline: '2px solid hsl(215 18% 40%)', outlineOffset: 2 }}>
              <AvatarImage src={top3[1]?.avatar_url || undefined} />
              <AvatarFallback style={{ background: 'hsl(215 18% 16%)', color: 'hsl(215 18% 60%)', fontWeight: 700 }}>
                {(top3[1]?.username || '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-[10px] font-semibold text-muted-foreground truncate max-w-[68px] text-center">
              {top3[1]?.username || 'Anonymous'}
            </p>
            <p className="text-[10px] font-black" style={{ color }}>{fmt(getScore(top3[1]))}</p>
            <div className="w-14 h-12 rounded-t-xl flex items-center justify-center"
              style={{ background: 'hsl(215 22% 10%)', border: '1px solid hsl(215 22% 18%)' }}>
              <span className="text-2xl font-black" style={{ color: 'hsl(215 18% 45%)' }}>2</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-1.5 -mx-1"
          >
            <div className="relative mb-1">
              <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <Avatar className="w-16 h-16" style={{ outline: `2px solid ${color}`, outlineOffset: 2 }}>
                <AvatarImage src={top3[0]?.avatar_url || undefined} />
                <AvatarFallback style={{ background: colorMuted, color, fontWeight: 700, fontSize: 18 }}>
                  {(top3[0]?.username || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="text-xs font-bold text-foreground truncate max-w-[90px] text-center">
              {top3[0]?.username || 'Anonymous'}
            </p>
            <p className="text-xs font-black" style={{ color }}>{fmt(getScore(top3[0]))}</p>
            <div className="w-16 h-16 rounded-t-xl flex items-center justify-center"
              style={{ background: colorMuted, border: `1px solid ${color}40` }}>
              <Trophy className="w-7 h-7" style={{ color }} />
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-1.5"
          >
            <Avatar className="w-12 h-12" style={{ outline: '2px solid hsl(38 55% 45%)', outlineOffset: 2 }}>
              <AvatarImage src={top3[2]?.avatar_url || undefined} />
              <AvatarFallback style={{ background: 'hsl(38 55% 16%)', color: 'hsl(38 55% 55%)', fontWeight: 700 }}>
                {(top3[2]?.username || '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-[10px] font-semibold text-muted-foreground truncate max-w-[68px] text-center">
              {top3[2]?.username || 'Anonymous'}
            </p>
            <p className="text-[10px] font-black" style={{ color }}>{fmt(getScore(top3[2]))}</p>
            <div className="w-14 h-10 rounded-t-xl flex items-center justify-center"
              style={{ background: 'hsl(38 55% 52% / 0.1)', border: '1px solid hsl(38 55% 52% / 0.25)' }}>
              <span className="text-xl font-black" style={{ color: 'hsl(38 55% 52%)' }}>3</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Row list for #4+ (or all if less than 3 total) */}
      <div className="space-y-2">
        {(hasTop3 ? rest : team).map((entry, idx) => {
          const rank = hasTop3 ? idx + 4 : idx + 1;
          const isMe = entry.user_id === currentUserId;
          const wins = Number(entry.total_wins) || 0;
          const battles = Number(entry.total_battles) || 0;
          const losses = Math.max(0, battles - wins);
          const profit = Number(entry.net_profit) || 0;

          return (
            <motion.div
              key={entry.user_id || `rank-${rank}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.025 }}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl border"
              style={{
                background: isMe ? colorMuted : 'hsl(225 25% 6%)',
                borderColor: isMe ? `${color.replace(')', ' / 0.35)')}` : 'hsl(225 20% 11%)',
              }}
            >
              <div className="w-6 text-center flex-shrink-0">
                {rank <= 3 ? (
                  <Star className="w-3.5 h-3.5 mx-auto text-amber-400" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{rank}</span>
                )}
              </div>

              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback style={{ background: colorMuted, color, fontSize: 12, fontWeight: 700 }}>
                  {(entry.username || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: isMe ? color : 'hsl(215 20% 86%)' }}>
                  {entry.username || 'Anonymous'}
                  {isMe && <span className="text-[10px] ml-1 opacity-50">(You)</span>}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <span className="text-green-400 font-semibold">{wins}W</span>
                  <span>/</span>
                  <span className="text-red-400 font-semibold">{losses}L</span>
                  <span className="opacity-40">•</span>
                  <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {profit >= 0 ? '+' : ''}{fmt(profit)}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black" style={{ color }}>{fmt(getScore(entry))}</p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ArenaTeamLeaderboard;
