import { useMemo } from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp, Users, Zap, Activity } from "lucide-react";
import arxonLogo from "@/assets/arxon-logo-new.jpg";
import GlobeMap from "@/components/admin/GlobeMap";
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
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", miners: 285, color: "#ec4899" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", miners: 210, color: "#d946ef" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", miners: 195, color: "#0ea5e9" },
  { code: "CA", name: "Canada", flag: "🇨🇦", miners: 185, color: "#10b981" },
  { code: "AE", name: "UAE", flag: "🇦🇪", miners: 155, color: "#6366f1" },
  { code: "DE", name: "Germany", flag: "🇩🇪", miners: 145, color: "#e11d48" },
];

const TOTAL_MINERS = MINING_COUNTRIES.reduce((sum, c) => sum + c.miners, 0);

const AdminGlobalMap = () => {
  const sorted = useMemo(() => [...MINING_COUNTRIES].sort((a, b) => b.miners - a.miners), []);
  const topRow = sorted.slice(0, 8);
  const bottomRow = sorted.slice(8, 16);

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-hidden">
      {/* Subtle ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-[#4a9eff]/[0.04] rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-8 md:px-10 md:py-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-4">
            <img src={arxonLogo} alt="Arxon" className="w-11 h-11 rounded-xl ring-1 ring-white/10" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-none">
                Global Mining Network
              </h1>
              <p className="text-white/40 text-xs mt-1 tracking-wide uppercase">
                Live mining activity · {MINING_COUNTRIES.length} countries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-white/50 font-medium">Live</span>
          </div>
        </motion.header>

        {/* Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-4 gap-3 mb-10"
        >
          {[
            { icon: Globe, label: "Countries", value: MINING_COUNTRIES.length.toString() },
            { icon: Users, label: "Total Miners", value: TOTAL_MINERS.toLocaleString() },
            { icon: Zap, label: "ARX Mined", value: "3.8M" },
            { icon: Activity, label: "Active Now", value: "4,289" },
          ].map((s, i) => (
            <div key={s.label} className="bg-white/[0.025] border border-white/[0.06] rounded-xl px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="w-3.5 h-3.5 text-[#4a9eff]/70" />
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">{s.label}</span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold tracking-tight">{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* 3D Globe with Country Markers */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 md:p-6 mb-8 flex items-center justify-center"
        >
          <GlobeMap />
        </motion.section>

        {/* Chart: Top Mining Countries by % */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4a9eff]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">
                Top Mining Countries
              </h2>
            </div>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">by % of total miners</span>
          </div>

          <div className="space-y-3">
            {sorted.map((c, i) => {
              const pct = (c.miners / TOTAL_MINERS) * 100;
              return (
                <motion.div
                  key={c.code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.025 }}
                  className="flex items-center gap-3"
                >
                  {/* Rank */}
                  <span className="w-5 text-right text-[11px] font-bold text-white/20 tabular-nums">{i + 1}</span>

                  {/* Flag */}
                  <span className="text-xl w-7 text-center">{c.flag}</span>

                  {/* Name */}
                  <span className="w-28 md:w-36 text-sm font-semibold text-white/80 truncate">{c.name}</span>

                  {/* Bar */}
                  <div className="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + i * 0.03, duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-md"
                      style={{ background: `linear-gradient(90deg, ${c.color}22, ${c.color}aa)` }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/80">
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10 text-center"
        >
          <p className="text-white/15 text-xs tracking-widest uppercase">
            Powered by{" "}
            <span className="font-extrabold bg-gradient-to-r from-[#4a9eff] to-[#00d4ff] bg-clip-text text-transparent text-sm">
              ARXON
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminGlobalMap;
