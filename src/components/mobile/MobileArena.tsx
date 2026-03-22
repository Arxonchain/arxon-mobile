import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useArena } from '@/hooks/useArena';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import { Zap } from 'lucide-react';

const CSS = `
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(139,174,214,.2)}50%{box-shadow:0 0 40px rgba(139,174,214,.45)}}
`;

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', borderRadius:22, overflow:'hidden',
      background:'linear-gradient(145deg,#0c1e38,#091525,#050e1a)', ...style }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:'linear-gradient(90deg,transparent,rgba(200,228,255,.12),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
        background:'linear-gradient(90deg,transparent,rgba(168,196,232,.04),transparent)',
        animation:'shimmer 5s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', inset:0, borderRadius:22, border:'1px solid rgba(139,174,214,.12)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </div>
  );
}

export default function MobileArena() {
  const { user }   = useAuth();
  const { points } = usePoints();
  const { activeBattle, userVote, participants, loading, voting, castVote } = useArena();
  const { membership, loading: membershipLoading, registering, registerMembership } = useArenaMembership();

  const [showAuth,  setShowAuth]  = useState(false);
  const [stakeAmt,  setStakeAmt]  = useState('');
  const [timerStr,  setTimerStr]  = useState('--:--');
  const [localVote, setLocalVote] = useState<'a'|'b'|null>(null);

  useEffect(() => {
    if (!activeBattle?.ends_at) return;
    const tick = () => {
      const diff = Math.max(0, new Date(activeBattle.ends_at).getTime() - Date.now());
      const h = Math.floor(diff/3600000);
      const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
      const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
      setTimerStr(h>0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick,1000);
    return () => clearInterval(id);
  },[activeBattle?.ends_at]);

  const totalPower = (activeBattle?.side_a_power??0)+(activeBattle?.side_b_power??0);
  const alphaPct   = totalPower>0 ? Math.round((activeBattle!.side_a_power/totalPower)*100) : 50;
  const omegaPct   = 100-alphaPct;
  const available  = points?.total_points ?? 0;
  const existingVote = userVote?.side ?? null;
  const activeVote   = existingVote ?? localVote;

  const handleStake = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!activeBattle || !activeVote) { alert('Select a side first'); return; }
    const amt = parseInt(stakeAmt);
    if (isNaN(amt)||amt<1000) { alert('Minimum stake is 1,000 ARX-P'); return; }
    if (amt>available) { alert('Insufficient ARX-P'); return; }
    const ok = await castVote(activeBattle.id, activeVote, amt);
    if (ok) setStakeAmt('');
  };

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 32px',gap:0,fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{position:'relative',width:130,height:130,marginBottom:32}}>
        <svg style={{position:'absolute',inset:0,animation:'spin 8s linear infinite'}} width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="60" fill="none" stroke="rgba(180,95,255,0.08)" strokeWidth="1"/>
          <circle cx="65" cy="65" r="60" fill="none" stroke="rgba(180,95,255,0.3)" strokeWidth="1.5" strokeDasharray="35 342" strokeLinecap="round"/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:78,height:78,borderRadius:24,background:'linear-gradient(145deg,#1a0a28,#0a0518)',border:'1.5px solid rgba(180,95,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',animation:'float 3s ease-in-out infinite',boxShadow:'0 8px 32px rgba(180,95,255,.2)'}}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#B45FFF" strokeWidth="1.8">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/>
            </svg>
          </div>
        </div>
      </div>
      <div style={{fontSize:28,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.5px',marginBottom:10,textAlign:'center'}}>Prediction Arena</div>
      <div style={{fontSize:14,color:'rgba(139,174,214,.45)',marginBottom:36,textAlign:'center',lineHeight:1.6}}>Stake ARX-P on battle outcomes and earn from the winning pool</div>
      <motion.button whileTap={{scale:.96}} onClick={()=>setShowAuth(true)}
        style={{width:'100%',padding:'18px',borderRadius:20,background:'linear-gradient(135deg,#1a0a28,#2a1040)',border:'1.5px solid rgba(180,95,255,.3)',color:'#C89EFF',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 24px rgba(180,95,255,.15)'}}>
        Sign In to Enter
      </motion.button>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );

  if (membershipLoading||loading) return (
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{CSS}</style>
      <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(180,95,255,.2)',borderTopColor:'#B45FFF',animation:'spin 1s linear infinite'}}/>
    </div>
  );

  if (!membership) return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <ArenaOnboarding onComplete={registerMembership} isLoading={registering}/>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:100}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{padding:'52px 24px 0',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:28,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.5px'}}>Arena</div>
          <div style={{fontSize:12,color:'rgba(139,174,214,.4)',marginTop:4}}>
            Team <span style={{color:'#B45FFF',fontWeight:700,textTransform:'uppercase'}}>{membership.club}</span>
            {' · '}{available.toLocaleString()} ARX-P
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(224,96,96,.1)',border:'1px solid rgba(224,96,96,.2)',borderRadius:20,padding:'6px 14px'}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#E06060',animation:'pulse 1.2s infinite'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#E06060'}}>LIVE</span>
        </div>
      </div>

      {/* Battle Card */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.1}} style={{margin:'20px 24px 0'}}>
        <Card>
          <div style={{padding:'22px 20px 20px'}}>
            {activeBattle ? (
              <>
                <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'1.4px',color:'rgba(168,196,232,.4)',fontWeight:600,marginBottom:6}}>Current Battle</div>
                <div style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:20,letterSpacing:'-.3px'}}>
                  {activeBattle.description||activeBattle.title||'Boost Battle'}
                </div>

                {/* VS Row */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 56px 1fr',gap:10,alignItems:'center',marginBottom:18}}>
                  {/* Side A */}
                  <motion.div whileTap={{scale:.97}} onClick={()=>!existingVote&&setLocalVote('a')}
                    style={{background:activeVote==='a'?'rgba(139,174,214,.12)':'rgba(139,174,214,.05)',
                      border:`2px solid ${activeVote==='a'?'rgba(139,174,214,.5)':'rgba(139,174,214,.12)'}`,
                      borderRadius:18,padding:'16px 10px',textAlign:'center',cursor:existingVote?'default':'pointer',transition:'all .2s'}}>
                    <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.5)',fontWeight:700,marginBottom:5}}>{activeBattle.side_a_name}</div>
                    <div style={{fontSize:26,fontWeight:900,color:'#EEF2F7',lineHeight:1}}>{alphaPct}%</div>
                    <div style={{fontSize:10,color:'rgba(139,174,214,.4)',marginTop:4}}>{activeBattle.side_a_power.toLocaleString()}</div>
                    {activeVote==='a' && <div style={{fontSize:9,color:'#5DB08A',marginTop:8,fontWeight:700}}>✓ Your pick</div>}
                  </motion.div>

                  {/* Timer */}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{fontSize:11,fontWeight:900,color:'rgba(139,174,214,.4)',letterSpacing:'.5px'}}>VS</div>
                    <div style={{fontSize:11,fontWeight:800,color:'#E06060',fontVariantNumeric:'tabular-nums',textAlign:'center'}}>{timerStr}</div>
                    <div style={{fontSize:7,color:'rgba(238,242,247,.2)',textTransform:'uppercase',letterSpacing:'.5px'}}>left</div>
                  </div>

                  {/* Side B */}
                  <motion.div whileTap={{scale:.97}} onClick={()=>!existingVote&&setLocalVote('b')}
                    style={{background:activeVote==='b'?'rgba(139,174,214,.12)':'rgba(139,174,214,.05)',
                      border:`2px solid ${activeVote==='b'?'rgba(139,174,214,.5)':'rgba(139,174,214,.12)'}`,
                      borderRadius:18,padding:'16px 10px',textAlign:'center',cursor:existingVote?'default':'pointer',transition:'all .2s'}}>
                    <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.5)',fontWeight:700,marginBottom:5}}>{activeBattle.side_b_name}</div>
                    <div style={{fontSize:26,fontWeight:900,color:'#EEF2F7',lineHeight:1}}>{omegaPct}%</div>
                    <div style={{fontSize:10,color:'rgba(139,174,214,.4)',marginTop:4}}>{activeBattle.side_b_power.toLocaleString()}</div>
                    {activeVote==='b' && <div style={{fontSize:9,color:'#5DB08A',marginTop:8,fontWeight:700}}>✓ Your pick</div>}
                  </motion.div>
                </div>

                {/* Progress bar */}
                <div style={{height:5,borderRadius:3,background:'rgba(139,174,214,.08)',overflow:'hidden'}}>
                  <motion.div initial={{width:0}} animate={{width:`${alphaPct}%`}} transition={{duration:1,ease:'easeOut'}}
                    style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,#8BAED6,#A8C4E8)'}}/>
                </div>

                {/* Pool totals */}
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                  <span style={{fontSize:9,color:'rgba(139,174,214,.35)'}}>Total staked: {totalPower.toLocaleString()} ARX-P</span>
                  <span style={{fontSize:9,color:'rgba(139,174,214,.35)'}}>{participants.length} stakers</span>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'28px 0'}}>
                <div style={{fontSize:48,marginBottom:12}}>⚔️</div>
                <div style={{fontSize:16,fontWeight:700,color:'rgba(238,242,247,.5)'}}>No active battle right now</div>
                <div style={{fontSize:12,color:'rgba(139,174,214,.3)',marginTop:6}}>Check back soon</div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Stake Panel */}
      {activeBattle && !existingVote && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.2}}
          style={{margin:'16px 24px 0'}}>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(139,174,214,.3)',fontWeight:700,marginBottom:12}}>
            Stake Your ARX-P
          </div>
          <div style={{background:'rgba(139,174,214,.05)',border:'1px solid rgba(139,174,214,.12)',borderRadius:18,padding:'16px',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <input type="number" value={stakeAmt} onChange={e=>setStakeAmt(e.target.value)}
                placeholder="1,000" style={{flex:1,background:'none',border:'none',outline:'none',fontSize:28,fontWeight:800,color:'#fff',fontFamily:"'Creato Display',-apple-system,system-ui"}}/>
              <span style={{fontSize:13,fontWeight:700,color:'#8BAED6',flexShrink:0}}>ARX-P</span>
            </div>
            <div style={{fontSize:10,color:'rgba(139,174,214,.3)',marginTop:6}}>Min 1,000 · Max 100,000 · Available: {Math.floor(available).toLocaleString()}</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {[['1K','1000'],['5K','5000'],['10K','10000'],['Max',String(Math.floor(available))]].map(([l,v])=>(
              <button key={l} onClick={()=>setStakeAmt(v)}
                style={{padding:'9px 0',borderRadius:13,background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.12)',color:'#8BAED6',fontSize:12,fontWeight:700,cursor:'pointer',outline:'none',transition:'all .15s'}}>
                {l}
              </button>
            ))}
          </div>
          <motion.button whileTap={{scale:.97}} onClick={handleStake} disabled={voting}
            style={{width:'100%',padding:'18px',borderRadius:20,transition:'all .2s',fontFamily:"'Creato Display',-apple-system,system-ui",
              background: activeVote&&stakeAmt ? 'linear-gradient(135deg,#1E3A5F,#0c2040)' : 'rgba(139,174,214,.04)',
              border:`1.5px solid ${activeVote&&stakeAmt ? 'rgba(139,174,214,.3)' : 'rgba(139,174,214,.08)'}`,
              color: activeVote&&stakeAmt ? '#C8E0FF' : 'rgba(238,242,247,.2)',
              fontSize:15,fontWeight:800,cursor:'pointer',
              boxShadow: activeVote&&stakeAmt ? '0 4px 20px rgba(30,58,95,.3)' : 'none'}}>
            {voting ? 'Staking...' : activeVote
              ? `Stake on ${activeVote==='a'?activeBattle.side_a_name:activeBattle.side_b_name}`
              : '← Select a side to stake'}
          </motion.button>
          <div style={{marginTop:10,padding:'12px 16px',background:'rgba(200,150,60,.05)',border:'1px solid rgba(200,150,60,.15)',borderRadius:14,display:'flex',alignItems:'center',gap:8}}>
            <Zap size={14} color="#C8963C"/>
            <span style={{fontSize:11,color:'rgba(200,150,60,.7)',lineHeight:1.5}}>Winning side earns a share of the losing pool. Results announced when battle ends.</span>
          </div>
        </motion.div>
      )}

      {/* Staked confirmation */}
      {existingVote && activeBattle && (
        <div style={{margin:'16px 24px 0',padding:'16px',background:'rgba(93,176,138,.07)',border:'1px solid rgba(93,176,138,.2)',borderRadius:18,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:13,background:'rgba(93,176,138,.12)',border:'1px solid rgba(93,176,138,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>✓</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'#5DB08A'}}>Staked {userVote?.power_spent?.toLocaleString()} ARX-P</div>
            <div style={{fontSize:11,color:'rgba(93,176,138,.55)',marginTop:3}}>
              On {existingVote==='a'?activeBattle.side_a_name:activeBattle.side_b_name} · Awaiting results
            </div>
          </div>
        </div>
      )}

      {/* Live Feed */}
      <div style={{padding:'28px 24px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(139,174,214,.3)',fontWeight:700}}>Live Feed</div>
          <div style={{fontSize:11,color:'rgba(139,174,214,.3)'}}>{participants.length} stakers</div>
        </div>
        {participants.length > 0 ? participants.slice(0,8).map((p,i) => (
          <motion.div key={p.user_id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
            style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:16,marginBottom:8,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)'}}>
            <div style={{width:36,height:36,borderRadius:12,background:'rgba(139,174,214,.08)',border:'1px solid rgba(139,174,214,.14)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#8BAED6',flexShrink:0}}>
              {p.username?.[0]?.toUpperCase()||'?'}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{p.username||'Miner'}</div>
              <div style={{fontSize:10,color:'rgba(139,174,214,.35)',marginTop:1}}>Staked {p.power_spent.toLocaleString()} ARX-P</div>
            </div>
            <div style={{fontSize:10,color:'rgba(139,174,214,.35)'}}>{new Date(p.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
          </motion.div>
        )) : (
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <div style={{fontSize:11,color:'rgba(139,174,214,.3)'}}>No stakes yet — be the first!</div>
          </div>
        )}
      </div>
      <div style={{height:20}}/>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
