import { motion } from 'framer-motion';
import { Wallet, Clock, Pickaxe, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AnimatedBackground from '@/components/layout/AnimatedBackground';

const WalletPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A1F44] flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 text-center p-8 glass-card border border-primary/20 max-w-md mx-4">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
        >
          <Wallet className="w-10 h-10 text-primary" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-accent font-medium">Coming Soon</span>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-3">Wallet Connect</h1>
          
          <p className="text-muted-foreground mb-6">
            Wallet connection will be available soon. In the meantime, keep mining to earn ARX tokens!
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/mining')}
              className="w-full btn-mining"
            >
              <Pickaxe className="w-4 h-4 mr-2" />
              Continue Mining
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WalletPage;
