import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Eye, AlertCircle } from 'lucide-react';
import { useBiometric } from '@/hooks/useBiometric';
import arxonLogo from '@/assets/arxon-logo.jpg';

export default function BiometricLockScreen() {
  const { authenticate, checking } = useBiometric();
  const [failed, setFailed] = useState(false);

  const unlock = async () => {
    setFailed(false);
    const ok = await authenticate();
    if (!ok) setFailed(true);
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,
      background:'hsl(225 30% 2%)',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

      {/* Logo */}
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
        transition={{delay:0.1,type:'spring',stiffness:200}}>
        <div style={{width:80,height:80,borderRadius:24,overflow:'hidden',
          border:'2px solid hsl(215 35% 62%/0.3)',
          boxShadow:'0 0 40px hsl(215 55% 62%/0.15)',marginBottom:32}}>
          <img src={arxonLogo} alt="Arxon" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        </div>
      </motion.div>

      <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
        style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',marginBottom:8}}>
        Arxon
      </motion.h1>
      <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
        style={{fontSize:14,color:'hsl(215 14% 45%)',marginBottom:48}}>
        App is locked
      </motion.p>

      {/* Fingerprint button */}
      <motion.button
        whileTap={{scale:0.92}}
        onClick={unlock}
        disabled={checking}
        style={{width:88,height:88,borderRadius:28,cursor:'pointer',outline:'none',
          background: failed
            ? 'hsl(0 60% 56%/0.08)'
            : checking
              ? 'hsl(215 35% 62%/0.12)'
              : 'hsl(215 35% 62%/0.08)',
          border:`2px solid ${failed ? 'hsl(0 60% 56%/0.4)' : 'hsl(215 35% 62%/0.3)'}`,
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow: failed
            ? '0 0 24px hsl(0 60% 56%/0.2)'
            : '0 0 24px hsl(215 55% 62%/0.15)',
          transition:'all 0.3s'}}>
        {failed
          ? <AlertCircle size={40} color="hsl(0 60% 56%)"/>
          : checking
            ? <div style={{width:32,height:32,borderRadius:'50%',
                border:'3px solid hsl(215 35% 62%/0.2)',
                borderTopColor:'hsl(215 35% 62%)',
                animation:'spin 1s linear infinite'}}/>
            : <Fingerprint size={42} color="hsl(215 35% 62%)"/>}
      </motion.button>

      <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
        style={{fontSize:13,color: failed ? 'hsl(0 60% 62%)' : 'hsl(215 14% 45%)',
          marginTop:20,textAlign:'center',maxWidth:220,lineHeight:1.5}}>
        {failed
          ? 'Authentication failed. Tap to try again.'
          : checking
            ? 'Verifying…'
            : 'Tap to unlock with biometrics'}
      </motion.p>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
