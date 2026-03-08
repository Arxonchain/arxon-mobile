import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, Users, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ClubSelectionProps {
  onClubSelected: (club: 'alpha' | 'omega') => void;
  isSelecting?: boolean;
}

const ClubSelection = ({ onClubSelected, isSelecting = false }: ClubSelectionProps) => {
  const [selectedClub, setSelectedClub] = useState<'alpha' | 'omega' | null>(null);
  const [clubCounts, setClubCounts] = useState({ alpha: 0, omega: 0 });
  const [suggestedClub, setSuggestedClub] = useState<'alpha' | 'omega'>('alpha');

  useEffect(() => {
    const fetchClubCounts = async () => {
      const { data: alphaCount } = await supabase
        .from('arena_members')
        .select('id', { count: 'exact', head: true })
        .eq('club', 'alpha');

      const { data: omegaCount } = await supabase
        .from('arena_members')
        .select('id', { count: 'exact', head: true })
        .eq('club', 'omega');

      const alpha = alphaCount ? (alphaCount as any).length || 0 : 0;
      const omega = omegaCount ? (omegaCount as any).length || 0 : 0;

      setClubCounts({ alpha, omega });
      // Suggest the club with fewer members for balance
      setSuggestedClub(alpha <= omega ? 'alpha' : 'omega');
    };

    fetchClubCounts();
  }, []);

  const handleSelect = (club: 'alpha' | 'omega') => {
    setSelectedClub(club);
  };

  const handleConfirm = () => {
    if (selectedClub) {
      onClubSelected(selectedClub);
    }
  };

  const clubs = [
    {
      id: 'alpha' as const,
      name: 'ALPHA',
      tagline: 'The Pioneers',
      description: 'First to conquer, last to fall. Alpha members lead the charge.',
      icon: Crown,
      gradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
      borderColor: 'border-amber-500/50',
      textColor: 'text-amber-500',
      glowColor: 'shadow-amber-500/30',
      bgAccent: 'bg-amber-500/10',
    },
    {
      id: 'omega' as const,
      name: 'OMEGA',
      tagline: 'The Endgame',
      description: 'The final word in every battle. Omega members finish what others start.',
      icon: Shield,
      gradient: 'from-primary/20 via-primary/10 to-transparent',
      borderColor: 'border-primary/50',
      textColor: 'text-primary',
      glowColor: 'shadow-primary/30',
      bgAccent: 'bg-primary/10',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-6 px-4">
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4"
        >
          <Users className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground">Choose Your Club</h2>
        <p className="text-muted-foreground max-w-md">
          Join a faction and battle for supremacy. This choice is permanent and defines your arena journey.
        </p>
      </div>

      {/* Suggested Club Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30"
      >
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm text-accent">
          Suggested for balance: <span className="font-bold">{suggestedClub.toUpperCase()}</span>
        </span>
      </motion.div>

      {/* Club Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {clubs.map((club, index) => (
          <motion.div
            key={club.id}
            initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(club.id)}
            className={`relative cursor-pointer group transition-all duration-300 ${
              selectedClub === club.id ? 'scale-105' : 'hover:scale-102'
            }`}
          >
            {/* Selection indicator */}
            {selectedClub === club.id && (
              <motion.div
                layoutId="selection"
                className={`absolute inset-0 rounded-2xl ${club.borderColor} border-2 shadow-lg ${club.glowColor}`}
                initial={false}
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}

            <div
              className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                selectedClub === club.id
                  ? `${club.borderColor} ${club.bgAccent}`
                  : 'border-border/50 bg-card/80 hover:border-border'
              }`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${club.gradient} opacity-50`} />

              <div className="relative z-10 space-y-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${club.bgAccent} flex items-center justify-center`}>
                  <club.icon className={`w-7 h-7 ${club.textColor}`} />
                </div>

                {/* Title */}
                <div>
                  <h3 className={`text-2xl font-black ${club.textColor}`}>{club.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{club.tagline}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {club.description}
                </p>

                {/* Member count */}
                <div className="flex items-center gap-2 pt-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {clubCounts[club.id].toLocaleString()} members
                  </span>
                </div>

                {/* Suggested badge */}
                {suggestedClub === club.id && (
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${club.bgAccent} ${club.textColor} text-xs font-medium`}>
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Confirm Button */}
      <AnimatePresence>
        {selectedClub && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleConfirm}
            disabled={isSelecting}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSelecting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
                Joining...
              </>
            ) : (
              <>
                Join {selectedClub.toUpperCase()}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Warning */}
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        ⚠️ Your club choice is permanent and cannot be changed. Choose wisely!
      </p>
    </div>
  );
};

export default ClubSelection;
