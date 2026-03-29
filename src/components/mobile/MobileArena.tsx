import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useArena, type ArenaBattle, type BattleHistoryEntry } from '@/hooks/useArena';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Trophy, Zap, Users, Clock } from 'lucide-react';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import { motion, AnimatePresence } from 'framer-motion';

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
`;

type Tab = 'battles' | 'leaderboard' | 'my-stakes';

// ── Helpers ────────────────────────────────────────────────────────────────
function useTimer(endsAt: string | null, active: boolean) {
  const [str, setStr] = useState('');
  useEffect(() => {
    if (!active || !endsAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const h = Math.floor(diff/3600000);
      const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
      const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
      setStr(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, active]);
  return str;
}

// ── Smart image for each battle side ──────────────────────────────────────
function SideImage({ imageUrl, name, size = 52 }: { imageUrl: string|null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  // Generate a visually distinct background color from name
  const hue = name.split('').reduce((acc,c) => acc + c.charCodeAt(0), 0) % 360;

  if (imageUrl && !err) {
    return (
      <div style={{width:size,height:size,borderRadius:size/4,overflow:'hidden',flexShrink:0}}>
        <img src={imageUrl} alt={name} onError={()=>setErr(true)}
          style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
    );
  }
  return (
    <div style={{width:size,height:size,borderRadius:size/4,flexShrink:0,
      background:`linear-gradient(135deg,hsl(${hue} 55% 35%),hsl(${(hue+40)%360} 50% 25%))`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*0.3,fontWeight:700,color:'white'}}>
      {initials}
    </div>
  );
}

// ── Compact Battle Card (list view) ───────────────────────────────────────
function BattleCard({
  battle, isActive, userVoted, userWon, onClick
}: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  userVoted?: boolean;
  userWon?: boolean;
  onClick: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const totalPow = (battle.side_a_power??0) + (battle.side_b_power??0);
  const pctA = totalPow > 0 ? Math.round((battle.side_a_power/totalPow)*100) : 50;
  const pctB = 100 - pctA;
  const concluded = !isActive && battle.winner_side;

  return (
    <motion.div whileTap={{scale:0.97}} onClick={onClick}
      style={{borderRadius:18,overflow:'hidden',marginBottom:10,cursor:'pointer',position:'relative',
        background:concluded&&userWon
          ? 'linear-gradient(135deg,hsl(155 45% 43%/0.08),hsl(225 28% 9%))'
          : 'hsl(225 26% 9%)',
        border:`1px solid ${concluded&&userWon?'hsl(155 45% 43%/0.25)':isActive?'hsl(215 30% 22%/0.5)':'hsl(215 22% 15%)'}`,
      }}>
      {/* Top shimmer line for active */}
      {isActive && <div style={{position:'absolute',top:0,left:0,right:0,height:2,
        background:'linear-gradient(90deg,transparent,hsl(215 35% 62%/0.5),transparent)'}}/>}

      <div style={{padding:'14px 14px 12px'}}>
        {/* Header row */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{flex:1,minWidth:0,paddingRight:8}}>
            <p style={{fontSize:12,fontWeight:700,color:'hsl(215 18% 85%)',letterSpacing:'-0.2px',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{battle.title}</p>
            {battle.description && (
              <p style={{fontSize:10,color:'hsl(215 14% 40%)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {battle.description}
              </p>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',flexShrink:0}}>
            {isActive && (
              <div style={{display:'flex',alignItems:'center',gap:4,
                background:'hsl(0 60% 56%/0.1)',border:'1px solid hsl(0 60% 56%/0.22)',
                borderRadius:20,padding:'3px 9px'}}>
                <div className="pulse" style={{width:5,height:5,borderRadius:'50%',background:'hsl(0 60% 56%)'}}/>
                <span style={{fontSize:9,fontWeight:700,color:'hsl(0 60% 65%)'}}>LIVE · {timer}</span>
              </div>
            )}
            {concluded && (
              <div style={{fontSize:9,fontWeight:700,padding:'3px 9px',borderRadius:20,
                color:userWon?'hsl(155 45% 55%)':'hsl(215 18% 45%)',
                background:userWon?'hsl(155 45% 43%/0.1)':'hsl(215 22% 13%)',
                border:`1px solid ${userWon?'hsl(155 45% 43%/0.22)':'hsl(215 22% 20%)'}`}}>
                {userVoted?(userWon?'🏆 Won':'💧 Lost'):'Ended'}
              </div>
            )}
            {!isActive && !concluded && (
              <div style={{fontSize:9,fontWeight:700,padding:'3px 9px',borderRadius:20,
                color:'hsl(215 18% 42%)',background:'hsl(215 22% 12%)',border:'1px solid hsl(215 22% 18%)'}}>
                Upcoming
              </div>
            )}
            <ChevronRight size={14} color="hsl(215 18% 35%)" style={{marginLeft:6}}/>
          </div>
        </div>

        {/* VS row — compact with images */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 36px 1fr',gap:8,alignItems:'center',marginBottom:10}}>
          {/* Side A */}
          <div style={{display:'flex',alignItems:'center',gap:8,
            padding:'10px 10px',borderRadius:13,
            background:battle.winner_side==='a'?'hsl(38 55% 52%/0.1)':'hsl(215 26% 11%)',
            border:`1px solid ${battle.winner_side==='a'?'hsl(38 55% 52%/0.3)':'hsl(215 22% 18%)'}`,
          }}>
            <SideImage imageUrl={battle.side_a_image} name={battle.side_a_name} size={38}/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:10,fontWeight:700,color:'hsl(215 18% 80%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{battle.side_a_name}</p>
              <p style={{fontSize:12,fontWeight:800,color:battle.winner_side==='a'?'hsl(38 55% 58%)':'hsl(215 32% 72%)'}}>{pctA}%</p>
            </div>
            {battle.winner_side==='a' && <span style={{fontSize:14}}>👑</span>}
          </div>

          {/* VS */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:32,height:32,borderRadius:10,background:'hsl(215 26% 12%)',
              border:'1px solid hsl(215 22% 20%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:9,fontWeight:900,color:'hsl(215 22% 38%)'}}>VS</span>
            </div>
          </div>

          {/* Side B */}
          <div style={{display:'flex',alignItems:'center',gap:8,
            padding:'10px 10px',borderRadius:13,
            background:battle.winner_side==='b'?'hsl(38 55% 52%/0.1)':'hsl(215 26% 11%)',
            border:`1px solid ${battle.winner_side==='b'?'hsl(38 55% 52%/0.3)':'hsl(215 22% 18%)'}`,
          }}>
            <SideImage imageUrl={battle.side_b_image} name={battle.side_b_name} size={38}/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:10,fontWeight:700,color:'hsl(215 18% 80%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{battle.side_b_name}</p>
              <p style={{fontSize:12,fontWeight:800,color:battle.winner_side==='b'?'hsl(38 55% 58%)':'hsl(215 32% 72%)'}}>{pctB}%</p>
            </div>
            {battle.winner_side==='b' && <span style={{fontSize:14}}>👑</span>}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{height:4,borderRadius:2,background:'hsl(215 26% 12%)',overflow:'hidden',marginBottom:7}}>
          <div style={{height:'100%',borderRadius:2,width:`${pctA}%`,
            background:'linear-gradient(90deg,hsl(215 35% 50%),hsl(215 45% 65%))',transition:'width 0.5s ease'}}/>
        </div>

        {/* Footer */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:9,color:'hsl(215 14% 35%)'}}>
            {totalPow.toLocaleString()} ARX-P staked
          </span>
          <span style={{fontSize:9,color:'hsl(215 14% 32%)'}}>
            {new Date(isActive?battle.ends_at:battle.starts_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Battle Detail View (full page) ─────────────────────────────────────────
function BattleDetail({
  battle, isActive, userVote, participants, voting, castVote, available, onClose
}: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  userVote: any;
  participants: any[];
  voting: boolean;
  castVote: (id:string,side:'a'|'b',amt:number)=>Promise<boolean>;
  available: number;
  onClose: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const totalPow = (battle.side_a_power??0) + (battle.side_b_power??0);
  const pctA = totalPow > 0 ? Math.round((battle.side_a_power/totalPow)*100) : 50;
  const pctB = 100 - pctA;
  const existingVote = userVote?.side ?? null;
  const [localSide, setLocalSide] = useState<'a'|'b'|null>(null);
  const [stakeAmt, setStakeAmt] = useState('');
  const activeSide = existingVote ?? localSide;
  const concluded = !isActive && battle.winner_side;

  const handleVote = async () => {
    if (!activeSide) return;
    const amt = parseInt(stakeAmt);
    if (isNaN(amt)||amt<1000) { alert('Minimum 1,000 ARX-P'); return; }
    if (amt>available) { alert('Insufficient ARX-P'); return; }
    const ok = await castVote(battle.id, activeSide, amt);
    if (ok) { setStakeAmt(''); setLocalSide(null); }
  };

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
      style={{position:'fixed',inset:0,background:'hsl(225 30% 3%)',zIndex:300,overflowY:'auto',paddingBottom:100,
        fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0'}}>
        <button onClick={onClose} className="press"
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:16,fontWeight:700,color:'hsl(215 20% 93%)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{battle.title}</h1>
          {isActive && <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>⏱ {timer} remaining</p>}
        </div>
        <div style={{width:40}}/>
      </div>

      <div style={{padding:'16px 20px 0'}}>
        {/* Hero VS card */}
        <div className="glass-elevated" style={{borderRadius:22,padding:'20px',marginBottom:14,position:'relative',overflow:'hidden',
          border:`1px solid ${isActive?'hsl(215 30% 22%/0.5)':'hsl(215 22% 16%)'}`,
          background:isActive?'linear-gradient(145deg,hsl(225 28% 11%),hsl(215 30% 14%))':'hsl(225 26% 9%)'}}>
          {isActive && <div style={{position:'absolute',top:0,left:0,right:0,height:2,
            background:'linear-gradient(90deg,transparent,hsl(215 35% 62%/0.5),transparent)'}}/>}

          {battle.description && (
            <p style={{fontSize:12,color:'hsl(215 18% 55%)',marginBottom:14,textAlign:'center'}}>{battle.description}</p>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 40px 1fr',gap:10,alignItems:'stretch',marginBottom:14}}>
            {/* Side A */}
            <motion.div whileTap={{scale:0.97}}
              onClick={()=>isActive&&!existingVote&&setLocalSide('a')}
              style={{borderRadius:16,padding:'16px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:10,
                cursor:isActive&&!existingVote?'pointer':'default',transition:'all 0.2s',
                background:activeSide==='a'?'hsl(215 35% 62%/0.12)':'hsl(215 26% 11%)',
                border:`2px solid ${activeSide==='a'?'hsl(215 35% 62%/0.45)':battle.winner_side==='a'?'hsl(38 55% 52%/0.4)':'hsl(215 22% 18%)'}`,
              }}>
              <SideImage imageUrl={battle.side_a_image} name={battle.side_a_name} size={62}/>
              <p style={{fontSize:12,fontWeight:700,color:'hsl(215 18% 82%)',textAlign:'center'}}>{battle.side_a_name}</p>
              <div style={{fontSize:24,fontWeight:800,color:battle.winner_side==='a'?'hsl(38 55% 58%)':activeSide==='a'?'hsl(215 35% 72%)':'hsl(215 20% 90%)'}}>{pctA}%</div>
              <p style={{fontSize:10,color:'hsl(215 14% 40%)',textAlign:'center'}}>{battle.side_a_power.toLocaleString()} ARX-P</p>
              {battle.winner_side==='a' && <div style={{fontSize:10,fontWeight:700,color:'hsl(38 55% 58%)'}}>👑 Winner</div>}
              {activeSide==='a'&&isActive && <div style={{fontSize:10,fontWeight:700,color:'hsl(155 45% 55%)'}}>✓ Your pick</div>}
            </motion.div>

            {/* VS */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontWeight:900,fontSize:12,color:'hsl(215 18% 38%)'}}>VS</div>
            </div>

            {/* Side B */}
            <motion.div whileTap={{scale:0.97}}
              onClick={()=>isActive&&!existingVote&&setLocalSide('b')}
              style={{borderRadius:16,padding:'16px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:10,
                cursor:isActive&&!existingVote?'pointer':'default',transition:'all 0.2s',
                background:activeSide==='b'?'hsl(215 35% 62%/0.12)':'hsl(215 26% 11%)',
                border:`2px solid ${activeSide==='b'?'hsl(215 35% 62%/0.45)':battle.winner_side==='b'?'hsl(38 55% 52%/0.4)':'hsl(215 22% 18%)'}`,
              }}>
              <SideImage imageUrl={battle.side_b_image} name={battle.side_b_name} size={62}/>
              <p style={{fontSize:12,fontWeight:700,color:'hsl(215 18% 82%)',textAlign:'center'}}>{battle.side_b_name}</p>
              <div style={{fontSize:24,fontWeight:800,color:battle.winner_side==='b'?'hsl(38 55% 58%)':activeSide==='b'?'hsl(215 35% 72%)':'hsl(215 20% 90%)'}}>{pctB}%</div>
              <p style={{fontSize:10,color:'hsl(215 14% 40%)',textAlign:'center'}}>{battle.side_b_power.toLocaleString()} ARX-P</p>
              {battle.winner_side==='b' && <div style={{fontSize:10,fontWeight:700,color:'hsl(38 55% 58%)'}}>👑 Winner</div>}
              {activeSide==='b'&&isActive && <div style={{fontSize:10,fontWeight:700,color:'hsl(155 45% 55%)'}}>✓ Your pick</div>}
            </motion.div>
          </div>

          {/* Progress */}
          <div style={{height:5,borderRadius:3,background:'hsl(215 26% 12%)',overflow:'hidden',marginBottom:8}}>
            <motion.div initial={{width:0}} animate={{width:`${pctA}%`}} transition={{duration:0.8,ease:'easeOut'}}
              style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,hsl(215 35% 50%),hsl(215 45% 65%))'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'hsl(215 14% 35%)'}}>
            <span>Total: {totalPow.toLocaleString()} ARX-P staked</span>
            <span>{participants.length} stakers</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
          {[
            {icon:<Trophy size={16}/>, label:'Pool A', val:`${battle.side_a_power.toLocaleString()}`, col:'hsl(215 35% 62%)'},
            {icon:<Users size={16}/>,  label:'Stakers', val:String(participants.length), col:'hsl(155 45% 50%)'},
            {icon:<Trophy size={16}/>, label:'Pool B', val:`${battle.side_b_power.toLocaleString()}`, col:'hsl(255 50% 65%)'},
          ].map((s,i)=>(
            <div key={i} className="glass-card" style={{borderRadius:16,padding:'12px 10px',textAlign:'center'}}>
              <div style={{color:'hsl(215 25% 45%)',display:'flex',justifyContent:'center',marginBottom:5}}>{s.icon}</div>
              <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.1em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:3}}>{s.label}</p>
              <p style={{fontSize:14,fontWeight:700,color:s.col}}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Stake panel — only if active and not yet voted */}
        {isActive && !existingVote && (
          <div className="glass-elevated" style={{borderRadius:20,padding:'16px',marginBottom:14,border:'1px solid hsl(215 28% 20%)'}}>
            <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.12em',color:'hsl(215 14% 35%)',fontWeight:700,marginBottom:10}}>
              Stake ARX-P · {activeSide?`backing ${activeSide==='a'?battle.side_a_name:battle.side_b_name}`:'select a side above'}
            </p>
            <div style={{display:'flex',alignItems:'center',gap:10,background:'hsl(215 26% 10%)',
              border:'1px solid hsl(215 26% 17%)',borderRadius:14,padding:'14px 16px',marginBottom:10}}>
              <input type="number" value={stakeAmt} onChange={e=>setStakeAmt(e.target.value)}
                placeholder="1,000" style={{flex:1,background:'none',border:'none',outline:'none',fontSize:22,
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
              {voting?'Staking…':activeSide?`Stake on ${activeSide==='a'?battle.side_a_name:battle.side_b_name}`:'← Select a side above first'}
            </button>
            <p style={{fontSize:9,color:'hsl(215 14% 32%)',marginTop:8,textAlign:'center'}}>
              Min 1,000 · Max 100,000 ARX-P · Winners earn from the losing pool
            </p>
          </div>
        )}

        {/* Staked confirmation */}
        {existingVote && isActive && (
          <div style={{marginBottom:14,padding:'14px 16px',background:'hsl(155 45% 43%/0.07)',
            border:'1px solid hsl(155 45% 43%/0.22)',borderRadius:18,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:12,background:'hsl(155 45% 43%/0.12)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>✓</div>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'hsl(155 45% 55%)'}}>
                Staked {userVote?.power_spent?.toLocaleString()} ARX-P
              </p>
              <p style={{fontSize:11,color:'hsl(155 45% 43%/0.6)',marginTop:2}}>
                On {existingVote==='a'?battle.side_a_name:battle.side_b_name} · Awaiting results
              </p>
            </div>
          </div>
        )}

        {/* Live participants */}
        {participants.length > 0 && (
          <>
            <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.12em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10}}>
              Live Stakers ({participants.length})
            </p>
            {participants.slice(0,8).map((p:any) => (
              <div key={p.user_id} style={{display:'flex',alignItems:'center',gap:10,
                padding:'10px 14px',borderRadius:14,marginBottom:7,
                background:'hsl(225 24% 8%)',border:'1px solid hsl(215 20% 13%)'}}>
                <div style={{width:32,height:32,borderRadius:10,background:'hsl(215 25% 13%)',
                  border:'1px solid hsl(215 22% 20%)',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:12,fontWeight:700,color:'hsl(215 25% 55%)',flexShrink:0,overflow:'hidden'}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : p.username?.[0]?.toUpperCase()||'?'}
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
      </div>
    </motion.div>
  );
}

// ── Main Arena Component ───────────────────────────────────────────────────
export default function MobileArena() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { points }  = usePoints();
  const { activeBattle, userVote, participants, battleHistory, leaderboard, loading, voting, castVote } = useArena();
  const { membership, loading: memLoading, registering, registerMembership } = useArenaMembership();

  const [showAuth,      setShowAuth]      = useState(false);
  const [tab,           setTab]           = useState<Tab>('battles');
  const [selectedBattle,setSelectedBattle]= useState<(ArenaBattle|BattleHistoryEntry)|null>(null);
  const [isBattleActive,setIsBattleActive]= useState(false);

  const available = Math.round(points?.total_points ?? 0);

  const openBattle = (battle: ArenaBattle|BattleHistoryEntry, isActive: boolean) => {
    setSelectedBattle(battle);
    setIsBattleActive(isActive);
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

  if (memLoading||loading) return (
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

  const alphaBoard = leaderboard.filter((e:any)=>e.club==='alpha'||!e.club);
  const omegaBoard = leaderboard.filter((e:any)=>e.club==='omega');
  const myStakes   = (battleHistory as BattleHistoryEntry[]).filter(b=>b.user_participated);
  const allHistory = battleHistory as BattleHistoryEntry[];

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* Battle detail overlay */}
      <AnimatePresence>
        {selectedBattle && (
          <BattleDetail
            battle={selectedBattle}
            isActive={isBattleActive}
            userVote={isBattleActive?userVote:null}
            participants={isBattleActive?participants:[]}
            voting={voting}
            castVote={castVote}
            available={available}
            onClose={()=>setSelectedBattle(null)}/>
        )}
      </AnimatePresence>

      {/* Header */}
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

      {/* Tabs */}
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

        {/* BATTLES TAB */}
        {tab==='battles' && (
          <>
            {activeBattle && (
              <>
                <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10}}>Active Battle</p>
                <BattleCard battle={activeBattle} isActive
                  userVoted={!!userVote} userWon={false}
                  onClick={()=>openBattle(activeBattle,true)}/>
              </>
            )}

            {allHistory.length > 0 && (
              <>
                <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:10,marginTop:6}}>
                  All Battles ({allHistory.length})
                </p>
                {allHistory.map(b=>(
                  <BattleCard key={b.id} battle={b}
                    userVoted={b.user_participated}
                    userWon={b.user_won}
                    onClick={()=>openBattle(b,false)}/>
                ))}
              </>
            )}

            {!activeBattle && allHistory.length===0 && (
              <div className="glass-card" style={{borderRadius:20,padding:'32px 20px',textAlign:'center'}}>
                <div style={{fontSize:44,marginBottom:12}}>⚔️</div>
                <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:6}}>No battles yet</p>
                <p style={{fontSize:12,color:'hsl(215 14% 35%)'}}>Check back soon for upcoming battles</p>
              </div>
            )}
          </>
        )}

        {/* LEADERBOARD TAB */}
        {tab==='leaderboard' && (
          <>
            {[{team:'Alpha',board:alphaBoard,col:'hsl(215 35% 62%)',bg:'hsl(215 35% 62%/0.05)',bd:'hsl(215 30% 18%)'},
              {team:'Omega',board:omegaBoard,col:'hsl(255 50% 65%)',bg:'hsl(255 50% 60%/0.05)',bd:'hsl(255 40% 22%)'}
            ].map(({team,board,col,bg,bd})=>(
              <div key={team} style={{marginBottom:20}}>
                <p style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.14em',fontWeight:700,marginBottom:10,color:col}}>
                  {team} Team
                </p>
                {board.length===0
                  ? <p style={{fontSize:12,color:'hsl(215 14% 35%)'}}>No {team.toLowerCase()} members yet</p>
                  : board.slice(0,10).map((e:any,i:number)=>(
                    <div key={e.user_id} style={{display:'flex',alignItems:'center',gap:10,
                      padding:'10px 14px',borderRadius:14,marginBottom:7,background:bg,border:`1px solid ${bd}`}}>
                      <div style={{width:26,height:26,borderRadius:9,background:`${col}22`,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:col,flexShrink:0}}>
                        {i<3?['🥇','🥈','🥉'][i]:i+1}
                      </div>
                      <div style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',
                        background:'hsl(225 25% 13%)',display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:12,fontWeight:700,color:col,flexShrink:0}}>
                        {e.avatar_url?<img src={e.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:e.username?.[0]?.toUpperCase()||'?'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12,fontWeight:600,color:'hsl(215 18% 82%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.username||'Miner'}</p>
                      </div>
                      <p style={{fontSize:12,fontWeight:700,color}}>{(e.total_power_staked||0).toLocaleString()}</p>
                    </div>
                  ))
                }
              </div>
            ))}
          </>
        )}

        {/* MY STAKES TAB */}
        {tab==='my-stakes' && (
          <>
            {myStakes.length===0 ? (
              <div className="glass-card" style={{borderRadius:20,padding:'32px 20px',textAlign:'center'}}>
                <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:6}}>No stakes yet</p>
                <p style={{fontSize:12,color:'hsl(215 14% 35%)'}}>Stake ARX-P on a battle to see your history</p>
              </div>
            ) : myStakes.map(b=>(
              <BattleCard key={b.id} battle={b} userVoted={b.user_participated} userWon={b.user_won}
                onClick={()=>openBattle(b,false)}/>
            ))}
          </>
        )}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
