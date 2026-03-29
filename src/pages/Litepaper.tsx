import { useState, useRef, useCallback } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const Litepaper = () => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const exportToPdf = useCallback(async () => {
    setExporting(true);
    setProgress("Preparing…");
    try {
      const container = document.getElementById("litepaper-pages");
      if (!container) return;
      const pages = container.querySelectorAll<HTMLElement>("[data-lp-page]");
      await new Promise(r => setTimeout(r, 300));

      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [816, 1056] });

      for (let i = 0; i < pages.length; i++) {
        setProgress(`Page ${i + 1}/${pages.length}…`);
        const canvas = await html2canvas(pages[i], {
          width: 816,
          height: 1056,
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage([816, 1056], "portrait");
        pdf.addImage(imgData, "JPEG", 0, 0, 816, 1056);
      }

      setProgress("Saving…");
      pdf.save("Arxon-Litepaper-v0.9.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
      setProgress("");
    }
  }, []);

  const pageStyle = "w-[816px] min-h-[1056px] h-[1056px] bg-white text-[#1a1a1a] p-16 flex flex-col overflow-hidden relative";
  const h1Style = "text-[28px] font-bold text-[#0a0a0a] leading-tight tracking-tight mb-1";
  const h2Style = "text-[20px] font-bold text-[#0a0a0a] leading-tight mt-6 mb-3";
  const h3Style = "text-[16px] font-semibold text-[#1a1a1a] leading-tight mt-4 mb-2";
  const pStyle = "text-[13px] leading-[1.7] text-[#2a2a2a] mb-3";
  const bulletStyle = "text-[13px] leading-[1.7] text-[#2a2a2a] pl-4 mb-1";
  const accentBar = "w-12 h-1 bg-[#0a0a0a] mb-4 mt-1";
  const footerStyle = "absolute bottom-8 left-16 right-16 flex justify-between items-center text-[10px] text-[#999] border-t border-[#e5e5e5] pt-3";

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center py-12">
      {/* Download bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#0a0a0a]" />
          <span className="text-[14px] font-semibold text-[#0a0a0a] tracking-tight">Arxon Litepaper — Version 0.9</span>
        </div>
        <button
          onClick={exportToPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-[13px] font-medium rounded-lg hover:bg-[#222] transition-colors disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? progress : "Download PDF"}
        </button>
      </div>

      <div className="h-14" />

      {/* Visible reading version */}
      <div ref={contentRef} className="flex flex-col items-center gap-8">
        {/* We show a nice readable version here */}
        <div className="max-w-3xl w-full bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-12 md:p-16">
          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-[3px] text-[#999] mb-4">Litepaper · Version 0.9 · February 2026</div>
            <h1 className="text-[36px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-3">Arxon</h1>
            <p className="text-[18px] text-[#555] leading-relaxed">A Sovereign Layer-1 Blockchain with Toggleable Privacy</p>
          </div>
          <div className={accentBar} />

          <div className="mb-8">
            <p className="text-[13px] text-[#666] leading-relaxed mb-4">
              <strong>Authors</strong><br />
              Gabe Ademibo — Founder &amp; CEO<br />
              Zeoraex Ronish — Blockchain Application Developer<br />
              Ojulowo Vincent — Frontend/UI Engineer
            </p>
          </div>

          <div className="bg-[#fafaf8] border border-[#e5e5e5] rounded-lg p-5 mb-8">
            <p className="text-[11px] text-[#888] leading-relaxed">
              <strong>Disclaimer</strong> — This litepaper is a high-level technical overview of Arxon as of February 2026. It is not a formal whitepaper, investment solicitation, or legal document. All specifications are subject to change based on development, audits, and community feedback. Arxon is in early pre-mainnet stage, and while we've bootstrapped mining traction, mainnet launch depends on funding and engineering milestones. For legal or investment advice, consult professionals.
            </p>
          </div>

          {/* Abstract */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">Abstract</h2>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-6">
            Arxon is a standalone Layer-1 blockchain designed for user-controlled privacy in everyday transactions and governance. By integrating Halo2 zk-SNARKs into a customized Substrate runtime, we enable one-tap toggling between transparent and shielded modes—allowing full privacy when needed, or complete auditability for compliance. Our mobile-first mining distribution bootstraps a decentralized community, while Proof-of-Stake consensus ensures secure, scalable operations. Targeting remittances and ZK-voting as core use cases, Arxon addresses real-world privacy gaps in high-growth markets. This litepaper outlines our technical architecture, token model, and path to mainnet.
          </p>

          {/* Introduction */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">1. Introduction &amp; Problem Statement</h2>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            We started Arxon to solve a core limitation in blockchain: privacy shouldn't be all-or-nothing. Existing chains either expose everything (like Ethereum) or hide everything (like Monero), leading to surveillance risks or regulatory delistings. With over $905 billion in global remittances annually (World Bank 2024–2025 data) and 1.3 billion unbanked facing high fees and tracking, there's a clear need for compliant, optional privacy. Add emerging demands for secure on-chain voting—where coercion resistance is key—and the opportunity is massive.
          </p>
          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-6 mb-2">Problem Statement</h3>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-6">
            Public ledgers make transactions traceable, deterring adoption in sensitive areas like remittances (where diaspora senders risk exposure) or governance (where votes could be coerced). Mandatory privacy chains face delistings (Monero on 73+ exchanges in 2025, per TRM Labs). We need a chain that lets users choose privacy per transaction, while supporting audits and KYC when required. Arxon delivers this with a modular Rust-based L1, starting from proven primitives to accelerate development without compromising security.
          </p>

          {/* Core Solution */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">2. Core Solution &amp; Key Features</h2>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            Arxon's runtime allows users to toggle privacy on-chain. In transparent mode, transactions are fully visible like standard Ethereum-style chains. In shielded mode, details (sender, recipient, amount) are hidden using Halo2 zk-SNARKs, but a public receipt proves validity without revealing data. This hybrid approach makes Arxon compliance-friendly while protecting user choice.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {[
              { title: "Toggle Privacy", desc: "One-tap in wallets — shielded transactions use zk proofs for confidentiality, transparent for audits." },
              { title: "Mobile/Browser Mining", desc: "Low-barrier entry to earn ARX-P points (convertible to $ARX post-mainnet), bootstrapping decentralization." },
              { title: "EVM Compatibility", desc: "Via pallet-evm, enabling Solidity developers to build dApps without Rust learning curve." },
              { title: "ZK-Voting dApp", desc: "Coercion-resistant ballots with verifiable results — private votes, public tallies." },
              { title: "Low Fees & Fast Finality", desc: "<$0.01 per transaction, <5s confirmation in optimized modes." },
            ].map((f, i) => (
              <div key={i} className="border border-[#e5e5e5] rounded-lg p-4">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-1">{f.title}</p>
                <p className="text-[12px] text-[#555] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Technical Architecture */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">3. Technical Architecture</h2>
          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-4 mb-2">Overview</h3>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            Arxon is a sovereign standalone L1 built in Rust, leveraging modular blockchain primitives for rapid iteration and security. We customize the runtime to integrate privacy without sacrificing performance or interoperability.
          </p>

          {/* Architecture Diagram */}
          <div className="border border-[#e5e5e5] rounded-lg p-6 my-6 bg-[#fafaf8]">
            <p className="text-[11px] uppercase tracking-[2px] text-[#999] mb-4">Layered Architecture</p>
            <div className="space-y-3">
              {[
                { layer: "Application Layer", detail: "ZK-voting, shielded remittances, EVM smart contracts" },
                { layer: "ZK Proof Engine", detail: "Halo2 zk-SNARKs — no trusted setup, toggleable shielding" },
                { layer: "Transaction Layer", detail: "Extrinsic dispatch to shielded or transparent paths" },
                { layer: "Consensus Layer", detail: "BABE block production + GRANDPA finality (PoS)" },
              ].map((l, i) => (
                <div key={i} className="flex items-start gap-4 border-l-2 border-[#0a0a0a] pl-4 py-2">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0a0a0a]">{l.layer}</p>
                    <p className="text-[12px] text-[#666]">{l.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-6 mb-2">Runtime &amp; Execution</h3>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            The core is a Wasm-compiled runtime, allowing forkless upgrades. Transactions are weighted for gas fees, with parallel dispatch for non-conflicting extrinsics—using multi-threaded execution on validator nodes to scale. For privacy, shielded transactions generate Halo2 proofs client-side (fast generation 10–50ms on mobile) and verify on-chain (1–5ms per proof).
          </p>

          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-6 mb-2">Consensus &amp; Security</h3>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            BABE assigns blocks probabilistically based on stake, reducing attack vectors. GRANDPA ensures finality with 2/3 validator agreement. We plan comprehensive audits for custom pallets (toggle privacy, mining rewards) by Web3/privacy specialists like OtterSec or SRLabs pre-mainnet.
          </p>

          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-6 mb-2">Performance Targets</h3>
          <div className="grid grid-cols-3 gap-4 my-4">
            {[
              { label: "Transparent Mode", value: "5,000–20,000+ TPS" },
              { label: "Private Mode", value: "10–500 TPS" },
              { label: "Long-term Target", value: "100,000+ TPS" },
            ].map((p, i) => (
              <div key={i} className="text-center border border-[#e5e5e5] rounded-lg p-4 bg-[#fafaf8]">
                <p className="text-[18px] font-bold text-[#0a0a0a]">{p.value}</p>
                <p className="text-[11px] text-[#888] mt-1">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[#888] mb-6">Production depends on hardware, transaction type, and privacy mix — benchmarks on public testnet Q3 2026.</p>

          {

          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-6 mb-2">Utility</h3>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            $ARX pays gas fees, stakes for validator rewards, votes in governance, and claims mining points. In PoS, stakers secure the network and earn from fees.
          </p>

          <h3 className="text-[17px] font-semibold text-[#0a0a0a] mt-6 mb-2">Emission &amp; Vesting</h3>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-6">
            Mining tapers over 4–5 years (halving-style). Vested portions unlock linearly; staking bonuses for holders. Fee burns (30–50% of transaction fees) offset staking emissions for mild deflation.
          </p>

          {/* Roadmap */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">5. Roadmap</h2>
          <div className="space-y-4 my-6">
            {[
              { phase: "Current – Mid 2026", items: "Mining live (10K+ users), pre-seed raise, team expansion, early EVM prototypes." },
              { phase: "Post-Raise – H2 2026", items: "Core hires, testnet launch (custom runtime with privacy pallet, Halo2, mining hooks), audits, EVM rollout." },
              { phase: "2027", items: "Mainnet, remittances corridors (India/Nigeria focus), voting dApp beta, partnerships." },
              { phase: "2028+", items: "1M+ users, multi-country voting pilots, ecosystem growth (ARX-20, DeFi)." },
            ].map((r, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className="text-[13px] font-semibold text-[#0a0a0a]">{r.phase}</p>
                </div>
                <div className="flex-1 border-l-2 border-[#ddd] pl-4">
                  <p className="text-[13px] text-[#444] leading-relaxed">{r.items}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Risks */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">6. Risks &amp; Mitigations</h2>
          <div className="space-y-3 my-4">
            {[
              { risk: "Technical (ZK complexity)", mitigation: "Use proven Halo2 + comprehensive audits." },
              { risk: "Regulatory (privacy/delisting)", mitigation: "Optional toggle for compliance; legal opinions pre-TGE." },
              { risk: "Adoption", mitigation: "Mining traction de-risks; focus remittances beachheads." },
              { risk: "Security", mitigation: "Full audits, bug bounties." },
            ].map((r, i) => (
              <div key={i} className="flex gap-4 text-[13px]">
                <span className="font-semibold text-[#0a0a0a] w-48 flex-shrink-0">{r.risk}</span>
                <span className="text-[#555]">{r.mitigation}</span>
              </div>
            ))}
          </div>

          {/* Conclusion */}
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mt-10 mb-3">7. Conclusion</h2>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-6">
            Arxon combines modular technology with real-world utility to deliver privacy that adapts. We've proven distribution with mining; now we build the L1 to match. Join us in making blockchain safe and scalable for billions.
          </p>

          {/* Contact */}
          <div className="border-t border-[#e5e5e5] pt-6 mt-10">
            <h3 className="text-[17px] font-semibold text-[#0a0a0a] mb-3">Contact</h3>
            <p className="text-[14px] text-[#444] leading-relaxed">
              Gabe Ademibo, Founder &amp; CEO<br />
              X: @GabeXmeta<br />
              Website: arxon.xyz
            </p>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[11px] text-[#bbb]">© 2026 Arxon. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Hidden PDF pages for export — fixed 8.5x11 ratio */}
      <div id="litepaper-pages" style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}>
        {/* Page 1: Title */}
        <div data-lp-page="0" style={{ width: 816, height: 1056, background: "#fff", padding: 64, display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "#0a0a0a" }} />
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#999", textTransform: "uppercase", marginBottom: 32 }}>Litepaper · Version 0.9 · February 2026</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#0a0a0a", lineHeight: 1.1, marginBottom: 12 }}>Arxon</div>
          <div style={{ fontSize: 20, color: "#555", marginBottom: 48 }}>A Sovereign Layer-1 Blockchain with Toggleable Privacy</div>
          <div style={{ width: 48, height: 3, background: "#0a0a0a", marginBottom: 40 }} />
          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
            <strong>Authors</strong><br />
            Gabe Ademibo — Founder &amp; CEO<br />
            Zeoraex Ronish — Blockchain Application Developer<br />
            Ojulowo Vincent — Frontend/UI Engineer
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 1</span>
          </div>
        </div>

        {/* Page 2: Disclaimer + Abstract */}
        <div data-lp-page="1" style={{ width: 816, height: 1056, background: "#fff", padding: 64, fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ background: "#fafaf8", border: "1px solid #e5e5e5", borderRadius: 8, padding: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 }}>Disclaimer</div>
            <div style={{ fontSize: 11, color: "#888", lineHeight: 1.7 }}>
              This litepaper is a high-level technical overview of Arxon as of February 2026. It is not a formal whitepaper, investment solicitation, or legal document. All specifications are subject to change based on development, audits, and community feedback. Arxon is in early pre-mainnet stage, and while we've bootstrapped mining traction, mainnet launch depends on funding and engineering milestones. For legal or investment advice, consult professionals.
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginBottom: 12 }}>Abstract</div>
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8 }}>
            Arxon is a standalone Layer-1 blockchain designed for user-controlled privacy in everyday transactions and governance. By integrating Halo2 zk-SNARKs into a customized Substrate runtime, we enable one-tap toggling between transparent and shielded modes—allowing full privacy when needed, or complete auditability for compliance. Our mobile-first mining distribution bootstraps a decentralized community, while Proof-of-Stake consensus ensures secure, scalable operations. Targeting remittances and ZK-voting as core use cases, Arxon addresses real-world privacy gaps in high-growth markets. This litepaper outlines our technical architecture, token model, and path to mainnet.
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 2</span>
          </div>
        </div>

        {/* Page 3: Introduction & Problem */}
        <div data-lp-page="2" style={{ width: 816, height: 1056, background: "#fff", padding: 64, fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginBottom: 12 }}>1. Introduction &amp; Problem Statement</div>
          <div style={{ width: 48, height: 3, background: "#0a0a0a", marginBottom: 20 }} />
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8, marginBottom: 24 }}>
            We started Arxon to solve a core limitation in blockchain: privacy shouldn't be all-or-nothing. Existing chains either expose everything (like Ethereum) or hide everything (like Monero), leading to surveillance risks or regulatory delistings. With over $905 billion in global remittances annually (World Bank 2024–2025 data) and 1.3 billion unbanked facing high fees and tracking, there's a clear need for compliant, optional privacy. Add emerging demands for secure on-chain voting—where coercion resistance is key—and the opportunity is massive.
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#0a0a0a", marginBottom: 12 }}>Problem Statement</div>
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8 }}>
            Public ledgers make transactions traceable, deterring adoption in sensitive areas like remittances (where diaspora senders risk exposure) or governance (where votes could be coerced). Mandatory privacy chains face delistings (Monero on 73+ exchanges in 2025, per TRM Labs). We need a chain that lets users choose privacy per transaction, while supporting audits and KYC when required. Arxon delivers this with a modular Rust-based L1, starting from proven primitives to accelerate development without compromising security.
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 3</span>
          </div>
        </div>

        {/* Page 4: Core Solution & Features */}
        <div data-lp-page="3" style={{ width: 816, height: 1056, background: "#fff", padding: 64, fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginBottom: 12 }}>2. Core Solution &amp; Key Features</div>
          <div style={{ width: 48, height: 3, background: "#0a0a0a", marginBottom: 20 }} />
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8, marginBottom: 24 }}>
            Arxon's runtime allows users to toggle privacy on-chain. In transparent mode, transactions are fully visible like standard Ethereum-style chains. In shielded mode, details (sender, recipient, amount) are hidden using Halo2 zk-SNARKs, but a public receipt proves validity without revealing data. This hybrid approach makes Arxon compliance-friendly while protecting user choice.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { t: "Toggle Privacy", d: "One-tap in wallets — shielded transactions use zk proofs for confidentiality, transparent for audits." },
              { t: "Mobile/Browser Mining", d: "Low-barrier entry to earn ARX-P points (convertible to $ARX post-mainnet), bootstrapping decentralization." },
              { t: "EVM Compatibility", d: "Via pallet-evm, enabling Solidity developers to build dApps without Rust learning curve." },
              { t: "ZK-Voting dApp", d: "Coercion-resistant ballots with verifiable results — private votes, public tallies." },
            ].map((f, i) => (
              <div key={i} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0a0a0a", marginBottom: 4 }}>{f.t}</div>
                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{f.d}</div>
              </div>
            ))}
          </div>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0a0a0a", marginBottom: 4 }}>Low Fees &amp; Fast Finality</div>
            <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{"<"}$0.01 per transaction, {"<"}5s confirmation in optimized modes.</div>
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 4</span>
          </div>
        </div>

        {/* Page 5: Technical Architecture Overview */}
        <div data-lp-page="4" style={{ width: 816, height: 1056, background: "#fff", padding: 64, fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginBottom: 12 }}>3. Technical Architecture — Overview</div>
          <div style={{ width: 48, height: 3, background: "#0a0a0a", marginBottom: 20 }} />
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8, marginBottom: 24 }}>
            Arxon is a sovereign standalone L1 built in Rust, leveraging modular blockchain primitives for rapid iteration and security. We customize the runtime to integrate privacy without sacrificing performance or interoperability.
          </div>
          <div style={{ background: "#fafaf8", border: "1px solid #e5e5e5", borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#999", marginBottom: 16 }}>Layered Architecture</div>
            {[
              { l: "Application Layer", d: "ZK-voting, shielded remittances, EVM smart contracts" },
              { l: "ZK Proof Engine", d: "Halo2 zk-SNARKs — no trusted setup, toggleable shielding" },
              { l: "Transaction Layer", d: "Extrinsic dispatch to shielded or transparent paths" },
              { l: "Consensus Layer", d: "BABE block production + GRANDPA finality (PoS)" },
            ].map((item, i) => (
              <div key={i} style={{ borderLeft: "3px solid #0a0a0a", paddingLeft: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0a0a0a" }}>{item.l}</div>
                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{item.d}</div>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 5</span>
          </div>
        </div>

        {/* Page 6: Technical Details */}
        <div data-lp-page="5" style={{ width: 816, height: 1056, background: "#fff", padding: 64, fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginBottom: 12 }}>3. Technical Architecture — Details</div>
          <div style={{ width: 48, height: 3, background: "#0a0a0a", marginBottom: 20 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0a0a0a", marginBottom: 8 }}>Runtime &amp; Execution</div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.8, marginBottom: 20 }}>
            The core is a Wasm-compiled runtime, allowing forkless upgrades. Transactions are weighted for gas fees, with parallel dispatch for non-conflicting extrinsics—using multi-threaded execution on validator nodes to scale. For privacy, shielded transactions generate Halo2 proofs client-side (fast generation 10–50ms on mobile) and verify on-chain (1–5ms per proof).
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0a0a0a", marginBottom: 8 }}>Consensus &amp; Security</div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.8, marginBottom: 20 }}>
            BABE assigns blocks probabilistically based on stake, reducing attack vectors. GRANDPA ensures finality with 2/3 validator agreement. We plan comprehensive audits for custom pallets (toggle privacy, mining rewards) by Web3/privacy specialists like OtterSec or SRLabs pre-mainnet.
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0a0a0a", marginBottom: 12 }}>Performance Targets</div>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { v: "5,000–20,000+", l: "TPS (Transparent)" },
              { v: "10–500", l: "TPS (Private)" },
              { v: "100,000+", l: "TPS (Long-term)" },
            ].map((p, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", border: "1px solid #e5e5e5", borderRadius: 8, padding: 16, background: "#fafaf8" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0a0a0a" }}>{p.v}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>{p.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 12 }}>Production depends on hardware, transaction type, and privacy mix — benchmarks on public testnet Q3 2026.</div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 6</span>
          </div>
        </div>

        
          </table>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0a0a0a", marginBottom: 8 }}>Utility</div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.8, marginBottom: 16 }}>
            $ARX pays gas fees, stakes for validator rewards, votes in governance, and claims mining points. In PoS, stakers secure the network and earn from fees.
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0a0a0a", marginBottom: 8 }}>Emission &amp; Vesting</div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.8 }}>
            Mining tapers over 4–5 years (halving-style). Vested portions unlock linearly; staking bonuses for holders. Fee burns (30–50% of transaction fees) offset staking emissions for mild deflation.
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 7</span>
          </div>
        </div>

        {/* Page 8: Roadmap, Risks, Conclusion */}
        <div data-lp-page="7" style={{ width: 816, height: 1056, background: "#fff", padding: 64, fontFamily: "'Creato Display', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginBottom: 12 }}>5. Roadmap</div>
          <div style={{ width: 48, height: 3, background: "#0a0a0a", marginBottom: 16 }} />
          {[
            { p: "Current – Mid 2026", d: "Mining live (10K+ users), pre-seed raise, team expansion, early EVM prototypes." },
            { p: "Post-Raise – H2 2026", d: "Core hires, testnet launch (custom runtime with privacy pallet, Halo2, mining hooks), audits, EVM rollout." },
            { p: "2027", d: "Mainnet, remittances corridors (India/Nigeria focus), voting dApp beta, partnerships." },
            { p: "2028+", d: "1M+ users, multi-country voting pilots, ecosystem growth (ARX-20, DeFi)." },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <div style={{ width: 150, fontSize: 12, fontWeight: 600, color: "#0a0a0a", flexShrink: 0 }}>{r.p}</div>
              <div style={{ borderLeft: "2px solid #ddd", paddingLeft: 16, fontSize: 12, color: "#444", lineHeight: 1.7 }}>{r.d}</div>
            </div>
          ))}

          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginTop: 28, marginBottom: 12 }}>6. Risks &amp; Mitigations</div>
          {[
            { r: "Technical (ZK complexity)", m: "Use proven Halo2 + comprehensive audits." },
            { r: "Regulatory (privacy/delisting)", m: "Optional toggle for compliance; legal opinions pre-TGE." },
            { r: "Adoption", m: "Mining traction de-risks; focus remittances beachheads." },
            { r: "Security", m: "Full audits, bug bounties." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: "#0a0a0a", width: 200, flexShrink: 0 }}>{item.r}</span>
              <span style={{ color: "#555" }}>{item.m}</span>
            </div>
          ))}

          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a0a0a", marginTop: 28, marginBottom: 12 }}>7. Conclusion</div>
          <div style={{ fontSize: 12, color: "#333", lineHeight: 1.8, marginBottom: 20 }}>
            Arxon combines modular technology with real-world utility to deliver privacy that adapts. We've proven distribution with mining; now we build the L1 to match. Join us in making blockchain safe and scalable for billions.
          </div>
          <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0a0a0a", marginBottom: 8 }}>Contact</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.8 }}>
              Gabe Ademibo, Founder &amp; CEO · X: @GabeXmeta · Website: https://arxon.io/
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 64, right: 64, borderTop: "1px solid #e5e5e5", paddingTop: 12, fontSize: 10, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>Arxon Litepaper v0.9</span><span>Confidential — Page 8</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Litepaper;
