import { motion } from 'framer-motion';
import { Shield, Sword, Zap, LayoutGrid } from 'lucide-react';

interface ArenaTournamentHeaderProps {
  alphaStaked: number;
  omegaStaked: number;
  alphaMembers: number;
  omegaMembers: number;
  totalChallenges?: number;
  totalStaked?: number;
  alphaPool?: number;
  omegaPool?: number;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const ArenaTournamentHeader = ({
  alphaStaked,
  omegaStaked,
  alphaMembers,
  omegaMembers,
  totalChallenges,
  totalStaked,
}: ArenaTournamentHeaderProps) => {
  const total = alphaStaked + omegaStaked;
  const alphaPercent = total > 0 ? (alphaStaked / total) * 100 : 50;
  const omegaPercent = 100 - alphaPercent;

  const ALPHA_COLOR = 'hsl(195 80% 50%)';
  const OMEGA_COLOR = 'hsl(255 60% 65%)';

  return (
    <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(225 30% 5%) 0%, hsl(225 30% 3%) 100%)' }}>
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -left-20 top-0 w-56 h-56 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${ALPHA_COLOR}, transparent 70%)` }}
          animate={{ opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute -right-20 top-0 w-56 h-56 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${OMEGA_COLOR}, transparent 70%)` }}
          animate={{ opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 4, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="relative z-10 px-4 pt-4 pb-3">
        {/* Title */}
        <div className="text-center mb-4">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-black tracking-[0.3em] uppercase mb-1"
            style={{ color: ALPHA_COLOR }}
          >
            Prediction Arena
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-xl font-black text-foreground tracking-tight"
          >
            STAKE • PREDICT •{' '}
            <span style={{ color: ALPHA_COLOR }}>WIN</span>
          </motion.h1>
        </div>

        {/* Alpha VS Omega cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-stretch gap-3"
        >
          {/* Alpha */}
          <div
            className="flex-1 rounded-2xl p-3 border relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(195 80% 50% / 0.18), hsl(195 80% 50% / 0.05))',
              borderColor: 'hsl(195 80% 50% / 0.35)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(195 80% 50% / 0.2)' }}>
                <Shield className="w-4 h-4" style={{ color: ALPHA_COLOR }} />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Team</p>
                <p className="text-sm font-black" style={{ color: ALPHA_COLOR }}>ALPHA</p>
              </div>
            </div>
            <p className="text-lg font-black text-foreground leading-none">
              {fmt(alphaStaked)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">ARX-P</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{alphaMembers} members</p>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center justify-center flex-shrink-0">
            <motion.div
              className="w-11 h-11 rounded-full flex items-center justify-center border-2"
              style={{
                background: 'hsl(225 30% 5%)',
                borderColor: 'hsl(215 35% 62% / 0.35)',
                boxShadow: '0 0 20px hsl(215 35% 62% / 0.15)',
              }}
              animate={{ boxShadow: ['0 0 12px hsl(215 35% 62% / 0.1)', '0 0 24px hsl(215 35% 62% / 0.3)', '0 0 12px hsl(215 35% 62% / 0.1)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <span className="text-xs font-black" style={{ color: 'hsl(215 35% 62%)' }}>VS</span>
            </motion.div>
          </div>

          {/* Omega */}
          <div
            className="flex-1 rounded-2xl p-3 border relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(255 60% 65% / 0.18), hsl(255 60% 65% / 0.05))',
              borderColor: 'hsl(255 60% 65% / 0.35)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(255 60% 65% / 0.2)' }}>
                <Sword className="w-4 h-4" style={{ color: OMEGA_COLOR }} />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Team</p>
                <p className="text-sm font-black" style={{ color: OMEGA_COLOR }}>OMEGA</p>
              </div>
            </div>
            <p className="text-lg font-black text-foreground leading-none">
              {fmt(omegaStaked)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">ARX-P</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{omegaMembers} members</p>
          </div>
        </motion.div>

        {/* Power bar */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black" style={{ color: ALPHA_COLOR, minWidth: 28 }}>
              {alphaPercent.toFixed(0)}%
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(225 22% 12%)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${ALPHA_COLOR}, ${OMEGA_COLOR})` }}
                initial={{ width: '50%' }}
                animate={{ width: `${alphaPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] font-black" style={{ color: OMEGA_COLOR, minWidth: 28, textAlign: 'right' }}>
              {omegaPercent.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Stats row — mimics the 4-col stats banner from screenshots */}
        <div
          className="mt-3 grid grid-cols-4 rounded-2xl overflow-hidden border"
          style={{ borderColor: 'hsl(225 20% 13%)', background: 'hsl(225 25% 6%)' }}
        >
          {[
            { icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Challenges', value: totalChallenges ?? '—' },
            { icon: <Zap className="w-3.5 h-3.5" />, label: 'Total Staked', value: totalStaked != null ? fmt(totalStaked) : '—' },
            { icon: <Shield className="w-3.5 h-3.5" style={{ color: ALPHA_COLOR }} />, label: 'Alpha Pool', value: fmt(alphaStaked) },
            { icon: <Sword className="w-3.5 h-3.5" style={{ color: OMEGA_COLOR }} />, label: 'Omega Pool', value: fmt(omegaStaked) },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center py-3 gap-1"
              style={{ borderRight: i < 3 ? '1px solid hsl(225 20% 13%)' : 'none' }}
            >
              <span className="text-muted-foreground">{s.icon}</span>
              <p className="text-sm font-black text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted-foreground leading-none">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArenaTournamentHeader;
