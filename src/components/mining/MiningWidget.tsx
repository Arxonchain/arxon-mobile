import { Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

interface MiningWidgetProps {
  isMining: boolean;
  onToggleMining: () => void;
}

const MiningWidget = ({ isMining, onToggleMining }: MiningWidgetProps) => {
  const [earnings, setEarnings] = useState(890);
  const [countdown, setCountdown] = useState({ minutes: 4, seconds: 34 });
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (!isMining) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          // Reset countdown and add earnings
          setEarnings((e) => e + 10);
          return { minutes: 4, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMining]);

  const copyReferralCode = () => {
    const code = profile?.referral_code;
    if (!code) {
      toast({
        title: "Not Ready",
        description: "Your referral code is still generating",
        variant: "destructive"
      });
      return;
    }
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const displayCode = profileLoading 
    ? "Generating..." 
    : profile?.referral_code || "Generating...";

  return (
    <div className="relative flex flex-col items-center justify-center py-16">
      {/* Background Glows */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="glow-orb glow-orb-blue w-[500px] h-[500px] animate-pulse-glow" />
      </div>

      {/* Earnings Card */}
      <div className="glass-card px-16 py-8 mb-8 text-center relative z-10">
        <p className="text-muted-foreground text-lg mb-2">Earning</p>
        <h2 className="text-5xl font-bold text-foreground">{earnings}ARX</h2>
      </div>

      {/* Mining Circle */}
      <div className="mining-circle w-48 h-48 relative z-10 animate-float">
        <p className="text-muted-foreground text-sm mb-1">Next roll call</p>
        <p className="text-4xl font-bold text-foreground">
          {String(countdown.minutes).padStart(2, "0")}m {String(countdown.seconds).padStart(2, "0")}s
        </p>
        <button
          onClick={onToggleMining}
          className={isMining ? "status-connected mt-3" : "status-not-active mt-3"}
        >
          <span className={`w-2 h-2 rounded-full ${isMining ? "bg-foreground" : "bg-destructive"}`} />
          {isMining ? "Connected" : "Not Active"}
        </button>
      </div>

      {/* Copy Referral */}
      <button
        onClick={copyReferralCode}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mt-8 relative z-10"
      >
        <Copy className="h-4 w-4" />
        <span className="text-sm">{displayCode}</span>
      </button>
    </div>
  );
};

export default MiningWidget;
