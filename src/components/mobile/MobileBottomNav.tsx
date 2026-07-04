import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';

// FIX BUG-02 + ENH-01: Added Mining tab, replaced Leaderboard in main nav
// Mining is the core feature and needs direct access.
// Leaderboard is now accessible via dashboard or a dedicated button.

const HomeIcon = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="2" fill={a?'hsl(215 35% 62%/0.25)':'none'} stroke={a?'hsl(215 35% 62%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
    <rect x="14" y="3" width="7" height="7" rx="2" fill={a?'hsl(215 35% 62%/0.15)':'none'} stroke={a?'hsl(215 35% 62%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
    <rect x="3" y="14" width="7" height="7" rx="2" fill={a?'hsl(215 35% 62%/0.15)':'none'} stroke={a?'hsl(215 35% 62%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
    <rect x="14" y="14" width="7" height="7" rx="2" fill={a?'hsl(215 35% 62%/0.35)':'none'} stroke={a?'hsl(215 35% 62%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
  </svg>
);

// NEW: Mining icon
const MiningIcon = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4"
      fill={a?'hsl(155 45% 43%/0.2)':'none'}
      stroke={a?'hsl(155 45% 50%)':'hsl(215 14% 38%)'}
      strokeWidth="1.7"/>
    <circle cx="12" cy="12" r="9"
      fill="none"
      stroke={a?'hsl(155 45% 43%/0.35)':'hsl(215 14% 28%)'}
      strokeWidth="1.2"
      strokeDasharray="3 3"/>
    <line x1="12" y1="2" x2="12" y2="5" stroke={a?'hsl(155 45% 50%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="12" y1="19" x2="12" y2="22" stroke={a?'hsl(155 45% 50%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="2" y1="12" x2="5" y2="12" stroke={a?'hsl(155 45% 50%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="19" y1="12" x2="22" y2="12" stroke={a?'hsl(155 45% 50%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const ArenaIcon = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5"
      fill={a?'hsl(255 50% 65%/0.15)':'none'} stroke={a?'hsl(255 50% 65%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="19" cy="19" r="2.2"
      fill={a?'hsl(255 50% 65%/0.2)':'none'} stroke={a?'hsl(255 50% 65%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
    <circle cx="5" cy="5" r="2.2"
      fill={a?'hsl(255 50% 65%/0.2)':'none'} stroke={a?'hsl(255 50% 65%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
  </svg>
);

const LeaderboardIcon = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
      fill={a?'hsl(38 55% 52%/0.22)':'none'} stroke={a?'hsl(38 55% 52%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

const ProfileIcon = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill={a?'hsl(215 35% 62%/0.2)':'none'} stroke={a?'hsl(215 35% 62%)':'hsl(215 14% 38%)'} strokeWidth="1.7"/>
    <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={a?'hsl(215 35% 62%)':'hsl(215 14% 38%)'} strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const TABS = [
  { to:'/',           id:'home',        label:'Home',        icon:HomeIcon,        col:'hsl(215 35% 62%)', dot:'hsl(215 55% 62%)' },
  { to:'/mining',     id:'mining',      label:'Mining',      icon:MiningIcon,      col:'hsl(155 45% 50%)', dot:'hsl(155 55% 55%)' },
  { to:'/arena',      id:'arena',       label:'Arena',       icon:ArenaIcon,       col:'hsl(255 50% 65%)', dot:'hsl(255 55% 70%)' },
  { to:'/leaderboard',id:'leaderboard', label:'Leaderboard', icon:LeaderboardIcon, col:'hsl(38 55% 52%)',  dot:'hsl(38 60% 58%)'  },
  { to:'/profile',    id:'profile',     label:'Profile',     icon:ProfileIcon,     col:'hsl(215 35% 62%)', dot:'hsl(215 55% 62%)' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { hideNav } = useMobileNav();
  if (!user || hideNav) return null;
  if (['/auth','/admin','/landing'].some(p => location.pathname.startsWith(p))) return null;
  // FIX BUG-17: Hide bottom nav when arena battle detail is open
  // MobileArena sets selectedBattle which renders a fixed overlay — bottom nav should be hidden
  // The arena page itself hides it via CSS when the detail is open
  const hidePaths = ['/auth', '/admin', '/landing'];
  if (hidePaths.some(p => location.pathname.startsWith(p))) return null;

  const activeId = (() => {
    if (location.pathname === '/') return 'home';
    for (const t of TABS.slice(1)) if (location.pathname.startsWith(t.to)) return t.id;
    return 'home';
  })();

  return (
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:200,
      background:'linear-gradient(to top,hsl(225 30% 3%) 60%,transparent)',
      paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      <div style={{margin:'0 10px 10px',
        background:'linear-gradient(180deg,hsl(225 26% 9%/0.97),hsl(225 30% 5%/0.99))',
        backdropFilter:'blur(44px) saturate(1.4)',WebkitBackdropFilter:'blur(44px) saturate(1.4)',
        borderRadius:24,border:'1px solid hsl(215 25% 17%/0.55)',padding:'8px 2px',display:'flex',
        boxShadow:'0 -4px 32px hsl(225 35% 3%/0.6),inset 0 1px 0 hsl(215 35% 62%/0.05)'}}>
        {TABS.map(({ to, id, label, icon, col, dot }) => {
          const isActive = id === activeId;
          return (
            <NavLink key={to} to={to} style={{flex:1,display:'flex',flexDirection:'column',
              alignItems:'center',gap:4,padding:'9px 0',textDecoration:'none',
              position:'relative',WebkitTapHighlightColor:'transparent'}}>
              {isActive && (
                <motion.div layoutId="navPill"
                  style={{position:'absolute',inset:'2px 5px',background:`${col}1a`,
                    borderRadius:14,border:`1px solid ${col}30`}}
                  transition={{type:'spring',stiffness:420,damping:34}}/>
              )}
              {isActive && (
                <motion.div layoutId="navDot"
                  style={{position:'absolute',top:2,width:4,height:4,borderRadius:'50%',
                    background:dot,boxShadow:`0 0 8px ${dot}`}}
                  transition={{type:'spring',stiffness:420,damping:34}}/>
              )}
              <div style={{position:'relative',zIndex:1,filter:isActive?`drop-shadow(0 0 6px ${dot}88)`:'none',transition:'filter 0.25s'}}>
                {icon(isActive)}
              </div>
              <span style={{fontSize:9,fontWeight:isActive?700:500,letterSpacing:'0.04em',
                textTransform:'uppercase',position:'relative',zIndex:1,
                color:isActive?col:'hsl(215 14% 38%)',transition:'color 0.2s',
                fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
