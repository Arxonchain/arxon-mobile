 import { motion } from 'framer-motion';
 import { ReactNode } from 'react';
 
 interface ScrollRevealProps {
   children: ReactNode;
   delay?: number;
   direction?: 'up' | 'down' | 'left' | 'right';
   className?: string;
 }
 
 const ScrollReveal = ({ 
   children, 
   delay = 0, 
   direction = 'up',
   className = '' 
 }: ScrollRevealProps) => {
   const directionOffset = {
     up: { y: 30, x: 0 },
     down: { y: -30, x: 0 },
     left: { y: 0, x: 30 },
     right: { y: 0, x: -30 },
   }[direction];
 
   return (
     <motion.div
       className={className}
       initial={{ 
         opacity: 0, 
         ...directionOffset 
       }}
       whileInView={{ 
         opacity: 1, 
         y: 0, 
         x: 0 
       }}
       viewport={{ once: true, margin: '-50px' }}
       transition={{ 
         duration: 0.6, 
         delay,
         ease: [0.25, 0.1, 0.25, 1] 
       }}
     >
       {children}
     </motion.div>
   );
 };
 
 export default ScrollReveal;