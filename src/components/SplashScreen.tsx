import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
  isAppReady: boolean;
}

const SplashScreen = ({ onFinish, isAppReady }: SplashScreenProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!isAppReady) return;
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 600);
    }, 800);
    return () => clearTimeout(timer);
  }, [isAppReady, onFinish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
        >
          {/* Glow background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl" />
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Logo */}
            <motion.img
              src="/favicon.png"
              alt="Arxon"
              className="w-28 h-28 rounded-2xl"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(59,130,246,0.3)',
                  '0 0 60px rgba(59,130,246,0.6)',
                  '0 0 20px rgba(59,130,246,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-3xl font-bold text-white tracking-widest uppercase">
                ARXON
              </h1>
              <p className="text-blue-400 text-sm tracking-[0.3em] uppercase mt-1">
                Mining Hub
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: isAppReady ? '100%' : '70%' }}
                transition={{ duration: isAppReady ? 0.3 : 1.5, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-300 rounded-full"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
