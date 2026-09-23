import { Construction } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon.svg';
import { errorUi, glassMeshBackground, glassPanelStyle } from '@/components/system/errorUiTokens';
import {
  APP_MAINTENANCE_FOLLOWUP,
  APP_MAINTENANCE_MESSAGE,
  APP_MAINTENANCE_TITLE,
} from '@/lib/appMaintenance';

/** Blocks the entire app (no auth, no mining) during platform maintenance. */
export default function AppMaintenanceScreen() {
  const g = errorUi.glass;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: errorUi.criticalZ + 10,
        background: g.overlayBgStrong,
        backdropFilter: g.blurStrong,
        WebkitBackdropFilter: g.blurStrong,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: errorUi.font,
        overflow: 'auto',
      }}
    >
      <div style={glassMeshBackground()} />
      <div
        style={{
          ...glassPanelStyle(),
          textAlign: 'center',
          padding: '32px 28px',
          maxWidth: 420,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            overflow: 'hidden',
            margin: '0 auto 20px',
            border: `1px solid ${g.badgeBorder}`,
            boxShadow: `${g.innerHighlight}, 0 0 36px ${errorUi.cyanGlow}`,
          }}
        >
          <img src={arxonLogo} alt="Arxon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <Construction size={28} color={errorUi.cyan} style={{ marginBottom: 16 }} />
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: 22,
            fontWeight: 800,
            color: errorUi.text,
            letterSpacing: '0.03em',
          }}
        >
          {APP_MAINTENANCE_TITLE}
        </h1>
        <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55, color: errorUi.textMuted }}>
          {APP_MAINTENANCE_MESSAGE}
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'rgba(232,252,255,0.55)' }}>
          {APP_MAINTENANCE_FOLLOWUP}
        </p>
      </div>
    </div>
  );
}
