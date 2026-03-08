 import { useState, useEffect, useRef } from 'react';
 import { motion } from 'framer-motion';
 import { Trophy, Target, Zap, TrendingUp } from 'lucide-react';
 
 interface ArenaStatsBannerProps {
   totalChallenges: number;
   totalEarned: number;
   alphaEarned: number;
   omegaEarned: number;
 }
 
 // Animated counter component
 const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
   const [displayValue, setDisplayValue] = useState(0);
   const startTimeRef = useRef<number | null>(null);
   const animationRef = useRef<number | null>(null);
 
   useEffect(() => {
     const animate = (currentTime: number) => {
       if (!startTimeRef.current) startTimeRef.current = currentTime;
       const elapsed = currentTime - startTimeRef.current;
       const progress = Math.min(elapsed / duration, 1);
       
       // Easing function for smooth animation
       const easeOutQuart = 1 - Math.pow(1 - progress, 4);
       const currentValue = Math.floor(easeOutQuart * value);
       
       setDisplayValue(currentValue);
       
       if (progress < 1) {
         animationRef.current = requestAnimationFrame(animate);
       }
     };
 
     startTimeRef.current = null;
     animationRef.current = requestAnimationFrame(animate);
 
     return () => {
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
     };
   }, [value, duration]);
 
   const formatNumber = (num: number) => {
     if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
     if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
     return num.toLocaleString();
   };
 
   return <span>{formatNumber(displayValue)}</span>;
 };
 
 const ArenaStatsBanner = ({
   totalChallenges,
   totalEarned,
   alphaEarned,
   omegaEarned,
 }: ArenaStatsBannerProps) => {
   const [isVisible, setIsVisible] = useState(false);
   const bannerRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     const observer = new IntersectionObserver(
       ([entry]) => {
         if (entry.isIntersecting) {
           setIsVisible(true);
         }
       },
       { threshold: 0.3 }
     );
 
     if (bannerRef.current) {
       observer.observe(bannerRef.current);
     }
 
     return () => observer.disconnect();
   }, []);
 
   const stats = [
     {
       icon: Target,
       value: totalChallenges,
       label: 'Challenges',
       color: 'text-primary',
     },
     {
       icon: TrendingUp,
       value: totalEarned,
       label: 'Total Staked',
       color: 'text-primary',
     },
     {
       icon: Zap,
       value: alphaEarned,
       label: 'Alpha Pool',
       color: 'text-primary',
     },
     {
       icon: Trophy,
       value: omegaEarned,
       label: 'Omega Pool',
       color: 'text-primary',
     },
   ];
 
   return (
     <motion.div
       ref={bannerRef}
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="relative overflow-hidden mx-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/10"
     >
       {/* Animated glow effect */}
       <motion.div
         className="absolute inset-0 opacity-30"
         style={{
           background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)',
         }}
         animate={{ x: ['-100%', '100%'] }}
         transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
       />
 
       <div className="relative z-10 py-3 px-2">
         <div className="grid grid-cols-4 gap-1">
           {stats.map((stat, index) => (
             <motion.div
               key={stat.label}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.1 }}
               className="text-center"
             >
               <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
               <p className="text-sm md:text-lg font-black text-foreground">
                 {isVisible ? <AnimatedCounter value={stat.value} /> : '0'}
               </p>
               <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wide">
                 {stat.label}
               </p>
             </motion.div>
           ))}
         </div>
       </div>
     </motion.div>
   );
 };
 
 export default ArenaStatsBanner;