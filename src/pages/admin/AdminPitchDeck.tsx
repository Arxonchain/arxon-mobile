import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid3X3, Maximize, Minimize, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import arxonLogo from "@/assets/arxon-logo-new.jpg";
import miningScreenshot from "@/assets/mining-screenshot.jpg";
import walletScreenshot from "@/assets/wallet-screenshot.jpg";

/* ── Real signup data from database ── */
const REAL_DAILY_SIGNUPS = [
  { day: "Dec 31", signups: 1, cumulative: 1 },
  { day: "Jan 1", signups: 32, cumulative: 33 },
  { day: "Jan 2", signups: 177, cumulative: 210 },
  { day: "Jan 3", signups: 656, cumulative: 866 },
  { day: "Jan 4", signups: 367, cumulative: 1233 },
  { day: "Jan 5", signups: 170, cumulative: 1403 },
  { day: "Jan 6", signups: 94, cumulative: 1497 },
  { day: "Jan 7", signups: 154, cumulative: 1651 },
  { day: "Jan 8", signups: 217, cumulative: 1868 },
  { day: "Jan 9", signups: 112, cumulative: 1980 },
  { day: "Jan 10", signups: 302, cumulative: 2282 },
  { day: "Jan 11", signups: 288, cumulative: 2570 },
  { day: "Jan 12", signups: 175, cumulative: 2745 },
  { day: "Jan 13", signups: 347, cumulative: 3092 },
  { day: "Jan 14", signups: 152, cumulative: 3244 },
  { day: "Jan 15", signups: 104, cumulative: 3348 },
  { day: "Jan 16", signups: 113, cumulative: 3461 },
  { day: "Jan 17", signups: 597, cumulative: 4058 },
  { day: "Jan 18", signups: 347, cumulative: 4405 },
  { day: "Jan 19", signups: 117, cumulative: 4522 },
  { day: "Jan 20", signups: 118, cumulative: 4640 },
  { day: "Jan 21", signups: 49, cumulative: 4689 },
  { day: "Jan 22", signups: 66, cumulative: 4755 },
  { day: "Jan 23", signups: 113, cumulative: 4868 },
  { day: "Jan 24", signups: 663, cumulative: 5531 },
  { day: "Jan 25", signups: 4338, cumulative: 9869 },
];

const WEEKLY_SIGNUPS = [
  { week: "W1", signups: 1233 },
  { week: "W2", signups: 1337 },
  { week: "W3", signups: 1835 },
  { week: "W4", signups: 5464 },
];

/* ── Shared Components ── */

const SlideWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("w-full h-full flex flex-col justify-center items-center relative overflow-hidden", className)}>
    {children}
  </div>
);

const SlideBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold border border-[hsl(215,50%,70%/0.3)] text-[hsl(215,50%,70%)] bg-[hsl(215,50%,70%/0.06)] mb-5">
    {children}
  </span>
);

const Stat = ({ value, label, sub }: { value: string; label: string; sub?: string }) => (
  <div className="text-center">
    <div className="text-3xl md:text-4xl font-black text-[hsl(215,50%,80%)]">{value}</div>
    <div className="text-[10px] text-[hsl(220,15%,55%)] mt-1.5 uppercase tracking-[0.15em] font-bold">{label}</div>
    {sub && <div className="text-[9px] text-[hsl(220,15%,42%)] mt-0.5">{sub}</div>}
  </div>
);

const SlideBg = () => <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,18%,4%)] via-[hsl(220,15%,5%)] to-[hsl(220,12%,3%)]" />;

/* ── Custom Tooltip for Charts ── */
const ChartTooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,20%)] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[hsl(220,15%,55%)] font-bold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-bold" style={{ color: p.color }}>{p.value.toLocaleString()} {p.name}</p>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   SLIDE 1: Cover
   ══════════════════════════════════════════════════════════════ */
const Slide1Cover = () => (
  <SlideWrapper>
    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,18%,4%)] via-[hsl(220,22%,7%)] to-[hsl(220,15%,2%)]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[hsl(215,50%,60%/0.03)] blur-[120px]" />
    <div className="absolute top-20 right-20 w-[300px] h-[300px] rounded-full bg-[hsl(200,60%,50%/0.02)] blur-[80px]" />
    <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-3xl">
      <div className="mb-10 flex items-center gap-4">
        <img src={arxonLogo} alt="Arxon" className="w-14 h-14 rounded-2xl object-cover shadow-[0_0_30px_hsl(215,50%,60%/0.15)]" />
        <span className="text-3xl font-black tracking-[0.2em] text-[hsl(220,20%,95%)]">ARXON</span>
      </div>
      <h1 className="text-6xl md:text-8xl font-black leading-[1.02] mb-5">
        <span className="text-[hsl(220,20%,95%)]">Privacy You </span>
        <span className="bg-gradient-to-r from-[hsl(215,50%,70%)] to-[hsl(200,60%,55%)] bg-clip-text text-transparent">Control</span>
      </h1>
      <p className="text-lg text-[hsl(220,15%,50%)] max-w-lg mb-12 font-medium leading-relaxed">
        Layer-1 blockchain with toggle privacy for payments and governance
      </p>
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(215,50%,55%)] to-[hsl(220,40%,45%)] flex items-center justify-center text-white text-sm font-black shadow-[0_0_20px_hsl(215,50%,60%/0.3)]">GA</div>
        <div className="text-left">
          <div className="text-base font-bold text-[hsl(220,20%,92%)]">Gabe Ademibo</div>
          <div className="text-xs text-[hsl(220,15%,50%)] font-medium">Founder & CEO</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[hsl(220,15%,35%)] font-bold">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
        Pre-Seed · Confidential
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 2: The Problem
   ══════════════════════════════════════════════════════════════ */
const Slide2Problem = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[hsl(0,30%,8%/0.2)] to-transparent" />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>The Problem</SlideBadge>
      <h2 className="text-4xl md:text-5xl font-black text-[hsl(220,20%,95%)] leading-[1.1] mb-10">
        2 Billion People Can't Use<br />Blockchain <span className="text-[hsl(0,65%,58%)]">Safely</span>
      </h2>
      <div className="grid grid-cols-3 gap-5 mb-10">
        {[
          { stat: "$905B", label: "Global Remittances", sub: "World Bank/Visa 2024–2025", icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          )},
          { stat: "1.3B", label: "Unbanked at Risk", sub: "Face surveillance & high fees", icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          )},
          { stat: "100%", label: "TX Exposed", sub: "On public ledgers", icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          )},
        ].map((item, i) => (
          <div key={i} className="bg-[hsl(220,15%,6%/0.8)] backdrop-blur border border-[hsl(220,15%,14%)] rounded-2xl p-6 text-center group hover:border-[hsl(220,15%,22%)] transition-all">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[hsl(0,50%,50%/0.1)] flex items-center justify-center text-[hsl(0,60%,60%)]">{item.icon}</div>
            <div className="text-3xl font-black text-[hsl(215,50%,80%)]">{item.stat}</div>
            <div className="text-xs text-[hsl(220,20%,85%)] font-bold mt-2">{item.label}</div>
            <div className="text-[10px] text-[hsl(220,15%,42%)] mt-1">{item.sub}</div>
          </div>
        ))}
      </div>
      <div className="border-l-2 border-[hsl(0,60%,45%/0.5)] pl-5 py-1">
        <p className="text-sm text-[hsl(220,15%,55%)] leading-relaxed">
          Public ledgers expose every transaction — the majority of users avoid or limit blockchain use.
          <span className="text-[hsl(220,20%,88%)] font-bold"> Financial privacy for the underserved is the singular focus.</span>
        </p>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 3: Market Timing
   ══════════════════════════════════════════════════════════════ */
const Slide3Timing = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Market Timing</SlideBadge>
      <h2 className="text-4xl md:text-5xl font-black text-[hsl(220,20%,95%)] leading-tight mb-10">
        The Market Is <span className="text-[hsl(215,50%,70%)]">Ready</span>
      </h2>
      <div className="space-y-3 mb-10">
        {[
          { date: "Oct 2025", text: "Ethereum Foundation launches Privacy Cluster", icon: (
            <div className="w-8 h-8 rounded-lg bg-[hsl(260,50%,50%/0.15)] flex items-center justify-center text-sm">⟠</div>
          )},
          { date: "Dec 2025", text: "Circle tests encrypted stablecoins (USDCx on Aleo testnet)", icon: (
            <div className="w-8 h-8 rounded-lg bg-[hsl(215,50%,50%/0.15)] flex items-center justify-center text-sm">💲</div>
          )},
          { date: "2025", text: "Goldman Sachs / BNY Mellon back Canton's privacy chain", icon: (
            <div className="w-8 h-8 rounded-lg bg-[hsl(40,50%,50%/0.15)] flex items-center justify-center text-sm">🏦</div>
          )},
          { date: "2025", text: "Monero delisted on ~73 exchanges → market needs compliant privacy", icon: (
            <div className="w-8 h-8 rounded-lg bg-[hsl(0,50%,50%/0.15)] flex items-center justify-center text-sm">⚠️</div>
          )},
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 bg-[hsl(220,15%,6%/0.6)] backdrop-blur border border-[hsl(220,15%,14%)] rounded-xl p-4 hover:border-[hsl(220,15%,22%)] transition-all">
            {item.icon}
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[hsl(215,50%,65%)] font-bold">{item.date}</span>
              <p className="text-sm text-[hsl(220,20%,88%)] font-medium mt-0.5">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gradient-to-r from-[hsl(215,50%,70%/0.08)] to-transparent border-l-2 border-[hsl(215,50%,65%)] p-5 rounded-r-xl">
        <p className="text-base text-[hsl(220,20%,92%)] font-black italic">
          "The market is ready. The incumbents are focused elsewhere."
        </p>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 4: The Solution — Toggle Privacy
   ══════════════════════════════════════════════════════════════ */
const Slide4Solution = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>The Solution</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] leading-tight mb-3">
        Toggle Privacy: <span className="text-[hsl(215,50%,70%)]">On</span> When You Need It,{" "}
        <span className="text-[hsl(220,15%,50%)]">Off</span> When You Don't
      </h2>
      <p className="text-sm text-[hsl(220,15%,50%)] mb-8">One-tap ZK shielding via Halo2 zk-SNARKs</p>

      {/* Toggle flow diagram — improved with SVG arrows */}
      <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-2">
          {[
            { label: "TX Created", icon: "📝", sublabel: "User initiates" },
            { label: "Toggle 🔒", icon: "⚡", sublabel: "One-tap privacy" },
            { label: "ZK Shielded", icon: "🛡️", sublabel: "Halo2 proof" },
            { label: "Receipt ✓", icon: "📄", sublabel: "Compliance ready" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex-1 bg-gradient-to-b from-[hsl(220,15%,10%)] to-[hsl(220,15%,7%)] border border-[hsl(215,50%,70%/0.15)] rounded-xl p-4 text-center hover:border-[hsl(215,50%,70%/0.3)] transition-all">
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-xs font-black text-[hsl(220,20%,90%)]">{step.label}</div>
                <div className="text-[9px] text-[hsl(220,15%,45%)] mt-1">{step.sublabel}</div>
              </div>
              {i < 3 && (
                <svg className="w-6 h-6 text-[hsl(215,50%,60%)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[hsl(220,15%,6%)] border border-[hsl(150,60%,40%/0.2)] rounded-xl p-5 text-center">
          <div className="text-2xl font-black text-[hsl(150,60%,55%)]">&lt;$0.01</div>
          <div className="text-[10px] text-[hsl(220,15%,50%)] mt-1 uppercase tracking-wider font-bold">Fees</div>
        </div>
        <div className="bg-[hsl(220,15%,6%)] border border-[hsl(150,60%,40%/0.2)] rounded-xl p-5 text-center">
          <div className="text-2xl font-black text-[hsl(150,60%,55%)]">&lt;5s</div>
          <div className="text-[10px] text-[hsl(220,15%,50%)] mt-1 uppercase tracking-wider font-bold">Finality</div>
        </div>
        <div className="bg-[hsl(220,15%,6%)] border border-[hsl(150,60%,40%/0.2)] rounded-xl p-5 text-center">
          <div className="text-2xl font-black text-[hsl(150,60%,55%)]">Auto</div>
          <div className="text-[10px] text-[hsl(220,15%,50%)] mt-1 uppercase tracking-wider font-bold">Receipts</div>
        </div>
      </div>

      {/* Comparison bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[hsl(0,50%,12%/0.5)] border border-[hsl(0,50%,25%/0.3)] rounded-xl p-3 text-center">
          <div className="text-xs font-black text-[hsl(0,65%,60%)]">Monero</div>
          <div className="text-[9px] text-[hsl(220,15%,50%)] mt-1">Always private → Delisted</div>
        </div>
        <div className="bg-[hsl(215,50%,60%/0.08)] border border-[hsl(215,50%,60%/0.3)] rounded-xl p-3 text-center shadow-[0_0_20px_hsl(215,50%,60%/0.08)]">
          <div className="text-xs font-black text-[hsl(215,50%,80%)]">ARXON ✦</div>
          <div className="text-[9px] text-[hsl(220,15%,60%)] mt-1">Toggle privacy → Compliant</div>
        </div>
        <div className="bg-[hsl(30,50%,12%/0.5)] border border-[hsl(30,50%,25%/0.3)] rounded-xl p-3 text-center">
          <div className="text-xs font-black text-[hsl(30,65%,60%)]">Ethereum</div>
          <div className="text-[9px] text-[hsl(220,15%,50%)] mt-1">Always public → Exposed</div>
        </div>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 5: Architecture — Layered Diagram
   ══════════════════════════════════════════════════════════════ */
const Slide5Architecture = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-5xl px-6 md:px-12">
      <SlideBadge>How It Works</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-8">
        Built for Privacy at <span className="text-[hsl(215,50%,70%)]">Scale</span>
      </h2>

      {/* Architecture flow — improved layered diagram */}
      <div className="relative mb-8">
        {/* Connection lines */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(280,50%,50%/0.3)] via-[hsl(215,50%,60%/0.4)] to-[hsl(150,50%,45%/0.3)] -translate-y-1/2 z-0" />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {[
            { layer: "Consensus Layer", tech: "BABE + GRANDPA", desc: "Fast block production + provable finality", gradient: "from-[hsl(280,45%,35%)] to-[hsl(260,40%,28%)]", borderColor: "hsl(280,50%,50%/0.3)", number: "01" },
            { layer: "ZK Proof Engine", tech: "Halo2 zk-SNARKs", desc: "Toggleable proofs — no trusted setup", gradient: "from-[hsl(215,45%,40%)] to-[hsl(220,40%,30%)]", borderColor: "hsl(215,50%,60%/0.3)", number: "02" },
            { layer: "Transaction Layer", tech: "Shielded ⇄ Transparent", desc: "Private details hidden | Fully auditable", gradient: "from-[hsl(190,40%,32%)] to-[hsl(200,40%,25%)]", borderColor: "hsl(180,50%,45%/0.3)", number: "03" },
            { layer: "Application Layer", tech: "dApps & Contracts", desc: "ZK-Voting · Remittances · EVM-compatible", gradient: "from-[hsl(150,35%,30%)] to-[hsl(160,35%,22%)]", borderColor: "hsl(150,50%,45%/0.3)", number: "04" },
          ].map((item, i) => (
            <div key={i} className="relative group">
              <div className={cn("bg-gradient-to-br rounded-2xl p-5 h-full border transition-all hover:scale-[1.02]", item.gradient)} style={{ borderColor: item.borderColor }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-bold">{item.layer}</div>
                  <div className="text-[9px] text-white/25 font-black">{item.number}</div>
                </div>
                <div className="text-base font-black text-white mb-2">{item.tech}</div>
                <div className="text-[11px] text-white/65 leading-relaxed">{item.desc}</div>
              </div>
              {i < 3 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,20%)] items-center justify-center">
                  <svg className="w-3 h-3 text-[hsl(215,50%,65%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 7l5 5m0 0l-5 5"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-[hsl(220,15%,50%)]">
        <p>• Sovereign Rust L1 — leveraging proven modular primitives</p>
        <p>• Performance ambition: <span className="text-[hsl(220,20%,88%)] font-bold">5,000–20,000+ TPS</span> (transparent mode)</p>
        <p>• Long-term target: <span className="text-[hsl(220,20%,88%)] font-bold">100,000+ TPS</span> via intra-block parallelism</p>
      </div>
      <p className="text-[8px] text-[hsl(220,15%,30%)] mt-4 text-right italic">
        Production performance depends on hardware, network, tx complexity & privacy ratio
      </p>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 6: Product — Real Data Charts + Screenshots
   ══════════════════════════════════════════════════════════════ */
const Slide6Product = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-5xl px-6 md:px-10">
      <SlideBadge>Product</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-2">
        Live Mining, Real Users, <span className="text-[hsl(150,60%,55%)]">Growing Daily</span>
      </h2>
      <p className="text-sm text-[hsl(220,15%,50%)] mb-6">Browser/mobile mining — no hardware needed, accessible worldwide</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value="9,911" label="Total Miners" sub="& counting" />
        <Stat value="249" label="Avg Daily Signups" sub="peak: 4,338/day" />
        <Stat value="5,594" label="Weekly Active" />
        <Stat value="1,700+" label="Discord Members" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Real growth chart */}
        <div className="md:col-span-2 bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
          <div className="text-[10px] text-[hsl(220,15%,50%)] mb-3 font-bold uppercase tracking-[0.15em]">Cumulative User Growth — Real Data</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={REAL_DAILY_SIGNUPS}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(215,50%,60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(215,50%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,14%)" />
              <XAxis dataKey="day" tick={{ fill: 'hsl(220,15%,40%)', fontSize: 9 }} axisLine={{ stroke: 'hsl(220,15%,14%)' }} tickLine={false} interval={4} />
              <YAxis tick={{ fill: 'hsl(220,15%,40%)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltipCustom />} />
              <Area type="monotone" dataKey="cumulative" name="Users" stroke="hsl(215,50%,65%)" fill="url(#growthGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mining app screenshot */}
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-3 flex flex-col items-center justify-center">
          <div className="text-[10px] text-[hsl(220,15%,50%)] mb-2 font-bold uppercase tracking-[0.15em] self-start">Mining App</div>
          <img src={miningScreenshot} alt="Arxon Mining App" className="w-full rounded-xl object-cover max-h-[180px]" />
        </div>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 7: Traction Deep Dive — Real Charts
   ══════════════════════════════════════════════════════════════ */
const Slide7Traction = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-5xl px-6 md:px-10">
      <SlideBadge>Traction</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-2">
        From 0 to 10K in <span className="text-[hsl(215,50%,70%)]">40 Days</span>
      </h2>
      <p className="text-sm text-[hsl(220,15%,50%)] mb-6">Organic, pre-marketing, pre-funding traction</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Daily signups bar chart */}
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
          <div className="text-[10px] text-[hsl(220,15%,50%)] mb-3 font-bold uppercase tracking-[0.15em]">Daily Signups — Real Data</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={REAL_DAILY_SIGNUPS.filter((_, i) => i % 2 === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
              <XAxis dataKey="day" tick={{ fill: 'hsl(220,15%,40%)', fontSize: 8 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: 'hsl(220,15%,40%)', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltipCustom />} />
              <Bar dataKey="signups" name="Signups" fill="hsl(215,50%,60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic distribution */}
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
          <div className="text-[10px] text-[hsl(220,15%,50%)] mb-3 font-bold uppercase tracking-[0.15em]">Top Mining Countries</div>
          {[
            { country: "🇮🇳 India", pct: 28, color: "hsl(215,50%,60%)" },
            { country: "🇮🇩 Indonesia", pct: 18, color: "hsl(200,50%,55%)" },
            { country: "🇳🇬 Nigeria", pct: 16, color: "hsl(150,50%,50%)" },
            { country: "🇧🇩 Bangladesh", pct: 12, color: "hsl(280,45%,55%)" },
            { country: "🇨🇳 China", pct: 8, color: "hsl(30,60%,55%)" },
            { country: "🇵🇰 Pakistan", pct: 6, color: "hsl(180,45%,50%)" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[hsl(220,20%,85%)] w-28 font-medium">{item.country}</span>
              <div className="flex-1 bg-[hsl(220,15%,10%)] rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${item.pct * 3}%`, backgroundColor: item.color }} />
              </div>
              <span className="text-[10px] text-[hsl(220,15%,55%)] w-8 text-right font-bold">{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Community */}
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
          <div className="text-[10px] text-[hsl(220,15%,50%)] mb-3 font-bold uppercase tracking-[0.15em]">Community Growth</div>
          <div className="space-y-3">
            {[
              { platform: "Discord", members: "1,700+", growth: "+340%", icon: "💬" },
              { platform: "Twitter/X", members: "2,500+", growth: "+180%", icon: "𝕏" },
              { platform: "Telegram", members: "900+", growth: "+220%", icon: "✈️" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-sm text-[hsl(220,20%,88%)] font-bold">{item.platform}</div>
                    <div className="text-[10px] text-[hsl(220,15%,50%)]">{item.members}</div>
                  </div>
                </div>
                <span className="text-xs text-[hsl(150,60%,55%)] font-black">{item.growth}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly chart */}
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
          <div className="text-[10px] text-[hsl(220,15%,50%)] mb-3 font-bold uppercase tracking-[0.15em]">Weekly Growth Acceleration</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={WEEKLY_SIGNUPS}>
              <XAxis dataKey="week" tick={{ fill: 'hsl(220,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220,15%,40%)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltipCustom />} />
              <Bar dataKey="signups" name="Signups" radius={[4, 4, 0, 0]}>
                {WEEKLY_SIGNUPS.map((_, i) => (
                  <Cell key={i} fill={`hsl(215,50%,${50 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[hsl(150,60%,50%/0.08)] to-transparent border-l-2 border-[hsl(150,60%,50%)] p-3 rounded-r-xl mt-4">
        <p className="text-xs text-[hsl(220,20%,88%)] font-black italic">
          "This is organic, pre-marketing, pre-funding traction"
        </p>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 8: Market Opportunity — Funnel
   ══════════════════════════════════════════════════════════════ */
const Slide8Market = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Market Opportunity</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-10">
        <span className="text-[hsl(215,50%,70%)]">$905B</span> → $150B → <span className="text-[hsl(150,60%,55%)]">$15B</span>
      </h2>

      {/* Improved funnel with gradient trapezoids */}
      <div className="flex flex-col items-center gap-0 mb-10">
        {[
          { label: "TAM", value: "$905B", desc: "Global remittances (World Bank/Visa 2024–2025)", width: "100%", opacity: 1 },
          { label: "SAM", value: "$150B", desc: "Crypto-enabled cross-border payments", width: "68%", opacity: 0.85 },
          { label: "SOM", value: "$15B", desc: "10% of crypto remittance market", width: "38%", opacity: 0.7 },
        ].map((item, i) => (
          <div key={i} className="w-full flex flex-col items-center">
            <div
              className="relative bg-gradient-to-r from-[hsl(215,50%,55%/0.15)] via-[hsl(215,50%,60%/0.1)] to-[hsl(215,50%,55%/0.15)] border border-[hsl(215,50%,65%/0.2)] rounded-xl p-5 flex items-center justify-between transition-all hover:border-[hsl(215,50%,65%/0.4)]"
              style={{ width: item.width, minWidth: "320px", opacity: item.opacity }}
            >
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[hsl(215,50%,70%)] font-black">{item.label}</span>
                <p className="text-xs text-[hsl(220,15%,50%)] mt-1">{item.desc}</p>
              </div>
              <span className="text-2xl md:text-3xl font-black text-[hsl(215,50%,80%)]">{item.value}</span>
            </div>
            {i < 2 && (
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[8px] border-l-transparent border-r-transparent border-t-[hsl(215,50%,60%/0.3)] my-1" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-[hsl(220,15%,6%)] border border-[hsl(215,50%,65%/0.15)] rounded-xl p-5 text-center">
        <p className="text-[10px] text-[hsl(220,15%,50%)] uppercase tracking-wider font-bold mb-1">Phase 2 Opportunity</p>
        <p className="text-xl font-black text-[hsl(215,50%,80%)]">$10B+ Election Integrity Market <span className="text-[hsl(220,15%,50%)] font-normal text-xs">(2027+)</span></p>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 9: Competitive Landscape — 2×2 Matrix
   ══════════════════════════════════════════════════════════════ */
const Slide9Competition = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Competitive Landscape</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-8">
        Privacy Chains: Well-Funded,<br /><span className="text-[hsl(215,50%,70%)]">Differently Focused</span>
      </h2>

      {/* Improved 2×2 matrix with proper quadrant labels */}
      <div className="relative bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-8 mb-6" style={{ minHeight: "340px" }}>
        {/* Quadrant labels */}
        <div className="absolute top-3 left-14 text-[8px] uppercase tracking-wider text-[hsl(220,15%,30%)] font-bold">Developer / Mandatory</div>
        <div className="absolute top-3 right-8 text-[8px] uppercase tracking-wider text-[hsl(220,15%,30%)] font-bold">Developer / Optional</div>
        <div className="absolute bottom-3 left-14 text-[8px] uppercase tracking-wider text-[hsl(220,15%,30%)] font-bold">End-User / Mandatory</div>
        <div className="absolute bottom-3 right-8 text-[8px] uppercase tracking-wider text-[hsl(150,50%,40%)] font-bold">End-User / Optional ★</div>

        {/* Y-axis */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] uppercase tracking-wider text-[hsl(220,15%,35%)] font-bold whitespace-nowrap">
          Developer ← Focus → End-User
        </div>
        {/* X-axis */}
        <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-wider text-[hsl(220,15%,35%)] font-bold">
          Mandatory ← Privacy → Optional
        </div>

        {/* Grid lines */}
        <div className="absolute left-1/2 top-8 bottom-8 w-px bg-[hsl(220,15%,15%)]" />
        <div className="absolute top-1/2 left-12 right-4 h-px bg-[hsl(220,15%,15%)]" />

        {/* Competitors — positioned in quadrants */}
        <div className="absolute top-14 left-20 bg-[hsl(220,15%,10%)] rounded-lg px-3 py-2 text-xs text-[hsl(220,15%,50%)] border border-[hsl(220,15%,18%)] font-medium">Zcash</div>
        <div className="absolute top-[42%] left-16 bg-[hsl(0,30%,12%)] rounded-lg px-3 py-2 text-xs text-[hsl(0,50%,60%)] border border-[hsl(0,30%,20%)] font-medium">Monero ⚠️</div>
        <div className="absolute top-16 right-20 bg-[hsl(220,15%,10%)] rounded-lg px-3 py-2 text-xs text-[hsl(220,15%,50%)] border border-[hsl(220,15%,18%)] font-medium">Aleo</div>
        <div className="absolute top-28 right-28 bg-[hsl(220,15%,10%)] rounded-lg px-3 py-2 text-xs text-[hsl(220,15%,50%)] border border-[hsl(220,15%,18%)] font-medium">Nillion</div>
        <div className="absolute top-[55%] left-[40%] bg-[hsl(220,15%,10%)] rounded-lg px-3 py-2 text-xs text-[hsl(220,15%,50%)] border border-[hsl(220,15%,18%)] font-medium">Aztec (L2)</div>

        {/* Arxon — highlighted in the unique quadrant */}
        <div className="absolute bottom-14 right-14 bg-gradient-to-br from-[hsl(215,50%,55%)] to-[hsl(220,45%,45%)] rounded-xl px-5 py-3 text-sm font-black text-white shadow-[0_0_30px_hsl(215,50%,60%/0.4)] border border-[hsl(215,50%,70%/0.3)]">
          ARXON ✦
        </div>
      </div>

      <div className="bg-gradient-to-r from-[hsl(215,50%,65%/0.08)] to-transparent border-l-2 border-[hsl(215,50%,65%)] p-4 rounded-r-xl">
        <p className="text-sm text-[hsl(220,20%,90%)] font-black italic">
          "Our wedge: We're the only privacy L1 built for end-user payments with mobile-first distribution"
        </p>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 10: Go-to-Market
   ══════════════════════════════════════════════════════════════ */
const Slide10GTM = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Go-to-Market</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-8">
        Mine → Use → <span className="text-[hsl(215,50%,70%)]">Govern</span>
      </h2>

      <div className="space-y-3">
        {[
          { phase: "Phase 1", time: "NOW", title: "Mobile Mining for User Acquisition", desc: "10K+ miners from India, Indonesia, Nigeria, Bangladesh, China — world's leading remittance recipients", status: "active" },
          { phase: "Phase 2", time: "Post-Raise", title: "Private Remittance Corridors", desc: "India (top global), Indonesia & Philippines (SEA), Nigeria & Kenya (SSA), Bangladesh", status: "next" },
          { phase: "Phase 3", time: "2027", title: "ZK-Voting dApp Pilots", desc: "Municipal/regional government pilots for coercion-resistant voting", status: "planned" },
          { phase: "Phase 4", time: "2028", title: "Ecosystem Expansion", desc: "ARX-20 tokens, DeFi primitives, NFTs, governance tools", status: "planned" },
        ].map((item, i) => (
          <div key={i} className={cn(
            "flex gap-4 rounded-xl p-4 border transition-all",
            item.status === "active"
              ? "bg-[hsl(215,50%,60%/0.06)] border-[hsl(215,50%,60%/0.25)]"
              : "bg-[hsl(220,15%,5%)] border-[hsl(220,15%,13%)]"
          )}>
            <div className="flex-shrink-0 text-center w-16">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[hsl(215,50%,65%)] font-black">{item.phase}</div>
              <div className="text-xs text-[hsl(220,15%,50%)] mt-0.5 font-medium">{item.time}</div>
              {item.status === "active" && <span className="inline-block w-2 h-2 rounded-full bg-[hsl(150,60%,55%)] mt-1.5 animate-pulse" />}
            </div>
            <div>
              <div className="text-sm font-bold text-[hsl(220,20%,92%)]">{item.title}</div>
              <div className="text-xs text-[hsl(220,15%,50%)] mt-1 leading-relaxed">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 11: Tokenomics — Donut Chart
   ══════════════════════════════════════════════════════════════ */
const Slide11Tokenomics = () => {
  const allocations = [
    { label: "Treasury / Ecosystem", pct: 30, amount: "300M", color: "hsl(215,50%,60%)" },
    { label: "Community Mining", pct: 25, amount: "250M", color: "hsl(150,60%,50%)" },
    { label: "Pre-seed Investors", pct: 20, amount: "200M", color: "hsl(280,50%,55%)" },
    { label: "Team (4yr vest)", pct: 15, amount: "150M", color: "hsl(30,70%,55%)" },
    { label: "Post-TGE Staking", pct: 10, amount: "100M", color: "hsl(180,50%,50%)" },
  ];

  return (
    <SlideWrapper>
      <SlideBg />
      <div className="relative z-10 w-full max-w-5xl px-6 md:px-10">
        <SlideBadge>Tokenomics</SlideBadge>
        <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-2">
          $ARX: Designed for <span className="text-[hsl(215,50%,70%)]">Long-Term Value</span>
        </h2>
        <p className="text-sm text-[hsl(220,15%,50%)] mb-6">Total Supply: 1,000,000,000 $ARX · TGE Circulating: 250,000,000</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {/* Donut chart */}
          <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5 flex flex-col items-center">
            <div className="text-[10px] text-[hsl(220,15%,50%)] mb-2 font-bold uppercase tracking-[0.15em] self-start">Allocation</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={allocations} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="pct" stroke="none">
                  {allocations.map((a, i) => <Cell key={i} fill={a.color} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,20%)] rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-xs font-bold text-[hsl(220,20%,90%)]">{d.label}</p>
                        <p className="text-[10px] text-[hsl(220,15%,55%)]">{d.amount} · {d.pct}%</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {allocations.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-[9px] text-[hsl(220,15%,55%)]">{a.label} ({a.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Utility + contrast */}
          <div className="space-y-4">
            <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
              <div className="text-[10px] text-[hsl(220,15%,50%)] mb-3 font-bold uppercase tracking-[0.15em]">Token Utility</div>
              <div className="grid grid-cols-2 gap-2">
                {["⛽ Gas fees", "🔒 Staking", "🗳 Governance", "🛡 Privacy proofs", "⛏ Mining claims", "📊 Validators"].map((u, i) => (
                  <div key={i} className="text-xs text-[hsl(220,20%,85%)] font-medium bg-[hsl(220,15%,8%)] rounded-lg px-3 py-2">{u}</div>
                ))}
              </div>
            </div>
            <div className="bg-[hsl(150,40%,8%/0.5)] border border-[hsl(150,50%,30%/0.2)] rounded-xl p-4">
              <p className="text-[11px] text-[hsl(150,60%,60%)] font-black italic">
                "No insider-dominated allocation" — contrast with Nillion's 80%
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
};

/* ══════════════════════════════════════════════════════════════
   SLIDE 12: Team
   ══════════════════════════════════════════════════════════════ */
const Slide12Team = () => {
  const team = [
    { name: "Gabe Ademibo", role: "Founder & CEO", desc: "6+ years blockchain/Web3 · Built systems for Doginal Dogs · Driving Arxon's toggle privacy vision", x: "@GabeXmeta", initials: "GA", featured: true },
    { name: "Aisar Gatrif", role: "Marketing & Growth Lead", desc: "Founder @aisarlabs · Partner @rakebitcom & @qzino_official · 50K+ Web3 community reach", x: "@aisarcore", initials: "AG", featured: false },
    { name: "Victor Agama", role: "Community & Marketing Lead", desc: "Web3 Community Builder · Building Discord, onboarding, and viral mining traction", x: "@dibwuru", initials: "VA", featured: false },
    { name: "Zeoraex Ronish", role: "Blockchain App Developer", desc: "EVM dApp development · Smart contract interaction, wallet integration, testnet ops", x: "@Titaniconqueror", initials: "ZR", featured: false },
    { name: "Ojulowo Vincent", role: "Frontend/UI Engineer", desc: "Building mining dashboard, wallet UX, user interfaces", x: "", initials: "OV", featured: false },
  ];
  return (
    <SlideWrapper>
      <SlideBg />
      <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
        <SlideBadge>Team</SlideBadge>
        <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-8">
          Built by <span className="text-[hsl(215,50%,70%)]">Builders</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {team.map((m, i) => (
            <div key={i} className={cn(
              "bg-[hsl(220,15%,5%)] border rounded-2xl p-4 transition-all hover:border-[hsl(220,15%,25%)]",
              m.featured ? "border-[hsl(215,50%,60%/0.3)]" : "border-[hsl(220,15%,13%)]"
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0",
                  m.featured ? "bg-gradient-to-br from-[hsl(215,50%,55%)] to-[hsl(220,45%,40%)] shadow-[0_0_15px_hsl(215,50%,60%/0.3)]" : "bg-gradient-to-br from-[hsl(220,20%,25%)] to-[hsl(220,15%,18%)]"
                )}>{m.initials}</div>
                <div>
                  <div className="text-sm font-bold text-[hsl(220,20%,92%)]">{m.name}</div>
                  <div className="text-[9px] text-[hsl(215,50%,65%)] font-bold uppercase tracking-[0.1em]">{m.role}</div>
                </div>
              </div>
              <p className="text-[11px] text-[hsl(220,15%,50%)] leading-relaxed">{m.desc}</p>
              {m.x && <p className="text-[10px] text-[hsl(215,50%,65%)] mt-2 font-medium">𝕏 {m.x}</p>}
            </div>
          ))}
        </div>
        <div className="bg-[hsl(220,15%,5%)] border border-dashed border-[hsl(220,15%,18%)] rounded-xl p-3 text-center">
          <p className="text-xs text-[hsl(220,15%,50%)]">
            <span className="font-bold text-[hsl(220,20%,85%)]">Scaling Post-Raise:</span> Priority hires — CTO/Lead Rust Engineer + backend/DevOps
          </p>
        </div>
      </div>
    </SlideWrapper>
  );
};

/* ══════════════════════════════════════════════════════════════
   SLIDE 13: Roadmap — Timeline
   ══════════════════════════════════════════════════════════════ */
const Slide13Roadmap = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Roadmap</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-8">
        From Mining to <span className="text-[hsl(215,50%,70%)]">Mainnet</span>
      </h2>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[hsl(215,50%,65%)] via-[hsl(215,50%,45%)] to-[hsl(220,15%,18%)]" />

        <div className="space-y-6 pl-14">
          {[
            { time: "Now – Mid 2026", title: "Bootstrapped Phase", items: ["Mining live & growing (10K+ → 50K+ target)", "Pre-seed raise execution", "Team expansion prep & early prototyping"], active: true },
            { time: "H2 2026", title: "Core Development & Testnet", items: ["Hire CTO/Lead Rust Engineer + DevOps", "Build & launch testnet (Substrate + Halo2)", "Security audits · EVM compatibility"], active: false },
            { time: "2027", title: "Mainnet Launch", items: ["Mainnet rollout (alpha → full decentralization)", "Private remittance corridors live", "ZK-voting dApp beta/testnet"], active: false },
            { time: "2028+", title: "Growth & Impact Scale", items: ["Target 1M+ users", "Multi-country ZK-voting", "ARX-20 tokens, DeFi, governance"], active: false },
          ].map((phase, i) => (
            <div key={i} className="relative">
              <div className={cn(
                "absolute -left-14 top-1.5 w-4 h-4 rounded-full border-2",
                phase.active
                  ? "bg-[hsl(215,50%,65%)] border-[hsl(215,50%,65%)] shadow-[0_0_12px_hsl(215,50%,65%/0.5)]"
                  : "bg-[hsl(220,15%,8%)] border-[hsl(220,15%,22%)]"
              )} />
              <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(215,50%,65%)] font-black mb-1">{phase.time}</div>
              <div className="text-sm font-bold text-[hsl(220,20%,92%)] mb-2">{phase.title}</div>
              <ul className="space-y-1">
                {phase.items.map((item, j) => (
                  <li key={j} className="text-xs text-[hsl(220,15%,50%)] flex items-start gap-2">
                    <span className="text-[hsl(215,50%,60%)] mt-0.5 text-[8px]">●</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   SLIDE 14: The Ask
   ══════════════════════════════════════════════════════════════ */
const Slide14Ask = () => {
  const fundData = [
    { name: "Engineering", pct: 50, color: "hsl(215,50%,60%)" },
    { name: "Growth", pct: 25, color: "hsl(150,60%,50%)" },
    { name: "Operations", pct: 15, color: "hsl(280,50%,55%)" },
    { name: "Reserve", pct: 10, color: "hsl(30,70%,55%)" },
  ];

  return (
    <SlideWrapper>
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,18%,4%)] via-[hsl(215,25%,8%)] to-[hsl(220,15%,3%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(215,50%,55%/0.04)] blur-[100px]" />
      <div className="relative z-10 w-full max-w-4xl px-8 md:px-12 text-center">
        <SlideBadge>The Ask</SlideBadge>
        <h2 className="text-5xl md:text-7xl font-black text-[hsl(220,20%,95%)] mb-3">
          <span className="text-[hsl(215,50%,70%)]">$10M</span> Pre-Seed
        </h2>
        <p className="text-lg text-[hsl(220,15%,50%)] mb-10 font-medium">
          $40–60M FDV · SAFE + Token Warrant
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {fundData.map((item, i) => (
            <div key={i} className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,13%)] rounded-2xl p-5 text-center">
              <div className="text-3xl font-black mb-1" style={{ color: item.color }}>{item.pct}%</div>
              <div className="text-xs font-bold text-[hsl(220,20%,88%)]">{item.name}</div>
              <div className="w-full bg-[hsl(220,15%,10%)] rounded-full h-1.5 mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-[hsl(215,50%,65%/0.08)] to-[hsl(215,50%,65%/0.04)] border border-[hsl(215,50%,65%/0.15)] rounded-2xl p-6">
          <p className="text-base text-[hsl(220,20%,92%)] font-black italic">
            "This raise gets us to mainnet + 100K users — the milestones that unlock Series A"
          </p>
        </div>
      </div>
    </SlideWrapper>
  );
};

/* ══════════════════════════════════════════════════════════════
   SLIDE 15: Appendix Cover
   ══════════════════════════════════════════════════════════════ */
const Slide15Appendix = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-3xl px-8 md:px-12 text-center">
      <SlideBadge>Appendix</SlideBadge>
      <h2 className="text-3xl md:text-4xl font-black text-[hsl(220,20%,95%)] mb-3">
        Supporting Materials &<br /><span className="text-[hsl(215,50%,70%)]">Due Diligence</span>
      </h2>
      <p className="text-sm text-[hsl(220,15%,50%)] mb-10">For follow-up reference only — not presented unless requested.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {["Detailed $ARX Tokenomics", "Litepaper & Full Document", "Mining Economics & Rewards", "Regulatory by Market", "3-Year Projections", "Cap Table (Pre & Post)"].map((item, i) => (
          <div key={i} className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,13%)] rounded-xl p-3 text-xs text-[hsl(220,20%,85%)] font-medium text-center hover:border-[hsl(220,15%,22%)] transition-all cursor-default">
            {item}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[hsl(220,15%,35%)]">
        Arxon Confidential · February 2026 · Gabe @GabeXmeta
      </p>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   APPENDIX A: Tokenomics Detail
   ══════════════════════════════════════════════════════════════ */
const SlideAppendixA = () => {
  const allocationData = [
    { label: "Community & Miners", amount: "250M", pct: 25, color: "hsl(150,60%,50%)" },
    { label: "Treasury / Ecosystem", amount: "300M", pct: 30, color: "hsl(215,50%,60%)" },
    { label: "Pre-seed Investors", amount: "200M", pct: 20, color: "hsl(280,50%,55%)" },
    { label: "Team & Contributors", amount: "150M", pct: 15, color: "hsl(30,70%,55%)" },
    { label: "Post-TGE Staking", amount: "100M", pct: 10, color: "hsl(180,50%,50%)" },
  ];

  return (
    <SlideWrapper>
      <SlideBg />
      <div className="relative z-10 w-full max-w-5xl px-6 md:px-10">
        <SlideBadge>Appendix A</SlideBadge>
        <h2 className="text-2xl md:text-3xl font-black text-[hsl(220,20%,95%)] mb-6">
          $ARX Token — <span className="text-[hsl(215,50%,70%)]">Full Economics</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
            <div className="text-[10px] font-bold text-[hsl(220,15%,50%)] uppercase tracking-[0.15em] mb-3">Allocation Breakdown</div>
            {allocationData.map((a, i) => (
              <div key={i} className="flex items-center gap-2 mb-2.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-xs text-[hsl(220,20%,85%)] flex-1 font-medium">{a.label}</span>
                <span className="text-xs text-[hsl(220,15%,50%)]">{a.amount}</span>
                <span className="text-xs font-black text-[hsl(215,50%,70%)] w-10 text-right">{a.pct}%</span>
              </div>
            ))}
          </div>
          <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
            <div className="text-[10px] font-bold text-[hsl(220,15%,50%)] uppercase tracking-[0.15em] mb-3">Vesting & Emission</div>
            <div className="space-y-2.5 text-xs text-[hsl(220,15%,50%)] leading-relaxed">
              <p>• Mining rewards: ~4–5 years tapering (~50% in first 18mo)</p>
              <p>• Investor tokens: 12-month lock-up, then 24–36mo linear vest</p>
              <p>• Team: 4-year vesting, 1-year cliff</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[hsl(220,15%,15%)]">
              <div className="text-[10px] font-bold text-[hsl(220,15%,50%)] uppercase tracking-[0.15em] mb-2">Deflationary Mechanisms</div>
              <p className="text-xs text-[hsl(220,15%,50%)]">Network fees partially burned → net-zero or mild deflation as usage grows</p>
            </div>
          </div>
        </div>
        <p className="text-[8px] text-[hsl(220,15%,30%)] italic">Note: Final parameters subject to community governance input and legal review.</p>
      </div>
    </SlideWrapper>
  );
};

/* ══════════════════════════════════════════════════════════════
   APPENDIX B: Mining Economics — Emission Curve
   ══════════════════════════════════════════════════════════════ */
const SlideAppendixB = () => {
  const emissionData = Array.from({ length: 24 }, (_, i) => ({
    month: `M${(i + 1) * 2}`,
    emission: Math.round(100 * Math.pow(0.92, i)),
  }));

  return (
    <SlideWrapper>
      <SlideBg />
      <div className="relative z-10 w-full max-w-5xl px-6 md:px-10">
        <SlideBadge>Appendix B</SlideBadge>
        <h2 className="text-2xl md:text-3xl font-black text-[hsl(220,20%,95%)] mb-6">
          Mining Economics <span className="text-[hsl(215,50%,70%)]">Breakdown</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { title: "Current System", desc: "Browser/mobile mining → ARX-P points. No hardware needed, accessible worldwide." },
            { title: "Conversion to $ARX", desc: "Post-mainnet: fair ratio (total points ÷ 250M $ARX). Anti-sybil + optional KYC." },
            { title: "Claim & Vesting", desc: "40% immediate · 60% vested over 24 months. Staking accelerates unlock." },
          ].map((item, i) => (
            <div key={i} className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-4">
              <div className="text-xs font-bold text-[hsl(215,50%,65%)] mb-2">{item.title}</div>
              <p className="text-[11px] text-[hsl(220,15%,50%)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Emission curve with real Recharts line chart */}
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5 mb-4">
          <div className="text-[10px] font-bold text-[hsl(220,15%,50%)] uppercase tracking-[0.15em] mb-3">Emission Taper (~48 months)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={emissionData}>
              <defs>
                <linearGradient id="emissionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(215,50%,60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(215,50%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(220,15%,40%)', fontSize: 8 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: 'hsl(220,15%,40%)', fontSize: 8 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<ChartTooltipCustom />} />
              <Area type="monotone" dataKey="emission" name="Emission %" stroke="hsl(215,50%,60%)" fill="url(#emissionGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat value="8–18%" label="Expected Early Yield" sub="Annualized for active miners" />
          <Stat value="25%" label="Total Supply Cap" sub="No further minting post-emission" />
        </div>
      </div>
    </SlideWrapper>
  );
};

/* ══════════════════════════════════════════════════════════════
   APPENDIX C: Regulatory
   ══════════════════════════════════════════════════════════════ */
const SlideAppendixC = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Appendix C</SlideBadge>
      <h2 className="text-2xl md:text-3xl font-black text-[hsl(220,20%,95%)] mb-6">
        Regulatory <span className="text-[hsl(215,50%,70%)]">Snapshot</span>
      </h2>
      <p className="text-xs text-[hsl(220,15%,50%)] mb-6">Optional privacy (toggle) reduces regulatory friction vs. mandatory privacy coins.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {[
          { flag: "🇮🇳", country: "India", remit: "~$138B", note: "30% crypto tax, growing adoption. Toggle fits PMLA/AML." },
          { flag: "🇳🇬", country: "Nigeria", remit: "~$21B", note: "CBN restrictions easing 2025–2026. Privacy for diaspora." },
          { flag: "🇮🇩", country: "Indonesia", remit: "SEA Leader", note: "OJK/BI oversight. Optional shielded mode fits fintech rules." },
          { flag: "🇧🇩", country: "Bangladesh", remit: "High % GDP", note: "Emerging crypto interest. Privacy helps unbanked users." },
        ].map((item, i) => (
          <div key={i} className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-4 flex gap-3 hover:border-[hsl(220,15%,22%)] transition-all">
            <span className="text-3xl flex-shrink-0">{item.flag}</span>
            <div>
              <div className="text-sm font-bold text-[hsl(220,20%,88%)]">{item.country} <span className="text-[hsl(215,50%,65%)] text-xs font-normal">{item.remit}</span></div>
              <p className="text-xs text-[hsl(220,15%,50%)] mt-1 leading-relaxed">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-[hsl(220,15%,42%)] space-y-1">
        <p>• Utility token design. No ICO-style promises.</p>
        <p>• Legal opinion planned pre-TGE. Optional KYC for high-value ops.</p>
      </div>
    </div>
  </SlideWrapper>
);

/* ══════════════════════════════════════════════════════════════
   APPENDIX D: Projections — Revenue Chart
   ══════════════════════════════════════════════════════════════ */
const SlideAppendixD = () => {
  const projData = [
    { year: "Year 1", revenue: 0.2, expenses: 6, users: 50 },
    { year: "Year 2", revenue: 2.25, expenses: 8.5, users: 250 },
    { year: "Year 3", revenue: 16.5, expenses: 12, users: 750 },
  ];

  return (
    <SlideWrapper>
      <SlideBg />
      <div className="relative z-10 w-full max-w-5xl px-6 md:px-10">
        <SlideBadge>Appendix D</SlideBadge>
        <h2 className="text-2xl md:text-3xl font-black text-[hsl(220,20%,95%)] mb-6">
          3-Year <span className="text-[hsl(215,50%,70%)]">Projections</span>
        </h2>
        <p className="text-xs text-[hsl(220,15%,50%)] mb-6">Conservative estimates · $10M raise · Mainnet H2 2026–2027</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Revenue vs Expenses chart */}
          <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
            <div className="text-[10px] font-bold text-[hsl(220,15%,50%)] uppercase tracking-[0.15em] mb-3">Revenue vs Expenses ($M)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={projData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="year" tick={{ fill: 'hsl(220,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(220,15%,40%)', fontSize: 9 }} axisLine={false} tickLine={false} unit="M" />
                <Tooltip content={<ChartTooltipCustom />} />
                <Bar dataKey="revenue" name="Revenue $M" fill="hsl(150,60%,50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses $M" fill="hsl(0,50%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(220,15%,15%)]">
                  <th className="p-3 text-left text-[hsl(220,15%,50%)] font-bold uppercase tracking-wider text-[9px]">Metric</th>
                  <th className="p-3 text-center text-[9px] text-[hsl(220,15%,50%)] font-bold">Y1</th>
                  <th className="p-3 text-center text-[9px] text-[hsl(220,15%,50%)] font-bold">Y2</th>
                  <th className="p-3 text-center text-[9px] text-[hsl(220,15%,50%)] font-bold">Y3</th>
                </tr>
              </thead>
              <tbody className="text-[hsl(220,20%,85%)]">
                <tr className="border-b border-[hsl(220,15%,12%)]">
                  <td className="p-3 font-medium">Revenue</td>
                  <td className="p-3 text-center text-[hsl(220,15%,50%)]">~$0</td>
                  <td className="p-3 text-center">$0.5–4M</td>
                  <td className="p-3 text-center text-[hsl(150,60%,55%)] font-bold">$8–25M+</td>
                </tr>
                <tr className="border-b border-[hsl(220,15%,12%)]">
                  <td className="p-3 font-medium">Expenses</td>
                  <td className="p-3 text-center">~$5–7M</td>
                  <td className="p-3 text-center">$7–10M</td>
                  <td className="p-3 text-center">Scaling</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Users</td>
                  <td className="p-3 text-center">50K+</td>
                  <td className="p-3 text-center">250K+</td>
                  <td className="p-3 text-center text-[hsl(215,50%,70%)] font-bold">500K–1M+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[8px] text-[hsl(220,15%,30%)] italic">Projections are directional — actuals depend on adoption and market conditions.</p>
      </div>
    </SlideWrapper>
  );
};

/* ══════════════════════════════════════════════════════════════
   APPENDIX E: Cap Table
   ══════════════════════════════════════════════════════════════ */
const SlideAppendixE = () => (
  <SlideWrapper>
    <SlideBg />
    <div className="relative z-10 w-full max-w-4xl px-8 md:px-12">
      <SlideBadge>Appendix E</SlideBadge>
      <h2 className="text-2xl md:text-3xl font-black text-[hsl(220,20%,95%)] mb-8">
        Cap Table <span className="text-[hsl(215,50%,70%)]">Summary</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(220,15%,14%)] rounded-2xl p-5">
          <div className="text-[10px] font-bold text-[hsl(220,15%,50%)] uppercase tracking-[0.15em] mb-4">Pre-Raise</div>
          {[
            { label: "Founder & Early Contributors", pct: "85–90%", color: "hsl(215,50%,60%)", width: 87 },
            { label: "Future Team / Option Pool", pct: "10–15%", color: "hsl(280,50%,55%)", width: 12 },
          ].map((item, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[hsl(220,20%,85%)] font-medium">{item.label}</span>
                <span className="font-black" style={{ color: item.color }}>{item.pct}</span>
              </div>
              <div className="w-full bg-[hsl(220,15%,10%)] rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.width}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[hsl(220,15%,5%)] border border-[hsl(215,50%,60%/0.15)] rounded-2xl p-5">
          <div className="text-[10px] font-bold text-[hsl(215,50%,65%)] uppercase tracking-[0.15em] mb-4">Post-$10M Raise ($40–60M FDV)</div>
          {[
            { label: "Founder & Contributors", pct: "60–70%", color: "hsl(215,50%,60%)", width: 65 },
            { label: "Pre-seed Investors", pct: "17–25%", color: "hsl(150,60%,50%)", width: 21 },
            { label: "Option Pool", pct: "10–15%", color: "hsl(280,50%,55%)", width: 12 },
          ].map((item, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[hsl(220,20%,85%)] font-medium">{item.label}</span>
                <span className="font-black" style={{ color: item.color }}>{item.pct}</span>
              </div>
              <div className="w-full bg-[hsl(220,15%,10%)] rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.width}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[8px] text-[hsl(220,15%,30%)] mt-4 italic text-center">
        Exact percentages depend on final valuation and terms. Via SAFE + Token Warrant.
      </p>
    </div>
  </SlideWrapper>
);


/* ══════════════════════════════════════════════════════════════
   ALL SLIDES + MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
const ALL_SLIDES = [
  { component: Slide1Cover, title: "Cover" },
  { component: Slide2Problem, title: "The Problem" },
  { component: Slide3Timing, title: "Market Timing" },
  { component: Slide4Solution, title: "The Solution" },
  { component: Slide5Architecture, title: "Architecture" },
  { component: Slide6Product, title: "Product" },
  { component: Slide7Traction, title: "Traction" },
  { component: Slide8Market, title: "Market Opportunity" },
  { component: Slide9Competition, title: "Competition" },
  { component: Slide10GTM, title: "Go-to-Market" },
  { component: Slide11Tokenomics, title: "Tokenomics" },
  { component: Slide12Team, title: "Team" },
  { component: Slide13Roadmap, title: "Roadmap" },
  { component: Slide14Ask, title: "The Ask" },
  { component: Slide15Appendix, title: "Appendix" },
  { component: SlideAppendixA, title: "App. A: Tokenomics" },
  { component: SlideAppendixB, title: "App. B: Mining" },
  { component: SlideAppendixC, title: "App. C: Regulatory" },
  { component: SlideAppendixD, title: "App. D: Projections" },
  { component: SlideAppendixE, title: "App. E: Cap Table" },
];

const AdminPitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const next = useCallback(() => setCurrentSlide(s => Math.min(s + 1, ALL_SLIDES.length - 1)), []);
  const prev = useCallback(() => setCurrentSlide(s => Math.max(s - 1, 0)), []);

  const exportToPdf = useCallback(async () => {
    setExporting(true);
    setExportProgress("Preparing slides…");
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });

      // Get all pre-rendered slide elements from the hidden export strip
      const container = document.getElementById("pdf-export-strip");
      if (!container) throw new Error("Export strip not found");

      const slideEls = container.querySelectorAll<HTMLElement>("[data-pdf-slide]");

      // Wait a tick for charts/images to paint
      await new Promise(r => setTimeout(r, 500));

      for (let i = 0; i < slideEls.length; i++) {
        setExportProgress(`Capturing slide ${i + 1}/${slideEls.length}…`);

        const canvas = await html2canvas(slideEls[i], {
          width: 1920,
          height: 1080,
          scale: 1,
          useCORS: true,
          backgroundColor: "#050709",
          logging: false,
          allowTaint: true,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        if (i > 0) pdf.addPage([1920, 1080], "landscape");
        pdf.addImage(imgData, "JPEG", 0, 0, 1920, 1080);
      }

      setExportProgress("Saving PDF…");
      pdf.save("Arxon-Pitch-Deck.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (exporting) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "g") setShowGrid(v => !v);
      if (e.key === "Escape") { setShowGrid(false); setIsFullscreen(false); }
      if (e.key === "f") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFs);
    return () => { window.removeEventListener("keydown", handleKey); document.removeEventListener("fullscreenchange", handleFs); };
  }, [next, prev, exporting]);

  const CurrentSlideComponent = ALL_SLIDES[currentSlide].component;

  if (showGrid) {
    return (
      <div className="min-h-screen bg-[hsl(220,15%,3%)] p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-[hsl(220,20%,95%)]">Arxon Pitch Deck</h1>
          <button onClick={() => setShowGrid(false)} className="text-xs text-[hsl(215,50%,65%)] hover:text-[hsl(215,50%,80%)] font-bold uppercase tracking-wider">
            ← Back to Presentation
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {ALL_SLIDES.map((slide, i) => {
            const SlideComp = slide.component;
            return (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setShowGrid(false); }}
                className={cn(
                  "relative aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03]",
                  i === currentSlide ? "border-[hsl(215,50%,65%)] shadow-[0_0_15px_hsl(215,50%,65%/0.3)]" : "border-[hsl(220,15%,15%)] hover:border-[hsl(220,15%,25%)]"
                )}
              >
                <div className="w-[1920px] h-[1080px] origin-top-left" style={{ transform: "scale(0.12)" }}>
                  <SlideComp />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className="text-[10px] text-white/80 font-bold">{i + 1}. {slide.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-[hsl(220,15%,2%)]",
      isFullscreen ? "fixed inset-0 z-[100]" : "min-h-[calc(100vh-3rem)] rounded-xl overflow-hidden"
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,15%,3%)] border-b border-[hsl(220,15%,10%)] z-20">
        <div className="flex items-center gap-3">
          <img src={arxonLogo} alt="Arxon" className="w-6 h-6 rounded-lg object-cover" />
          <span className="text-xs font-black text-[hsl(220,20%,95%)] tracking-[0.15em] hidden md:inline">ARXON PITCH DECK</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={exportToPdf}
            disabled={exporting}
            className="p-2 rounded-lg hover:bg-[hsl(220,15%,10%)] transition-colors text-[hsl(220,15%,50%)] hover:text-[hsl(220,20%,85%)] disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
            title="Download as PDF"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting && <span className="text-[10px] font-bold">{exportProgress}</span>}
          </button>
          <button onClick={() => setShowGrid(true)} className="p-2 rounded-lg hover:bg-[hsl(220,15%,10%)] transition-colors text-[hsl(220,15%,50%)] hover:text-[hsl(220,20%,85%)]">
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}
            className="p-2 rounded-lg hover:bg-[hsl(220,15%,10%)] transition-colors text-[hsl(220,15%,50%)] hover:text-[hsl(220,20%,85%)]"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>

        {currentSlide > 0 && (
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[hsl(220,15%,6%/0.8)] border border-[hsl(220,15%,18%)] flex items-center justify-center text-[hsl(220,15%,50%)] hover:text-[hsl(220,20%,85%)] hover:bg-[hsl(220,15%,10%)] transition-all z-10 backdrop-blur-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentSlide < ALL_SLIDES.length - 1 && (
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[hsl(220,15%,6%/0.8)] border border-[hsl(220,15%,18%)] flex items-center justify-center text-[hsl(220,15%,50%)] hover:text-[hsl(220,20%,85%)] hover:bg-[hsl(220,15%,10%)] transition-all z-10 backdrop-blur-sm">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,15%,3%)] border-t border-[hsl(220,15%,10%)]">
        <span className="text-[10px] text-[hsl(220,15%,35%)] font-bold">
          {currentSlide + 1} / {ALL_SLIDES.length}
        </span>
        <div className="flex items-center gap-1">
          {ALL_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "transition-all rounded-full",
                i === currentSlide
                  ? "w-5 h-1.5 bg-[hsl(215,50%,65%)]"
                  : i < 15
                    ? "w-1.5 h-1.5 bg-[hsl(220,15%,22%)] hover:bg-[hsl(220,15%,35%)]"
                    : "w-1.5 h-1.5 bg-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,28%)]"
              )}
            />
          ))}
        </div>
        <span className="text-[10px] text-[hsl(220,15%,30%)] font-medium">{ALL_SLIDES[currentSlide].title}</span>
      </div>

      {/* Hidden export strip — all slides pre-rendered in DOM for html2canvas */}
      <div
        id="pdf-export-strip"
        style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}
      >
        {ALL_SLIDES.map((slide, i) => {
          const SlideComp = slide.component;
          return (
            <div
              key={i}
              data-pdf-slide={i}
              style={{ width: 1920, height: 1080, position: "relative", overflow: "hidden", background: "hsl(220,15%,3%)", fontFamily: "'Creato Display', system-ui, sans-serif" }}
            >
              <SlideComp />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPitchDeck;
