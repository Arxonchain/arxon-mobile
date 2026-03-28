import { motion } from 'framer-motion';

const fadeUp = { hidden:{opacity:0,y:22}, show:{opacity:1,y:0,transition:{duration:0.48,ease:[0.25,0.46,0.45,0.94]}} };
const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.07,delayChildren:0.15}} };

export default function MobileWallet() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
        display:'flex',flexDirection:'column',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

      <motion.div variants={fadeUp} style={{padding:'52px 20px 0'}}>
        <h1 style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.5px'}}>Wallet</h1>
        <p style={{fontSize:12,color:'hsl(215 14% 38%)',marginTop:3}}>Connect & manage your Web3 wallet</p>
      </motion.div>

      <motion.div variants={fadeUp}
        style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
          justifyContent:'center',padding:'0 32px'}}>

        {/* Animated wallet orb */}
        <div style={{position:'relative',width:156,height:156,marginBottom:36}}>
          <svg style={{position:'absolute',inset:0,animation:'spinSlow 14s linear infinite'}} width="156" height="156" viewBox="0 0 156 156">
            <style>{`@keyframes spinSlow{to{transform:rotate(360deg)}}`}</style>
            <circle cx="78" cy="78" r="72" fill="none" stroke="hsl(215 35% 62%/0.07)" strokeWidth="1"/>
            <circle cx="78" cy="78" r="72" fill="none" stroke="hsl(215 35% 62%/0.28)" strokeWidth="1.5"
              strokeDasharray="38 414" strokeLinecap="round"/>
          </svg>
          <svg style={{position:'absolute',inset:0,animation:'spinSlow 20s linear infinite reverse'}} width="156" height="156" viewBox="0 0 156 156">
            <circle cx="78" cy="78" r="56" fill="none" stroke="hsl(215 35% 62%/0.05)" strokeWidth="1"
              strokeDasharray="22 328" strokeLinecap="round"/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <motion.div className="float glow-steel"
              style={{width:90,height:90,borderRadius:28,
                background:'linear-gradient(145deg,hsl(215 30% 16%),hsl(225 32% 9%),hsl(215 35% 6%))',
                border:'1.5px solid hsl(215 35% 62%/0.28)',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 12px 40px hsl(215 55% 62%/0.15)'}}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="14" rx="3" fill="hsl(215 35% 62%/0.18)"
                  stroke="hsl(215 35% 62%)" strokeWidth="1.7"/>
                <path d="M2 11h20" stroke="hsl(215 35% 62%)" strokeWidth="1.7"/>
                <circle cx="17" cy="15.5" r="1.5" fill="hsl(215 35% 62%)"/>
                <path d="M7 4v3M12 3v4M17 4v3" stroke="hsl(215 35% 62%/0.55)" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </motion.div>
          </div>
        </div>

        <motion.h2 variants={fadeUp}
          style={{fontSize:28,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.5px',textAlign:'center',marginBottom:10}}>
          Wallet Connect
        </motion.h2>
        <motion.p variants={fadeUp}
          style={{fontSize:14,color:'hsl(215 14% 42%)',textAlign:'center',lineHeight:1.65,maxWidth:290,marginBottom:40}}>
          Connect your Web3 wallet to unlock advanced features and on-chain rewards
        </motion.p>

        {/* Features */}
        {[
          {icon:'🔐', label:'Secure On-Chain Transfers',   sub:'Your keys, your coins. Always.'},
          {icon:'⚡', label:'Instant ARX-P Withdrawals',   sub:'Bridge directly to mainnet'},
          {icon:'🎁', label:'Exclusive Holder Rewards',    sub:'NFT & token airdrops for holders'},
        ].map((f,i)=>(
          <motion.div key={i} variants={fadeUp}
            className="glass-card press card-lift"
            style={{display:'flex',alignItems:'center',gap:14,padding:'15px 16px',
              borderRadius:18,marginBottom:9,width:'100%'}}>
            <div style={{width:42,height:42,borderRadius:14,background:'hsl(215 25% 11%)',
              border:'1px solid hsl(215 22% 17%)',display:'flex',alignItems:'center',
              justifyContent:'center',fontSize:20,flexShrink:0}}>{f.icon}</div>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:'hsl(215 18% 88%)'}}>{f.label}</p>
              <p style={{fontSize:11,color:'hsl(215 14% 38%)',marginTop:2}}>{f.sub}</p>
            </div>
          </motion.div>
        ))}

        {/* Coming Soon */}
        <motion.div variants={fadeUp} style={{width:'100%',marginTop:8}}>
          <div className="shine"
            style={{borderRadius:20,padding:'20px',background:'hsl(215 25% 10%)',
              border:'1.5px solid hsl(215 22% 18%)',textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:7}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:'hsl(38 55% 52%)',
                boxShadow:'0 0 10px hsl(38 55% 52%/0.7)'}} className="mining-pulse"/>
              <span style={{fontSize:16,fontWeight:700,color:'hsl(215 20% 55%)'}}>Coming Soon</span>
            </div>
            <p style={{fontSize:11,color:'hsl(215 14% 32%)'}}>Polkadot & EVM wallet support launching soon</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
