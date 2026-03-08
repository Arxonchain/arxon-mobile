import { motion } from 'framer-motion';
import type { ArenaMarket } from '@/hooks/useArenaMarkets';

interface CategoryBannerProps {
  market: ArenaMarket;
}

const categoryConfig: Record<string, {
  gradient: string;
  borderColor: string;
  icon: string;
  bgPattern: string;
}> = {
  sports: {
    gradient: 'from-green-600/90 via-emerald-500/80 to-teal-500/70',
    borderColor: 'border-green-400/50',
    icon: '⚽',
    bgPattern: 'radial-gradient(ellipse at top right, rgba(34, 197, 94, 0.3), transparent 50%), radial-gradient(ellipse at bottom left, rgba(20, 184, 166, 0.2), transparent 50%)',
  },
  politics: {
    gradient: 'from-blue-600/90 via-indigo-500/80 to-purple-500/70',
    borderColor: 'border-blue-400/50',
    icon: '🏛️',
    bgPattern: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.3), transparent 50%), radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.2), transparent 50%)',
  },
  crypto: {
    gradient: 'from-orange-600/90 via-amber-500/80 to-yellow-500/70',
    borderColor: 'border-orange-400/50',
    icon: '₿',
    bgPattern: 'radial-gradient(ellipse at top right, rgba(249, 115, 22, 0.3), transparent 50%), radial-gradient(ellipse at bottom left, rgba(234, 179, 8, 0.2), transparent 50%)',
  },
  entertainment: {
    gradient: 'from-pink-600/90 via-purple-500/80 to-violet-500/70',
    borderColor: 'border-pink-400/50',
    icon: '🎬',
    bgPattern: 'radial-gradient(ellipse at top right, rgba(236, 72, 153, 0.3), transparent 50%), radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.2), transparent 50%)',
  },
  other: {
    gradient: 'from-slate-600/90 via-gray-500/80 to-zinc-500/70',
    borderColor: 'border-slate-400/50',
    icon: '📊',
    bgPattern: 'radial-gradient(ellipse at top right, rgba(100, 116, 139, 0.3), transparent 50%), radial-gradient(ellipse at bottom left, rgba(113, 113, 122, 0.2), transparent 50%)',
  },
};

const CategoryBanner = ({ market }: CategoryBannerProps) => {
  const config = categoryConfig[market.category] || categoryConfig.other;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br ${config.gradient}
        ${config.borderColor} border
        p-4 sm:p-6
        shadow-2xl
      `}
      style={{ backgroundImage: config.bgPattern }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-32 h-32 rounded-full bg-white/10 blur-3xl"
          animate={{
            x: [0, 20, 0],
            y: [0, -10, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '-20%', right: '-10%' }}
        />
        <motion.div
          className="absolute w-24 h-24 rounded-full bg-white/5 blur-2xl"
          animate={{
            x: [0, -15, 0],
            y: [0, 15, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ bottom: '-10%', left: '-5%' }}
        />
      </div>

      {/* Category badge */}
      <div className="relative z-10 flex items-center gap-2 mb-3">
        <span className="text-2xl">{config.icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-white/80">
          {market.category}
        </span>
        {market.is_active && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="relative z-10 text-xl sm:text-2xl font-bold text-white leading-tight mb-4">
        {market.title}
      </h2>

      {/* VS Section */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-xl flex items-center justify-center text-2xl font-bold mb-2 shadow-lg"
            style={{ backgroundColor: `${market.side_a_color}40`, borderColor: market.side_a_color, borderWidth: 2 }}
          >
            {market.side_a_name.charAt(0)}
          </div>
          <p className="text-sm font-bold text-white truncate">{market.side_a_name}</p>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-black text-white/50">VS</span>
        </div>

        <div className="flex-1 text-center">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-xl flex items-center justify-center text-2xl font-bold mb-2 shadow-lg"
            style={{ backgroundColor: `${market.side_b_color}40`, borderColor: market.side_b_color, borderWidth: 2 }}
          >
            {market.side_b_name.charAt(0)}
          </div>
          <p className="text-sm font-bold text-white truncate">{market.side_b_name}</p>
        </div>
      </div>

      {/* Prize pool */}
      {market.prize_pool > 0 && (
        <div className="relative z-10 mt-4 pt-4 border-t border-white/20 text-center">
          <span className="text-xs text-white/60">Prize Pool</span>
          <p className="text-xl font-black text-white">
            {market.prize_pool >= 1000000 
              ? `${(market.prize_pool / 1000000).toFixed(1)}M` 
              : market.prize_pool >= 1000
                ? `${(market.prize_pool / 1000).toFixed(0)}K`
                : market.prize_pool.toLocaleString()
            } ARX-P
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default CategoryBanner;
