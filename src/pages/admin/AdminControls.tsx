import { useState, useEffect, forwardRef } from "react";
import { Power, Megaphone, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";


import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminControls = forwardRef<HTMLDivElement>((_, ref) => {
  const [settings, setSettings] = useState({
    publicMiningEnabled: true,
    claimingEnabled: false,
    arenaPublicAccess: false,
  });
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("mining_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          publicMiningEnabled: data.public_mining_enabled,
          claimingEnabled: data.claiming_enabled,
          arenaPublicAccess: (data as any).arena_public_access ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const columnMap: Record<string, string> = {
        publicMiningEnabled: "public_mining_enabled",
        claimingEnabled: "claiming_enabled",
        arenaPublicAccess: "arena_public_access",
      };

      // First get the settings row ID
      const { data: existingSettings } = await supabase
        .from("mining_settings")
        .select("id")
        .limit(1)
        .single();

      if (!existingSettings) {
        throw new Error("No settings found");
      }

      const { error } = await supabase
        .from("mining_settings")
        .update({ 
          [columnMap[key]]: value, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", existingSettings.id);

      if (error) throw error;

      // If disabling public mining, stop all active mining sessions
      if (key === "publicMiningEnabled" && value === false) {
        const { error: stopError } = await supabase
          .from("mining_sessions")
          .update({ 
            is_active: false, 
            ended_at: new Date().toISOString() 
          })
          .eq("is_active", true);

        if (stopError) {
          console.error("Error stopping active sessions:", stopError);
        } else {
          toast({
            title: "All Mining Sessions Stopped",
            description: "All active mining sessions have been terminated.",
          });
        }
      }

      setSettings((prev) => ({ ...prev, [key]: value }));
      
      const friendlyNames: Record<string, string> = {
        publicMiningEnabled: "Public Mining",
        claimingEnabled: "$ARX Token Claiming",
        arenaPublicAccess: "Arena Public Access",
      };
      
      toast({
        title: "Setting Updated",
        description: `${friendlyNames[key] || key} has been ${typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : `set to ${value}`}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;

    try {
      const { error } = await supabase.from("announcements").insert({
        title: "Network Broadcast",
        message: broadcastMessage,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Message Broadcasted",
        description: "Your message has been sent to all miners.",
      });
      setBroadcastMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to broadcast message",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Mining Controls</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage ARX-P mining settings and $ARX token controls</p>
      </div>

      {/* Info Banner */}
      <div className="glass-card p-3 md:p-4 border-primary/30 bg-primary/5">
        <p className="text-xs md:text-sm">
          <span className="font-medium text-foreground">Current Rate:</span> +10 ARX-P/hour | 
          <span className="font-medium text-foreground ml-1 md:ml-2">Max:</span> 8 hours
          <span className="hidden sm:inline"> | <span className="font-medium text-foreground ml-2">Token:</span> ARX-P → $ARX at TGE</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Toggle Controls */}
        <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6">
          <h3 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
            <Power className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Network Toggles
          </h3>

          <div className="space-y-3 md:space-y-4">
            {/* Public Mining */}
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base text-foreground">Public Mining</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">Enable or disable public mining</p>
              </div>
              <Switch
                checked={settings.publicMiningEnabled}
                onCheckedChange={(checked) => updateSetting("publicMiningEnabled", checked)}
              />
            </div>

            {/* Claiming */}
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm md:text-base text-foreground">$ARX Token Claiming</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">ARX-P to $ARX conversion</p>
              </div>
              <Switch
                checked={settings.claimingEnabled}
                onCheckedChange={(checked) => updateSetting("claimingEnabled", checked)}
              />
            </div>

            {/* Arena Public Access */}
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-lg gap-3">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Swords className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base text-foreground">Arena Public Access</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Public access to the Arena</p>
                </div>
              </div>
              <Switch
                checked={settings.arenaPublicAccess}
                onCheckedChange={(checked) => updateSetting("arenaPublicAccess", checked)}
              />
            </div>
          </div>
        </div>

        {/* Broadcast Message */}
        <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6 lg:col-span-2">
          <h3 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Broadcast to All Miners
          </h3>

          <div className="space-y-3 md:space-y-4">
            <Textarea
              placeholder="Enter your message to broadcast to all active miners..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="bg-muted/50 min-h-[100px] md:min-h-[120px] text-sm"
            />
            <div className="flex justify-end">
              <Button onClick={handleBroadcast} disabled={!broadcastMessage.trim()} size="sm">
                <Megaphone className="h-4 w-4 mr-2" />
                Send Broadcast
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AdminControls.displayName = "AdminControls";

export default AdminControls;
