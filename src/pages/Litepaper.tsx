import { useState, useRef, useCallback } from "react";
import { Download, Loader2, FileText, ArrowLeft } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

const Litepaper = () => {
  const [exporting, setExporting] = useState(false);
  const [progress,  setProgress]  = useState("");
  const navigate = useNavigate();

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
          width: 816, height: 1056, scale: 2, useCORS: true,
          backgroundColor: "#ffffff", logging: false,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage([816, 1056], "portrait");
        pdf.addImage(imgData, "JPEG", 0, 0, 816, 1056);
      }
      setProgress("Saving…");
      pdf.save("Arxon-Litepaper-2026.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
      setProgress("");
    }
  }, []);

  /* ── shared text styles ── */
  const pg   = "w-[816px] h-[1056px] bg-white text-[#1a1a1a] p-[72px] flex flex-col overflow-hidden relative";
  const h1   = "text-[32px] font-bold text-[#0a0a0a] leading-tight tracking-tight mb-2";
  const h2   = "text-[18px] font-bold text-[#0a0a0a] leading-tight mt-6 mb-2";
  const h3   = "text-[14px] font-semibold text-[#111] leading-tight mt-4 mb-1";
  const p    = "text-[12.5px] leading-[1.75] text-[#2a2a2a] mb-3";
  const li   = "text-[12.5px] leading-[1.7] text-[#2a2a2a] pl-5 mb-1";
  const bar  = "w-10 h-[3px] bg-[#0a0a0a] mb-5 mt-1";
  const tag  = "text-[9.5px] uppercase tracking-[3px] text-[#aaa] mb-3";
  const ft   = "absolute bottom-7 left-[72px] right-[72px] flex justify-between items-center text-[9px] text-[#bbb] border-t border-[#e8e8e8] pt-3";
  const rule = "border-t border-[#e5e5e5] my-5";
  const accent = "#8BAED6";
  const pNum = (n: number) => <div className={ft}><span>arxon.io</span><span>Arxon Litepaper 2026</span><span>Page {n}</span></div>;

  return (
    <div className="min-h-screen bg-[#f3f3ee] flex flex-col items-center py-12">

      {/* ── Top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#0a0a0a] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-px h-4 bg-[#e5e5e5]" />
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#0a0a0a]" />
            <span className="text-[13px] font-semibold text-[#0a0a0a]">Arxon Litepaper — 2026</span>
          </div>
        </div>
        <button
          onClick={exportToPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#0a0a0a] text-white text-[12px] font-medium rounded-lg hover:bg-[#222] transition-colors disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {exporting ? progress : "Download PDF"}
        </button>
      </div>
      <div className="h-14" />

      {/* ══════════════════════════════════════════════
          READABLE WEB VERSION
      ══════════════════════════════════════════════ */}
      <div className="max-w-3xl w-full mx-auto px-6 mb-20">

        {/* Cover */}
        <div className="bg-[#0a0e18] rounded-2xl p-12 mb-8 relative overflow-hidden" style={{background:'linear-gradient(145deg,#0b1829,#040a14)'}}>
          <div style={{position:'absolute',top:-60,right:-60,width:260,height:260,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(139,174,214,0.12),transparent 70%)',pointerEvents:'none'}}/>
          <div style={{fontSize:10,color:'rgba(172,202,254,.5)',letterSpacing:'3px',textTransform:'uppercase',marginBottom:16}}>Litepaper · 2026</div>
          <div style={{fontSize:42,fontWeight:900,color:'#f0f4ff',letterSpacing:'-.03em',lineHeight:1,marginBottom:8}}>ARXON</div>
          <div style={{fontSize:18,color:'rgba(172,202,254,.7)',marginBottom:20,fontWeight:300,lineHeight:1.5}}>Sovereign Privacy Blockchain<br/>for the Unbanked World</div>
          <div style={{width:40,height:2,background:accent,marginBottom:20}}/>
          <div style={{fontSize:13,color:'rgba(240,244,255,.5)',fontStyle:'italic',lineHeight:1.6}}>
            "Financial sovereignty is not a privilege. It is a right."
          </div>
        </div>

        {/* Intro */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 mb-6">
          <div className="text-[11px] uppercase tracking-[2.5px] text-[#aaa] mb-4">Introduction</div>
          <p className="text-[14px] leading-[1.8] text-[#333] mb-4">
            This document is a clear, honest overview of what Arxon is, what problem it solves, and what we are building. It is written for anyone — not just developers or investors. If you have ever sent money across borders, worried about who can see your finances, or wondered whether your vote actually counts, Arxon is built for you.
          </p>
        </div>

        {/* The Problem */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 mb-6">
          <div className="text-[11px] uppercase tracking-[2.5px] text-[#aaa] mb-2">The Problem</div>
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mb-1 leading-tight">The Global Financial System Fails the Many</h2>
          <div className="w-8 h-[3px] mb-5" style={{background:accent}}/>
          <p className="text-[13.5px] leading-[1.8] text-[#333] mb-5">
            Despite two generations of cryptocurrency innovation, over <strong>1.4 billion adults worldwide</strong> remain without access to basic financial services. Blockchain promised to change this. In practice, the benefits have mostly flowed to those who were already financially included.
          </p>

          <div className="space-y-5">
            {[
              {
                title: "Financial Exclusion",
                body: "Hundreds of millions of people in Africa, Asia, and Latin America conduct their entire financial lives in cash. Without bank accounts, they cannot save securely, access credit, or participate in the digital economy. Traditional banks require government ID, proof of address, minimum balances, and physical branches — requirements that exclude entire communities."
              },
              {
                title: "Financial Surveillance",
                body: "Public blockchains solve financial exclusion but introduce a new problem: total transparency. On most chains, your wallet balance, every transaction you have ever made, and every person you have ever paid is permanently visible to anyone on earth. In environments where wealth makes you a target, or where political activity can lead to persecution, a fully transparent financial record is dangerous."
              },
              {
                title: "The Cost of Sending Money Home",
                body: "The Nigerian diaspora alone sends over $20 billion home every year. At current average fees of 6–8% charged by services like Western Union, that means over $1.5 billion is extracted from the world's poorest families every single year — not going to the families, not going to the economy, just disappearing into fees. Blockchain can reduce this cost to near zero. But only if the technology is actually accessible."
              }
            ].map(item => (
              <div key={item.title} className="pl-5 border-l-2" style={{borderColor:accent}}>
                <div className="text-[13px] font-bold text-[#0a0a0a] mb-1">{item.title}</div>
                <p className="text-[13px] leading-[1.75] text-[#444]">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-[#fafaf8] border border-[#e5e5e5]">
            <p className="text-[12.5px] text-[#555] leading-[1.75] italic">
              Existing privacy blockchains do not solve this well. Some force every transaction to be anonymous whether you want it or not, creating regulatory problems and exchange delistings. Others offer a simple on/off switch that most users never touch. None offer what real people actually need: <strong>control over exactly what information they share, with whom, and when.</strong>
            </p>
          </div>
        </div>

        {/* The Solution */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 mb-6">
          <div className="text-[11px] uppercase tracking-[2.5px] text-[#aaa] mb-2">The Arxon Solution</div>
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mb-1 leading-tight">A Sovereign Layer-1 Built for the Excluded</h2>
          <div className="w-8 h-[3px] mb-5" style={{background:accent}}/>
          <p className="text-[13.5px] leading-[1.8] text-[#333] mb-4">
            Arxon is a sovereign Layer-1 blockchain built from the ground up to serve the people that existing financial systems — both traditional and crypto — have failed. It is not a modification of another chain. It is not built on Ethereum or Bitcoin. Arxon is its own independent network with its own consensus, its own token, its own rules, and its own mission.
          </p>
          <p className="text-[13.5px] leading-[1.8] text-[#333] mb-6">
            Arxon gives users <strong>complete control over their financial privacy</strong> — not a binary switch, but granular, per-transaction choice.
          </p>

          <div className="rounded-xl p-6 mb-5" style={{background:'linear-gradient(145deg,#f0f5ff,#f8f9ff)',border:`1px solid ${accent}30`}}>
            <div className="text-[12px] font-bold text-[#0a0a0a] mb-3">The Selective Privacy System — Four Independent Flags</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { flag:"Hide Sender Address", eg:"Protect your identity" },
                { flag:"Hide Receiver Address", eg:"Keep recipients private" },
                { flag:"Hide Transaction Amount", eg:"Confidential payments" },
                { flag:"Hide Wallet Balance", eg:"Financial privacy" },
              ].map(item => (
                <div key={item.flag} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#e8e8e8]">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:`${accent}20`,border:`1px solid ${accent}50`}}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{background:accent}}/>
                  </div>
                  <div>
                    <div className="text-[11.5px] font-semibold text-[#0a0a0a]">{item.flag}</div>
                    <div className="text-[10.5px] text-[#888]">{item.eg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[13px] leading-[1.75] text-[#444]">
            This means a Nigerian woman receiving money from her son in London can show who sent it — so she knows it is genuine — but hide the amount, so no one in her community knows her financial situation. A business paying a supplier can make the payment amount private for competitive reasons while keeping the destination publicly verifiable. No other blockchain offers this level of user control. <strong>Arxon is the first.</strong>
          </p>
        </div>

        {/* What We Built */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 mb-6">
          <div className="text-[11px] uppercase tracking-[2.5px] text-[#aaa] mb-2">What Arxon Has Built</div>
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mb-1 leading-tight">The Chain Is Running. Blocks Are Being Produced.</h2>
          <div className="w-8 h-[3px] mb-5" style={{background:accent}}/>

          <div className="space-y-6">
            {[
              {
                title: "A Live Sovereign Blockchain",
                body: "Arxon runs its own independent network using BABE/GRANDPA consensus — the same battle-tested mechanism that secures Polkadot. The chain produces a new block every six seconds and has been running in multi-node testnet configuration with independent validators producing and finalising blocks in real time. The chain has its own unique identity: unique Chain ID, token symbol (ARX), and a fixed total supply with no inflation."
              },
              {
                title: "Full Ethereum Compatibility",
                body: "Arxon is fully compatible with the Ethereum Virtual Machine. Any smart contract written for Ethereum deploys on Arxon without a single line of code changed. MetaMask connects to Arxon. Every Ethereum developer tool works on Arxon out of the box. The combination of Ethereum compatibility with Arxon's selective privacy creates something that does not exist anywhere else: privacy-preserving decentralised finance."
              },
              {
                title: "Private Transaction Receipts",
                body: "Every transaction with any privacy flag active automatically generates a Private Transaction Receipt — a tamper-proof, permanently stored record of the full transaction details. This receipt acts as a legal document: complete sender and receiver addresses, transaction amount, timestamp to the second, block number, and each party's wallet balance immediately before and after the transaction. For third-party verification, either party can generate a single-use disclosure code that burns permanently after use."
              },
              {
                title: "The ARX-P Mining System",
                body: "Before mainnet launches, Arxon has built a growing mining community earning points through browser and mobile applications that require no hardware investment and no technical knowledge. Points earned through mining are called ARX-P. At mainnet, these points convert to real ARX tokens through the on-chain claim system. Arxon's mining community means there will be immediate organic demand for ARX at launch from real participants who earned their tokens through effort, not purchasing power."
              },
            ].map(item => (
              <div key={item.title}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${accent}18`,border:`1px solid ${accent}30`}}>
                    <div className="w-2 h-2 rounded-full" style={{background:accent}}/>
                  </div>
                  <div className="text-[14px] font-bold text-[#0a0a0a]">{item.title}</div>
                </div>
                <p className="text-[13px] leading-[1.8] text-[#444] pl-9">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 mb-6">
          <div className="text-[11px] uppercase tracking-[2.5px] text-[#aaa] mb-2">Roadmap</div>
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mb-1 leading-tight">Progress, Not Plans</h2>
          <div className="w-8 h-[3px] mb-5" style={{background:accent}}/>
          <p className="text-[13px] leading-[1.75] text-[#555] mb-6">Every milestone listed below corresponds to working code. Arxon publishes progress openly on GitHub.</p>

          {[
            {
              phase: "COMPLETE — Foundation",
              color: "#2dd4a0",
              items: [
                "Sovereign Layer-1 blockchain running in multi-node testnet",
                "ARX native token, fixed supply, no inflation",
                "Full EVM compatibility — MetaMask, Solidity, all Ethereum tooling",
                "Selective privacy system — four independent per-transaction flags",
                "Balance visibility toggle — users control public/private balance display",
                "Private Transaction Receipt system with single-use disclosure codes",
                "ARX-P mining system — community earning before mainnet",
                "On-chain ARX claim pallet for unlimited miners",
                "Professional whitepaper and open-source codebase on GitHub",
              ]
            },
            {
              phase: "IN PROGRESS — Public Testnet",
              color: accent,
              items: [
                "Public testnet launch — anyone can connect and transact",
                "Block explorer — browse all Arxon transactions publicly",
                "Testnet faucet — developers get test ARX to build with",
                "Validator expansion — growing the independent validator set",
                "Anti-rug protection registry for builders",
                "Developer documentation and SDK release",
                "MetaMask official chain registration",
              ]
            },
            {
              phase: "BUILDING — ZK Privacy",
              color: "#f5a623",
              items: [
                "Halo2 zero-knowledge proof integration for private transfers",
                "Cryptographic enforcement of all four privacy flags",
                "ZK voting Phase 1 — private on-chain votes with verifiable results",
                "Privacy-preserving DeFi primitive contracts",
                "Third-party ZK circuit security audit",
              ]
            },
            {
              phase: "AHEAD — Ecosystem",
              color: "#999",
              items: [
                "ZK voting Phase 2 — national-scale batch proof elections",
                "Remittance corridor integrations for Nigeria and diaspora markets",
                "Mobile wallet with built-in privacy controls",
                "Institutional partnerships for election infrastructure",
                "Cross-chain bridges to major ecosystems",
                "Mainnet launch with ARX-P conversion open to all miners",
              ]
            },
          ].map(phase => (
            <div key={phase.phase} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:phase.color}}/>
                <div className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{color:phase.color}}>{phase.phase}</div>
              </div>
              <div className="pl-4 space-y-1.5">
                {phase.items.map(item => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="text-[#bbb] mt-1 flex-shrink-0" style={{fontSize:10}}>→</div>
                    <span className="text-[12.5px] leading-[1.7] text-[#444]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Why Arxon */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 mb-6">
          <div className="text-[11px] uppercase tracking-[2.5px] text-[#aaa] mb-2">Why Arxon</div>
          <h2 className="text-[22px] font-bold text-[#0a0a0a] mb-1 leading-tight">Three Differences That Matter</h2>
          <div className="w-8 h-[3px] mb-5" style={{background:accent}}/>

          {[
            {
              n: "01",
              title: "The problem is real and the users are real",
              body: "Financial exclusion is not a theoretical problem. It affects hundreds of millions of people right now. The diaspora sending money home, paying 7% in fees, is real. The person in a country with unstable governance who cannot safely show their wealth is real. The voter who fears coercion is real. Arxon is built for these people — not as a marketing narrative, but as the actual design brief."
            },
            {
              n: "02",
              title: "The technology is original",
              body: "Selective transaction privacy — the ability to independently hide sender, receiver, amount, and balance on a per-transaction basis — does not exist on any other production blockchain. This is not an incremental improvement. It is a new capability. As we build with zero-knowledge proofs, Arxon becomes the most sophisticated privacy system on any EVM-compatible chain."
            },
            {
              n: "03",
              title: "The community is real and growing",
              body: "Most blockchain projects launch and then struggle to acquire users. Arxon's mining community means there will be immediate organic demand for ARX at launch from hundreds of thousands of real participants who earned their tokens through effort, not purchasing power. The community is the network."
            },
          ].map(item => (
            <div key={item.n} className="flex gap-5 mb-6">
              <div className="text-[28px] font-black flex-shrink-0 leading-none mt-0.5" style={{color:`${accent}40`}}>{item.n}</div>
              <div>
                <div className="text-[14px] font-bold text-[#0a0a0a] mb-2">{item.title}</div>
                <p className="text-[13px] leading-[1.8] text-[#444]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing */}
        <div className="rounded-2xl p-10 text-center mb-6" style={{background:'linear-gradient(145deg,#0b1829,#040a14)',border:'1px solid rgba(172,202,254,.14)'}}>
          <p className="text-[13.5px] leading-[1.9] mb-5" style={{color:'rgba(172,202,254,.7)'}}>
            Bitcoin proved that money without banks was possible. Ethereum proved that programmable money was possible.{" "}
            <strong style={{color:'#f0f4ff'}}>Arxon is proving that private, accessible, fair money is possible</strong>{" "}
            — and building it for the people who need it most.
          </p>
          <p className="text-[13px] font-bold" style={{color:'#accafe'}}>"Arxon is Built For the World."</p>
          <p className="text-[11px] mt-4" style={{color:'rgba(172,202,254,.35)'}}>arxon.io</p>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl p-5 bg-[#fafaf8] border border-[#e5e5e5]">
          <p className="text-[11px] text-[#888] leading-[1.75]">
            <strong>Disclaimer</strong> — This litepaper is for informational purposes only. It does not constitute financial advice or an offer of any kind. Arxon is in active development. All technical details are subject to change as the project evolves. For legal or investment advice, consult qualified professionals.
          </p>
        </div>
      </div>


      {/* ══════════════════════════════════════════════
          HIDDEN PDF-EXPORT PAGES (exact A4 dimensions)
      ══════════════════════════════════════════════ */}
      <div id="litepaper-pages" style={{position:'absolute',left:'-9999px',top:0}}>

        {/* PAGE 1 — Cover */}
        <div data-lp-page className={pg} style={{background:'#0a0e18',color:'#f0f4ff',justifyContent:'center',alignItems:'flex-start'}}>
          <div style={{position:'absolute',top:-80,right:-80,width:360,height:360,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(139,174,214,0.1),transparent 70%)'}}/>
          <div style={{marginBottom:12,fontSize:10,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(172,202,254,.5)'}}>Litepaper · 2026</div>
          <div style={{fontSize:60,fontWeight:900,letterSpacing:'-2px',lineHeight:1,color:'#f0f4ff',marginBottom:12}}>ARXON</div>
          <div style={{fontSize:22,fontWeight:300,color:'rgba(172,202,254,.7)',lineHeight:1.5,marginBottom:24}}>Sovereign Privacy Blockchain<br/>for the Unbanked World</div>
          <div style={{width:48,height:3,background:accent,marginBottom:32}}/>
          <div style={{fontSize:16,fontStyle:'italic',color:'rgba(172,202,254,.55)',lineHeight:1.7,maxWidth:500,marginBottom:60}}>
            "Financial sovereignty is not a privilege. It is a right."
          </div>
          <div style={{fontSize:12,color:'rgba(172,202,254,.3)',marginTop:'auto'}}>arxon.io</div>
        </div>

        {/* PAGE 2 — The Problem */}
        <div data-lp-page className={pg}>
          <div className={tag}>The Problem</div>
          <div className={h1}>The Global Financial System<br/>Fails the Many</div>
          <div className={bar}/>
          <p className={p}>Despite two generations of cryptocurrency innovation, over <strong>1.4 billion adults worldwide</strong> remain without access to basic financial services. Blockchain promised to change this. In practice, the benefits have mostly flowed to those who were already financially included.</p>
          <p className={p}>Three specific problems remain unsolved:</p>
          <div className={h2}>Financial Exclusion</div>
          <p className={p}>Hundreds of millions of people in Africa, Asia, and Latin America conduct their entire financial lives in cash. Without bank accounts, they cannot save securely, access credit, or participate in the digital economy. Traditional banks require government ID, proof of address, minimum balances, and physical branches — requirements that exclude entire communities.</p>
          <div className={h2}>Financial Surveillance</div>
          <p className={p}>Public blockchains solve financial exclusion but introduce a new problem: total transparency. On most chains, your wallet balance, every transaction you have ever made, and every person you have ever paid is permanently visible to anyone on earth. In environments where wealth makes you a target, or where political activity can lead to persecution, a fully transparent financial record is dangerous.</div>
          <div className={h2}>The Cost of Sending Money Home</div>
          <p className={p}>The Nigerian diaspora alone sends over $20 billion home every year. At current average fees of 6–8% charged by services like Western Union, that means over <strong>$1.5 billion is extracted from the world's poorest families every single year</strong> — not going to the families, not going to the economy, just disappearing into fees. Blockchain can reduce this cost to near zero. But only if the technology is actually accessible.</p>
          <p className={`${p} italic text-[#555]`} style={{marginTop:'auto',fontSize:11.5}}>Existing privacy blockchains do not solve this well. None offer what real people actually need: control over exactly what information they share, with whom, and when.</p>
          {pNum(2)}
        </div>

        {/* PAGE 3 — The Arxon Solution */}
        <div data-lp-page className={pg}>
          <div className={tag}>The Arxon Solution</div>
          <div className={h1}>A Sovereign Layer-1 Built<br/>for the Excluded</div>
          <div className={bar}/>
          <p className={p}>Arxon is a sovereign Layer-1 blockchain built from the ground up to serve the people that existing financial systems — both traditional and crypto — have failed. It is not a modification of another chain. It is not built on Ethereum or Bitcoin. Arxon is its own independent network with its own consensus, its own token, its own rules, and its own mission.</p>
          <p className={p}>Arxon gives users <strong>complete control over their financial privacy</strong> — not a binary switch, but granular, per-transaction choice.</p>
          <p className={p}>The core innovation is the Selective Privacy System. Every transaction on Arxon carries four independent privacy flags. A user can choose any combination:</p>
          <div className="grid grid-cols-2 gap-3 my-4">
            {["Hide the sender address","Hide the receiver address","Hide the transaction amount","Hide their wallet balance from public view"].map(f=>(
              <div key={f} className="flex items-center gap-2 p-3 rounded-lg" style={{background:'#f8f9fc',border:'1px solid #e5e5e5'}}>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{background:`${accent}25`,border:`1px solid ${accent}50`}}/>
                <span className="text-[12px] font-medium text-[#1a1a1a]">{f}</span>
              </div>
            ))}
          </div>
          <p className={p}>This means a Nigerian woman receiving money from her son in London can show who sent it — so she knows it is genuine — but hide the amount, so no one in her community knows her financial situation. A business paying a supplier can make the payment amount private for competitive reasons while keeping the destination publicly verifiable. A voter casting a ballot can hide everything about their participation while still being able to prove they voted if they choose to.</p>
          <p className={`${p} font-bold`}>No other blockchain offers this level of user control. Arxon is the first.</p>
          {pNum(3)}
        </div>

        {/* PAGE 4 — What Arxon Has Built */}
        <div data-lp-page className={pg}>
          <div className={tag}>What Arxon Has Built</div>
          <div className={h1}>The Chain Is Running.</div>
          <div className={bar}/>
          <div className={h2}>A Live Sovereign Blockchain</div>
          <p className={p}>Arxon runs its own independent network using BABE/GRANDPA consensus — the same battle-tested mechanism that secures Polkadot. The chain produces a new block every six seconds and has been running in multi-node testnet configuration. The chain has its own unique identity: unique Chain ID, token symbol ARX, and a fixed total supply with no inflation.</p>
          <div className={h2}>Full Ethereum Compatibility</div>
          <p className={p}>Arxon is fully compatible with the Ethereum Virtual Machine. Any smart contract written for Ethereum deploys on Arxon without a single line of code changed. MetaMask connects to Arxon. Every Ethereum developer tool works out of the box. The combination of Ethereum compatibility with selective privacy creates something that does not exist anywhere else: <strong>privacy-preserving decentralised finance</strong>.</p>
          <div className={h2}>The Selective Privacy System</div>
          <p className={p}>The privacy pallet is live on-chain. Users can set their default privacy preferences for all future transactions or configure privacy on a per-transaction basis. Eight distinct privacy modes emerge from the four flags, from fully transparent to fully shielded.</p>
          <div className={h2}>Private Transaction Receipts</div>
          <p className={p}>Every transaction with any privacy flag active automatically generates a Private Transaction Receipt — a tamper-proof, permanently stored record. This receipt functions as a legal document containing: complete sender and receiver addresses, transaction amount, timestamp to the second, block number, and each party's wallet balance immediately before and after the transaction. For third-party verification, either party can generate a single-use disclosure code that burns permanently after use.</p>
          {pNum(4)}
        </div>

        {/* PAGE 5 — Mining & Claim */}
        <div data-lp-page className={pg}>
          <div className={tag}>Community & Claim System</div>
          <div className={h1}>Building the Community<br/>Before Mainnet</div>
          <div className={bar}/>
          <div className={h2}>The ARX-P Mining System</div>
          <p className={p}>Before mainnet launches, Arxon has built a mining community of 14k+ users — growing toward the target of at least 500k–1M active miners. These are real people, earning real points through browser and mobile mining applications that require no hardware investment and no technical knowledge. Anyone with a phone can participate.</p>
          <p className={p}>Points earned through mining are called <strong>ARX-P</strong>. At mainnet, these points convert to real ARX tokens through the on-chain claim system. This approach to community building is intentional. Most blockchain projects launch and then struggle to acquire users. Arxon's mining community means there will be immediate organic demand for ARX at launch from hundreds of thousands of real participants who earned their tokens through effort, not through purchasing power.</p>
          <div className={h2}>The ARX Claim System</div>
          <p className={p}>The on-chain claim pallet handles the conversion of ARX-P points to ARX tokens at mainnet. It is built to handle unlimited claimants — whether 100,000 or 10,000,000 — with the same on-chain efficiency. A snapshot of all point balances is taken, loaded on-chain, and each miner calls the claim function exactly once to receive their ARX. The process is transparent, verifiable, and cannot be manipulated after the snapshot is locked.</p>
          <div className={h2}>Token Distribution</div>
          <div className="grid grid-cols-3 gap-3 my-4">
            {[["Treasury","300M","30%"],["Mining Pool","250M","25%"],["Investors","200M","20%"],["Team","150M","15%"],["Staking","100M","10%"],["Total","1B","100%"]].map(([l,v,pct])=>(
              <div key={l} className="p-3 rounded-lg text-center" style={{background:l==="Total"?"#f0f5ff":"#f8f9fc",border:`1px solid ${l==="Total"?accent+"50":"#e5e5e5"}`}}>
                <div style={{fontSize:10,color:'#aaa',marginBottom:2}}>{l}</div>
                <div style={{fontSize:15,fontWeight:900,color:'#0a0a0a'}}>{v}</div>
                <div style={{fontSize:10,color:accent,fontWeight:700}}>{pct}</div>
              </div>
            ))}
          </div>
          {pNum(5)}
        </div>

        {/* PAGE 6 — Roadmap */}
        <div data-lp-page className={pg}>
          <div className={tag}>Roadmap</div>
          <div className={h1}>Progress, Not Plans</div>
          <div className={bar}/>
          <p className={p}>Every milestone listed below corresponds to working code, not plans. Arxon publishes its progress openly on GitHub.</p>
          {[
            { phase:"COMPLETE — Foundation", color:"#2dd4a0", items:["Sovereign Layer-1 blockchain running in multi-node testnet","ARX native token, fixed supply","Full EVM compatibility — MetaMask, Solidity, all Ethereum tooling","Selective privacy system — four independent per-transaction flags","Private Transaction Receipt system with single-use disclosure codes","ARX-P mining system — community earning before mainnet","On-chain ARX claim pallet for unlimited miners"] },
            { phase:"IN PROGRESS — Public Testnet", color:accent, items:["Public testnet launch — anyone can connect and transact","Block explorer — browse all Arxon transactions publicly","Testnet faucet — developers get test ARX to build with","Anti-rug protection registry for builders","Developer documentation and SDK release","MetaMask official chain registration"] },
            { phase:"BUILDING — ZK Privacy", color:"#f5a623", items:["Halo2 zero-knowledge proof integration for private transfers","Cryptographic enforcement of all four privacy flags","ZK voting Phase 1 — private on-chain votes with verifiable results","Third-party ZK circuit security audit"] },
            { phase:"AHEAD — Ecosystem", color:"#999", items:["ZK voting Phase 2 — national-scale batch proof elections","Remittance corridor integrations for Nigeria and diaspora markets","Mobile wallet with built-in privacy controls","Mainnet launch with ARX-P conversion open to all miners"] },
          ].map(ph=>(
            <div key={ph.phase} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{background:ph.color,flexShrink:0}}/>
                <div style={{fontSize:9.5,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:ph.color}}>{ph.phase}</div>
              </div>
              <div className="pl-4 space-y-1">
                {ph.items.map(item=>(
                  <div key={item} style={{fontSize:11.5,color:'#444',display:'flex',gap:8}}>
                    <span style={{color:'#bbb',flexShrink:0}}>→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {pNum(6)}
        </div>

        {/* PAGE 7 — Why Arxon + Closing */}
        <div data-lp-page className={pg}>
          <div className={tag}>Why Arxon</div>
          <div className={h1}>Three Differences That Matter</div>
          <div className={bar}/>
          {[
            { n:"01", title:"The problem is real and the users are real", body:"Financial exclusion is not a theoretical problem. It affects hundreds of millions of people right now. The diaspora sending money home, paying 7% in fees, is real. The person in a country with unstable governance who cannot safely show their wealth is real. The voter who fears coercion is real. Arxon is built for these people — not as a marketing narrative, but as the actual design brief." },
            { n:"02", title:"The technology is original", body:"Selective transaction privacy — the ability to independently hide sender, receiver, amount, and balance on a per-transaction basis — does not exist on any other production blockchain. This is not an incremental improvement. It is a new capability. As we build with zero-knowledge proofs, Arxon becomes the most sophisticated privacy system on any EVM-compatible chain." },
            { n:"03", title:"The community is real and growing", body:"Most blockchain projects launch and then struggle to acquire users. Arxon's mining community means there will be immediate organic demand for ARX at launch from hundreds of thousands of real participants who earned their tokens through effort, not purchasing power." },
          ].map(item=>(
            <div key={item.n} className="flex gap-5 mb-6">
              <div style={{fontSize:26,fontWeight:900,color:`${accent}35`,flexShrink:0,lineHeight:1,marginTop:2}}>{item.n}</div>
              <div>
                <div className={h3}>{item.title}</div>
                <p className={p}>{item.body}</p>
              </div>
            </div>
          ))}
          <div className="mt-auto p-6 rounded-xl" style={{background:'#f0f5ff',border:`1px solid ${accent}30`}}>
            <p className="text-[13px] leading-[1.8] text-[#333] mb-3">Bitcoin proved that money without banks was possible. Ethereum proved that programmable money was possible. <strong>Arxon is proving that private, accessible, fair money is possible</strong> — and building it for the people who need it most.</p>
            <p className="text-[13px] font-bold" style={{color:accent}}>"Arxon is Built For the World."</p>
          </div>
          <p className="text-[10px] text-[#bbb] mt-4 leading-[1.7]">This litepaper is for informational purposes only. It does not constitute financial advice or an offer of any kind. Arxon is in active development. All technical details are subject to change as the project evolves.</p>
          {pNum(7)}
        </div>

      </div>{/* end #litepaper-pages */}
    </div>
  );
};

export default Litepaper;
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
