import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  Copy, Check, Shield, Bell, BookOpen, Settings, LogOut, ListChecks, Users, Wallet, Camera,
  LayoutDashboard, Trophy, History, Scale, User2, CalendarDays, FileDown, Globe, Zap, Receipt,
  Upload, Link2, BarChart3, Megaphone, RotateCcw, Coins, Send, Flame, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InAppNotificationBell from '@/components/mobile/InAppNotificationBell';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { V2Page, V2ButtonGhost, fadeUp, stagger } from '../design/Kit';
import { neon } from '../design/neonTokens';
import {
  NeonScreenHeader,
  NeonGlassCard,
  NeonCompactBalance,
  NeonMenuRow,
  NeonMenuGroup,
  NeonSectionLabel,
} from '../design/NeonSecondaryUI';

const ACTIVITY_TEXT = '#b8eff8';

function NeonToggle({ on, onToggle, accent = neon.teal }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: on ? `${accent}35` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${on ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.22s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 16, height: 16, borderRadius: '50%',
        background: on ? accent : 'rgba(184,239,248,0.35)',
        transition: 'all 0.22s',
        boxShadow: on ? `0 0 10px ${accent}88` : 'none',
      }} />
    </div>
  );
}

const QUICK: { Icon: LucideIcon; label: string; path: string; accent: string }[] = [
  { Icon: Trophy, label: 'Rankings', path: '/leaderboard', accent: neon.gold },
  { Icon: ListChecks, label: 'Tasks', path: '/tasks', accent: neon.teal },
  { Icon: Send, label: 'Nexus', path: '/nexus', accent: neon.cyan },
];

const MENU: { Icon: LucideIcon; label: string; sub: string; path: string; accent: string }[] = [
  { Icon: Receipt, label: 'Points History', sub: 'Credits & deductions', path: '/points-history', accent: neon.gold },
  { Icon: Users, label: 'Referrals', sub: '100 ARX-P per friend', path: '/referrals', accent: neon.teal },
  { Icon: Wallet, label: 'Wallet', sub: 'Connect Web3 wallet', path: '/wallet', accent: neon.cyan },
  { Icon: Shield, label: 'Security', sub: 'Password & account', path: '/settings?tab=security', accent: neon.purple },
  { Icon: BookOpen, label: 'Litepaper', sub: 'Guides & docs', path: '/litepaper', accent: 'rgba(184,239,248,0.6)' },
  { Icon: Settings, label: 'App Settings', sub: 'Notifications & display', path: '/settings', accent: 'rgba(184,239,248,0.45)' },
];

const LEGAL_MENU: { Icon: LucideIcon; label: string; sub: string; path: string; accent: string }[] = [
  { Icon: Scale, label: 'Terms of Service', sub: 'Usage & eligibility', path: '/terms', accent: 'rgba(184,239,248,0.55)' },
  { Icon: Shield, label: 'Privacy Policy', sub: 'How we handle your data', path: '/privacy', accent: neon.purple },
];

const ADMIN_MENU: { Icon: LucideIcon; label: string; sub: string; path: string; accent: string }[] = [
  { Icon: LayoutDashboard, label: 'Dashboard', sub: 'Platform overview', path: '/admin', accent: neon.cyan },
  { Icon: BarChart3, label: 'Analytics', sub: 'Deep metrics', path: '/admin/analytics', accent: neon.teal },
  { Icon: User2, label: 'Users & Miners', sub: 'Manage users', path: '/admin/users', accent: neon.teal },
  { Icon: ListChecks, label: 'Task Manager', sub: 'Add & manage tasks', path: '/admin/tasks', accent: neon.cyan },
  { Icon: Trophy, label: 'Arena Markets', sub: 'Create battles', path: '/admin/arena', accent: neon.purple },
  { Icon: History, label: 'Battle History', sub: 'Resolved battles', path: '/admin/battle-history', accent: neon.gold },
  { Icon: Link2, label: 'Referral Manager', sub: 'Manage referrals', path: '/admin/referrals', accent: neon.teal },
  { Icon: RotateCcw, label: 'Referral Recovery', sub: 'Bulk recovery', path: '/admin/referral-recovery', accent: neon.gold },
  { Icon: CalendarDays, label: 'Daily Signups', sub: 'Signup analytics', path: '/admin/signups', accent: neon.cyan },
  { Icon: Zap, label: 'Mining Controls', sub: 'Mining & broadcast', path: '/admin/controls', accent: neon.gold },
  { Icon: Megaphone, label: 'Announcements', sub: 'Broadcasts', path: '/admin/announcements', accent: neon.purple },
  { Icon: Scale, label: 'Reconciliation', sub: 'Audit points', path: '/admin/reconciliation', accent: neon.teal },
  { Icon: Coins, label: '$ARX Claims', sub: 'Token claims', path: '/admin/claims', accent: neon.gold },
  { Icon: FileDown, label: 'Export Filter', sub: 'Export CSV', path: '/admin/export-filter', accent: 'rgba(184,239,248,0.5)' },
  { Icon: Upload, label: 'Import Users', sub: 'Bulk import', path: '/admin/import-users', accent: 'rgba(184,239,248,0.5)' },
  { Icon: Globe, label: 'Global Map', sub: 'Miner activity', path: '/admin/global-map', accent: neon.teal },
];

export default function ProfileV2() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { points, rank } = usePoints();
  const { profile, refetchProfile } = useProfile();
  const { isAdmin } = useAdmin();
  const { preferences: pushPrefs, updatePreferences: updatePushPrefs, requestPermission } = usePushNotifications();

  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [xHandle, setXHandle] = useState('');
  const [editingX, setEditingX] = useState(false);
  const [savingX, setSavingX] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const totalPts = Math.round(points?.total_points ?? 0);
  const streak = points?.daily_streak ?? 0;
  const avatarUrl = profile?.avatar_url;
  const profileXHandle = (profile as { x_handle?: string | null })?.x_handle;

  useEffect(() => {
    if (profileXHandle) setXHandle(profileXHandle);
  }, [profileXHandle]);

  const saveXHandle = async () => {
    const handleToSave = xHandle.replace('@', '').trim();
    if (handleToSave && !/^[A-Za-z0-9_]{1,15}$/.test(handleToSave)) {
      toast({ title: 'Invalid X handle', description: '1–15 chars: letters, numbers, underscores.', variant: 'destructive' });
      return;
    }
    if (!user) return;
    setSavingX(true);
    try {
      const { error } = await supabase.from('profiles').update({ x_handle: handleToSave || null } as { x_handle: string | null }).eq('user_id', user.id);
      if (error) throw error;
      await refetchProfile();
      setEditingX(false);
      toast({ title: 'Saved!', description: handleToSave ? `@${handleToSave} linked` : 'X handle removed' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Save failed', variant: 'destructive' });
    } finally {
      setSavingX(false);
    }
  };

  const copyRef = async () => {
    if (!profile?.referral_code) return;
    await navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Referral code copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Select JPG, PNG, etc.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB', variant: 'destructive' });
      return;
    }
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      if (dbErr) throw dbErr;
      await refetchProfile();
      toast({ title: 'Profile updated!', description: 'Avatar saved' });
    } catch (err: unknown) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <V2Page>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      <NeonScreenHeader
        eyebrow="You"
        title={username}
        subtitle={user?.email ?? 'Account & preferences'}
        right={<InAppNotificationBell />}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 16px 20px' }}>
        {/* Identity strip */}
        <motion.div variants={fadeUp} style={{ marginBottom: 12 }}>
          <NeonGlassCard accent={neon.cyan} padding="12px 12px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
                    border: `1.5px solid ${neon.cyan}40`, boxShadow: `0 0 20px ${neon.cyan}18`, cursor: 'pointer',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: `linear-gradient(135deg, ${neon.cyan}22, ${neon.purple}18)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 24, color: neon.cyan,
                    }}>
                      {username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(2,6,14,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: uploading ? 1 : 0, transition: 'opacity 0.2s',
                  }}>
                    {uploading ? (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${neon.cyan}44`, borderTopColor: neon.cyan, animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Camera size={16} color={ACTIVITY_TEXT} />
                    )}
                  </div>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 8,
                    background: neon.cyan, border: `2px solid ${neon.deep}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <Camera size={10} color={neon.deep} />
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {rank && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: neon.gold, background: `${neon.gold}18`, border: `1px solid ${neon.gold}35`, borderRadius: 16, padding: '3px 8px' }}>
                      #{rank}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 800, color: neon.teal, background: `${neon.teal}15`, border: `1px solid ${neon.teal}30`, borderRadius: 16, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Flame size={10} /> {streak}d
                  </span>
                  {isAdmin && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: neon.purple, background: `${neon.purple}18`, border: `1px solid ${neon.purple}35`, borderRadius: 16, padding: '3px 8px' }}>
                      Admin
                    </span>
                  )}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 400, color: 'rgba(184,239,248,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </p>
              </div>
            </div>
          </NeonGlassCard>
        </motion.div>

        {/* Balance */}
        <motion.div variants={fadeUp} style={{ marginBottom: 12 }}>
          <NeonCompactBalance
            balance={totalPts}
            rank={rank}
            stats={[
              { label: 'Streak', value: `${streak}d`, accent: neon.gold },
              { label: 'Rank', value: rank ? `#${rank}` : '—', accent: neon.gold },
              { label: 'Today', value: totalPts > 0 ? 'Active' : '—', accent: neon.teal },
            ]}
          />
        </motion.div>

        {/* Quick links */}
        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {QUICK.map((q) => (
              <motion.button
                key={q.path}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(q.path)}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 14, border: `1px solid ${q.accent}28`,
                  background: `linear-gradient(155deg, ${q.accent}10 0%, rgba(6,12,24,0.9) 100%)`,
                  cursor: 'pointer', fontFamily: neon.font, textAlign: 'center',
                  boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 0 12px ${q.accent}08`,
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 9, margin: '0 auto 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${q.accent}18`, border: `1px solid ${q.accent}35`, color: q.accent,
                }}>
                  <q.Icon size={14} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: ACTIVITY_TEXT }}>{q.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Referral */}
        {profile?.referral_code && (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard accent={neon.gold} padding="12px 14px">
              <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${neon.gold}99` }}>
                Referral Code
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: neon.gold, letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                  {profile.referral_code}
                </p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={copyRef}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 11, flexShrink: 0,
                    background: `${neon.gold}18`, border: `1px solid ${neon.gold}40`, color: neon.gold,
                    fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: neon.font,
                  }}
                >
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </motion.button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>Share & earn 100 ARX-P per friend</p>
            </NeonGlassCard>
          </motion.div>
        )}

        {/* X handle */}
        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <NeonGlassCard accent={neon.cyan} padding="12px 14px">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingX ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: `${neon.cyan}12`, border: `1px solid ${neon.cyan}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={ACTIVITY_TEXT}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: ACTIVITY_TEXT }}>X (Twitter)</p>
                  <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>
                    {profileXHandle ? `@${profileXHandle}` : 'Not linked'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingX((e) => !e)}
                style={{
                  padding: '5px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800,
                  background: editingX ? 'rgba(255,255,255,0.06)' : `${neon.cyan}15`,
                  border: `1px solid ${editingX ? 'rgba(255,255,255,0.1)' : `${neon.cyan}35`}`,
                  color: editingX ? 'rgba(184,239,248,0.5)' : neon.cyan, cursor: 'pointer', fontFamily: neon.font,
                }}
              >
                {editingX ? 'Cancel' : profileXHandle ? 'Edit' : 'Link'}
              </button>
            </div>
            {editingX && (
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '8px 10px',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: neon.cyan }}>@</span>
                  <input
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: ACTIVITY_TEXT, fontFamily: neon.font }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveXHandle}
                  disabled={savingX}
                  style={{
                    padding: '8px 14px', borderRadius: 11, fontSize: 11, fontWeight: 800,
                    background: neon.cyan, border: 'none', color: neon.deep, cursor: 'pointer', fontFamily: neon.font,
                  }}
                >
                  {savingX ? '…' : 'Save'}
                </button>
              </div>
            )}
          </NeonGlassCard>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <NeonSectionLabel>Notifications</NeonSectionLabel>
          <NeonGlassCard accent={neon.cyan} padding="8px 10px">
            {[
              {
                label: 'Push Notifications',
                sub: 'Arena, rewards & announcements',
                on: pushPrefs.arenaLive || pushPrefs.arenaResults || pushPrefs.adminAnnouncements,
                toggle: async () => {
                  const enabling = !(pushPrefs.arenaLive || pushPrefs.arenaResults || pushPrefs.adminAnnouncements);
                  if (enabling) {
                    const ok = await requestPermission();
                    if (!ok) {
                      toast({ title: 'Notifications blocked', description: 'Enable in device settings', variant: 'destructive' });
                      return;
                    }
                  }
                  updatePushPrefs({ ...pushPrefs, arenaLive: enabling, arenaResults: enabling, rewardUpdates: enabling, adminAnnouncements: enabling });
                },
              },
              {
                label: 'Mining Alerts',
                sub: 'Session & claim reminders',
                on: pushPrefs.miningAlerts && pushPrefs.claimNotifications,
                toggle: () => {
                  const next = !(pushPrefs.miningAlerts && pushPrefs.claimNotifications);
                  updatePushPrefs({ ...pushPrefs, miningAlerts: next, claimNotifications: next });
                },
              },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: `${neon.cyan}12`, border: `1px solid ${neon.cyan}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={14} color={neon.cyan} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: ACTIVITY_TEXT }}>{item.label}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>{item.sub}</p>
                  </div>
                </div>
                <NeonToggle on={item.on} onToggle={item.toggle} />
              </div>
            ))}
          </NeonGlassCard>
        </motion.div>

        {/* Account menu */}
        <motion.div variants={fadeUp}>
          <NeonMenuGroup title="Account">
            {MENU.map((item) => (
              <NeonMenuRow key={item.path} icon={item.Icon} label={item.label} sub={item.sub} accent={item.accent} onClick={() => navigate(item.path)} />
            ))}
          </NeonMenuGroup>
        </motion.div>

        {/* Legal */}
        <motion.div variants={fadeUp} style={{ marginTop: 4 }}>
          <NeonMenuGroup title="Legal">
            {LEGAL_MENU.map((item) => (
              <NeonMenuRow key={item.path} icon={item.Icon} label={item.label} sub={item.sub} accent={item.accent} onClick={() => navigate(item.path)} />
            ))}
          </NeonMenuGroup>
        </motion.div>

        {/* Admin */}
        {isAdmin && (
          <motion.div variants={fadeUp} style={{ marginTop: 4 }}>
            <NeonMenuGroup title="Admin">
              {ADMIN_MENU.map((item) => (
                <NeonMenuRow key={item.path} icon={item.Icon} label={item.label} sub={item.sub} accent={item.accent} onClick={() => navigate(item.path)} />
              ))}
            </NeonMenuGroup>
          </motion.div>
        )}

        <motion.div variants={fadeUp} style={{ marginTop: 8 }}>
          <V2ButtonGhost onClick={() => signOut?.()} accent="#f87171" fullWidth>
            <LogOut size={15} style={{ marginRight: 4 }} />
            Sign Out
          </V2ButtonGhost>
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
