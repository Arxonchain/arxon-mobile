import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, Zap, Trophy, MessageSquare, TrendingUp, Gift } from 'lucide-react';
import { useInAppNotifications, AppNotification } from '@/hooks/useInAppNotifications';

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric' });
}

function typeIcon(type: string) {
  if (type.includes('mining'))    return { icon: Zap,          col: 'hsl(38 55% 52%)' };
  if (type.includes('arena'))     return { icon: Trophy,       col: 'hsl(255 50% 65%)' };
  if (type.includes('chat'))      return { icon: MessageSquare,col: 'hsl(155 45% 50%)' };
  if (type.includes('nexus'))     return { icon: TrendingUp,   col: 'hsl(155 45% 50%)' };
  if (type.includes('reward'))    return { icon: Gift,         col: 'hsl(38 55% 52%)' };
  return { icon: Bell, col: 'hsl(215 35% 62%)' };
}

export default function InAppNotificationBell() {
  const { notifications, unread, markRead, reload } = useInAppNotifications();
  const [open, setOpen] = useState(false);

  const openDrawer = () => { setOpen(true); reload(); };
  const closeDrawer = () => setOpen(false);
  const readAll = () => markRead();

  return (
    <>
      {/* Bell button */}
      <button onClick={openDrawer}
        style={{position:'relative',width:40,height:40,borderRadius:14,
          background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',
          display:'flex',alignItems:'center',justifyContent:'center',
          cursor:'pointer',outline:'none'}}>
        <Bell size={17} color="hsl(215 25% 52%)"/>
        {unread > 0 && (
          <div style={{position:'absolute',top:7,right:7,width:8,height:8,borderRadius:'50%',
            background:'hsl(0 60% 56%)',border:'2px solid hsl(225 30% 3%)',
            boxShadow:'0 0 6px hsl(0 60% 56%/0.5)'}}>
            {unread > 9 && (
              <span style={{position:'absolute',top:-14,right:-6,fontSize:9,fontWeight:700,
                color:'white',background:'hsl(0 60% 50%)',borderRadius:6,padding:'1px 4px'}}>
                {unread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={closeDrawer}
              style={{position:'fixed',inset:0,zIndex:900,background:'rgba(0,0,0,0.5)'}}/>

            <motion.div
              initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:340,damping:36}}
              style={{position:'fixed',left:0,right:0,bottom:0,zIndex:901,
                background:'hsl(225 28% 6%)',borderRadius:'24px 24px 0 0',
                border:'1px solid hsl(215 22% 14%)',
                maxHeight:'80vh',display:'flex',flexDirection:'column',
                fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

              {/* Handle */}
              <div style={{display:'flex',justifyContent:'center',paddingTop:10,paddingBottom:4}}>
                <div style={{width:36,height:4,borderRadius:2,background:'hsl(215 22% 20%)'}}/>
              </div>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'8px 20px 12px'}}>
                <div>
                  <h2 style={{fontSize:17,fontWeight:700,color:'hsl(215 20% 93%)'}}>Notifications</h2>
                  {unread > 0 && (
                    <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>
                      {unread} unread
                    </p>
                  )}
                </div>
                <div style={{display:'flex',gap:8}}>
                  {unread > 0 && (
                    <button onClick={readAll}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
                        borderRadius:12,background:'hsl(215 25% 12%)',
                        border:'1px solid hsl(215 22% 18%)',cursor:'pointer',outline:'none'}}>
                      <CheckCheck size={13} color="hsl(215 35% 62%)"/>
                      <span style={{fontSize:11,fontWeight:600,color:'hsl(215 35% 62%)'}}>
                        Mark all read
                      </span>
                    </button>
                  )}
                  <button onClick={closeDrawer}
                    style={{width:34,height:34,borderRadius:11,background:'hsl(215 25% 12%)',
                      border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',
                      justifyContent:'center',cursor:'pointer',outline:'none'}}>
                    <X size={15} color="hsl(215 18% 45%)"/>
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{overflowY:'auto',flex:1,padding:'0 16px 24px'}}>
                {notifications.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px 0'}}>
                    <Bell size={40} color="hsl(215 14% 25%)" style={{margin:'0 auto 12px'}}/>
                    <p style={{fontSize:15,fontWeight:700,color:'hsl(215 14% 38%)',marginBottom:6}}>
                      No notifications yet
                    </p>
                    <p style={{fontSize:12,color:'hsl(215 14% 28%)'}}>
                      You'll get notified about mining, arena battles, and more
                    </p>
                  </div>
                ) : notifications.map(n => {
                  const { icon: Icon, col } = typeIcon(n.type);
                  return (
                    <motion.div key={n.id}
                      initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                      onClick={() => markRead(n.id)}
                      style={{display:'flex',alignItems:'flex-start',gap:12,
                        padding:'13px 14px',borderRadius:18,marginBottom:8,cursor:'pointer',
                        background: n.read ? 'hsl(225 22% 7%)' : 'hsl(215 26% 10%)',
                        border:`1px solid ${n.read ? 'hsl(215 20% 12%)' : `${col}22`}`}}>
                      <div style={{width:40,height:40,borderRadius:13,flexShrink:0,
                        background:`${col}14`,border:`1px solid ${col}28`,
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Icon size={17} color={col}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                          <p style={{fontSize:13,fontWeight:n.read?600:700,
                            color: n.read ? 'hsl(215 18% 70%)' : 'hsl(215 18% 90%)'}}>
                            {n.title}
                          </p>
                          <span style={{fontSize:9,color:'hsl(215 14% 32%)',flexShrink:0,marginLeft:8}}>
                            {relTime(n.created_at)}
                          </span>
                        </div>
                        <p style={{fontSize:11,color:'hsl(215 14% 45%)',lineHeight:1.45}}>
                          {n.message}
                        </p>
                        {n.amount !== 0 && n.amount && (
                          <p style={{fontSize:11,fontWeight:700,color:col,marginTop:4}}>
                            {n.amount > 0 ? '+' : ''}{n.amount.toLocaleString()} ARX-P
                          </p>
                        )}
                      </div>
                      {!n.read && (
                        <div style={{width:8,height:8,borderRadius:'50%',background:col,
                          flexShrink:0,marginTop:4,boxShadow:`0 0 6px ${col}/0.5`}}/>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
