import { useState, useCallback } from "react";
import { Download, Loader2, FileText, ChevronLeft } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

const Litepaper = () => {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");

  const exportToPdf = useCallback(async () => {
    setExporting(true); setProgress("Preparing…");
    try {
      const container = document.getElementById("litepaper-pages");
      if (!container) return;
      const pages = container.querySelectorAll<HTMLElement>("[data-lp-page]");
      await new Promise(r => setTimeout(r, 300));
      const pdf = new jsPDF({ orientation:"portrait", unit:"px", format:[816,1056] });
      for (let i=0;i<pages.length;i++) {
        setProgress(`Page ${i+1}/${pages.length}…`);
        const canvas = await html2canvas(pages[i],{width:816,height:1056,scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false});
        const imgData = canvas.toDataURL("image/jpeg",0.95);
        if (i>0) pdf.addPage([816,1056],"portrait");
        pdf.addImage(imgData,"JPEG",0,0,816,1056);
      }
      setProgress("Saving…");
      pdf.save("Arxon-Litepaper-2026.pdf");
    } catch(err){console.error("PDF export failed:",err);}
    finally{setExporting(false);setProgress("");}
  },[]);

  const ps="w-[816px] min-h-[1056px] h-[1056px] bg-white text-[#1a1a1a] px-[72px] py-[56px] flex flex-col overflow-hidden relative";
  const h2="text-[18px] font-bold text-[#0a0a0a] leading-tight mt-5 mb-2";
  const h3="text-[13.5px] font-semibold text-[#1a1a1a] leading-tight mt-3 mb-1";
  const p ="text-[12px] leading-[1.72] text-[#2a2a2a] mb-2";
  const sm="text-[11px] leading-[1.68] text-[#2a2a2a] mb-1.5";
  const bar="w-8 h-[3px] bg-[#0a0a0a] mb-3 mt-0.5";
  const ft="absolute bottom-7 left-[72px] right-[72px] flex justify-between items-center text-[9px] text-[#999] border-t border-[#e5e5e5] pt-2.5";

  const Phase=({status,color,bg,bd,title,items}:{status:string;color:string;bg:string;bd:string;title:string;items:string[]})=>(
    <div className="mb-3" style={{background:bg,border:`1px solid ${bd}`,borderRadius:10,padding:"10px 14px"}}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-[8.5px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{color,background:bd}}>{status}</span>
        <p className="text-[11.5px] font-bold" style={{color}}>{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        {items.map((item,j)=>(
          <div key={j} className="flex gap-1.5 items-start py-[2px]">
            <span className="text-[8.5px] mt-0.5 flex-shrink-0" style={{color}}>→</span>
            <p className="text-[10px] leading-[1.6]" style={{color:color+'cc'}}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center py-12">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} color="#555"/>
          </button>
          <FileText size={16} color="#555"/>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">Arxon Litepaper 2026</span>
        </div>
        <button onClick={exportToPdf} disabled={exporting}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#0a0a0a] text-white text-[12px] font-semibold rounded-lg hover:bg-[#222] transition-colors disabled:opacity-50">
          {exporting?<><Loader2 size={14} className="animate-spin"/>{progress}</>:<><Download size={14}/>Download PDF</>}
        </button>
      </div>

      <div id="litepaper-pages" className="mt-16 flex flex-col gap-4">

        {/* PAGE 1 */}
        <div data-lp-page className={ps}>
          <div className="flex flex-col items-start mb-7">
            <div className="w-11 h-11 bg-[#0a0a0a] rounded-xl flex items-center justify-center mb-5">
              <span className="text-white font-bold text-[20px]">A</span>
            </div>
            <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#888] mb-2">Litepaper · 2026</p>
            <h1 className="text-[36px] font-bold text-[#0a0a0a] leading-[1.15] tracking-tight mb-3">
              ARXON<br/>Sovereign Privacy Blockchain<br/>for the Unbanked World
            </h1>
            <div className={bar}/>
            <p className="text-[12.5px] italic text-[#555] mb-4">"Financial sovereignty is not a privilege. It is a right."</p>
            <p className={p} style={{maxWidth:600}}>
              This document is a clear, honest overview of what Arxon is, what problem it solves, and what we are building.
              It is written for anyone, not just developers or investors. If you have ever sent money across borders,
              worried about who can see your finances, or wondered whether your vote actually counts, Arxon is built for you.
            </p>
          </div>

          <div className={h2}>The Problem</div>
          <div className={bar}/>
          <p className={p}>
            The global financial system was not built for everyone. Despite two generations of cryptocurrency innovation,
            over <strong>1.4 billion adults worldwide</strong> remain without access to basic financial services.
            Blockchain promised to change this. In practice, the benefits have mostly flowed to those who were already financially included.
          </p>
          <p className={p}>Three specific problems remain unsolved:</p>

          <div className={h3}>Financial Exclusion</div>
          <p className={sm}>
            Hundreds of millions of people in Africa, Asia, and Latin America conduct their entire financial lives in cash.
            Without bank accounts, they cannot save securely, access credit, or participate in the digital economy.
            Traditional banks require government ID, proof of address, minimum balances, and physical branches —
            requirements that exclude entire communities.
          </p>

          <div className={h3}>Financial Surveillance</div>
          <p className={sm}>
            Public blockchains solve financial exclusion but introduce a new problem: total transparency.
            On most chains, your wallet balance, every transaction you have ever made, and every person you have ever paid
            is permanently visible to anyone on earth. In environments where wealth makes you a target, or where political
            activity can lead to persecution, a fully transparent financial record is dangerous.
          </p>

          <div className={h3}>The Cost of Sending Money Home</div>
          <p className={sm}>
            The Nigerian diaspora alone sends over $20 billion home every year. At current average fees of 6–8% charged
            by services like Western Union, that means over <strong>$1.5 billion is extracted from the world's poorest
            families every single year</strong> — not going to the families, not going to the economy, just disappearing
            into fees. Blockchain can reduce this cost to near zero. But only if the technology is actually accessible.
          </p>
          <p className={sm}>
            Existing privacy blockchains do not solve this well. None offer what real people actually need:
            control over exactly what information they share, with whom, and when.
          </p>

          <div className={ft}>
            <span>arxon.io</span>
            <span>Arxon Litepaper 2026 · For informational purposes only</span>
            <span>1</span>
          </div>
        </div>

        {/* PAGE 2 */}
        <div data-lp-page className={ps}>
          <div className={h2}>The Arxon Solution</div>
          <div className={bar}/>
          <p className={p}>
            Arxon is a sovereign Layer-1 blockchain built from the ground up to serve the people that existing financial
            systems have failed. It is not a modification of another chain. Arxon is its own independent network with
            its own consensus, its own token, its own rules, and its own mission.
          </p>
          <p className={p}>
            Arxon gives users <strong>complete control over their financial privacy</strong> — not a binary switch,
            but granular, per-transaction choice. The core innovation is the <strong>Selective Privacy System</strong>.
            Every transaction carries four independent privacy flags:
          </p>

          <div className="bg-[#f8f8f6] border border-[#e5e5e5] rounded-xl p-4 mb-3">
            <p className="text-[11px] font-bold text-[#0a0a0a] mb-2.5 uppercase tracking-wide">The Four Privacy Flags</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[['🔒 Hide Sender Address','Who sent the funds'],['🔒 Hide Receiver Address','Who received the funds'],['🔒 Hide Transaction Amount','How much was sent'],['🔒 Hide Wallet Balance','Total balance visibility']].map(([t,s],i)=>(
                <div key={i} className="bg-white rounded-lg p-3 border border-[#e8e8e8]">
                  <p className="text-[11px] font-semibold text-[#0a0a0a] mb-0.5">{t}</p>
                  <p className="text-[10px] text-[#777]">{s}</p>
                </div>
              ))}
            </div>
          </div>

          <p className={sm}>
            This means a Nigerian woman receiving money from her son in London can show who sent it — but hide the amount,
            so no one in her community knows her financial situation. <strong>No other blockchain offers this level of user
            control. Arxon is the first.</strong>
          </p>

          <div className={h2}>What Arxon Has Built</div>
          <div className={bar}/>

          <div className={h3}>A Live Sovereign Blockchain</div>
          <p className={sm}>
            Arxon runs its own independent network using BABE/GRANDPA consensus — the same battle-tested mechanism
            that secures Polkadot. The chain produces a new block every six seconds and has been running in multi-node
            testnet configuration with independent validators producing and finalising blocks in real time.
          </p>

          <div className={h3}>Full Ethereum Compatibility</div>
          <p className={sm}>
            Any smart contract written for Ethereum deploys on Arxon without a single line of code changed.
            MetaMask connects to Arxon. Every Ethereum developer tool works out of the box. This opens Arxon
            to the entire Ethereum ecosystem on day one.
          </p>
          <p className={sm}>
            The combination creates something that does not exist anywhere else: <strong>privacy-preserving
            decentralised finance</strong>. A DeFi protocol on Arxon can accept private payments, offer hidden balances,
            and execute confidential transactions, while remaining accessible through MetaMask.
          </p>

          <div className={h3}>The Selective Privacy System</div>
          <p className={sm}>
            The privacy pallet is live on-chain. The four flags work independently and in any combination —
            eight distinct privacy modes emerge, from fully transparent to fully shielded. The next phase adds
            Halo2 zero-knowledge cryptographic proofs — mathematical guarantees that hidden information cannot
            be revealed even by examining the chain's raw data.
          </p>

          <div className={h3}>Private Transaction Receipts</div>
          <p className={sm}>
            Every transaction with any privacy flag active automatically generates a <strong>Private Transaction Receipt</strong>
            — a tamper-proof, permanently stored legal document containing sender, receiver, amount, timestamp, block number,
            and each party's wallet balance before and after the transaction. Single-use disclosure codes enable third-party
            verification. Each code burns permanently after use and is logged on-chain forever.
          </p>

          <div className={ft}>
            <span>arxon.io</span>
            <span>Arxon Litepaper 2026 · For informational purposes only</span>
            <span>2</span>
          </div>
        </div>

        {/* PAGE 3 */}
        <div data-lp-page className={ps}>
          <div className={h2}>The ARX-P Mining System</div>
          <div className={bar}/>
          <p className={sm}>
            Before mainnet launches, Arxon has built a mining community of <strong>14,000+ users</strong> growing toward
            the target of at least 500,000–1,000,000 active miners. These are real people, earning real points through
            browser and mobile mining applications that require no hardware investment and no technical knowledge.
            Anyone with a phone can participate.
          </p>
          <p className={sm}>
            Points earned through mining are called <strong>ARX-P</strong>. At mainnet, these points convert to real ARX
            tokens through the on-chain claim system. Most blockchain projects launch and then struggle to acquire users.
            Arxon's mining community means there will be immediate organic demand for ARX at launch from hundreds of
            thousands of real participants who earned their tokens through effort, not purchasing power.
          </p>

          <div className={h2}>What We Are Building</div>
          <div className={bar}/>

          <div className={h3}>Zero-Knowledge Cryptographic Privacy</div>
          <p className={sm}>
            The next phase adds <strong>Halo2 zero-knowledge proofs</strong> — making hidden information impossible to
            reveal even with complete access to the blockchain's raw data. Halo2 was chosen because it requires no trusted
            setup. The security is mathematical, not ceremonial.
          </p>

          <div className={h3}>On-Chain Private Voting</div>
          <p className={sm}>
            Arxon's voting system makes coercion cryptographically impossible through a mathematical mechanism called a
            nullifier. A voter proves they are eligible without revealing who they are. Results are tallied through Layer-2
            zero-knowledge batch proofs. One billion votes across 10,000 batches settles on-chain in seconds —
            any election from a local community vote to a national election is within reach.
          </p>

          <div className={h3}>The Developer Ecosystem</div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-0.5 mb-3">
            {[
              'Privacy-preserving DeFi — trading, lending, liquidity with confidential amounts',
              'Private remittance — send money home with hidden amounts and verifiable delivery',
              'Confidential payroll — employees paid in ARX with private salary information',
              'ZK voting — for communities, DAOs, and governments at any scale',
              'Private NFT marketplaces — prove ownership without revealing purchase price',
              'Confidential identity — prove eligibility without revealing personal data',
            ].map((item,i)=>(
              <div key={i} className="flex gap-1.5 items-start py-[3px]">
                <span className="text-[9px] mt-0.5 text-[#888] flex-shrink-0">→</span>
                <p className="text-[10.5px] leading-[1.6] text-[#333]">{item}</p>
              </div>
            ))}
          </div>

          <div className={h2}>Why Arxon</div>
          <div className={bar}/>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              ['The problem is real','Financial exclusion affects hundreds of millions of people right now. Arxon is built for these people — not as a marketing narrative, but as the actual design brief.'],
              ['The technology is original','Selective per-transaction privacy — independently hiding sender, receiver, amount, and balance — does not exist on any other production blockchain. This is not incremental. It is new.'],
              ['The community is growing','14,000+ miners growing toward 500k–1M. Real people earning real points, creating immediate organic demand for ARX at mainnet launch through effort, not purchasing power.'],
            ].map(([t,b],i)=>(
              <div key={i} className="bg-[#f8f8f6] border border-[#e5e5e5] rounded-xl p-3.5">
                <p className="text-[11px] font-bold text-[#0a0a0a] mb-1.5">{t}</p>
                <p className="text-[10px] leading-[1.6] text-[#555]">{b}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-[#e5e5e5] pt-4">
            <p className="text-[11.5px] italic text-[#555] text-center mb-1">
              "Bitcoin proved that money without banks was possible. Ethereum proved that programmable money was possible.
              Arxon is proving that private, accessible, fair money is possible — building it for the people who need it most."
            </p>
            <p className="text-[11px] font-bold text-center text-[#0a0a0a]">Arxon is Built For the World. · arxon.io</p>
          </div>

          <div className={ft}>
            <span>arxon.io</span>
            <span>This litepaper is for informational purposes only. It does not constitute financial advice or an offer of any kind.</span>
            <span>3</span>
          </div>
        </div>

        {/* PAGE 4 — Roadmap */}
        <div data-lp-page className={ps}>
          <div className={h2}>Roadmap</div>
          <div className={bar}/>
          <p className={p}>
            The following reflects what has been completed and what is being actively built.
            Arxon publishes its progress openly on GitHub. Every milestone listed corresponds to working code, not plans.
          </p>

          <Phase status="COMPLETE" color="#166534" bg="#f0fdf4" bd="#bbf7d0" title="Foundation"
            items={['Sovereign Layer-1 blockchain running in multi-node testnet','ARX native token, fixed supply, no inflation','Full EVM compatibility — MetaMask, Solidity, all Ethereum tooling','Selective privacy system — four independent per-transaction flags','Balance visibility toggle — users control public/private balance display','Private Transaction Receipt system with single-use disclosure codes','ARX-P mining system — community earning before mainnet','On-chain ARX claim pallet for unlimited miners','Node branding, validator infrastructure, testnet chainspec','Open-source codebase on GitHub']}/>

          <Phase status="IN PROGRESS" color="#92400e" bg="#fffbeb" bd="#fde68a" title="Public Testnet"
            items={['Public testnet launch — anyone can connect and transact','Block explorer — browse all Arxon transactions publicly','Testnet faucet — developers get test ARX to build with','Validator expansion — growing the independent validator set','Anti-rug protection registry for builders','Developer documentation and SDK release','MetaMask official chain registration']}/>

          <Phase status="BUILDING" color="#1e3a5f" bg="#eff6ff" bd="#bfdbfe" title="ZK Privacy"
            items={['Halo2 zero-knowledge proof integration for private transfers','Cryptographic enforcement of all four privacy flags','ZK voting Phase 1 — private on-chain votes with verifiable results','Privacy-preserving DeFi primitive contracts','Third-party ZK circuit security audit']}/>

          <Phase status="AHEAD" color="#581c87" bg="#fdf4ff" bd="#e9d5ff" title="Ecosystem"
            items={['ZK voting Phase 2 — national-scale batch proof elections','Remittance corridor integrations for Nigeria and diaspora markets','Mobile wallet with built-in privacy controls','Institutional partnerships for election infrastructure','Cross-chain bridges to major ecosystems','Mainnet launch with ARX-P conversion open to all miners']}/>

          <div className={ft}>
            <span>arxon.io</span>
            <span>Arxon Litepaper 2026 · For informational purposes only. All technical details subject to change.</span>
            <span>4</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Litepaper;
