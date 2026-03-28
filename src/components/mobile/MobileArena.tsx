import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useArena, type ArenaBattle, type BattleHistoryEntry } from '@/hooks/useArena';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import { ChevronLeft, Trophy, Zap, Clock } from 'lucide-react';

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmerSwipe{0%{left:-100%}100%{left:200%}}
@keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
`;

type Tab = 'battles' | 'leaderboard' | 'my-stakes';

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="glass-elevated" style={{borderRadius:20,position:'relative',overflow:'hidden',...style}}>
      <div style={{position:'absolute',top:0,left:'-100%',width:'60%',height:'100%',pointerEvents:'none',
        background:'linear-gradient(90deg,transparent,hsl(215 40% 80%/0.04),transparent)',
        animation:'shimmerSwipe 6s ease-in-out infinite'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,pointerEvents:'none',
        background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.1),transparent)'}}/>
      <div style={{position:'relative',zIndex:2}}>{children}</div>
    </div>
  );
}

// ── Battle card (works for active & history) ──────────────────────────────
function BattleCard({
  battle, isActive, userVoted, userSide, userWon, userStake,
  onVoteA, onVoteB, voting, membership, points, existingVote
}: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  userVoted?: boolean;
  userSide?: 'a'|'b'|null;
  userWon?: boolean;
  userStake?: number;
  onVoteA?: () => void;
  onVoteB?: () => void;
  voting?: boolean;
  membership?: any;
  points?: number;
  existingVote?: string|null;
}) {
  const [timer, setTimer] = useState('');
  const totalPow = (battle.side_a_power ?? 0) + (battle.side_b_power ?? 0);
  const pctA = totalPow > 0 ? Math.round((battle.side_a_power / totalPow) * 100) : 50;
  const pctB = 100 - pctA;

  useEffect(() => {
    if (!isActive) return;
    const tick = () => {
      const diff = Math.max(0, new Date(battle.ends_at).getTime() - Date.now());
      const h = Math.floor(diff/3600000);
      const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
      const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
      setTimer(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [battle.ends_at, isActive]);

  const isWinnerA = battle.winner_side === 'a';
  const isWinnerB = battle.winner_side === 'b';
  const concluded = !isActive && battle.winner_side;

  return (
    <GlassCard style={{marginBottom:12,
      border:isActive?'1px solid hsl(215 38% 28%/0.4)':'1px solid hsl(215 25% 18%/0.3)',
      background: concluded && userWon
        ? 'linear-gradient(145deg,hsl(155 45% 43%/0.1),hsl(225 30% 8%))'
        : isActive
          ? 'linear-gradient(145deg,hsl(225 30% 13%),hsl(215 32% 16%),hsl(225 30% 9%))'
          : 'hsl(225 25% 8%)'}}>
      <div style={{padding:'16px'}}>
        {/* Battle header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600}}>
              {concluded ? 'Battle Concluded' : 'Active Battle'}
            </p>
            <p style={{fontSize:14,fontWeight:700,color:'hsl(215 20% 90%)',marginTop:3,letterSpacing:'-0.2px'}}>
              {battle.title || 'Arena Battle'}
            </p>
          </div>
          {isActive && (
            <div style={{display:'flex',alignItems:'center',gap:4,
              background:'hsl(0 60% 56%/0.1)',border:'1px solid hsl(0 60% 56%/0.2)',
              borderRadius:20,padding:'5px 10px'}}>
              <div className="pulse" style={{width:6,height:6,borderRadius:'50%',background:'hsl(0 60% 56%)'}}/>
              <span style={{fontSize:10,fontWeight:700,color:'hsl(0 60% 65%)'}}>LIVE · {timer}</span>
            </div>
          )}
          {concluded && (
            <div style={{display:'flex',alignItems:'center',gap:4,
              background:`hsl(${userWon?'155 45% 43%':'215 25% 15%'}/0.15)`,
              border:`1px solid hsl(${userWon?'155 45% 43%':'215 25% 22%'}/0.3)`,
              borderRadius:20,padding:'5px 10px'}}>
              <span style={{fontSize:10,fontWeight:700,color:userWon?'hsl(155 45% 55%)':'hsl(215 18% 45%)'}}>
                {userVoted ? (userWon ? '🏆 Won' : '💧 Lost') : 'Ended'}
              </span>
            </div>
          )}
        </div>

        {/* Sides VS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 44px 1fr',gap:8,alignItems:'center',marginBottom:12}}>
          {/* Side A */}
          <div style={{background:`hsl(215 35% 62%/${isWinnerA?'0.12':existingVote==='a'?'0.08':'0.05'})`,
            border:`1.5px solid hsl(215 35% 62%/${isWinnerA?'0.4':existingVote==='a'?'0.25':'0.12'})`,
            borderRadius:16,padding:'14px 10px',textAlign:'center',
            transition:'all 0.2s',cursor:isActive&&!existingVote?'pointer':'default'}}
            onClick={isActive&&!existingVote?onVoteA:undefined}>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.12em',
              color:isWinnerA?'hsl(38 55% 52%)':'hsl(215 25% 52%)',fontWeight:700,marginBottom:4}}>
              {battle.side_a_name}
            </div>
            <div style={{fontSize:22,fontWeight:700,color:'hsl(215 20% 90%)',lineHeight:1}}>{pctA}%</div>
            <div style={{fontSize:9,color:'hsl(215 14% 38%)',marginTop:3}}>
              {battle.side_a_power.toLocaleString()} ARX-P
            </div>
            {isWinnerA && <div style={{fontSize:9,color:'hsl(38 55% 62%)',marginTop:5,fontWeight:700}}>👑 Winner</div>}
            {existingVote==='a' && isActive && <div style={{fontSize:9,color:'hsl(155 45% 55%)',marginTop:5,fontWeight:700}}>✓ Your pick</div>}
          </div>

          {/* VS */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <span style={{fontSize:11,fontWeight:700,color:'hsl(215 18% 38%)',letterSpacing:'0.1em'}}>VS</span>
          </div>

          {/* Side B */}
          <div style={{background:`hsl(215 35% 62%/${isWinnerB?'0.12':existingVote==='b'?'0.08':'0.05'})`,
            border:`1.5px solid hsl(215 35% 62%/${isWinnerB?'0.4':existingVote==='b'?'0.25':'0.12'})`,
            borderRadius:16,padding:'14px 10px',textAlign:'center',
            transition:'all 0.2s',cursor:isActive&&!existingVote?'pointer':'default'}}
            onClick={isActive&&!existingVote?onVoteB:undefined}>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.12em',
              color:isWinnerB?'hsl(38 55% 52%)':'hsl(215 25% 52%)',fontWeight:700,marginBottom:4}}>
              {battle.side_b_name}
            </div>
            <div style={{fontSize:22,fontWeight:700,color:'hsl(215 20% 90%)',lineHeight:1}}>{pctB}%</div>
            <div style={{fontSize:9,color:'hsl(215 14% 38%)',marginTop:3}}>
              {battle.side_b_power.toLocaleString()} ARX-P
            </div>
            {isWinnerB && <div style={{fontSize:9,color:'hsl(38 55% 62%)',marginTop:5,fontWeight:700}}>👑 Winner</div>}
            {existingVote==='b' && isActive && <div style={{fontSize:9,color:'hsl(155 45% 55%)',marginTop:5,fontWeight:700}}>✓ Your pick</div>}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{height:5,borderRadius:3,background:'hsl(215 25% 14%)',overflow:'hidden',marginBottom:8}}>
          <motion.div initial={{width:0}} animate={{width:`${pctA}%`}} transition={{duration:0.8,ease:'easeOut'}}
            style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,hsl(215 35% 50%),hsl(215 45% 65%))'}}/>
        </div>

        {/* Pool total */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:9,color:'hsl(215 14% 35%)'}}>
            Total staked: {totalPow.toLocaleString()} ARX-P
          </span>
          {userVoted && userStake && (
            <span style={{fontSize:9,fontWeight:600,color:`hsl(${userWon?'155 45% 55%':'215 25% 50%'})`}}>
              Your stake: {userStake.toLocaleString()} ARX-P
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default function MobileArena() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { points } = usePoints();
  const {
    activeBattle, userVote, participants, battleHistory,
    leaderboard, loading, voting, castVote
  } = useArena();
  const { membership, loading: memLoading, registering, registerMembership } = useArenaMembership();

  const [showAuth,  setShowAuth]  = useState(false);
  const [tab,       setTab]       = useState<Tab>('battles');
  const [stakeAmt,  setStakeAmt]  = useState('');
  const [localSide, setLocalSide] = useState<'a'|'b'|null>(null);

  const available   = Math.round(points?.total_points ?? 0);
  const existingVote = userVote?.side ?? null;
  const activeSide   = existingVote ?? localSide;

  const handleVote = async () => {
    if (!user)          { setShowAuth(true); return; }
    if (!activeBattle || !activeSide) return;
    const amt = parseInt(stakeAmt);
    if (isNaN(amt) || amt < 1000) { alert('Minimum 1,000 ARX-P'); return; }
    if (amt > available)           { alert('Insufficient ARX-P'); return; }
    const ok = await castVote(activeBattle.id, activeSide, amt);
    if (ok) { setStakeAmt(''); setLocalSide(null); }
  };

  if (!user) return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',padding:'0 32px',
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{fontSize:56,marginBottom:24}}>⚔️</div>
      <h2 style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',marginBottom:10,textAlign:'center'}}>Prediction Arena</h2>
      <p style={{fontSize:14,color:'hsl(215 14% 42%)',textAlign:'center',lineHeight:1.6,marginBottom:36}}>
        Stake ARX-P on battle outcomes and earn from the winning pool
      </p>
      <button onClick={()=>setShowAuth(true)} className="press glow-steel"
        style={{width:'100%',padding:'18px',borderRadius:20,cursor:'pointer',fontWeight:700,fontSize:15,
          background:'linear-gradient(135deg,hsl(215 35% 18%),hsl(225 32% 10%))',
          border:'1.5px solid hsl(215 35% 62%/0.35)',color:'hsl(215 38% 85%)',outline:'none',
          fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
        Sign In to Enter
      </button>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );

  if (memLoading || loading) return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{CSS}</style>
      <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid hsl(215 35% 62%/0.2)',borderTopColor:'hsl(215 35% 62%)',animation:'spin 1s linear infinite'}}/>
    </div>
  );

  if (!membership) return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <ArenaOnboarding onComplete={registerMembership} isLoading={registering}/>
    </div>
  );

  // Alpha/Omega leaderboard split
  const alphaBoard = leaderboard.filter((e: any) => e.club === 'alpha' || !e.club);
  const omegaBoard = leaderboard.filter((e: any) => e.club === 'omega');
  const alphaTotal = alphaBoard.reduce((s: number, e: any) => s + Number(e.total_power_staked||0), 0);
  const omegaTotal = omegaBoard.reduce((s: number, e: any) => s + Number(e.total_power_staked||0), 0);
  const grandTotal = alphaTotal + omegaTotal;

  const myStakes = (battleHistory as BattleHistoryEntry[]).filter(b => b.user_participated);

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={{padding:'52px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>navigate(-1)} className="press"
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:19,fontWeight:700,color:'hsl(215 20% 93%)'}}>Arena</h1>
          <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>
            Team <span style={{color:'hsl(255 50% 65%)',fontWeight:700,textTransform:'uppercase'}}>{membership.club}</span>
            {' · '}{available.toLocaleString()} ARX-P
          </p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,
          background:'hsl(0 60% 56%/0.1)',border:'1px solid hsl(0 60% 56%/0.22)',
          borderRadius:20,padding:'6px 12px'}}>
          <div className="pulse" style={{width:6,height:6,borderRadius:'50%',background:'hsl(0 60% 56%)'}}/>
          <span style={{fontSize:10,fontWeight:700,color:'hsl(0 60% 65%)'}}>LIVE</span>
        </div>
      </div>

      {/* ── Team power bar ── */}
      {grandTotal > 0 && (
        <div style={{margin:'14px 20px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:700,color:'hsl(215 35% 62%)'}}>
              ⬡ Alpha {Math.round((alphaTotal/grandTotal)*100)}%
            </span>
            <span style={{fontSize:10,fontWeight:700,color:'hsl(255 50% 65%)'}}>
              Omega {Math.round((omegaTotal/grandTotal)*100)}% ⬡
            </span>
          </div>
          <div style={{height:6,borderRadius:3,background:'hsl(225 30% 10%)',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(alphaTotal/grandTotal)*100}%`,
              borderRadius:3,background:'linear-gradient(90deg,hsl(215 35% 55%),hsl(255 45% 60%))',
              transition:'width 0.8s ease'}}/>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:0,padding:'16px 20px 0'}}>
        {([['battles','Battles'],['leaderboard','Leaderboard'],['my-stakes','My Stakes']] as [Tab,string][]).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1,padding:'10px 0',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',
              outline:'none',transition:'all 0.2s',background:'none',
              color:tab===t?'hsl(215 35% 72%)':'hsl(215 14% 35%)',
              borderBottom:`2px solid ${tab===t?'hsl(215 35% 62%)':'hsl(215 20% 18%)'}`,
              fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:'16px 20px 0'}}>

        {/* ══ BATTLES TAB ══════════════════════════════════════════════ */}
        {tab === 'battles' && (
          <>
            {/* Active battle */}
            {activeBattle ? (
              <>
                <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',
                  color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10}}>Active Battle</p>
                <BattleCard
                  battle={activeBattle} isActive
                  userVoted={!!existingVote} userSide={existingVote} existingVote={existingVote}
                  membership={membership} points={available} voting={voting}
                  onVoteA={()=>!existingVote&&setLocalSide('a')}
                  onVoteB={()=>!existingVote&&setLocalSide('b')}/>

                {/* Stake panel */}
                {!existingVote && (
                  <GlassCard style={{marginBottom:14,padding:'16px'}}>
                    <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.12em',
                      color:'hsl(215 14% 35%)',fontWeight:700,marginBottom:10}}>
                      Stake ARX-P {activeSide?`on ${activeSide==='a'?activeBattle.side_a_name:activeBattle.side_b_name}`:'— select a side above'}
                    </p>
                    <div style={{display:'flex',alignItems:'center',gap:12,
                      background:'hsl(215 25% 10%)',border:'1px solid hsl(215 25% 18%)',
                      borderRadius:14,padding:'14px 16px',marginBottom:10}}>
                      <input type="number" value={stakeAmt} onChange={e=>setStakeAmt(e.target.value)}
                        placeholder="1,000"
                        style={{flex:1,background:'none',border:'none',outline:'none',fontSize:22,
                          fontWeight:700,color:'hsl(215 20% 93%)',fontFamily:"'Creato Display',-apple-system,sans-serif"}}/>
                      <span style={{fontSize:13,fontWeight:600,color:'hsl(215 35% 55%)'}}>ARX-P</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:12}}>
                      {[['1K','1000'],['5K','5000'],['10K','10000'],['Max',String(available)]].map(([l,v])=>(
                        <button key={l} onClick={()=>setStakeAmt(v)}
                          style={{padding:'8px',borderRadius:11,background:'hsl(215 25% 12%)',
                            border:'1px solid hsl(215 25% 20%)',color:'hsl(215 25% 55%)',
                            fontSize:12,fontWeight:700,cursor:'pointer',outline:'none'}}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleVote} disabled={voting||!activeSide||!stakeAmt}
                      style={{width:'100%',padding:'15px',borderRadius:16,fontWeight:700,fontSize:14,cursor:'pointer',
                        outline:'none',transition:'all 0.2s',fontFamily:"'Creato Display',-apple-system,sans-serif",
                        background:activeSide&&stakeAmt?'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 45%))':'hsl(215 25% 12%)',
                        color:activeSide&&stakeAmt?'white':'hsl(215 18% 35%)',
                        border:`1.5px solid ${activeSide&&stakeAmt?'hsl(215 35% 62%/0.4)':'hsl(215 25% 18%)'}`,
                        boxShadow:activeSide&&stakeAmt?'0 4px 16px hsl(215 55% 62%/0.2)':'none'}}>
                      {voting?'Staking...' : activeSide
                        ? `Stake on ${activeSide==='a'?activeBattle.side_a_name:activeBattle.side_b_name}`
                        : '← Select a side above first'}
                    </button>
                    <p style={{fontSize:9,color:'hsl(215 14% 32%)',marginTop:8,textAlign:'center'}}>
                      Min 1,000 · Max 100,000 ARX-P · Winners earn from the losing pool
                    </p>
                  </GlassCard>
                )}

                {/* Staked confirmation */}
                {existingVote && (
                  <GlassCard style={{marginBottom:14,padding:'14px 16px',
                    background:'hsl(155 45% 43%/0.07)',border:'1px solid hsl(155 45% 43%/0.22)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:36,height:36,borderRadius:12,background:'hsl(155 45% 43%/0.12)',
                        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18}}>✓</div>
                      <div>
                        <p style={{fontSize:13,fontWeight:700,color:'hsl(155 45% 55%)'}}>
                          Staked {userVote?.power_spent?.toLocaleString()} ARX-P
                        </p>
                        <p style={{fontSize:11,color:'hsl(155 45% 43%/0.6)',marginTop:2}}>
                          On {existingVote==='a'?activeBattle.side_a_name:activeBattle.side_b_name} · Awaiting results
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Live feed */}
                {participants.length > 0 && (
                  <>
                    <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',
                      color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10}}>
                      Live Feed ({participants.length})
                    </p>
                    {participants.slice(0,6).map((p: any) => (
                      <div key={p.user_id} style={{display:'flex',alignItems:'center',gap:10,
                        padding:'10px 14px',borderRadius:14,marginBottom:7,
                        background:'hsl(225 24% 8%)',border:'1px solid hsl(215 20% 14%)'}}>
                        <div style={{width:32,height:32,borderRadius:10,background:'hsl(215 25% 13%)',
                          border:'1px solid hsl(215 22% 20%)',display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:12,fontWeight:700,color:'hsl(215 25% 55%)',flexShrink:0}}>
                          {p.username?.[0]?.toUpperCase()||'?'}
                        </div>
                        <div style={{flex:1}}>
                          <p style={{fontSize:12,fontWeight:600,color:'hsl(215 18% 80%)'}}>{p.username||'Miner'}</p>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:'hsl(215 35% 62%)'}}>
                          {p.power_spent.toLocaleString()} ARX-P
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <GlassCard style={{padding:'28px 20px',textAlign:'center',marginBottom:14}}>
                <div style={{fontSize:44,marginBottom:12}}>⚔️</div>
                <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 55%)',marginBottom:6}}>No active battle</p>
                <p style={{fontSize:12,color:'hsl(215 14% 35%)'}}>Check back soon for the next battle</p>
              </GlassCard>
            )}

            {/* Battle history */}
            {(battleHistory as BattleHistoryEntry[]).length > 0 && (
              <>
                <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',
                  color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10,marginTop:4}}>
                  Battle History ({(battleHistory as BattleHistoryEntry[]).length})
                </p>
                {(battleHistory as BattleHistoryEntry[]).map((battle) => (
                  <BattleCard key={battle.id} battle={battle}
                    userVoted={battle.user_participated}
                    userSide={battle.user_voted_side}
                    userWon={battle.user_won}
                    userStake={battle.user_stake}/>
                ))}
              </>
            )}
          </>
        )}

        {/* ══ LEADERBOARD TAB ══════════════════════════════════════════ */}
        {tab === 'leaderboard' && (
          <>
            {/* Team totals */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[
                {team:'Alpha',total:alphaTotal,col:'hsl(215 35% 62%)',bg:'hsl(215 35% 62%/0.1)',bd:'hsl(215 35% 62%/0.22)',wins:alphaBoard.reduce((s:number,e:any)=>s+Number(e.total_wins||0),0)},
                {team:'Omega',total:omegaTotal,col:'hsl(255 50% 65%)',bg:'hsl(255 50% 60%/0.1)',bd:'hsl(255 50% 60%/0.22)',wins:omegaBoard.reduce((s:number,e:any)=>s+Number(e.total_wins||0),0)},
              ].map(t=>(
                <GlassCard key={t.team} style={{padding:'16px 14px',background:t.bg,border:`1px solid ${t.bd}`}}>
                  <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.14em',color:t.col,fontWeight:700,marginBottom:6}}>Team {t.team}</p>
                  <p style={{fontSize:20,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.5px'}}>{t.total.toLocaleString()}</p>
                  <p style={{fontSize:9,color:'hsl(215 14% 38%)',marginTop:2}}>ARX-P staked</p>
                  <p style={{fontSize:11,color:t.col,marginTop:6,fontWeight:600}}>{t.wins} wins</p>
                </GlassCard>
              ))}
            </div>

            {/* Alpha leaderboard */}
            <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10}}>Alpha Team</p>
            {alphaBoard.slice(0,10).map((e: any, i: number) => (
              <div key={e.user_id} style={{display:'flex',alignItems:'center',gap:10,
                padding:'11px 14px',borderRadius:14,marginBottom:7,
                background:'hsl(215 35% 62%/0.05)',border:'1px solid hsl(215 30% 18%)'}}>
                <div style={{width:26,height:26,borderRadius:9,background:'hsl(215 35% 62%/0.1)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:700,color:'hsl(215 35% 62%)',flexShrink:0}}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i+1}
                </div>
                <div style={{width:30,height:30,borderRadius:'50%',background:'hsl(215 25% 13%)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:12,fontWeight:700,color:'hsl(215 25% 55%)',flexShrink:0}}>
                  {e.username?.[0]?.toUpperCase()||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:'hsl(215 18% 82%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.username||'Miner'}</p>
                </div>
                <p style={{fontSize:12,fontWeight:700,color:'hsl(215 35% 65%)'}}>{(e.total_power_staked||0).toLocaleString()}</p>
              </div>
            ))}

            {/* Omega leaderboard */}
            <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10,marginTop:16}}>Omega Team</p>
            {omegaBoard.length === 0 && <p style={{fontSize:12,color:'hsl(215 14% 35%)',marginBottom:12}}>No omega members yet</p>}
            {omegaBoard.slice(0,10).map((e: any, i: number) => (
              <div key={e.user_id} style={{display:'flex',alignItems:'center',gap:10,
                padding:'11px 14px',borderRadius:14,marginBottom:7,
                background:'hsl(255 50% 60%/0.05)',border:'1px solid hsl(255 40% 22%)'}}>
                <div style={{width:26,height:26,borderRadius:9,background:'hsl(255 50% 60%/0.1)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:700,color:'hsl(255 50% 65%)',flexShrink:0}}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i+1}
                </div>
                <div style={{width:30,height:30,borderRadius:'50%',background:'hsl(225 25% 13%)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:12,fontWeight:700,color:'hsl(255 40% 55%)',flexShrink:0}}>
                  {e.username?.[0]?.toUpperCase()||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:'hsl(215 18% 82%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.username||'Miner'}</p>
                </div>
                <p style={{fontSize:12,fontWeight:700,color:'hsl(255 50% 65%)'}}>{(e.total_power_staked||0).toLocaleString()}</p>
              </div>
            ))}
          </>
        )}

        {/* ══ MY STAKES TAB ══════════════════════════════════════════════ */}
        {tab === 'my-stakes' && (
          <>
            {myStakes.length === 0 ? (
              <GlassCard style={{padding:'32px 20px',textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:6}}>No stakes yet</p>
                <p style={{fontSize:12,color:'hsl(215 14% 35%)'}}>Stake ARX-P on a battle to see your history here</p>
              </GlassCard>
            ) : myStakes.map((battle) => (
              <div key={battle.id} style={{display:'flex',alignItems:'center',gap:12,
                padding:'14px 16px',borderRadius:18,marginBottom:9,
                background:battle.user_won?'hsl(155 45% 43%/0.07)':'hsl(225 24% 8%)',
                border:`1px solid ${battle.user_won?'hsl(155 45% 43%/0.22)':'hsl(215 20% 14%)'}`}}>
                <div style={{width:40,height:40,borderRadius:13,flexShrink:0,
                  background:battle.user_won?'hsl(155 45% 43%/0.12)':'hsl(215 25% 12%)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                  {battle.user_won?'🏆':'💧'}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:700,color:'hsl(215 18% 88%)'}}>
                    {battle.title || 'Arena Battle'}
                  </p>
                  <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>
                    Voted {battle.user_voted_side === 'a' ? battle.side_a_name : battle.side_b_name} · {battle.user_stake?.toLocaleString()} ARX-P
                  </p>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:12,fontWeight:700,color:battle.user_won?'hsl(155 45% 55%)':'hsl(215 18% 45%)'}}>
                    {battle.user_won?'Won':'Lost'}
                  </p>
                  <p style={{fontSize:9,color:'hsl(215 14% 32%)',marginTop:1}}>
                    {new Date(battle.ends_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
