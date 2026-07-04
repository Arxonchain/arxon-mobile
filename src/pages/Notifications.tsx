/**
 * Notifications.tsx — mobile notifications list with realtime updates
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Gift, Trophy, ChevronLeft, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInAppNotifications, type AppNotification } from '@/hooks/useInAppNotifications';

const CSS = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`;

function getIconInfo(type: string) {
  if (type === 'rumble_reward' || type === 'arena' || type.includes('arena'))
    return { icon: <Trophy size={18} color="hsl(38 55% 52%)"/>, bg: 'hsl(38 55% 52%/0.15)', border: 'hsl(38 55% 52%/0.3)' };
  if (type === 'new_tasks')
    return { icon: <Bell size={18} color="hsl(207 90% 54%)"/>, bg: 'hsl(207 90% 54%/0.15)', border: 'hsl(207 90% 54%/0.3)' };
  return { icon: <Gift size={18} color="hsl(215 35% 62%)"/>, bg: 'hsl(215 35% 62%/0.15)', border: 'hsl(215 35% 62%/0.3)' };
}

function formatDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Notifications() {
  const navigate    = useNavigate();
  const { notifications, loading, markRead } = useInAppNotifications();
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

  const markAllRead = () => markRead();
  const markOneRead = (id: string) => markRead(id);

  const hasUnread = notifications.some(n => !n.read);

  const baseStyle: React.CSSProperties = {
    minHeight:'100vh', background:'hsl(225 30% 3%)', paddingBottom:100,
    fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",
  };

  if (selectedNotif) {
    const { icon, bg, border } = getIconInfo(selectedNotif.type);
    return (
      <div style={baseStyle}>
        <style>{CSS}</style>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'52px 20px 0',marginBottom:24}}>
          <button onClick={()=>setSelectedNotif(null)} style={{width:40,height:40,borderRadius:14,
            background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',
            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none'}}>
            <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
          </button>
          <h1 style={{fontSize:18,fontWeight:700,color:'hsl(215 20% 93%)'}}>Notification</h1>
        </div>

        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          style={{padding:'0 20px'}}>
          <div style={{width:56,height:56,borderRadius:18,background:bg,
            border:`1.5px solid ${border}`,display:'flex',alignItems:'center',
            justifyContent:'center',marginBottom:16}}>
            {icon}
          </div>
          <h2 style={{fontSize:20,fontWeight:800,color:'hsl(215 18% 94%)',marginBottom:10}}>
            {selectedNotif.title}
          </h2>
          {selectedNotif.amount && selectedNotif.amount > 0 && (
            <div style={{display:'inline-flex',alignItems:'center',gap:6,
              padding:'6px 14px',borderRadius:20,marginBottom:14,
              background:bg,border:`1px solid ${border}`}}>
              <span style={{fontSize:14,fontWeight:800,color:'hsl(215 35% 72%)'}}>
                +{selectedNotif.amount.toLocaleString()} ARX-P
              </span>
            </div>
          )}
          <p style={{fontSize:14,color:'hsl(215 18% 65%)',lineHeight:1.6,marginBottom:20}}>
            {selectedNotif.message}
          </p>
          <p style={{fontSize:11,color:'hsl(215 14% 38%)'}}>{formatDate(selectedNotif.created_at)}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <style>{CSS}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>navigate(-1)} style={{width:40,height:40,borderRadius:14,
            background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',
            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none'}}>
            <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
          </button>
          <h1 style={{fontSize:20,fontWeight:700,color:'hsl(215 20% 93%)'}}>Notifications</h1>
        </div>
        {hasUnread && (
          <button onClick={markAllRead}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:12,
              background:'hsl(215 35% 62%/0.1)',border:'1px solid hsl(215 35% 62%/0.25)',
              color:'hsl(215 35% 72%)',fontSize:11,fontWeight:700,cursor:'pointer',outline:'none'}}>
            <CheckCheck size={14}/> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:60}}>
          <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid hsl(215 35% 62%/0.2)',
            borderTopColor:'hsl(215 35% 62%)',animation:'spin 1s linear infinite'}}/>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 32px'}}>
          <Bell size={40} color="hsl(215 14% 28%)" style={{marginBottom:16}}/>
          <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 45%)'}}>No notifications yet</p>
          <p style={{fontSize:12,color:'hsl(215 14% 32%)',marginTop:6}}>Rewards and updates will appear here</p>
        </div>
      ) : (
        <div style={{padding:'0 20px'}}>
          <AnimatePresence>
            {notifications.map((n, i) => {
              const { icon, bg, border } = getIconInfo(n.type);
              return (
                <motion.div key={n.id}
                  initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                  whileTap={{scale:0.98}}
                  onClick={() => { if (!n.read) markOneRead(n.id); setSelectedNotif(n); }}
                  style={{display:'flex',alignItems:'flex-start',gap:14,padding:'16px',borderRadius:18,
                    marginBottom:10,cursor:'pointer',
                    background: n.read ? 'hsl(225 26% 8%)' : 'hsl(215 35% 62%/0.06)',
                    border:`1px solid ${n.read ? 'hsl(215 22% 14%)' : 'hsl(215 35% 62%/0.2)'}`}}>
                  <div style={{width:44,height:44,borderRadius:14,background:bg,
                    border:`1px solid ${border}`,display:'flex',alignItems:'center',
                    justifyContent:'center',flexShrink:0}}>
                    {icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <p style={{fontSize:13,fontWeight:700,color:'hsl(215 20% 90%)',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.title}</p>
                      {!n.read && (
                        <div style={{width:6,height:6,borderRadius:'50%',background:'hsl(215 55% 62%)',flexShrink:0}}/>
                      )}
                    </div>
                    <p style={{fontSize:11,color:'hsl(215 14% 42%)',lineHeight:1.4,
                      overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                      {n.message}
                    </p>
                    <p style={{fontSize:10,color:'hsl(215 14% 30%)',marginTop:6}}>{formatDate(n.created_at)}</p>
                  </div>
                  {n.amount && n.amount > 0 && (
                    <span style={{fontSize:12,fontWeight:800,color:'hsl(155 45% 55%)',flexShrink:0}}>
                      +{n.amount}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
