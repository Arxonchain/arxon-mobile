import { useState, useEffect } from 'react';
import { X, Wrench, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Professional maintenance notification banner.
 * Non-intrusive, dismissible, and doesn't block any site functionality.
 */
const MaintenanceBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed banner in this session
    const dismissed = sessionStorage.getItem('arxon:maintenance-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    } else {
      // Show banner after a short delay for smooth UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('arxon:maintenance-banner-dismissed', 'true');
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="glass-card border border-primary/30 bg-background/95 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-sm">
                      🚀 System Update In Progress
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium">
                      Live
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We're making improvements to enhance your experience. Mining and all activities continue uninterrupted. 
                    If you notice any temporary display quirks, don't worry —{' '}
                    <span className="text-foreground font-medium">your points are safe</span> and will sync perfectly once complete.
                  </p>

                  {/* Reassurance badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Mining Active</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Points Protected</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>No Data Loss</span>
                    </div>
                  </div>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress indicator */}
              <div className="h-1 bg-muted/30">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MaintenanceBanner;
