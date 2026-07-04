import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Bell, Shield, Zap, Gift, Trophy, AlertCircle, Swords,
  Eye, EyeOff, Loader2,
} from 'lucide-react';
import { usePushNotifications, type NotificationPreferences } from '@/hooks/usePushNotifications';
import { useBiometric } from '@/contexts/BiometricContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

type Tab = 'notifications' | 'security';

const NOTIF_OPTIONS: {
  key: keyof NotificationPreferences;
  icon: typeof Bell;
  title: string;
  description: string;
}[] = [
  { key: 'miningAlerts',       icon: Zap,         title: 'Mining Alerts',      description: '10 minutes before session ends' },
  { key: 'claimNotifications', icon: Gift,        title: 'Claim Reminders',    description: 'When your 8-hour session is ready' },
  { key: 'arenaLive',          icon: Swords,      title: 'Arena Live',         description: 'New prediction battles go live' },
  { key: 'arenaResults',       icon: Trophy,      title: 'Arena Results',      description: 'Win or loss on battles you joined' },
  { key: 'rewardUpdates',      icon: Gift,        title: 'Reward Updates',     description: 'Significant ARX-P rewards earned' },
  { key: 'adminAnnouncements', icon: AlertCircle, title: 'Announcements',      description: 'Updates from the Arxon team' },
];

export default function MobileSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'security' ? 'security' : 'notifications';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'security' || t === 'notifications') setTab(t);
  }, [searchParams]);

  return (
    <div style={{
      minHeight: '100vh', background: 'hsl(225 30% 3%)', paddingBottom: 100,
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '52px 20px 0', marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} className="press"
          style={{ width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 11%)',
            border: '1px solid hsl(215 22% 18%)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Settings</h1>
          <p style={{ fontSize: 10, color: 'hsl(215 14% 38%)', marginTop: 2 }}>Notifications & security</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 18 }}>
        {([
          { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
          { id: 'security' as Tab, label: 'Security', icon: Shield },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '12px 8px', borderRadius: 14, cursor: 'pointer', outline: 'none',
              border: `1px solid ${tab === id ? 'hsl(215 35% 62%/0.35)' : 'hsl(215 22% 18%)'}`,
              background: tab === id ? 'hsl(215 35% 62%/0.1)' : 'hsl(215 25% 11%)',
              color: tab === id ? 'hsl(215 35% 72%)' : 'hsl(215 14% 42%)',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {tab === 'notifications' ? <NotificationsPanel /> : <SecurityPanel />}
      </div>

      <p style={{ textAlign: 'center', padding: '24px 0 8px', color: 'hsl(215 14% 28%)', fontSize: 10 }}>
        ARXON · v{(import.meta as any).env?.VITE_APP_VERSION || '1.0.0'}
      </p>
    </div>
  );
}

function NotificationsPanel() {
  const {
    permission, requestPermission, reRegisterToken, openNotificationSettings,
    isSupported, preferences, updatePreferences, isNative,
  } = usePushNotifications();
  const [checking, setChecking] = useState(false);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences[key] && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: 'Notifications blocked',
          description: isNative
            ? 'Enable notifications in phone Settings → Apps → Arxon, then tap Re-check.'
            : 'Allow notifications in your browser settings.',
          variant: 'destructive',
        });
        return;
      }
    }
    updatePreferences({ ...preferences, [key]: !preferences[key] });
    toast({ title: 'Saved', description: 'Notification preference updated.' });
  };

  const handleRecheck = useCallback(async () => {
    setChecking(true);
    await reRegisterToken();
    setTimeout(() => {
      setChecking(false);
      toast({ title: 'Re-checked', description: 'Notification permission refreshed.' });
    }, 1200);
  }, [reRegisterToken]);

  return (
    <div>
      {!isSupported && (
        <div className="glass-card" style={{ padding: 14, borderRadius: 16, marginBottom: 14,
          border: '1px solid hsl(0 60% 56%/0.25)', background: 'hsl(0 60% 56%/0.06)' }}>
          <p style={{ fontSize: 12, color: 'hsl(0 60% 62%)' }}>Push notifications are not supported on this device.</p>
        </div>
      )}

      {isSupported && permission === 'denied' && (
        <div className="glass-card" style={{ padding: 14, borderRadius: 16, marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'hsl(0 60% 62%)', marginBottom: 12, lineHeight: 1.5 }}>
            Notifications are blocked. Enable them in system settings, then re-check.
          </p>
          {isNative && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openNotificationSettings}
                style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', background: 'hsl(215 25% 12%)', border: '1px solid hsl(215 22% 20%)',
                  color: 'hsl(215 35% 72%)' }}>
                Open Settings
              </button>
              <button onClick={handleRecheck} disabled={checking}
                style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', background: 'hsl(215 35% 62%/0.1)', border: '1px solid hsl(215 35% 62%/0.25)',
                  color: 'hsl(215 35% 72%)' }}>
                {checking ? 'Checking…' : 'Re-check'}
              </button>
            </div>
          )}
        </div>
      )}

      {isSupported && permission === 'default' && (
        <div className="glass-card" style={{ padding: 14, borderRadius: 16, marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 45%)', marginBottom: 10 }}>
            Enable alerts for mining, arena, and rewards.
          </p>
          <button onClick={requestPermission}
            style={{ padding: '10px 18px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 45%))', border: 'none', color: 'white' }}>
            Enable Notifications
          </button>
        </div>
      )}

      {NOTIF_OPTIONS.map((opt, i) => {
        const Icon = opt.icon;
        const on = preferences[opt.key];
        return (
          <motion.div key={opt.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 18, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: 'hsl(215 35% 62%/0.1)', border: '1px solid hsl(215 35% 62%/0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(215 35% 62%)' }}>
              <Icon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 20% 90%)' }}>{opt.title}</p>
              <p style={{ fontSize: 10, color: 'hsl(215 14% 40%)', marginTop: 2 }}>{opt.description}</p>
            </div>
            <button onClick={() => handleToggle(opt.key)} aria-pressed={on}
              style={{ width: 48, height: 28, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                border: 'none', outline: 'none', transition: 'background 0.2s',
                background: on ? 'hsl(155 45% 43%)' : 'hsl(215 22% 18%)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22,
                borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

function SecurityPanel() {
  const { supported, enabled, checking, enableBiometric, disableBiometric, probeSupport } = useBiometric();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) void probeSupport();
  }, [isNative, probeSupport]);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (passwords.newPassword.length < 6) {
      toast({ title: 'Too short', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: 'Mismatch', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleBiometric = async () => {
    if (enabled) {
      disableBiometric();
      toast({ title: 'Biometric lock disabled' });
      return;
    }
    const ok = await enableBiometric();
    toast(ok
      ? { title: 'Biometric lock enabled', description: 'App locks when you switch away.' }
      : { title: 'Could not enable', description: 'Biometric setup failed on this device.', variant: 'destructive' });
  };

  return (
    <div>
      {isNative && (
        <div className="glass-card" style={{ padding: '16px', borderRadius: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 20% 90%)' }}>Biometric Lock</p>
              <p style={{ fontSize: 10, color: 'hsl(215 14% 40%)', marginTop: 4 }}>
                {supported ? 'Require unlock when returning to the app' : 'Not available on this device'}
              </p>
            </div>
            <button onClick={toggleBiometric} disabled={!supported || checking}
              style={{ width: 48, height: 28, borderRadius: 14, flexShrink: 0, cursor: supported ? 'pointer' : 'default',
                border: 'none', background: enabled ? 'hsl(155 45% 43%)' : 'hsl(215 22% 18%)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 22, height: 22,
                borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '16px', borderRadius: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 20% 90%)', marginBottom: 14 }}>Change Password</p>

        {(['newPassword', 'confirmPassword'] as const).map((field, idx) => (
          <div key={field} style={{ marginBottom: 12, position: 'relative' }}>
            <input
              type={(idx === 0 ? showPw : showConfirm) ? 'text' : 'password'}
              value={passwords[field]}
              onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
              placeholder={idx === 0 ? 'New password' : 'Confirm password'}
              style={{ width: '100%', padding: '14px 44px 14px 16px', borderRadius: 14, boxSizing: 'border-box',
                background: 'hsl(215 26% 10%)', border: '1px solid hsl(215 22% 18%)', outline: 'none',
                fontSize: 14, color: 'hsl(215 20% 93%)', fontFamily: "'Creato Display',-apple-system,sans-serif" }}
            />
            <button type="button" onClick={() => (idx === 0 ? setShowPw : setShowConfirm)(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215 14% 45%)' }}>
              {(idx === 0 ? showPw : showConfirm) ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        ))}

        <button onClick={handlePasswordChange} disabled={saving}
          style={{ width: '100%', padding: '15px', borderRadius: 16, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', border: 'none', marginTop: 4,
            background: 'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 45%))', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
