import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Trophy, Zap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PublicUser {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  x_handle: string | null;
  country: string | null;
  total_points: number;
  rank: number | null;
  daily_streak: number;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate   = useNavigate();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);

  useEffect(() => {
    if (!userId) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const [{ data: prof }, { data: pts }] = await Promise.all([
        supabase.from('profiles').select('user_id,username,avatar_url,country,x_handle')
          .eq('user_id', userId).maybeSingle(),
        supabase.from('user_points').select('total_points,daily_streak')
          .eq('user_id', userId).maybeSingle(),
      ]);

      if (!prof) { setNotFound(true); setLoading(false); return; }

      // Get rank
      const { count } = await supabase.from('user_points')
        .select('*', { count:'exact', head:true })
        .gt('total_points', pts?.total_points || 0);

      setProfile({
        user_id:     prof.user_id,
        username:    prof.username,
        avatar_url:  prof.avatar_url,
        x_handle:    (prof as any).x_handle || null,
        country:     prof.country,
        total_points: Math.round(Number(pts?.total_points || 0)),
        rank:         (count ?? 0) + 1,
        daily_streak: pts?.daily_streak || 0,
      });
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div style={{minHeight:'100vh', background:'hsl(225 30% 3%)', paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', padding:'52px 20px 0', gap:12}}>
        <button onClick={() => navigate(-1)}
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',
            justifyContent:'center',cursor:'pointer',outline:'none',flexShrink:0}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div>
          <h1 style={{fontSize:19,fontWeight:700,color:'hsl(215 20% 93%)'}}>Profile</h1>
          <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:1}}>Community member</p>
        </div>
      </div>

      {loading && (
        <div style={{display:'flex',justifyContent:'center',paddingTop:80}}>
          <div style={{width:36,height:36,borderRadius:'50%',
            border:'2px solid hsl(215 35% 62%/0.2)',
            borderTopColor:'hsl(215 35% 62%)',animation:'spin 1s linear infinite'}}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}

      {notFound && !loading && (
        <div style={{textAlign:'center',paddingTop:80,padding:'80px 40px 0'}}>
          <div style={{fontSize:56,marginBottom:16}}>🔍</div>
          <p style={{fontSize:18,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:8}}>User not found</p>
          <p style={{fontSize:13,color:'hsl(215 14% 35%)'}}>This profile doesn't exist or was removed</p>
        </div>
      )}

      {!loading && profile && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>

          {/* Avatar + Name Card */}
          <div style={{margin:'24px 20px 0'}}>
            <div style={{borderRadius:26,overflow:'hidden',position:'relative',
              background:'linear-gradient(145deg,hsl(225 28% 10%),hsl(215 30% 13%))',
              border:'1px solid hsl(215 25% 18%)'}}>

              {/* Top gradient bar */}
              <div style={{height:3,background:'linear-gradient(90deg,hsl(215 35% 55%),hsl(255 50% 65%),hsl(155 45% 43%))'}}/>

              <div style={{padding:'28px 24px 24px',display:'flex',alignItems:'center',gap:20}}>
                {/* Avatar */}
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:80,height:80,borderRadius:24,overflow:'hidden',
                    border:'2px solid hsl(215 35% 62%/0.25)',
                    boxShadow:'0 8px 28px hsl(215 55% 62%/0.12)'}}>
                    {profile.avatar_url && !avatarErr
                      ? <img src={profile.avatar_url} alt="" onError={()=>setAvatarErr(true)}
                          style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : <div style={{width:'100%',height:'100%',
                          background:'linear-gradient(135deg,hsl(215 30% 18%),hsl(215 40% 28%))',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:30,fontWeight:700,color:'hsl(215 20% 93%)'}}>
                          {profile.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    }
                  </div>
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{fontSize:22,fontWeight:700,color:'hsl(215 20% 93%)',
                    letterSpacing:'-0.3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {profile.username || 'Miner'}
                  </h2>
                  {profile.country && (
                    <p style={{fontSize:12,color:'hsl(215 14% 45%)',marginTop:4}}>{profile.country}</p>
                  )}
                  {/* X handle */}
                  {profile.x_handle && (
                    <a href={`https://x.com/${profile.x_handle}`} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:8,
                        background:'hsl(215 25% 13%)',border:'1px solid hsl(215 22% 20%)',
                        borderRadius:20,padding:'4px 10px',textDecoration:'none'}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="hsl(215 35% 62%)">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span style={{fontSize:11,fontWeight:600,color:'hsl(215 35% 62%)'}}>
                        @{profile.x_handle}
                      </span>
                    </a>
                  )}
                </div>
              </div>

              {/* Stats bar */}
              <div style={{borderTop:'1px solid hsl(215 25% 16%)',
                display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr'}}>
                {[
                  { label:'Rank',   val: profile.rank ? `#${profile.rank}` : '—',
                    col:'hsl(38 55% 58%)', icon:<Trophy size={14}/> },
                  null,
                  { label:'ARX-P',  val: profile.total_points.toLocaleString(),
                    col:'hsl(215 35% 72%)', icon:<Zap size={14}/> },
                  null,
                  { label:'Streak', val: `${profile.daily_streak}d`,
                    col:'hsl(155 45% 50%)', icon:<Star size={14}/> },
                ].map((s,i) => s === null
                  ? <div key={i} style={{background:'hsl(215 25% 16%)'}}/>
                  : <div key={i} style={{padding:'16px 0',textAlign:'center'}}>
                      <div style={{display:'flex',justifyContent:'center',color:s.col,marginBottom:5}}>{s.icon}</div>
                      <p style={{fontSize:16,fontWeight:700,color:s.col,letterSpacing:'-0.3px'}}>{s.val}</p>
                      <p style={{fontSize:8,color:'hsl(215 14% 32%)',marginTop:3,
                        textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600}}>{s.label}</p>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div style={{margin:'16px 20px 0',padding:'12px 16px',borderRadius:14,
            background:'hsl(215 25% 8%)',border:'1px solid hsl(215 22% 14%)'}}>
            <p style={{fontSize:11,color:'hsl(215 14% 35%)',textAlign:'center',lineHeight:1.5}}>
              🔒 Only public information is shown — username, rank, and points
            </p>
          </div>

        </motion.div>
      )}
    </div>
  );
}
