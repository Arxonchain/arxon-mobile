/**
 * Notifications.tsx — FULLY REWRITTEN in mobile inline-style pattern
 * FIX BUG-10: Removed all Tailwind className web styles, proper mobile header
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Gift, Trophy, ChevronLeft, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CSS = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`;

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  amount: number | null;
  created_at: string;
  read: boolean;
}

function getIconInfo(type: string) {
  if (type === 'rumble_reward' || type === 'arena')
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
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedNotif,  setSelectedNotif]  = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('user_notifications').select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(50);
        if (!error && data) setNotifications(data);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [user]);

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    for (const id of ids) {
      try { await (supabase as any).from('user_notifications').update({ read: true }).eq('id', id); } catch {}
    }
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await (supabase as any).from('user_notifications').update({ read: true }).eq('id', id); } catch {}
  };

  const hasUnread = notifications.some(n => !n.read);

  const baseStyle: React.CSSProperties = {
    minHeight:'100vh', background:'hsl(225 30% 3%)', paddingBottom:100,
    fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selectedNotif) {
    const { icon, bg, border } = getIconInfo(selectedNotif.notification_type);
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
          <p style={{fontSize:14,color:'hsl(215 14% 50%)',lineHeight:1.7,marginBottom:12,
            whiteSpace:'pre-wrap'}}>
            {selectedNotif.message}
          </p>
          <p style={{fontSize:11,color:'hsl(215 14% 32%)'}}>
            {new Date(selectedNotif.created_at).toLocaleString()}
          </p>
        </motion.div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={baseStyle}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'52px 20px 0',marginBottom:16}}>
        <button onClick={()=>navigate(-1)} style={{width:40,height:40,borderRadius:14,
          background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Bell size={18} color="hsl(215 35% 62%)"/>
          <h1 style={{fontSize:18,fontWeight:700,color:'hsl(215 20% 93%)'}}>Notifications</h1>
        </div>
        {hasUnread ? (
          <button onClick={markAllRead} style={{display:'flex',alignItems:'center',gap:5,
            padding:'8px 12px',borderRadius:12,cursor:'pointer',outline:'none',
            background:'hsl(215 35% 62%/0.08)',border:'1px solid hsl(215 35% 62%/0.2)',
            color:'hsl(215 35% 72%)',fontSize:11,fontWeight:700}}>
            <CheckCheck size={12}/> All read
          </button>
        ) : <div style={{width:72}}/>}
      </div>

      <div style={{padding:'0 20px'}}>
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{height:72,borderRadius:18,background:'hsl(215 22% 10%)',
                border:'1px solid hsl(215 20% 14%)',
                animation:'pulse 1.5s ease-in-out infinite',opacity:1-i*0.15}}/>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <Bell size={48} color="hsl(215 18% 22%)" style={{display:'block',margin:'0 auto 12px'}}/>
            <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 40%)',marginBottom:6}}>
              No notifications yet
            </p>
            <p style={{fontSize:12,color:'hsl(215 14% 28%)'}}>
              You'll see mining rewards, tasks, and updates here
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const { icon, bg, border } = getIconInfo(notif.notification_type);
              return (
                <motion.button key={notif.id}
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                  transition={{delay:i*0.03}}
                  onClick={()=>{ if (!notif.read) markRead(notif.id); setSelectedNotif(notif); }}
                  style={{width:'100%',textAlign:'left',padding:'14px 16px',borderRadius:18,
                    marginBottom:8,cursor:'pointer',outline:'none',
                    background: notif.read ? 'hsl(225 24% 8%)' : bg,
                    border: `1.5px solid ${notif.read ? 'hsl(215 20% 13%)' : border}`,
                    display:'flex',alignItems:'flex-start',gap:12,
                    transition:'all 0.2s'}}>
                  <div style={{width:42,height:42,borderRadius:14,flexShrink:0,
                    background: notif.read ? 'hsl(215 22% 12%)' : bg,
                    border:`1px solid ${notif.read ? 'hsl(215 20% 17%)' : border}`,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:3}}>
                      <p style={{fontSize:13,fontWeight:700,
                        color: notif.read ? 'hsl(215 14% 46%)' : 'hsl(215 18% 90%)',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
                          background:'hsl(215 35% 62%)',
                          boxShadow:'0 0 6px hsl(215 35% 62%/0.6)'}}/>
                      )}
                    </div>
                    <p style={{fontSize:11,color:'hsl(215 14% 38%)',marginBottom:5,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {notif.message}
                    </p>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      {notif.amount && notif.amount > 0 ? (
                        <span style={{fontSize:11,fontWeight:700,color:'hsl(215 35% 62%)'}}>
                          +{notif.amount.toLocaleString()} ARX-P
                        </span>
                      ) : <span/>}
                      <span style={{fontSize:10,color:'hsl(215 14% 30%)'}}>
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
