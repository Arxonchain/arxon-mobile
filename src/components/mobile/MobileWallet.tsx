import { motion } from 'framer-motion';

const CSS = `
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

export default function MobileWallet() {
  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:100,display:'flex',flexDirection:'column'}}>
      <style>{CSS}</style>

      <div style={{padding:'52px 20px 16px'}}>
        <div style={{fontSize:21,fontWeight:900,color:'#EEF2F7'}}>Wallet</div>
        <div style={{fontSize:12,color:'rgba(139,174,214,.45)',marginTop:4}}>Connect & manage your wallet</div>
      </div>

      {/* Coming Soon Hero */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 32px',gap:0}}>
        {/* Animated wallet icon */}
        <div style={{position:'relative',width:160,height:160,marginBottom:32}}>
          {/* Rotating ring */}
          <svg style={{position:'absolute',inset:0,animation:'rotate 8s linear infinite'}} width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(139,174,214,0.08)" strokeWidth="1"/>
            <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(139,174,214,0.35)" strokeWidth="1.5"
              strokeDasharray="40 412" strokeLinecap="round"/>
          </svg>
          <svg style={{position:'absolute',inset:0,animation:'rotate 12s linear infinite reverse'}} width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(139,174,214,0.1)" strokeWidth="1"
              strokeDasharray="25 340" strokeLinecap="round"/>
          </svg>
          {/* Center wallet */}
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:88,height:88,borderRadius:28,background:'linear-gradient(145deg,#1E3A5F,#0c2040)',border:'1.5px solid rgba(139,174,214,.3)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(30,58,95,.5)',animation:'float 4s ease-in-out infinite'}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="15" rx="3" fill="rgba(139,174,214,0.2)" stroke="#8BAED6" strokeWidth="1.8"/>
                <path d="M2 10H22" stroke="#8BAED6" strokeWidth="1.8"/>
                <circle cx="17" cy="15" r="1.5" fill="#8BAED6"/>
              </svg>
            </div>
          </div>
        </div>

        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:26,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.4px',marginBottom:8}}>Wallet Connect</div>
          <div style={{fontSize:14,color:'rgba(139,174,214,.5)',lineHeight:1.6,maxWidth:280,margin:'0 auto'}}>
            Connect your Web3 wallet to unlock advanced features and on-chain rewards
          </div>
        </div>

        {/* Feature list */}
        <div style={{width:'100%',marginBottom:32}}>
          {[
            { icon:'🔐', label:'Secure on-chain transfers', sub:'Your keys, your coins' },
            { icon:'⚡', label:'Instant ARX-P withdrawals',  sub:'Bridge to mainnet' },
            { icon:'🎁', label:'Exclusive holder rewards',   sub:'NFT & token airdrops' },
          ].map((f, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1+0.2 }}
              style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:16,marginBottom:8,background:'rgba(139,174,214,.04)',border:'1px solid rgba(139,174,214,.08)'}}>
              <div style={{width:40,height:40,borderRadius:13,background:'rgba(139,174,214,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{f.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{f.label}</div>
                <div style={{fontSize:11,color:'rgba(139,174,214,.4)',marginTop:2}}>{f.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Coming Soon Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          style={{width:'100%',padding:'18px',borderRadius:20,background:'rgba(139,174,214,.07)',border:'1.5px solid rgba(139,174,214,.2)',cursor:'default',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'-120%',width:'50%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(168,196,232,.08),transparent)',animation:'shimmerswipe 3s ease-in-out infinite'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#C8963C',animation:'pulse 1.5s infinite'}}/>
            <span style={{fontSize:15,fontWeight:800,color:'rgba(238,242,247,.5)',letterSpacing:'.02em'}}>Coming Soon</span>
          </div>
          <div style={{fontSize:11,color:'rgba(139,174,214,.3)',marginTop:6}}>Polkadot & EVM support launching soon</div>
        </motion.button>
      </div>
    </div>
  );
}
