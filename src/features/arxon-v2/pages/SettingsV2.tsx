import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell, Gift, Trophy, AlertCircle, Swords, Eye, EyeOff, Zap, Trash2,
} from 'lucide-react';
import VerificationCenter from '@/components/verification/VerificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTourOptional } from '@/contexts/AppTourContext';
import { resetTourProgress } from '@/lib/tour/tourStorage';
import { usePushNotifications, type NotificationPreferences } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { supabase } from '@/integrations/supabase/client';
import { V2Page } from '../design/Kit';
import {
  Field,
  GhostBtn,
  GlassSheet,
  NeonToggle,
  pc,
  PrimaryBtn,
  ProfileHead,
  SegmentTabs,
  TokenRow,
} from '../design/ProfileChrome';
import PrivacyDataSettings from '@/components/settings/PrivacyDataSettings';

type Tab = 'notifications' | 'security' | 'verification';

const NOTIF_OPTIONS: {
  key: keyof NotificationPreferences;
  icon: typeof Bell;
  title: string;
  description: string;
}[] = [
  { key: 'miningAlerts', icon: Zap, title: 'Mining alerts', description: '10 minutes before a session ends' },
  { key: 'claimNotifications', icon: Gift, title: 'Claim reminders', description: 'When your 8-hour session is ready' },
  { key: 'arenaLive', icon: Swords, title: 'Arena live', description: 'New prediction battles go live' },
  { key: 'arenaResults', icon: Trophy, title: 'Arena results', description: 'Win or loss on battles you joined' },
  { key: 'rewardUpdates', icon: Gift, title: 'Reward updates', description: 'Significant ARX-P rewards' },
  { key: 'adminAnnouncements', icon: AlertCircle, title: 'Announcements', description: 'Updates from the Arxon team' },
];

export default function SettingsV2() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab =
    tabParam === 'security' ? 'security' : tabParam === 'verification' ? 'verification' : 'notifications';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'security' || t === 'notifications' || t === 'verification') setTab(t);
  }, [searchParams]);

  return (
    <V2Page>
      <ProfileHead
        title={tab === 'security' ? 'Security' : tab === 'verification' ? 'Verification' : 'App settings'}
        subtitle={tab === 'security' ? 'Password and account' : tab === 'verification' ? 'Email, country, age and wallet' : 'Notifications and display'}
      />
      <div style={{ padding: '0 16px 12px' }}>
        <SegmentTabs
          tabs={[
            { id: 'notifications' as Tab, label: 'Alerts' },
            { id: 'verification' as Tab, label: 'Verify' },
            { id: 'security' as Tab, label: 'Security' },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'notifications' ? <NotificationsPanel /> : tab === 'verification' ? <VerificationPanel /> : <SecurityPanel />}
      </div>
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
    <>
      {!isSupported ? (
        <GlassSheet title="Device" danger>
          <TokenRow wrap danger icon={<Bell size={14} />} title="Not supported" sub="Push notifications are not available on this device." />
        </GlassSheet>
      ) : null}

      {isSupported && permission === 'denied' ? (
        <GlassSheet title="Permission" danger>
          <TokenRow wrap danger icon={<Bell size={14} />} title="Notifications blocked" sub="Enable them in system settings, then re-check." />
          {isNative ? (
            <div style={{ display: 'flex', gap: 8, padding: '4px 0 10px' }}>
              <GhostBtn label="Open settings" onClick={openNotificationSettings} />
            </div>
          ) : null}
          {isNative ? (
            <div style={{ padding: '0 0 10px' }}>
              <PrimaryBtn label={checking ? 'Checking…' : 'Re-check'} onClick={() => void handleRecheck()} />
            </div>
          ) : null}
        </GlassSheet>
      ) : null}

      {isSupported && permission === 'default' ? (
        <GlassSheet title="Permission">
          <TokenRow wrap icon={<Bell size={14} />} title="Enable alerts" sub="Mining, arena, and rewards." />
          <div style={{ padding: '4px 0 10px' }}>
            <PrimaryBtn label="Enable notifications" onClick={() => void requestPermission()} />
          </div>
        </GlassSheet>
      ) : null}

      <GlassSheet title="Alerts">
        {NOTIF_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const on = preferences[opt.key];
          return (
            <TokenRow
              key={opt.key}
              icon={<Icon size={14} />}
              title={opt.title}
              sub={opt.description}
              trailing={<NeonToggle on={on} onToggle={() => void handleToggle(opt.key)} />}
            />
          );
        })}
      </GlassSheet>
    </>
  );
}

function VerificationPanel() {
  const { user } = useAuth();
  const tour = useAppTourOptional();

  const replayGuide = () => {
    if (!user) return;
    resetTourProgress(user.id);
    tour?.startTour({ replay: true });
  };

  return (
    <>
      <VerificationCenter variant="v2" />
      {tour ? (
        <GhostBtn label="Replay Arxon setup guide" onClick={replayGuide} />
      ) : null}
    </>
  );
}

function SecurityPanel() {
  const navigate = useNavigate();
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
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'auth'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <GlassSheet title="Password">
        <div style={{ padding: '8px 0 4px' }}>
          <Field
            type={showPw ? 'text' : 'password'}
            value={passwords.newPassword}
            onChange={(v) => setPasswords((p) => ({ ...p, newPassword: v }))}
            placeholder="New password"
            trailing={(
              <button type="button" onClick={() => setShowPw((v) => !v)} style={eyeBtn}>
                {showPw ? <EyeOff size={16} color={pc.soft} /> : <Eye size={16} color={pc.soft} />}
              </button>
            )}
          />
          <Field
            type={showConfirm ? 'text' : 'password'}
            value={passwords.confirmPassword}
            onChange={(v) => setPasswords((p) => ({ ...p, confirmPassword: v }))}
            placeholder="Confirm password"
            trailing={(
              <button type="button" onClick={() => setShowConfirm((v) => !v)} style={eyeBtn}>
                {showConfirm ? <EyeOff size={16} color={pc.soft} /> : <Eye size={16} color={pc.soft} />}
              </button>
            )}
          />
          <PrimaryBtn label={saving ? 'Updating…' : 'Update password'} onClick={() => void handlePasswordChange()} disabled={saving} />
        </div>
      </GlassSheet>

      <PrivacyDataSettings />

      <GlassSheet title="Danger zone" danger>
        <TokenRow
          danger
          icon={<Trash2 size={14} />}
          title="Delete account"
          sub="30-day request · team review"
          onClick={() => navigate('/profile?delete=1')}
        />
      </GlassSheet>
    </>
  );
}

const eyeBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  padding: 4,
} as const;
