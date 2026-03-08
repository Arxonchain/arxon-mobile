import { Rocket, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Claim = () => {
  const [claimingEnabled, setClaimingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("mining_settings")
          .select("claiming_enabled")
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setClaimingEnabled(data.claiming_enabled);
        }
      } catch (error) {
        console.error("Error fetching claiming settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('claiming-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mining_settings'
        },
        (payload) => {
          const newSettings = payload.new as any;
          setClaimingEnabled(newSettings.claiming_enabled);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Claiming Rewards</h1>

      <div className="glass-card p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col items-center justify-center text-center min-h-[280px] sm:min-h-[320px] lg:min-h-[400px] relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`glow-orb ${claimingEnabled ? 'glow-orb-green' : 'glow-orb-blue'} w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 -top-10 sm:-top-20 -left-10 sm:-left-20 animate-pulse`} />
          <div className={`glow-orb ${claimingEnabled ? 'glow-orb-green' : 'glow-orb-blue'} w-24 sm:w-36 lg:w-48 h-24 sm:h-36 lg:h-48 -bottom-5 sm:-bottom-10 -right-5 sm:-right-10 animate-pulse`} style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Animated icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full ${claimingEnabled ? 'bg-green-500/20' : 'bg-accent/20'} animate-ping`} style={{ animationDuration: '2s' }} />
            <div className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full ${claimingEnabled ? 'bg-gradient-to-br from-green-500/30 to-green-500/10 border-green-500/30' : 'bg-gradient-to-br from-accent/30 to-accent/10 border-accent/30'} border flex items-center justify-center`}>
              {claimingEnabled ? (
                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-green-500 animate-bounce" style={{ animationDuration: '2s' }} />
              ) : (
                <Rocket className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-accent animate-bounce" style={{ animationDuration: '2s' }} />
              )}
            </div>
          </div>

          {/* Animated text */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <Sparkles className={`h-4 w-4 lg:h-5 lg:w-5 ${claimingEnabled ? 'text-green-500' : 'text-accent'} animate-pulse`} />
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground animate-fade-in">
                {claimingEnabled ? 'Claiming Now Available!' : 'Claiming Coming Soon'}
              </h2>
              <Sparkles className={`h-4 w-4 lg:h-5 lg:w-5 ${claimingEnabled ? 'text-green-500' : 'text-accent'} animate-pulse`} style={{ animationDelay: '0.5s' }} />
            </div>

            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xs sm:max-w-sm lg:max-w-md animate-fade-in px-2" style={{ animationDelay: '0.2s' }}>
              {claimingEnabled ? (
                <>Convert your <span className="text-green-500 font-semibold">ARX-P</span> to <span className="text-green-500 font-semibold">$ARX tokens</span> now!</>
              ) : (
                <>Reward claiming will be available once the <span className="text-accent font-semibold">ARXON mainnet</span> goes live.</>
              )}
            </p>
          </div>

          {/* Status indicator */}
          <div className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full ${claimingEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary/50 border-border/50'} border animate-fade-in`} style={{ animationDelay: '0.4s' }}>
            {claimingEnabled ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs sm:text-sm lg:text-base text-green-500">Claiming is active</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-xs sm:text-sm lg:text-base text-muted-foreground">Mainnet launch in progress...</span>
              </>
            )}
          </div>

          {/* Decorative dots */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 lg:pt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${claimingEnabled ? 'bg-green-500/60' : 'bg-accent/60'} animate-pulse`}
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Claim;
