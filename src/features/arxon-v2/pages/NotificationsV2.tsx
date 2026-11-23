import { useState } from 'react';
import { Bell, Gift, Trophy, CheckCheck } from 'lucide-react';
import { useInAppNotifications, type AppNotification } from '@/hooks/useInAppNotifications';
import { displayNotificationMessage, displayNotificationTitle } from '@/lib/notificationDisplay';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { MineLoad } from '../components/MineLoad';
import { V2Page } from '../design/Kit';
import { neon } from '../design/neonTokens';
import {
  Body,
  EmptyCopy,
  FrostPanel,
  GlassSheet,
  pc,
  ProfileHead,
  TokenRow,
} from '../design/ProfileChrome';

function getIcon(type: string) {
  if (type === 'arena_win' || type === 'rumble_reward' || type === 'arena' || type.includes('arena_win'))
    return <Trophy size={14} />;
  if (type === 'arena_loss') return <Trophy size={14} />;
  return type.startsWith('arena') || type === 'new_tasks' ? <Bell size={14} /> : <Gift size={14} />;
}

function formatDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsV2() {
  const { notifications, loading, markRead, reload } = useInAppNotifications();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const pull = usePullRefresh(() => reload(), { threshold: 28 });
  const hasUnread = notifications.some((n) => !n.read);

  if (selected) {
    return (
      <V2Page>
        <ProfileHead title="Notification" subtitle={formatDate(selected.created_at)} onBack={() => setSelected(null)} />
        <div style={{ padding: '0 16px 12px' }}>
          <FrostPanel>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 750, color: pc.ink, letterSpacing: '-0.3px', fontFamily: neon.font, lineHeight: 1.25 }}>
              {displayNotificationTitle(selected.title)}
            </p>
            {selected.amount != null && selected.amount !== 0 ? (
              <p style={{
                margin: '10px 0 0',
                fontSize: 15,
                fontWeight: 750,
                color: selected.amount > 0 ? '#1a7a45' : pc.danger,
                fontFamily: neon.font,
              }}>
                {selected.amount > 0 ? '+' : ''}{selected.amount.toLocaleString()} ARX-P
              </p>
            ) : null}
            <div style={{ marginTop: 10 }}>
              <Body ink>{displayNotificationMessage(selected.message)}</Body>
            </div>
          </FrostPanel>
        </div>
      </V2Page>
    );
  }

  return (
    <V2Page pull={pull}>
      <ProfileHead
        title="Notifications"
        subtitle="Arena, rewards and updates"
        right={hasUnread ? (
          <button
            type="button"
            aria-label="Mark all read"
            onClick={() => markRead()}
            style={{
              width: 38, height: 38, borderRadius: 19, border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <CheckCheck size={15} />
          </button>
        ) : undefined}
      />
      <div style={{ padding: '0 16px 12px' }}>
        {loading ? (
          <MineLoad waiting extra={pull.busy} kind="rows" rowCount={6} radius={22}>
            <div style={{ height: 240 }} />
          </MineLoad>
        ) : notifications.length === 0 ? (
          <GlassSheet>
            <EmptyCopy title="Nothing yet" body="Rewards and updates will show here." />
          </GlassSheet>
        ) : (
          <GlassSheet title={`${notifications.length} items`}>
            <MineLoad extra={pull.busy} kind="rows" rowCount={4} radius={0}>
              {notifications.map((n) => (
                <TokenRow
                  key={n.id}
                  wrap
                  icon={getIcon(n.type)}
                  title={displayNotificationTitle(n.title)}
                  sub={`${displayNotificationMessage(n.message)} · ${formatDate(n.created_at)}`}
                  onClick={() => { if (!n.read) markRead(n.id); setSelected(n); }}
                  trailing={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {n.amount != null && n.amount !== 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: n.amount > 0 ? pc.good : pc.soft }}>
                          {n.amount > 0 ? '+' : ''}{n.amount.toLocaleString()}
                        </span>
                      ) : null}
                      {!n.read ? <span style={{ width: 6, height: 6, borderRadius: 3, background: pc.cream }} /> : null}
                    </span>
                  }
                />
              ))}
            </MineLoad>
          </GlassSheet>
        )}
      </div>
    </V2Page>
  );
}
