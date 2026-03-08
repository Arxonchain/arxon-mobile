 import { motion } from 'framer-motion';
 
 interface RollingDiceProps {
   isRolling: boolean;
   size?: number;
 }
 
 const RollingDice = ({ isRolling, size = 200 }: RollingDiceProps) => {
   return (
     <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
       <motion.div
         className="relative"
         style={{ 
           width: size, 
           height: size,
           transformStyle: 'preserve-3d',
           perspective: '1000px'
         }}
         animate={isRolling ? {
           rotateX: [0, 360],
           rotateY: [0, 360],
           rotateZ: [0, 180],
         } : {
           rotateX: 0,
           rotateY: 0,
           rotateZ: 0,
         }}
         transition={isRolling ? {
           duration: 4,
           repeat: Infinity,
           ease: 'linear',
         } : {
           duration: 0.5,
           ease: 'easeOut',
         }}
       >
         {/* 3D Dice Cube */}
         <div 
           className="relative w-full h-full"
           style={{ 
             transformStyle: 'preserve-3d',
             transform: 'rotateX(-20deg) rotateY(30deg)',
           }}
         >
           {/* Front face */}
           <div 
             className="absolute inset-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10 backdrop-blur-sm flex items-center justify-center"
             style={{ transform: `translateZ(${size/2}px)` }}
           >
             <div className="grid grid-cols-2 gap-3 p-4">
               <div className="w-4 h-4 rounded-full bg-accent/60" />
               <div className="w-4 h-4 rounded-full bg-accent/60" />
               <div className="w-4 h-4 rounded-full bg-accent/60" />
               <div className="w-4 h-4 rounded-full bg-accent/60" />
             </div>
           </div>
           
           {/* Back face */}
           <div 
             className="absolute inset-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/20 to-primary/10 backdrop-blur-sm flex items-center justify-center"
             style={{ transform: `translateZ(-${size/2}px) rotateY(180deg)` }}
           >
             <div className="grid grid-cols-3 gap-2 p-4">
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
             </div>
           </div>
           
           {/* Top face */}
           <div 
             className="absolute inset-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/20 backdrop-blur-sm flex items-center justify-center"
             style={{ transform: `rotateX(90deg) translateZ(${size/2}px)` }}
           >
             <div className="w-5 h-5 rounded-full bg-accent/70" />
           </div>
           
           {/* Bottom face */}
           <div 
             className="absolute inset-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/15 to-primary/20 backdrop-blur-sm flex items-center justify-center"
             style={{ transform: `rotateX(-90deg) translateZ(${size/2}px)` }}
           >
             <div className="grid grid-cols-2 gap-2 p-4">
               <div className="w-3 h-3 rounded-full bg-primary/60 col-span-2 mx-auto" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60" />
               <div className="w-3 h-3 rounded-full bg-primary/60 col-span-2 mx-auto" />
             </div>
           </div>
           
           {/* Left face */}
           <div 
             className="absolute inset-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/15 backdrop-blur-sm flex items-center justify-center"
             style={{ transform: `rotateY(-90deg) translateZ(${size/2}px)` }}
           >
             <div className="flex flex-col gap-3">
               <div className="w-4 h-4 rounded-full bg-accent/60" />
               <div className="w-4 h-4 rounded-full bg-accent/60" />
             </div>
           </div>
           
           {/* Right face */}
           <div 
             className="absolute inset-0 rounded-2xl border border-primary/30 bg-gradient-to-br from-accent/20 to-primary/15 backdrop-blur-sm flex items-center justify-center"
             style={{ transform: `rotateY(90deg) translateZ(${size/2}px)` }}
           >
             <div className="flex flex-col gap-3">
               <div className="w-4 h-4 rounded-full bg-primary/60" />
               <div className="w-4 h-4 rounded-full bg-primary/60" />
               <div className="w-4 h-4 rounded-full bg-primary/60" />
             </div>
           </div>
         </div>
       </motion.div>
       
       {/* Glow effect under the dice */}
       <motion.div
         className="absolute rounded-full bg-accent/20 blur-3xl"
         style={{ width: size * 1.5, height: size * 0.5 }}
         animate={isRolling ? {
           scale: [1, 1.2, 1],
           opacity: [0.3, 0.5, 0.3],
         } : {
           scale: 1,
           opacity: 0.2,
         }}
         transition={isRolling ? {
           duration: 2,
           repeat: Infinity,
           ease: 'easeInOut',
         } : {
           duration: 0.5,
         }}
       />
     </div>
   );
 };
 
 export default RollingDice;