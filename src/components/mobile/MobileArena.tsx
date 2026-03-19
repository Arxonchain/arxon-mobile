import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useArena } from '@/hooks/useArena';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';

const CSS = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.4;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

function StrokeCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{position:'relative',borderRadius:26,overflow:'hidden',
      background:'linear-gradient(145deg,#0c1e38 0%,#0a1828 50%,#061220 100%)',...style}}>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 311 200" preserveAspectRatio="none">
        <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite'}}/>
        <path d="M 16 198 Q 155 206 295 198" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite',animationDelay:'.5s'}}/>
      </svg>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:'-120%',width:'50%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)',animation:'shimmerswipe 5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:5}}>{children}</div>
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

  // Live countdown
  useEffect(() => {
    if (!activeBattle?.ends_at) return;
    const tick = () => {
      const diff = Math.max(0, new Date(activeBattle.ends_at).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
      setTimerStr(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeBattle?.ends_at]);

  const totalPower = (activeBattle?.side_a_power ?? 0) + (activeBattle?.side_b_power ?? 0);
  const alphaPct   = totalPower > 0 ? Math.round((activeBattle!.side_a_power / totalPower) * 100) : 50;
  const omegaPct   = 100 - alphaPct;
  const availablePoints = points?.total_points ?? 0;
  const existingVote    = userVote?.side ?? null;
  const activeVote      = existingVote ?? localVote;

  const handleStake = async () => {
    if (!user)          { setShowAuth(true); return; }
    if (!activeBattle)  return;
    if (!activeVote)    { alert('Select ALPHA or OMEGA first'); return; }
    const amt = parseInt(stakeAmt);
    if (isNaN(amt) || amt < 1000) { alert('Minimum stake is 1,000 ARX-P'); return; }
    if (amt > availablePoints)    { alert('Insufficient ARX-P balance'); return; }
    const ok = await castVote(activeBattle.id, activeVote, amt);
    if (ok) setStakeAmt('');
  };

  if (!user) {
    return (
      <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <style>{CSS}</style>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>⚔️</div>
          <div style={{fontSize:20,fontWeight:900,color:'#EEF2F7',marginBottom:8}}>Prediction Arena</div>
          <div style={{fontSize:13,color:'rgba(139,174,214,.5)',marginBottom:24}}>Stake · Predict · Win</div>
          <motion.button whileTap={{scale:.95}} onClick={() => setShowAuth(true)}
            style={{padding:'14px 32px',borderRadius:18,background:'linear-gradient(135deg,#1E3A5F,#0c2040)',border:'1px solid rgba(139,174,214,.3)',color:'#C8E0FF',fontSize:15,fontWeight:800,cursor:'pointer'}}>
            Sign In to Enter
          </motion.button>
        </div>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
      </div>
    );
  }

  if (membershipLoading || loading) {
    return (
      <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <style>{CSS}</style>
        <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid rgba(139,174,214,.2)',borderTopColor:'#8BAED6',animation:'spin 1s linear infinite'}}/>
      </div>
    );
  }

  if (!membership) {
    return (
      <div style={{minHeight:'100vh',background:'#000'}}>
        <style>{CSS}</style>
        <ArenaOnboarding onComplete={registerMembership} isLoading={registering}/>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:90}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{padding:'10px 20px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:21,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.4px'}}>Arena</div>
          <div style={{fontSize:11,color:'rgba(238,242,247,.3)',marginTop:2}}>
            Team <span style={{color:'#8BAED6',fontWeight:700,textTransform:'uppercase'}}>{membership.club}</span>
            {' · '}{availablePoints.toLocaleString()} ARX-P
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(224,96,96,.1)',border:'1px solid rgba(224,96,96,.22)',borderRadius:20,padding:'5px 12px'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#E06060',animation:'pulse 1.2s infinite'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#E06060'}}>LIVE</span>
        </div>
      </div>

      {/* Battle card */}
      <div style={{margin:'0 16px 12px'}}>
        <StrokeCard>
          <div style={{padding:'20px 18px'}}>
            {activeBattle ? (
              <>
                <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(168,196,232,.45)',fontWeight:600,marginBottom:4}}>Current Battle</div>
                <div style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:14,letterSpacing:'-.4px'}}>
                  {activeBattle.description || activeBattle.title}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                  <motion.div whileTap={{scale:.97}}
                    onClick={() => !existingVote && setLocalVote('a')}
                    style={{flex:1,background:'rgba(139,174,214,.07)',
                      border:`2px solid ${activeVote==='a'?'rgba(139,174,214,.55)':'rgba(139,174,214,.15)'}`,
                      borderRadius:16,padding:'14px 12px',textAlign:'center',
                      cursor:existingVote?'default':'pointer',transition:'border-color .2s'}}>
                    <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.55)',fontWeight:700,marginBottom:4}}>{activeBattle.side_a_name}</div>
                    <div style={{fontSize:22,fontWeight:900,color:'#EEF2F7'}}>{alphaPct}%</div>
                    <div style={{fontSize:10,color:'rgba(139,174,214,.45)',marginTop:2}}>{activeBattle.side_a_power.toLocaleString()} ARX-P</div>
                    {activeVote==='a' && <div style={{fontSize:10,color:'#5DB08A',marginTop:6,fontWeight:700}}>✓ Your pick</div>}
                  </motion.div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:'rgba(139,174,214,.4)'}}>VS</div>
                    <div style={{fontSize:11,fontWeight:700,color:'#E06060',fontVariantNumeric:'tabular-nums'}}>{timerStr}</div>
                    <div style={{fontSize:8,color:'rgba(238,242,247,.25)',textTransform:'uppercase'}}>left</div>
                  </div>
                  <motion.div whileTap={{scale:.97}}
                    onClick={() => !existingVote && setLocalVote('b')}
                    style={{flex:1,background:'rgba(139,174,214,.07)',
                      border:`2px solid ${activeVote==='b'?'rgba(139,174,214,.55)':'rgba(139,174,214,.15)'}`,
                      borderRadius:16,padding:'14px 12px',textAlign:'center',
                      cursor:existingVote?'default':'pointer',transition:'border-color .2s'}}>
                    <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.55)',fontWeight:700,marginBottom:4}}>{activeBattle.side_b_name}</div>
                    <div style={{fontSize:22,fontWeight:900,color:'#EEF2F7'}}>{omegaPct}%</div>
                    <div style={{fontSize:10,color:'rgba(139,174,214,.45)',marginTop:2}}>{activeBattle.side_b_power.toLocaleString()} ARX-P</div>
                    {activeVote==='b' && <div style={{fontSize:10,color:'#5DB08A',marginTop:6,fontWeight:700}}>✓ Your pick</div>}
                  </motion.div>
                </div>
                <div style={{height:6,borderRadius:3,background:'rgba(139,174,214,.1)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,#8BAED6,#A8C4E8)',width:`${alphaPct}%`,transition:'width .5s ease'}}/>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:40,marginBottom:10}}>⚔️</div>
                <div style={{fontSize:15,fontWeight:700,color:'rgba(238,242,247,.5)'}}>No active battle right now</div>
                <div style={{fontSize:11,color:'rgba(139,174,214,.35)',marginTop:6}}>Check back soon for the next battle</div>
              </div>
            )}
          </div>
        </StrokeCard>
      </div>

      {/* Stake input — only if active battle and no existing vote */}
      {activeBattle && !existingVote && (
        <div style={{padding:'0 16px 12px'}}>
          <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(139,174,214,.5)',fontWeight:600,marginBottom:8}}>
            Stake Amount <span style={{color:'rgba(139,174,214,.3)'}}>(min 1,000)</span>
          </div>
          <div style={{background:'linear-gradient(145deg,#0c1e38,#061220)',border:'1px solid rgba(139,174,214,.22)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <input type="number" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)}
              placeholder="1000" style={{flex:1,background:'none',border:'none',outline:'none',fontSize:22,fontWeight:800,color:'#fff',fontFamily:"'Creato Display',-apple-system,system-ui"}}/>
            <span style={{fontSize:13,fontWeight:700,color:'#8BAED6'}}>ARX-P</span>
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[['1K','1000'],['5K','5000'],['10K','10000'],['Max',String(Math.floor(availablePoints))]].map(([label,val]) => (
              <button key={label} onClick={() => setStakeAmt(val)}
                style={{flex:1,padding:'8px 0',borderRadius:12,background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.13)',color:'#8BAED6',fontSize:12,fontWeight:700,cursor:'pointer',outline:'none'}}>
                {label}
              </button>
            ))}
          </div>
          <motion.button whileTap={{scale:.97}} onClick={handleStake} disabled={voting}
            style={{width:'100%',padding:17,borderRadius:18,
              background:activeVote&&stakeAmt?'linear-gradient(135deg,#1E3A5F,#0c2040)':'rgba(139,174,214,.05)',
              border:`1px solid ${activeVote&&stakeAmt?'rgba(139,174,214,.3)':'rgba(139,174,214,.08)'}`,
              color:activeVote&&stakeAmt?'#C8E0FF':'rgba(238,242,247,.25)',
              fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:"'Creato Display',-apple-system,system-ui",transition:'all .2s'}}>
            {voting ? 'Staking...' : activeVote
              ? `Stake on ${activeVote==='a'?activeBattle.side_a_name:activeBattle.side_b_name}`
              : 'Select a side first'}
          </motion.button>
          <div style={{marginTop:10,padding:'10px 14px',background:'rgba(93,176,138,.06)',border:'1px solid rgba(93,176,138,.18)',borderRadius:14,fontSize:11,color:'rgba(93,176,138,.8)',lineHeight:1.5}}>
            💡 Winning side earns a share of losing pool. Min 1,000 · Max 100,000 ARX-P
          </div>
        </div>
      )}

      {/* Staked confirmation */}
      {existingVote && activeBattle && (
        <div style={{margin:'0 16px 12px',padding:'14px 16px',background:'rgba(93,176,138,.07)',border:'1px solid rgba(93,176,138,.2)',borderRadius:16,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:12,background:'rgba(93,176,138,.12)',border:'1px solid rgba(93,176,138,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>✓</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#5DB08A'}}>Staked {userVote?.power_spent?.toLocaleString()} ARX-P</div>
            <div style={{fontSize:11,color:'rgba(93,176,138,.6)',marginTop:2}}>
              On {existingVote==='a'?activeBattle.side_a_name:activeBattle.side_b_name} · Results when battle ends
            </div>
          </div>
        </div>
      )}

      {/* Live participants */}
      <div style={{padding:'0 20px 8px',fontSize:10,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(238,242,247,.22)',fontWeight:600}}>
        Live Feed ({participants.length})
      </div>
      <div style={{padding:'0 16px 20px'}}>
        {participants.length > 0 ? participants.slice(0,8).map((p) => (
          <div key={p.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:14,marginBottom:6,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)'}}>
            <div style={{width:34,height:34,borderRadius:11,background:'rgba(139,174,214,.08)',border:'1px solid rgba(139,174,214,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#8BAED6',flexShrink:0}}>
              {p.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{p.username || 'Miner'}</div>
              <div style={{fontSize:10,color:'rgba(139,174,214,.4)',marginTop:1}}>Staked {p.power_spent.toLocaleString()} ARX-P</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(139,174,214,.5)',background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.12)',borderRadius:8,padding:'3px 8px'}}>
              {new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        )) : (
          <div style={{textAlign:'center',padding:'20px 0',color:'rgba(139,174,214,.3)',fontSize:13}}>
            No stakes yet — be the first!
          </div>
        )}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
