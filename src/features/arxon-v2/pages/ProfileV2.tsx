import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from 'react';
import {
  Copy, Check, Shield, ShieldCheck, Bell, BookOpen, Settings, LogOut, ListChecks, Users, Camera,
  LayoutDashboard, Trophy, History, Scale, User2, CalendarDays, FileDown, Globe, Zap, Receipt,
  Upload, Link2, BarChart3, Megaphone, RotateCcw, Coins, Share2, Trash2, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { useReferrals } from '@/hooks/useReferrals';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { copyAddress, shareText } from '@/walletFigma/flow/copyFlash';
import { displayReferralLink } from '@/lib/publicSite';
import DeleteAccountFlow from '../components/DeleteAccountFlow';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { frostWash, sheetGlass } from '@/walletFigma/flow/LiveScroll';
import { formatPointsDisplay } from '@/lib/formatPoints';
import { mobileTopPaddingPage } from '@/lib/mobileLayout';
import { MineLoad } from '../components/MineLoad';
import { V2Page, fadeUp, stagger } from '../design/Kit';
import { neon } from '../design/neonTokens';
import { SegmentTabs } from '../design/ProfileChrome';

const INK = '#0c1018';
const MUTED = '#5c6370';
const SOFT = '#8c8f99';

const frostCard: CSSProperties = {
  ...frostWash,
  borderRadius: 22,
  border: '1px solid rgba(61,109,255,0.32)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
  boxSizing: 'border-box',
};

const tokenSheet: CSSProperties = {
  borderRadius: 22,
  padding: '4px 12px 6px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  ...sheetGlass,
};

const tokenRow: CSSProperties = {
  width: '100%',
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  border: 'none',
  background: 'none',
  color: '#fff',
  padding: 0,
  cursor: 'pointer',
  fontFamily: neon.font,
  textAlign: 'left',
};

const tokenGlyph: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 16,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1c2025',
  color: '#fff',
};

function NeonToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="switch"
      aria-checked={on}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: on ? 'rgba(172,202,254,0.35)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${on ? 'rgba(172,202,254,0.55)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 16, height: 16, borderRadius: '50%',
        background: on ? '#accafe' : 'rgba(184,239,248,0.35)',
        transition: 'left 0.22s',
      }} />
    </div>
  );
}

function PersonMark({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.6" r="3.5" stroke="rgba(238,243,255,0.55)" strokeWidth="1.4" />
      <path
        d="M5.8 18.6c.9-3.4 3.2-5.1 6.2-5.1s5.3 1.7 6.2 5.1"
        stroke="rgba(238,243,255,0.55)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TokenRow({
  icon,
  title,
  sub,
  onClick,
  trailing,
  danger,
  glyphBg,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
  glyphBg?: string;
}) {
  return (
    <button type="button" onClick={onClick} style={{ ...tokenRow, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ ...tokenGlyph, background: glyphBg || (danger ? '#f25252' : '#1c2025') }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: danger ? '#ff8a8a' : '#fff',
        }}>
          {title}
        </span>
        {sub ? <span style={{ fontSize: 11, color: danger ? 'rgba(255,138,138,0.75)' : SOFT }}>{sub}</span> : null}
      </span>
      {trailing}
    </button>
  );
}

function TokenSheet({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {title ? (
        <p style={{ margin: '0 2px 8px', fontSize: 11, fontWeight: 650, color: SOFT, fontFamily: neon.font }}>
          {title}
        </p>
      ) : null}
      <div style={tokenSheet}>{children}</div>
    </div>
  );
}

const MENU: { Icon: LucideIcon; label: string; sub: string; path: string }[] = [
  { Icon: Receipt, label: 'Points History', sub: 'Credits & deductions', path: '/points-history' },
  { Icon: Users, label: 'Referrals', sub: '100 ARX-P per friend', path: '/referrals' },
  { Icon: Shield, label: 'Security', sub: 'Password & account', path: '/settings?tab=security' },
  { Icon: ShieldCheck, label: 'Verification', sub: 'Email, country, age, wallet', path: '/settings?tab=verification' },
  { Icon: BookOpen, label: 'Whitepaper', sub: 'Guides & docs', path: '/whitepaper' },
  { Icon: Settings, label: 'App Settings', sub: 'Notifications & display', path: '/settings' },
];

const LEGAL_MENU: { Icon: LucideIcon; label: string; sub: string; path: string }[] = [
  { Icon: Scale, label: 'Terms of Service', sub: 'Usage & eligibility', path: '/terms' },
  { Icon: Shield, label: 'Privacy Policy', sub: 'How we handle your data', path: '/privacy' },
];

type AdminTab = 'overview' | 'users' | 'platform' | 'arena';
type AdminItem = { Icon: LucideIcon; label: string; sub: string; path: string };

const ADMIN_SECTIONS: { id: AdminTab; label: string; items: AdminItem[] }[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { Icon: LayoutDashboard, label: 'Dashboard', sub: 'Platform overview', path: '/admin' },
      { Icon: BarChart3, label: 'Analytics', sub: 'Deep metrics', path: '/admin/analytics' },
      { Icon: CalendarDays, label: 'Daily Signups', sub: 'Signup analytics', path: '/admin/signups' },
      { Icon: Globe, label: 'Global Map', sub: 'Miner activity', path: '/admin/global-map' },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    items: [
      { Icon: User2, label: 'Users & Miners', sub: 'Manage users', path: '/admin/users' },
      { Icon: Trash2, label: 'Deletion requests', sub: '30-day account deletions', path: '/admin/deletions' },
      { Icon: Scale, label: 'Reconciliation', sub: 'Audit points', path: '/admin/reconciliation' },
      { Icon: FileDown, label: 'Export Filter', sub: 'Export CSV', path: '/admin/export-filter' },
      { Icon: Upload, label: 'Import Users', sub: 'Bulk import', path: '/admin/import-users' },
      { Icon: Coins, label: '$ARX Claims', sub: 'Token claims', path: '/admin/claims' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { Icon: Zap, label: 'Mining Controls', sub: 'Mining & broadcast', path: '/admin/controls' },
      { Icon: Megaphone, label: 'Announcements', sub: 'Broadcasts', path: '/admin/announcements' },
      { Icon: ListChecks, label: 'Task Manager', sub: 'Add & manage tasks', path: '/admin/tasks' },
      { Icon: Link2, label: 'Referral Manager', sub: 'Manage referrals', path: '/admin/referrals' },
      { Icon: RotateCcw, label: 'Referral Recovery', sub: 'Bulk recovery', path: '/admin/referral-recovery' },
    ],
  },
  {
    id: 'arena',
    label: 'Arena',
    items: [
      { Icon: Trophy, label: 'Arena Markets', sub: 'Create battles', path: '/admin/arena' },
      { Icon: History, label: 'Battle History', sub: 'Resolved battles', path: '/admin/battle-history' },
    ],
  },
];

export default function ProfileV2() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { points, refreshPoints } = usePoints();
  const { profile, refetchProfile } = useProfile();
  const { referralCode, getReferralLink, refreshReferrals } = useReferrals(user);
  const pull = usePullRefresh(async () => {
    await Promise.all([refetchProfile(), refreshPoints(), refreshReferrals()]);
  }, { threshold: 28 });
  const { isAdmin } = useAdmin();
  const { preferences: pushPrefs, updatePreferences: updatePushPrefs, requestPermission } = usePushNotifications();
  const deletion = useAccountDeletion();

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [xHandle, setXHandle] = useState('');
  const [editingX, setEditingX] = useState(false);
  const [savingX, setSavingX] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const fileRef = useRef<HTMLInputElement>(null);
  const adminSection = ADMIN_SECTIONS.find((s) => s.id === adminTab) ?? ADMIN_SECTIONS[0];

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const totalPts = Math.round(points?.total_points ?? 0);
  const avatarUrl = profile?.avatar_url;
  const code = referralCode || profile?.referral_code || '';
  const referralLink = getReferralLink() || (code ? `https://arxonchain.xyz/?ref=${code}` : '');
  const profileXHandle = (profile as { x_handle?: string | null })?.x_handle;
  const shortLink = referralLink ? displayReferralLink(referralLink) : '';

  useEffect(() => {
    if (profileXHandle) setXHandle(profileXHandle);
  }, [profileXHandle]);

  useEffect(() => {
    if (searchParams.get('delete') !== '1') return;
    setDeleteOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('delete');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const copyText = async (value: string, kind: 'code' | 'link') => {
    if (!value) return;
    await copyAddress(value, kind === 'link' ? 'Referral link copied' : 'Referral code copied');
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLink = async () => {
    if (!referralLink) return;
    await shareText('Join ARXON', `Join me on ARXON. Use my referral: ${code}\n${referralLink}`);
  };

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
      toast(publicErrorToast(e, 'verify'));
    } finally {
      setSavingX(false);
    }
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
      toast(publicErrorToast(err, 'upload'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <V2Page pull={pull}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      <motion.div variants={stagger} initial="hidden" animate="show">
        <MineLoad extra={pull.busy} kind="card" radius={0}>
          <div
            style={{
              position: 'relative',
              height: 300,
              overflow: 'hidden',
              background: '#12151c',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(180deg, #1c2025 0%, #0a0c10 100%)',
              }}>
                <PersonMark size={88} />
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(10,12,16,0.28) 0%, transparent 36%, rgba(10,12,16,0.82) 100%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: `${mobileTopPaddingPage()} 14px 0`,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                zIndex: 2,
              }}
            >
              <motion.button
                type="button"
                aria-label="Change photo"
                whileTap={{ scale: 0.92 }}
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 38, height: 38, borderRadius: 19, border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(10,12,16,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backdropFilter: 'blur(12px)',
                }}
              >
                {uploading ? (
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                ) : (
                  <Camera size={15} color="#fff" />
                )}
              </motion.button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 36,
                zIndex: 2,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.72)', fontFamily: neon.font }}>
                  Total balance
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 26,
                    fontWeight: 750,
                    color: '#fff',
                    letterSpacing: '-0.6px',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: neon.font,
                  }}
                >
                  {formatPointsDisplay(totalPts)}
                  <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>ARX-P</span>
                </p>
              </div>
            </div>
          </div>
        </MineLoad>

        <div style={{ padding: '0 16px 12px', marginTop: -22, position: 'relative', zIndex: 3 }}>
          <MineLoad extra={pull.busy} frost kind="card" radius={22}>
            <div style={{ ...frostCard, padding: '16px 16px 14px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 750,
                  color: INK,
                  letterSpacing: '-0.4px',
                  fontFamily: neon.font,
                }}
              >
                {username}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: MUTED, fontFamily: neon.font }}>
                {user?.email ?? 'Account'}
              </p>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(12,16,24,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: MUTED, fontFamily: neon.font }}>
                    Referral link
                  </p>
                  <p
                    style={{
                      margin: '3px 0 0',
                      fontSize: 12,
                      fontWeight: 650,
                      color: INK,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: neon.font,
                    }}
                  >
                    {shortLink || 'Generating…'}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => void copyText(referralLink, 'link')}
                  style={{
                    height: 34, padding: '0 12px', borderRadius: 12, border: 'none',
                    background: INK, color: '#fff', fontSize: 12, fontWeight: 700,
                    fontFamily: neon.font, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    flexShrink: 0,
                  }}
                >
                  {copied === 'link' ? <Check size={13} /> : <Copy size={13} />}
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => void shareLink()}
                  disabled={!referralLink}
                  style={{
                    width: 34, height: 34, borderRadius: 12, border: '1px solid rgba(12,16,24,0.12)',
                    background: 'transparent', color: INK, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Share2 size={14} />
                </motion.button>
              </div>
            </div>
          </MineLoad>
        </div>

        <div style={{ padding: '4px 16px 20px' }}>
          <div data-tour="profile-account">
          <TokenSheet title="Account">
            <TokenRow
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              }
              title="X (Twitter)"
              sub={profileXHandle ? `@${profileXHandle}` : 'Not linked'}
              onClick={() => setEditingX((v) => !v)}
              trailing={
                <span style={{ fontSize: 12, fontWeight: 650, color: SOFT }}>
                  {editingX ? 'Cancel' : profileXHandle ? 'Edit' : 'Link'}
                </span>
              }
            />
            {editingX ? (
              <div style={{ display: 'flex', gap: 6, padding: '4px 0 10px' }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6, height: 40,
                  background: '#1c2025', borderRadius: 12, padding: '0 10px',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#accafe' }}>@</span>
                  <input
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      fontSize: 13, color: '#fff', fontFamily: neon.font,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveXHandle}
                  disabled={savingX}
                  style={{
                    height: 40, padding: '0 14px', borderRadius: 12, border: 'none',
                    background: '#accafe', color: INK, fontSize: 12, fontWeight: 700,
                    fontFamily: neon.font, cursor: 'pointer',
                  }}
                >
                  {savingX ? '…' : 'Save'}
                </button>
              </div>
            ) : null}
            {MENU.map((item) => (
              <TokenRow
                key={item.path}
                icon={<item.Icon size={15} strokeWidth={2} />}
                title={item.label}
                sub={item.sub}
                onClick={() => navigate(item.path)}
              />
            ))}
          </TokenSheet>
          </div>

          <TokenSheet title="Notifications">
            <TokenRow
              icon={<Bell size={15} strokeWidth={2} />}
              title="Push notifications"
              sub="Arena, rewards & announcements"
              trailing={
                <NeonToggle
                  on={pushPrefs.arenaLive || pushPrefs.arenaResults || pushPrefs.adminAnnouncements}
                  onToggle={async () => {
                    const enabling = !(pushPrefs.arenaLive || pushPrefs.arenaResults || pushPrefs.adminAnnouncements);
                    if (enabling) {
                      const ok = await requestPermission();
                      if (!ok) {
                        toast({ title: 'Notifications blocked', description: 'Enable in device settings', variant: 'destructive' });
                        return;
                      }
                    }
                    updatePushPrefs({ ...pushPrefs, arenaLive: enabling, arenaResults: enabling, rewardUpdates: enabling, adminAnnouncements: enabling });
                  }}
                />
              }
            />
            <TokenRow
              icon={<Bell size={15} strokeWidth={2} />}
              title="Mining alerts"
              sub="Session & claim reminders"
              trailing={
                <NeonToggle
                  on={!!(pushPrefs.miningAlerts && pushPrefs.claimNotifications)}
                  onToggle={() => {
                    const next = !(pushPrefs.miningAlerts && pushPrefs.claimNotifications);
                    updatePushPrefs({ ...pushPrefs, miningAlerts: next, claimNotifications: next });
                  }}
                />
              }
            />
          </TokenSheet>

          <TokenSheet title="Legal">
            {LEGAL_MENU.map((item) => (
              <TokenRow
                key={item.path}
                icon={<item.Icon size={15} strokeWidth={2} />}
                title={item.label}
                sub={item.sub}
                onClick={() => navigate(item.path)}
              />
            ))}
          </TokenSheet>

          {isAdmin && (
            <>
              <p style={{ margin: '0 2px 8px', fontSize: 11, fontWeight: 650, color: SOFT, fontFamily: neon.font }}>
                Admin
              </p>
              <SegmentTabs
                tabs={ADMIN_SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
                active={adminTab}
                onChange={setAdminTab}
              />
              <TokenSheet>
                {adminSection.items.map((item) => (
                  <TokenRow
                    key={item.path}
                    icon={<item.Icon size={15} strokeWidth={2} />}
                    title={item.label}
                    sub={item.sub}
                    onClick={() => navigate(item.path)}
                  />
                ))}
              </TokenSheet>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{
              ...tokenSheet,
              background: '#f25252',
              border: '1px solid #ff7a7a',
            }}>
              <TokenRow
                icon={<LogOut size={15} strokeWidth={2.4} />}
                title="Sign out"
                glyphBg="rgba(12,16,24,0.28)"
                onClick={() => signOut?.()}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 2px 8px', fontSize: 11, fontWeight: 650, color: '#ff8a8a', fontFamily: neon.font }}>
              Danger zone
            </p>
            <div style={{
              ...tokenSheet,
              border: '1px solid rgba(242,82,82,0.5)',
              background: 'rgba(242,82,82,0.10)',
            }}>
              <TokenRow
                danger
                icon={<Trash2 size={15} strokeWidth={2.2} />}
                title="Delete account"
                sub={deletion.request ? 'Request pending — tap to review' : '30-day request · team review'}
                onClick={() => setDeleteOpen(true)}
              />
            </div>
          </div>
        </div>
      </motion.div>
      <DeleteAccountFlow
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        request={deletion.request}
        busy={deletion.busy}
        submit={deletion.submit}
        cancel={deletion.cancel}
      />
    </V2Page>
  );
}
