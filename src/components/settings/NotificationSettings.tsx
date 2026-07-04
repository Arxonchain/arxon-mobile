import { useState, useCallback } from "react";
import { Bell, Zap, Gift, Trophy, AlertCircle, Save, Loader2, BellOff, Settings, RefreshCw, Swords } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications, NotificationPreferences } from "@/hooks/usePushNotifications";

const NotificationSettings = () => {
  const { toast } = useToast();
  const {
    permission,
    requestPermission,
    reRegisterToken,
    openNotificationSettings,
    isSupported,
    preferences,
    updatePreferences,
    isNative,
  } = usePushNotifications();

  const [checking, setChecking] = useState(false);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences[key] && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Notifications Blocked",
          description: isNative
            ? "Go to Settings → Apps → Arxon → Notifications and enable them, then tap Re-check."
            : "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
        return;
      }
    }
    updatePreferences({ ...preferences, [key]: !preferences[key] });
    toast({ title: "Saved", description: "Notification preference updated." });
  };

  const handleRecheck = useCallback(async () => {
    setChecking(true);
    await reRegisterToken();
    setTimeout(() => {
      setChecking(false);
      toast({
        title: "Re-checked!",
        description: "If you enabled notifications in Settings, alerts should work now.",
      });
    }, 1500);
  }, [reRegisterToken, toast]);

  const notificationOptions: {
    key: keyof NotificationPreferences;
    icon: typeof Bell;
    title: string;
    description: string;
  }[] = [
    { key: "miningAlerts",        icon: Zap,         title: "Mining Alerts",        description: "10 minutes before your mining session ends" },
    { key: "claimNotifications",  icon: Gift,        title: "Claim Reminders",      description: "When your 8-hour session is complete and ready to claim" },
    { key: "arenaLive",           icon: Swords,      title: "Arena Live Battles",   description: "When a new prediction battle goes live" },
    { key: "arenaResults",        icon: Trophy,      title: "Arena Results",        description: "When you win or lose an arena battle" },
    { key: "rewardUpdates",       icon: Gift,        title: "Reward Updates",       description: "When you earn significant ARX-P rewards" },
    { key: "adminAnnouncements",  icon: AlertCircle, title: "Announcements",        description: "Important updates from the Arxon team" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          Push Notifications
        </h3>
        <p className="text-xs text-muted-foreground">
          Choose which alerts you receive on this device
        </p>
      </div>

      {!isSupported && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
          <BellOff className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">Push notifications are not supported on this device.</p>
        </div>
      )}

      {isSupported && permission === 'denied' && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-3">
          <div className="flex items-start gap-2">
            <BellOff className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              {isNative
                ? "Notifications are blocked. Enable them in your phone Settings, then tap Re-check."
                : "Notifications are blocked. Enable them in your browser settings."}
            </p>
          </div>
          {isNative && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openNotificationSettings}
                className="text-xs flex items-center gap-1 border-destructive/50 text-destructive hover:bg-destructive/10">
                <Settings className="h-3 w-3" />
                Open Settings
              </Button>
              <Button size="sm" variant="outline" onClick={handleRecheck} disabled={checking}
                className="text-xs flex items-center gap-1">
                {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Re-check
              </Button>
            </div>
          )}
        </div>
      )}

      {isSupported && permission === 'default' && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-muted-foreground mb-2">
            Enable notifications to receive real-time alerts about mining, arena, and rewards.
          </p>
          <Button size="sm" variant="outline" onClick={requestPermission} className="text-xs">
            Enable Notifications
          </Button>
        </div>
      )}

      {isSupported && permission === 'granted' && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <Bell className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-500">Notifications enabled. Toggle individual alerts below.</p>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {notificationOptions.map((option) => (
          <div key={option.key}
            className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/20 text-accent shrink-0">
                <option.icon className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor={option.key} className="text-sm font-medium text-foreground cursor-pointer">
                  {option.title}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              </div>
            </div>
            <Switch
              id={option.key}
              checked={preferences[option.key]}
              onCheckedChange={() => handleToggle(option.key)}
              className="shrink-0"
              disabled={!isSupported || permission === 'denied'}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettings;
