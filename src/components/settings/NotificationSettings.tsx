import { useState, useEffect, useCallback } from "react";
import { Bell, Zap, Gift, Trophy, AlertCircle, Save, Loader2, BellOff, Settings, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";

interface NotificationPreferences {
  miningAlerts: boolean;
  claimNotifications: boolean;
  rewardUpdates: boolean;
  leaderboardChanges: boolean;
  systemAnnouncements: boolean;
}

const STORAGE_KEY = "arxon_notification_preferences";

const NotificationSettings = () => {
  const { toast } = useToast();
  const {
    permission,
    requestPermission,
    reRegisterToken,
    openNotificationSettings,
    isSupported,
    preferences: hookPrefs,
    updatePreferences,
    isNative,
  } = usePushNotifications();

  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    miningAlerts: true,
    claimNotifications: true,
    rewardUpdates: true,
    leaderboardChanges: false,
    systemAnnouncements: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setPreferences(JSON.parse(stored)); } catch {}
    }
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences[key] && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Notifications Blocked",
          description: isNative
            ? "Go to Settings → Apps → Arxon → Notifications and enable them, then tap 'Re-check' here."
            : "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
        return;
      }
    }
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      updatePreferences(preferences as any);
      toast({ title: "Preferences Saved", description: "Notification settings updated." });
      setSaving(false);
    }, 500);
  };

  // After user enables in Android Settings and comes back to app
  const handleRecheck = useCallback(async () => {
    setChecking(true);
    await reRegisterToken();
    setTimeout(() => {
      setChecking(false);
      toast({ title: "Re-checked!", description: "If you enabled notifications in Settings, you should start receiving them." });
    }, 2000);
  }, [reRegisterToken, toast]);

  const notificationOptions = [
    { key: "miningAlerts" as const,        icon: Zap,          title: "Mining Alerts",         description: "Get notified 10 minutes before your mining session ends" },
    { key: "claimNotifications" as const,  icon: Gift,         title: "Claim Notifications",   description: "Receive alerts when your session is complete and tokens are ready to claim" },
    { key: "rewardUpdates" as const,       icon: Trophy,       title: "Reward Updates",        description: "Notifications when you earn significant ARX-P rewards" },
    { key: "leaderboardChanges" as const,  icon: Trophy,       title: "Leaderboard Changes",   description: "Alert when your ranking changes on the leaderboard" },
    { key: "systemAnnouncements" as const, icon: AlertCircle,  title: "System Announcements",  description: "Important updates about the ARXON network" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          Push Notifications
        </h3>
        <p className="text-xs text-muted-foreground">
          Configure which notifications you want to receive
        </p>
      </div>

      {/* Not supported */}
      {!isSupported && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
          <BellOff className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">Push notifications are not supported on this device.</p>
        </div>
      )}

      {/* DENIED — native: show "Go to Settings" button */}
      {isSupported && permission === 'denied' && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-3">
          <div className="flex items-start gap-2">
            <BellOff className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              {isNative
                ? "Notifications are blocked by Android. Enable them in your phone's Settings, then tap Re-check below."
                : "Notifications are blocked. Please enable them in your browser settings."}
            </p>
          </div>
          {isNative && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={openNotificationSettings}
                className="text-xs flex items-center gap-1 border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <Settings className="h-3 w-3" />
                Open Settings
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecheck}
                disabled={checking}
                className="text-xs flex items-center gap-1"
              >
                {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Re-check
              </Button>
            </div>
          )}
        </div>
      )}

      {/* DEFAULT — not yet asked */}
      {isSupported && permission === 'default' && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-muted-foreground mb-2">
            Enable notifications to receive real-time alerts about your mining and rewards.
          </p>
          <Button size="sm" variant="outline" onClick={requestPermission} className="text-xs">
            Enable Notifications
          </Button>
        </div>
      )}

      {/* GRANTED */}
      {isSupported && permission === 'granted' && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <Bell className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-500">Notifications enabled! Toggle individual alerts below.</p>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {notificationOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border/30"
          >
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

      <Button
        onClick={handleSave}
        disabled={saving || !isSupported}
        className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Preferences
      </Button>
    </div>
  );
};

export default NotificationSettings;
