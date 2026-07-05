/**
 * Referrals.tsx — FULLY REWRITTEN in mobile inline-style pattern
 * FIX BUG-12: Removed all Tailwind className web styles, ScrollReveal, GlowCard, ResendBackground
 * FIX BUG-34: Referral link always uses arxonchain.xyz
 * FIX ENH-04: Proper empty state with Share CTA
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Users, Activity, UserX, Gift, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useReferrals } from '@/hooks/useReferrals';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const CSS = `
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
  @keyframes shimmer{0%{left:-100%}100%{left:200%}}
`;

const Referrals = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { referralCode, referrals, stats, loading, getReferralLink } = useReferrals(user);

  const { activeReferrals, inactiveReferrals } = useMemo(() => ({
    activeReferrals:   referrals.filter(r => r.is_active === true),
    inactiveReferrals: referrals.filter(r => r.is_active !== true),
  }), [referrals]);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast({ title: '✓ Code Copied!', description: `Referral code ${referralCode} copied` });
  };

  const shareReferralLink = async () => {
    // FIX BUG-34: Always use arxonchain.xyz, never the Cloudflare Pages URL
    const link = referralCode
      ? `https://arxonchain.xyz/?ref=${referralCode}`
      : getReferralLink();
    if (!link) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ARXON',
          text: `Join me on ARXON and start mining ARX-P! Use my referral code: ${referralCode}`,
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(link);
          toast({ title: '✓ Link Copied!', description: 'Referral link copied to clipboard' });
        }
      }
    } else {
      navigator.clipboard.writeText(link);
      toast({ title: '✓ Link Copied!', description: 'Referral link copied to clipboard' });
    }
  };
  const statCards = [
    { icon: <Users   size={18}/>, label: 'Total Referrals', value: stats.totalReferrals, col: 'hsl(215 35% 62%)' },
    { icon: <Activity size={18}/>, label: 'Active Miners',  value: stats.activeMiners,   col: 'hsl(155 45% 50%)' },
    { icon: <UserX   size={18}/>, label: 'Inactive',       value: stats.inactiveMiners,  col: 'hsl(215 14% 42%)' },
    { icon: <Gift    size={18}/>, label: 'ARX-P Earned',   value: stats.totalEarnings,   col: 'hsl(38 55% 52%)'  },
  ];

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'52px 20px 0',marginBottom:4}}>
        <motion.button onClick={()=>navigate('/')} whileTap={{scale:0.92}}
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',
            justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <ArrowLeft size={20} color="hsl(215 25% 55%)"/>
        </motion.button>
        <h1 style={{fontSize:18,fontWeight:700,color:'hsl(215 20% 93%)'}}>Referrals</h1>
        <div style={{width:40}}/>
      </div>

      <div style={{padding:'16px 20px 0'}}>

        {/* Hero badge */}
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,
            padding:'6px 14px',borderRadius:20,marginBottom:10,
            background:'hsl(215 35% 62%/0.1)',border:'1px solid hsl(215 35% 62%/0.22)'}}>
            <Zap size={12} color="hsl(215 35% 62%)"/>
            <span style={{fontSize:12,fontWeight:700,color:'hsl(215 35% 72%)'}}>
              100 ARX-P per referral
            </span>
          </div>
          <h2 style={{fontSize:22,fontWeight:800,color:'hsl(215 18% 94%)',marginBottom:6}}>
            Invite Friends & Earn
          </h2>
          <p style={{fontSize:13,color:'hsl(215 14% 42%)'}}>
            Share your code and earn when friends join and mine
          </p>
        </div>

        {/* Referral Code Card */}
        {user && (
          <div style={{
            borderRadius:22,padding:'20px',marginBottom:14,
            background:'linear-gradient(135deg,hsl(215 35% 62%/0.1),hsl(225 30% 8%))',
            border:'1.5px solid hsl(215 35% 62%/0.25)',
            position:'relative',overflow:'hidden',
          }}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,
              background:'linear-gradient(90deg,transparent,hsl(215 35% 62%/0.4),transparent)'}}/>

            <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',
              color:'hsl(215 14% 40%)',fontWeight:700,marginBottom:8,textAlign:'center'}}>
              Your Referral Code
            </p>

            <div style={{textAlign:'center',marginBottom:14}}>
              {loading && !referralCode ? (
                <div style={{height:36,width:160,borderRadius:10,margin:'0 auto',
                  background:'hsl(215 22% 14%)',animation:'pulse 1.5s ease-in-out infinite'}}/>
              ) : (
                <span style={{fontSize:30,fontWeight:900,letterSpacing:6,
                  color:'hsl(215 35% 72%)',fontFamily:'monospace'}}>
                  {referralCode || '...'}
                </span>
              )}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <motion.button whileTap={{scale:0.95}} onClick={copyReferralCode}
                disabled={!referralCode}
                style={{padding:'12px',borderRadius:14,cursor:'pointer',outline:'none',
                  border:'1px solid hsl(215 35% 62%/0.3)',
                  background:'hsl(215 35% 62%/0.08)',
                  color:'hsl(215 35% 72%)',fontSize:13,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
                <Copy size={14}/> Copy Code
              </motion.button>
              <motion.button whileTap={{scale:0.95}} onClick={shareReferralLink}
                disabled={!referralCode}
                style={{padding:'12px',borderRadius:14,cursor:'pointer',outline:'none',
                  border:'none',
                  background:'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 45% 42%))',
                  color:'white',fontSize:13,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  boxShadow:'0 4px 16px hsl(215 55% 62%/0.25)',
                  fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
                <Share2 size={14}/> Share Link
              </motion.button>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {statCards.map((s,i) => (
            <div key={i} style={{borderRadius:18,padding:'14px',textAlign:'center',
              background:'hsl(215 26% 10%)',border:'1px solid hsl(215 22% 16%)'}}>
              <div style={{color:s.col,display:'flex',justifyContent:'center',marginBottom:6}}>
                {s.icon}
              </div>
              <p style={{fontSize:22,fontWeight:900,color:s.col,lineHeight:1,marginBottom:4}}>
                {s.value}
              </p>
              <p style={{fontSize:10,color:'hsl(215 14% 36%)',textTransform:'uppercase',
                letterSpacing:'0.08em',fontWeight:600}}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Referrals list */}
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[1,2,3].map(i=>(
              <div key={i} style={{height:64,borderRadius:16,background:'hsl(215 22% 10%)',
                border:'1px solid hsl(215 20% 14%)',
                animation:'pulse 1.5s ease-in-out infinite',opacity:1-i*0.2}}/>
            ))}
          </div>
        ) : referrals.length === 0 ? (
          /* FIX ENH-04: Proper empty state with share CTA */
          <div style={{borderRadius:22,padding:'40px 20px',textAlign:'center',
            background:'hsl(215 22% 8%)',border:'1px solid hsl(215 20% 12%)'}}>
            <div style={{fontSize:44,marginBottom:12}}>👥</div>
            <p style={{fontSize:16,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:6}}>
              No referrals yet
            </p>
            <p style={{fontSize:12,color:'hsl(215 14% 32%)',marginBottom:20,lineHeight:1.5}}>
              Share your referral link and earn{' '}
              <span style={{color:'hsl(215 35% 62%)',fontWeight:700}}>100 ARX-P</span>{' '}
              for every friend who joins
            </p>
            <motion.button whileTap={{scale:0.95}} onClick={shareReferralLink}
              disabled={!referralCode}
              style={{padding:'14px 28px',borderRadius:16,cursor:'pointer',outline:'none',
                border:'none',
                background:'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 45% 42%))',
                color:'white',fontSize:14,fontWeight:700,
                display:'inline-flex',alignItems:'center',gap:8,
                boxShadow:'0 4px 16px hsl(215 55% 62%/0.25)',
                fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
              <Share2 size={16}/> Share Your Link
            </motion.button>
          </div>
        ) : (
          <div>
            {/* Active miners */}
            {activeReferrals.length > 0 && (
              <div style={{marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <Activity size={14} color="hsl(155 45% 50%)"/>
                  <p style={{fontSize:12,fontWeight:700,color:'hsl(155 45% 50%)',
                    textTransform:'uppercase',letterSpacing:'0.1em'}}>
                    Active ({activeReferrals.length})
                  </p>
                </div>
                {activeReferrals.map((r,i) => (
                  <motion.div key={r.id}
                    initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                    transition={{delay:i*0.04}}
                    style={{display:'flex',alignItems:'center',gap:12,
                      padding:'12px 16px',borderRadius:16,marginBottom:6,
                      background:'hsl(155 45% 43%/0.06)',
                      border:'1px solid hsl(155 45% 43%/0.18)'}}>
                    <div style={{width:36,height:36,borderRadius:12,flexShrink:0,
                      background:'linear-gradient(135deg,hsl(155 55% 38%),hsl(155 45% 28%))',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:14,fontWeight:700,color:'white'}}>
                      {(r.referred_username || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:700,color:'hsl(215 18% 88%)',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {r.referred_username || 'Anonymous'}
                      </p>
                      <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>
                        {r.created_at ? format(new Date(r.created_at),'MMM d, yyyy') : 'N/A'}
                        {' · '}
                        <span style={{color:'hsl(155 45% 50%)'}}>⛏ Mining</span>
                      </p>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:'hsl(155 45% 55%)',flexShrink:0}}>
                      +{r.points_awarded || 0}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Inactive referrals */}
            {inactiveReferrals.length > 0 && (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <UserX size={14} color="hsl(215 14% 40%)"/>
                  <p style={{fontSize:12,fontWeight:700,color:'hsl(215 14% 40%)',
                    textTransform:'uppercase',letterSpacing:'0.1em'}}>
                    Inactive ({inactiveReferrals.length})
                  </p>
                </div>
                {inactiveReferrals.map((r,i) => (
                  <motion.div key={r.id}
                    initial={{opacity:0,x:-10}} animate={{opacity:0.6,x:0}}
                    transition={{delay:i*0.04}}
                    style={{display:'flex',alignItems:'center',gap:12,
                      padding:'12px 16px',borderRadius:16,marginBottom:6,
                      background:'hsl(225 24% 8%)',
                      border:'1px solid hsl(215 20% 12%)'}}>
                    <div style={{width:36,height:36,borderRadius:12,flexShrink:0,
                      background:'hsl(215 22% 14%)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:14,fontWeight:700,color:'hsl(215 18% 42%)'}}>
                      {(r.referred_username || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:600,color:'hsl(215 18% 65%)',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {r.referred_username || 'Anonymous'}
                      </p>
                      <p style={{fontSize:10,color:'hsl(215 14% 32%)',marginTop:2}}>
                        {r.created_at ? format(new Date(r.created_at),'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <span style={{fontSize:12,color:'hsl(215 14% 40%)',flexShrink:0}}>
                      +{r.points_awarded || 0}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Referrals;
