import { evaluateDailyMission, getDailyMission, type MissionSnapshot } from '../engine/dailyMission';

interface DailyMissionStripProps {
  snapshot: MissionSnapshot;
}

/** Slim in-game milestone tracker — only shown during daily runs. */
export function DailyMissionStrip({ snapshot }: DailyMissionStripProps) {
  const mission = getDailyMission();
  const status = evaluateDailyMission(mission, snapshot);
  const pct = Math.round(status.progress * 100);

  return (
    <div style={{
      flexShrink: 0,
      marginTop: 8,
      padding: '8px 12px',
      borderRadius: 12,
      background: 'rgba(5,14,28,0.82)',
      border: `1px solid ${status.met ? 'rgba(132,217,47,0.4)' : 'rgba(255,217,61,0.28)'}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        marginBottom: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{mission.emoji}</span>
          <span style={{
            fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: '#ffd93d',
            textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {mission.shortLabel}
          </span>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, color: status.met ? '#84d92f' : 'rgba(200,230,255,0.55)',
          flexShrink: 0,
        }}>
          {status.met ? 'Goal met' : status.detail}
        </span>
      </div>
      <div style={{
        height: 5, borderRadius: 3, overflow: 'hidden',
        background: 'rgba(4,12,26,0.9)', border: '1px solid rgba(79,216,235,0.15)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: status.met
            ? 'linear-gradient(90deg, #84d92f, #ffd93d)'
            : 'linear-gradient(90deg, #ff9d1b, #ffd93d)',
          boxShadow: status.met ? '0 0 8px rgba(132,217,47,0.5)' : undefined,
          transition: 'width 0.35s ease',
        }} />
      </div>
    </div>
  );
}
