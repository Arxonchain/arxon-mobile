 import { motion } from 'framer-motion';
 
 interface ResendBackgroundProps {
   variant?: 'default' | 'subtle' | 'intense';
 }
 
 const ResendBackground = ({ variant = 'default' }: ResendBackgroundProps) => {
   const intensity = {
     default: { main: 0.3, secondary: 0.2, tertiary: 0.15 },
     subtle: { main: 0.15, secondary: 0.1, tertiary: 0.08 },
     intense: { main: 0.5, secondary: 0.35, tertiary: 0.25 },
   }[variant];
 
   return (
     <div className="fixed inset-0 pointer-events-none overflow-hidden">
       {/* Main top gradient - steel blue */}
       <motion.div
         className="absolute"
         style={{
           width: '140%',
           height: '60%',
           left: '-20%',
           top: '-20%',
           background: `radial-gradient(ellipse at center, hsl(var(--primary) / ${intensity.main}) 0%, transparent 60%)`,
           filter: 'blur(60px)',
         }}
         animate={{
           scale: [1, 1.1, 1],
           opacity: [intensity.main, intensity.main * 1.3, intensity.main],
         }}
         transition={{
           duration: 8,
           repeat: Infinity,
           ease: 'easeInOut',
         }}
       />
       
       {/* Right side accent glow */}
       <motion.div
         className="absolute"
         style={{
           width: '50%',
           height: '70%',
           right: '-10%',
           top: '20%',
           background: `radial-gradient(ellipse at center, hsl(var(--accent) / ${intensity.secondary}) 0%, transparent 60%)`,
           filter: 'blur(80px)',
         }}
         animate={{
           x: [0, 30, 0],
           opacity: [intensity.secondary, intensity.secondary * 1.2, intensity.secondary],
         }}
         transition={{
           duration: 10,
           repeat: Infinity,
           ease: 'easeInOut',
         }}
       />
       
       {/* Bottom gradient wash */}
       <div 
         className="absolute bottom-0 left-0 right-0 h-1/3"
         style={{
           background: `linear-gradient(to top, hsl(var(--primary) / ${intensity.tertiary}), transparent)`,
         }}
       />
       
       {/* Floating orbs */}
       <motion.div
         className="absolute w-32 h-32 rounded-full"
         style={{
           background: `radial-gradient(circle, hsl(var(--accent) / 0.4) 0%, transparent 70%)`,
           filter: 'blur(40px)',
           left: '10%',
           top: '40%',
         }}
         animate={{
           y: [-20, 20, -20],
           x: [-10, 10, -10],
           scale: [1, 1.2, 1],
         }}
         transition={{
           duration: 6,
           repeat: Infinity,
           ease: 'easeInOut',
         }}
       />
       
       <motion.div
         className="absolute w-24 h-24 rounded-full"
         style={{
           background: `radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)`,
           filter: 'blur(30px)',
           right: '20%',
           bottom: '30%',
         }}
         animate={{
           y: [20, -20, 20],
           x: [10, -10, 10],
           scale: [1.1, 0.9, 1.1],
         }}
         transition={{
           duration: 7,
           repeat: Infinity,
           ease: 'easeInOut',
           delay: 1,
         }}
       />
       
       {/* Subtle grid pattern overlay */}
       <div 
         className="absolute inset-0 opacity-[0.02]"
         style={{
           backgroundImage: `
             linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
             linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
           `,
           backgroundSize: '60px 60px',
         }}
       />
     </div>
   );
 };
 
 export default ResendBackground;