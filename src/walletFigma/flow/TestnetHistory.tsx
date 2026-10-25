import { useState } from 'react';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame, type LiveActivity } from './liveFrame';

type Go = (id: string, remember?: boolean) => void;
type Place = 'all' | 'home' | 'vault';
type Model = 'all' | 'public' | 'private' | 'shield' | 'unshield';
type Item = LiveActivity['items'][number] & { day: string };

const PLACES: [Place, string][] = [['all', 'All'], ['home', 'Home'], ['vault', 'Vault']];
const MODELS: [Model, string][] = [
  ['all', 'All types'],
  ['public', 'Public'],
  ['private', 'Private pay'],
  ['shield', 'Shield'],
  ['unshield', 'Unshield'],
];

export function TestnetHistory({ go, limit }: { go: Go; limit?: number }) {
  const live = useLiveFrame();
  const [place, setPlace] = useState<Place>('all');
  const [model, setModel] = useState<Model>('all');
  const testnet = (live?.app ? flatten(live.activity) : []).filter((row) => row.network !== 'ethereum');
  const matched = testnet.filter((row) => {
    if (limit) return true;
    if (place !== 'all' && row.place !== place) return false;
    if (model !== 'all' && row.model !== model) return false;
    return true;
  });
  const rows = limit ? matched.slice(0, limit) : matched;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {limit ? null : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLACES.map(([id, label]) => (
              <Chip key={id} label={label} on={place === id} onClick={() => setPlace(id)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MODELS.map(([id, label]) => (
              <Chip key={id} label={label} on={model === id} onClick={() => setModel(id)} />
            ))}
          </div>
        </>
      )}
      {rows.length === 0 ? (
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#8b9097', lineHeight: 1.4 }}>
          {!live?.app ? 'Testnet payments show up here.' : testnet.length === 0 ? 'No testnet transactions yet.' : 'Nothing matches this filter.'}
        </p>
      ) : rows.map((row) => (
        <button
          key={`${row.hash ?? row.title}-${row.sub}`}
          type="button"
          onClick={() => {
            if (row.hash) void live?.openTx(row.hash);
            go(row.to || 'tx');
          }}
          style={{ width: '100%', border: 'none', background: '#1c2025', color: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: font.sans, cursor: 'pointer' }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{row.title}</span>
            <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: '#8b9097' }}>{row.day} · {row.sub}</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{row.amount}</span>
        </button>
      ))}
      {limit && testnet.length > limit ? (
        <button type="button" onClick={() => go('activity')} style={{ border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '4px 0', cursor: 'pointer' }}>See all</button>
      ) : null}
    </div>
  );
}

function flatten(groups: LiveActivity[]): Item[] {
  return groups.flatMap((group) => group.items.map((item) => ({ ...item, day: group.day })));
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ minHeight: 36, padding: '0 14px', borderRadius: 18, border: 'none', background: on ? '#accafe' : '#1c2025', color: on ? '#0c1018' : '#fff', fontFamily: font.sans, fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
