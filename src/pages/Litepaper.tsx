import { V2Page } from '@/features/arxon-v2/design/Kit';
import { GhostBtn, ProfileHead } from '@/features/arxon-v2/design/ProfileChrome';
import { openInAppBrowse } from '@/walletFigma/flow/inAppBrowse';

const WHITEPAPER_URL = 'https://arxonchain.org/whitepaper';

export default function Litepaper() {
  return (
    <V2Page padBottom={0}>
      <ProfileHead title="Whitepaper" subtitle="arxonchain.org/whitepaper" />
      <div style={{ padding: '0 12px 12px', boxSizing: 'border-box' }}>
        <div
          style={{
            height: 'calc(100dvh - 148px)',
            minHeight: 360,
            borderRadius: 22,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#fff',
          }}
        >
          <iframe
            title="Arxon Whitepaper"
            src={WHITEPAPER_URL}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <GhostBtn label="Open on arxonchain.org" onClick={() => openInAppBrowse(WHITEPAPER_URL)} />
        </div>
      </div>
    </V2Page>
  );
}
