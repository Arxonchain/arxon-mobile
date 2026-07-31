import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Shield,
  Bell,
  BookOpen,
  Settings,
  LogOut,
  ListChecks,
  Users,
  Wallet,
  Camera,
  LayoutDashboard,
  Trophy,
  History,
  Scale,
  User2,
  CalendarDays,
  FileDown,
  Globe,
  Zap,
  Receipt,
  Upload,
  Link2,
  BarChart3,
  Megaphone,
  RotateCcw,
  Coins,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InAppNotificationBell from '@/components/mobile/InAppNotificationBell';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { v2 } from '../design/tokens';
import {
  V2Page,
  V2Header,
  V2BalanceHero,
  V2MenuRow,
  V2Card,
  V2Eyebrow,
  V2ButtonGhost,
  fadeUp,
  stagger,
} from '../design/Kit';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 50,
        height: 28,
        borderRadius: 14,
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'all 0.25s',
        background: on ? `${v2.accent.success}40` : v2.brand.raised,
        border: `1px solid ${on ? `${v2.accent.success}73` : v2.brand.border}`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: on ? v2.accent.mining : v2.brand.muted,
          transition: 'all 0.25s',
          boxShadow: on ? `0 0 12px ${v2.accent.mining}8c` : 'none',
        }}
      />
    </div>
  );
}

const MENU: { Icon: LucideIcon; label: string; sub: string; path: string; accent: string }[] = [
  { Icon: Receipt, label: 'Points History', sub: 'All credits & deductions', path: '/points-history', accent: v2.accent.gold },
  { Icon: Users, label: 'Referrals', sub: 'Earn 100 ARX-P per friend', path: '/referrals', accent: v2.accent.mining },
  { Icon: Wallet, label: 'Wallet', sub: 'Connect your Web3 wallet', path: '/wallet', accent: v2.brand.steel },
  { Icon: Shield, label: 'Security', sub: 'Password & account security', path: '/settings?tab=security', accent: v2.brand.steelLight },
  { Icon: BookOpen, label: 'Litepaper', sub: 'Guides & documentation', path: '/litepaper', accent: v2.brand.mutedSoft },
  { Icon: Settings, label: 'App Settings', sub: 'Notifications & display', path: '/settings', accent: v2.brand.muted },
];

const ADMIN_MENU: { Icon: LucideIcon; label: string; sub: string; path: string; accent: string }[] = [
  { Icon: LayoutDashboard, label: 'Dashboard', sub: 'Platform overview & stats', path: '/admin', accent: v2.brand.steel },
  { Icon: BarChart3, label: 'Analytics', sub: 'Deep platform metrics', path: '/admin/analytics', accent: v2.accent.cyan },
  { Icon: User2, label: 'Users & Miners', sub: 'Manage all users', path: '/admin/users', accent: v2.accent.mining },
  { Icon: ListChecks, label: 'Task Manager', sub: 'Add & manage tasks', path: '/admin/tasks', accent: v2.accent.cyan },
  { Icon: Trophy, label: 'Arena Markets', sub: 'Create & manage battles', path: '/admin/arena', accent: v2.accent.arena },
  { Icon: History, label: 'Battle History', sub: 'Resolved arena battles', path: '/admin/battle-history', accent: v2.accent.gold },
  { Icon: Link2, label: 'Referral Manager', sub: 'Link & manage referrals', path: '/admin/referrals', accent: v2.accent.mining },
  { Icon: RotateCcw, label: 'Referral Recovery', sub: 'Bulk recover missed referrals', path: '/admin/referral-recovery', accent: v2.accent.gold },
  { Icon: CalendarDays, label: 'Daily Signups', sub: 'Signup analytics', path: '/admin/signups', accent: v2.brand.steel },
  { Icon: Zap, label: 'Mining Controls', sub: 'Mining, claiming & broadcast', path: '/admin/controls', accent: v2.accent.gold },
  { Icon: Megaphone, label: 'Announcements', sub: 'Create & manage broadcasts', path: '/admin/announcements', accent: v2.accent.arena },
  { Icon: Scale, label: 'Reconciliation', sub: 'Audit & restore points', path: '/admin/reconciliation', accent: v2.accent.mining },
  { Icon: Coins, label: '$ARX Claims', sub: 'Monitor token claims', path: '/admin/claims', accent: v2.accent.gold },
  { Icon: FileDown, label: 'Export Filter', sub: 'Export user data CSV', path: '/admin/export-filter', accent: v2.brand.mutedSoft },
  { Icon: Upload, label: 'Import Users', sub: 'Bulk import legacy users', path: '/admin/import-users', accent: v2.brand.mutedSoft },
  { Icon: Globe, label: 'Global Map', sub: 'Worldwide miner activity', path: '/admin/global-map', accent: v2.accent.mining },
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
      toast({
        title: 'Invalid X handle',
        description: 'Handle must be 1-15 characters: letters, numbers, underscores only.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) return;
    setSavingX(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ x_handle: handleToSave || null } as { x_handle: string | null })
        .eq('user_id', user.id);
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
      toast({ title: 'Invalid file', description: 'Please select an image file (JPG, PNG, etc.)', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image smaller than 2MB', variant: 'destructive' });
      return;
    }
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (dbErr) throw dbErr;
      await refetchProfile();
      toast({ title: 'Profile updated!', description: 'Avatar saved successfully' });
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

      <V2Header
        title="Profile"
        subtitle="Account settings"
        onBack={() => navigate(-1)}
        right={<InAppNotificationBell />}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 20px' }}>
        {/* Avatar + identity */}
        <motion.div variants={fadeUp} style={{ marginTop: 18 }}>
          <V2Card accent={v2.brand.glow} padding="22px 20px 0">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 24,
                    overflow: 'hidden',
                    border: `2px solid ${v2.brand.steel}38`,
                    boxShadow: `0 8px 28px ${v2.brand.glow}26`,
                    cursor: 'pointer',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: v2.gradient.steel,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 30,
                        color: v2.brand.steelBright,
                      }}
                    >
                      {username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `${v2.brand.deep}80`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: uploading ? 1 : 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {uploading ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: `2px solid ${v2.brand.steel}4d`,
                          borderTopColor: v2.brand.steel,
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    ) : (
                      <Camera size={18} color="white" />
                    )}
                  </div>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: v2.brand.steel,
                    border: `2px solid ${v2.brand.deep}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={11} color={v2.brand.deep} />
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: v2.brand.steelBright,
                    letterSpacing: '-0.3px',
                    margin: 0,
                  }}
                >
                  {username}
                </h2>
                <p style={{ fontSize: 11, color: v2.brand.muted, marginTop: 4 }}>{user?.email}</p>
                <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
                  {rank && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: v2.accent.gold,
                        background: `${v2.accent.gold}1a`,
                        border: `1px solid ${v2.accent.gold}40`,
                        borderRadius: 20,
                        padding: '4px 10px',
                      }}
                    >
                      Rank #{rank}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: v2.accent.mining,
                      background: `${v2.accent.mining}1a`,
                      border: `1px solid ${v2.accent.mining}38`,
                      borderRadius: 20,
                      padding: '4px 10px',
                    }}
                  >
                    🔥 {streak}d Streak
                  </span>
                  {isAdmin && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: v2.accent.arena,
                        background: `${v2.accent.arena}1f`,
                        border: `1px solid ${v2.accent.arena}4d`,
                        borderRadius: 20,
                        padding: '4px 10px',
                      }}
                    >
                      ⚡ Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </V2Card>
        </motion.div>

        {/* Stats hero */}
        <motion.div variants={fadeUp} style={{ marginTop: 12 }}>
          <V2BalanceHero
            balance={totalPts}
            rank={rank}
            stats={[
              { label: 'Streak', value: `${streak}d`, accent: v2.accent.gold },
              { label: 'Rank', value: rank ? `#${rank}` : '—', accent: v2.accent.gold },
              { label: 'ARX-P', value: totalPts.toLocaleString(), accent: v2.brand.steelLight },
            ]}
          />
        </motion.div>

        {/* Referral code */}
        {profile?.referral_code && (
          <motion.div variants={fadeUp} style={{ marginTop: 14 }}>
            <V2Card accent={v2.accent.gold} padding="18px 20px">
              <V2Eyebrow accent={v2.accent.gold}>Your Referral Code</V2Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
                <div>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: v2.accent.gold,
                      letterSpacing: '0.06em',
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    {profile.referral_code}
                  </p>
                  <p style={{ fontSize: 11, color: `${v2.accent.gold}80`, marginTop: 5 }}>Share & earn 100 ARX-P per friend</p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={copyRef}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 18px',
                    borderRadius: 14,
                    flexShrink: 0,
                    background: `${v2.accent.gold}26`,
                    border: `1px solid ${v2.accent.gold}4d`,
                    color: v2.accent.gold,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: v2.font,
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </motion.button>
              </div>
            </V2Card>
          </motion.div>
        )}

        {/* X handle */}
        <motion.div variants={fadeUp} style={{ marginTop: 20 }}>
          <V2Card padding="16px 18px" accent={v2.brand.steel}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: editingX ? 12 : 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: v2.brand.raised,
                    border: `1px solid ${v2.brand.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={v2.brand.steelBright}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: 0 }}>X (Twitter)</p>
                  <p style={{ fontSize: 10, color: v2.brand.muted, marginTop: 1 }}>
                    {profileXHandle ? `@${profileXHandle}` : 'Not linked'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingX((e) => !e)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
                  background: editingX ? v2.brand.raised : `${v2.brand.steel}1f`,
                  border: `1px solid ${editingX ? v2.brand.border : `${v2.brand.steel}40`}`,
                  color: editingX ? v2.brand.mutedSoft : v2.brand.steel,
                  cursor: 'pointer',
                  fontFamily: v2.font,
                }}
              >
                {editingX ? 'Cancel' : profileXHandle ? 'Edit' : 'Link'}
              </button>
            </div>
            {editingX && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: v2.brand.raised,
                    border: `1px solid ${v2.brand.border}`,
                    borderRadius: 12,
                    padding: '10px 14px',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800, color: v2.brand.steel }}>@</span>
                  <input
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      color: v2.brand.steelBright,
                      fontFamily: v2.font,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveXHandle}
                  disabled={savingX}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 800,
                    background: v2.brand.steel,
                    border: 'none',
                    color: v2.brand.deep,
                    cursor: 'pointer',
                    flexShrink: 0,
                    fontFamily: v2.font,
                  }}
                >
                  {savingX ? '…' : 'Save'}
                </button>
              </div>
            )}
          </V2Card>
        </motion.div>

        {/* Admin section */}
        {isAdmin && (
          <motion.div variants={fadeUp} style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: `${v2.accent.arena}33` }} />
              <V2Eyebrow accent={v2.accent.arena}>Admin Control Panel</V2Eyebrow>
              <div style={{ flex: 1, height: 1, background: `${v2.accent.arena}33` }} />
            </div>
            {ADMIN_MENU.map((item) => (
              <V2MenuRow
                key={item.path}
                icon={item.Icon}
                label={item.label}
                sub={item.sub}
                accent={item.accent}
                onClick={() => navigate(item.path)}
              />
            ))}
          </motion.div>
        )}

        {/* Push notifications */}
        <motion.div variants={fadeUp} style={{ marginTop: 24 }}>
          <V2Eyebrow accent={v2.brand.muted}>Notifications</V2Eyebrow>
          <div style={{ marginTop: 12 }}>
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
                      toast({
                        title: 'Notifications blocked',
                        description: 'Enable in Settings → Apps → Arxon → Notifications',
                        variant: 'destructive',
                      });
                      return;
                    }
                  }
                  const next = enabling;
                  updatePushPrefs({
                    ...pushPrefs,
                    arenaLive: next,
                    arenaResults: next,
                    rewardUpdates: next,
                    adminAnnouncements: next,
                  });
                },
              },
              {
                label: 'Mining Alerts',
                sub: 'Session ending & claim reminders',
                on: pushPrefs.miningAlerts && pushPrefs.claimNotifications,
                toggle: () => {
                  const next = !(pushPrefs.miningAlerts && pushPrefs.claimNotifications);
                  updatePushPrefs({
                    ...pushPrefs,
                    miningAlerts: next,
                    claimNotifications: next,
                  });
                },
              },
            ].map((item) => (
              <V2Card key={item.label} padding="14px 16px" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 13,
                        background: v2.brand.raised,
                        border: `1px solid ${v2.brand.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bell size={16} color={v2.brand.mutedSoft} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 10, color: v2.brand.muted, marginTop: 2 }}>{item.sub}</p>
                    </div>
                  </div>
                  <Toggle on={item.on} onToggle={item.toggle} />
                </div>
              </V2Card>
            ))}
          </div>
        </motion.div>

        {/* Account menu */}
        <motion.div variants={fadeUp} style={{ marginTop: 24 }}>
          <V2Eyebrow accent={v2.brand.muted}>Account</V2Eyebrow>
          <div style={{ marginTop: 12 }}>
            {MENU.map((item) => (
              <V2MenuRow
                key={item.path}
                icon={item.Icon}
                label={item.label}
                sub={item.sub}
                accent={item.accent}
                onClick={() => navigate(item.path)}
              />
            ))}
          </div>
        </motion.div>

        {/* Sign out */}
        <motion.div variants={fadeUp} style={{ marginTop: 12, marginBottom: 24 }}>
          <V2ButtonGhost onClick={() => signOut?.()} accent={v2.accent.danger} fullWidth>
            <LogOut size={16} style={{ marginRight: 4 }} />
            Sign Out
          </V2ButtonGhost>
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
