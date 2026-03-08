 import { ReactNode } from 'react';
 import { motion } from 'framer-motion';
 
 interface GlowCardProps {
   children: ReactNode;
   className?: string;
   glowColor?: 'primary' | 'accent' | 'green' | 'amber';
   hover?: boolean;
 }
 
 const GlowCard = ({ 
   children, 
   className = '', 
   glowColor = 'primary',
   hover = true 
 }: GlowCardProps) => {
   const glowColors = {
     primary: 'hsl(var(--primary))',
     accent: 'hsl(var(--accent))',
     green: 'hsl(142 76% 36%)',
     amber: 'hsl(38 92% 50%)',
   };
 
   const color = glowColors[glowColor];
 
   return (
     <motion.div
       className={`relative rounded-2xl bg-card/50 backdrop-blur-xl border border-border/40 overflow-hidden ${className}`}
       whileHover={hover ? { 
         scale: 1.02,
         borderColor: `${color}40`,
       } : {}}
       transition={{ duration: 0.2 }}
     >
       {/* Glow effect on hover */}
       {hover && (
         <motion.div
           className="absolute inset-0 opacity-0 pointer-events-none"
           style={{
             background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`,
           }}
           whileHover={{ opacity: 1 }}
           transition={{ duration: 0.3 }}
         />
       )}
       
       {/* Content */}
       <div className="relative z-10">
         {children}
       </div>
       
       {/* Subtle top border highlight */}
       <div 
         className="absolute top-0 left-0 right-0 h-px opacity-50"
         style={{
           background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
         }}
       />
     </motion.div>
   );
 };
 
 export default GlowCard;