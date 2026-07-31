import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, Shield, Zap, Gift, Trophy, AlertCircle, Swords, Flame, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { usePushNotifications, type NotificationPreferences } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  V2Page, V2Header, V2Tabs, V2Card, V2Button, V2ButtonGhost, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

type Tab = 'notifications' | 'security';

const NOTIF_OPTIONS: {
  key: keyof NotificationPreferences;
  icon: typeof Bell;
  title: string;
  description: string;
}[] = [
  { key: 'miningAlerts', icon: Zap, title: 'Mining Alerts', description: '10 minutes before session ends' },
  { key: 'claimNotifications', icon: Gift, title: 'Claim Reminders', description: 'When your 8-hour session is ready' },
  { key: 'arenaLive', icon: Swords, title: 'Arena Live', description: 'New prediction battles go live' },
  { key: 'arenaResults', icon: Trophy, title: 'Arena Results', description: 'Win or loss on battles you joined' },
  { key: 'rewardUpdates', icon: Gift, title: 'Reward Updates', description: 'Significant ARX-P rewards earned' },
  { key: 'wordForgeDaily', icon: Flame, title: 'Word Forge Daily', description: 'Daily challenge and streak reminders' },
  { key: 'adminAnnouncements', icon: AlertCircle, title: 'Announcements', description: 'Updates from the Arxon team' },
];

export default function SettingsV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'security' ? 'security' : 'notifications';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'security' || t === 'notifications') setTab(t);
  }, [searchParams]);

  return (
    <V2Page>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <V2Header title="Settings" subtitle="Notifications & security" onBack={() => navigate(-1)} large />

        <div style={{ padding: '0 20px' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 18 }}>
            <V2Tabs
              tabs={[
                { id: 'notifications' as Tab, label: 'Notifications' },
                { id: 'security' as Tab, label: 'Security' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </motion.div>

          {tab === 'notifications' ? <NotificationsPanel /> : <SecurityPanel />}
        </div>

        <p style={{ textAlign: 'center', padding: '24px 0 8px', color: v2.brand.muted, fontSize: 10 }}>
          ARXON · v{(import.meta as any).env?.VITE_APP_VERSION || '1.0.0'}
        </p>
      </motion.div>
    </V2Page>
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
        <V2Card accent={v2.accent.danger} padding="14px" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: v2.accent.danger, margin: 0 }}>Push notifications are not supported on this device.</p>
        </V2Card>
      )}

      {isSupported && permission === 'denied' && (
        <V2Card padding="14px" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: v2.accent.danger, marginBottom: 12, lineHeight: 1.5 }}>
            Notifications are blocked. Enable them in system settings, then re-check.
          </p>
          {isNative && (
            <div style={{ display: 'flex', gap: 8 }}>
              <V2ButtonGhost onClick={openNotificationSettings} accent={v2.brand.steel}>Open Settings</V2ButtonGhost>
              <V2ButtonGhost onClick={handleRecheck} accent={v2.brand.steel}>{checking ? 'Checking…' : 'Re-check'}</V2ButtonGhost>
            </div>
          )}
        </V2Card>
      )}

      {isSupported && permission === 'default' && (
        <V2Card padding="14px" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: v2.brand.mutedSoft, marginBottom: 10 }}>
            Enable alerts for mining, arena, and rewards.
          </p>
          <V2Button accent={v2.brand.steel} onClick={requestPermission}>Enable Notifications</V2Button>
        </V2Card>
      )}

      {NOTIF_OPTIONS.map((opt, i) => {
        const Icon = opt.icon;
        const on = preferences[opt.key];
        return (
          <motion.div key={opt.key} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
            <V2Card accent={on ? v2.accent.mining : undefined} padding="14px 16px" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: v2.radius.sm, flexShrink: 0,
                  background: `${v2.brand.steel}14`, border: `1px solid ${v2.brand.steel}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: v2.brand.steel,
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: 0 }}>{opt.title}</p>
                  <p style={{ fontSize: 10, color: v2.brand.muted, margin: '2px 0 0' }}>{opt.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(opt.key)}
                  aria-pressed={on}
                  style={{
                    width: 48, height: 28, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                    border: 'none', outline: 'none', transition: 'background 0.2s',
                    background: on ? v2.accent.mining : v2.brand.border, position: 'relative',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22,
                    borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>
            </V2Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function SecurityPanel() {
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

  return (
    <V2Card padding="16px">
      <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, marginBottom: 14 }}>Change Password</p>

      {(['newPassword', 'confirmPassword'] as const).map((field, idx) => (
        <div key={field} style={{ marginBottom: 12, position: 'relative' }}>
          <input
            type={(idx === 0 ? showPw : showConfirm) ? 'text' : 'password'}
            value={passwords[field]}
            onChange={(e) => setPasswords((p) => ({ ...p, [field]: e.target.value }))}
            placeholder={idx === 0 ? 'New password' : 'Confirm password'}
            style={{
              width: '100%', padding: '14px 44px 14px 16px', borderRadius: v2.radius.sm, boxSizing: 'border-box',
              background: v2.brand.raised, border: `1px solid ${v2.brand.border}`, outline: 'none',
              fontSize: 14, color: v2.brand.steelBright, fontFamily: v2.font,
            }}
          />
          <button
            type="button"
            onClick={() => (idx === 0 ? setShowPw : setShowConfirm)((v) => !v)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: v2.brand.mutedSoft,
            }}
          >
            {(idx === 0 ? showPw : showConfirm) ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ))}

      <V2Button accent={v2.brand.steel} fullWidth onClick={handlePasswordChange} disabled={saving}>
        {saving ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : 'Update Password'}
      </V2Button>
    </V2Card>
  );
}
