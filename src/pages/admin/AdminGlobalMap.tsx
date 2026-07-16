import { useMemo } from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp, Users, Zap, Activity, Loader2 } from "lucide-react";
import arxonLogo from "@/assets/arxon-icon.svg";
import GlobeMap from "@/components/admin/GlobeMap";
import { useAdminStats, formatNumber } from "@/hooks/useAdminStats";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

/** Estimated regional distribution for visualization (no country field on profiles yet). */
const MINING_COUNTRIES = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", miners: 4850, color: "#22c55e" },
  { code: "IN", name: "India", flag: "🇮🇳", miners: 1580, color: "#f97316" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", miners: 920, color: "#eab308" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", miners: 710, color: "#14b8a6" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", miners: 680, color: "#14b8a6" },
  { code: "US", name: "United States", flag: "🇺🇸", miners: 620, color: "#3b82f6" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", miners: 535, color: "#f43f5e" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", miners: 420, color: "#84cc16" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", miners: 390, color: "#ef4444" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", miners: 390, color: "#f59e0b" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", miners: 380, color: "#06b6d4" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", miners: 350, color: "#8b5cf6" },
];

const ESTIMATED_TOTAL = MINING_COUNTRIES.reduce((sum, c) => sum + c.miners, 0);

const AdminGlobalMap = () => {
  const { data: stats, isLoading } = useAdminStats();
  const sorted = useMemo(() => [...MINING_COUNTRIES].sort((a, b) => b.miners - a.miners), []);

  const liveMetrics = [
    { icon: Globe, label: "Countries", value: MINING_COUNTRIES.length.toString() },
    { icon: Users, label: "Total Users", value: isLoading ? "…" : formatNumber(stats?.totalUsers || 0) },
    { icon: Zap, label: "Total ARX-P", value: isLoading ? "…" : formatNumber(stats?.totalPoints || 0) },
    { icon: Activity, label: "Active Now", value: isLoading ? "…" : formatNumber(stats?.activeMiners || 0) },
  ];

  return (
    <div className="rounded-2xl bg-[#050508] text-white overflow-hidden border border-white/[0.06]">
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <AdminPageHeader
          title="Global Mining Network"
          description="Live platform stats · regional map uses estimated distribution until geo data is collected"
          className="mb-8 [&_h1]:text-white [&_p]:text-white/45"
          actions={
            isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            ) : (
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-white/50 font-medium">
                  {stats?.activeMiners || 0} mining now
                </span>
              </div>
            )
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-8"
        >
          {liveMetrics.map((s) => (
            <div key={s.label} className="bg-white/[0.025] border border-white/[0.06] rounded-xl px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="w-3.5 h-3.5 text-[#4a9eff]/70" />
                <span className="text-[9px] sm:text-[10px] text-white/30 uppercase tracking-widest font-semibold">{s.label}</span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight">{s.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 sm:p-4 md:p-6 mb-6 flex items-center justify-center overflow-hidden"
        >
          <GlobeMap />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-6 md:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4a9eff]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">
                Top Mining Countries
              </h2>
            </div>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Estimated · marketing view</span>
          </div>

          <div className="space-y-3">
            {sorted.map((c, i) => {
              const pct = (c.miners / ESTIMATED_TOTAL) * 100;
              return (
                <motion.div
                  key={c.code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.02 }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  <span className="w-4 sm:w-5 text-right text-[10px] sm:text-[11px] font-bold text-white/20 tabular-nums">{i + 1}</span>
                  <span className="text-lg sm:text-xl w-6 sm:w-7 text-center shrink-0">{c.flag}</span>
                  <span className="w-20 sm:w-28 md:w-36 text-xs sm:text-sm font-semibold text-white/80 truncate">{c.name}</span>
                  <div className="flex-1 h-5 sm:h-6 bg-white/[0.03] rounded-md overflow-hidden relative min-w-0">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.4 + i * 0.02, duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-md"
                      style={{ background: `linear-gradient(90deg, ${c.color}22, ${c.color}aa)` }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-bold text-white/80">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AdminGlobalMap;
