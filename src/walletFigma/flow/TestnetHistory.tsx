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

export function TestnetHistory({ go, limit, place: lockedPlace }: { go: Go; limit?: number; place?: Place }) {
  const live = useLiveFrame();
  const [place, setPlace] = useState<Place>(lockedPlace ?? 'all');
  const [model, setModel] = useState<Model>('all');
  const testnet = (live?.app ? flatten(live.activity) : []).filter((row) => row.network !== 'ethereum');
  const where = lockedPlace ?? (limit ? 'all' : place);
  const matched = testnet.filter((row) => {
    if (where !== 'all' && row.place !== where) return false;
    if (limit || model === 'all') return true;
    return row.model === model;
  });
  const rows = limit ? matched.slice(0, limit) : matched;
  const grouped = !limit && where === 'all';

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
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b9097', lineHeight: 1.4 }}>
          {!live?.app ? 'Testnet payments show up here.' : testnet.length === 0 ? 'No testnet transactions yet.' : matched.length === 0 && where === 'vault' ? 'No vault transactions yet. Private pay is filed here.' : 'Nothing matches this filter.'}
        </p>
      ) : grouped ? (
        <Grouped rows={rows} go={go} />
      ) : rows.map((row) => (
        <HistoryLine key={`${row.hash ?? row.title}-${row.sub}`} row={row} go={go} />
      ))}
      {limit && matched.length > limit ? (
        <button type="button" onClick={() => go('activity')} style={{ border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '4px 0', cursor: 'pointer' }}>See all</button>
      ) : null}
    </div>
  );
}

function HistoryLine({ row, go }: { row: Item; go: Go }) {
  const live = useLiveFrame();
  return (
    <button
      type="button"
      onClick={() => {
        if (row.hash) void live?.openTx(row.hash);
        go(row.to || 'tx');
      }}
      style={{ width: '100%', border: 'none', background: '#1c2025', color: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontFamily: font.sans, cursor: 'pointer' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{row.title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>{row.day} · {row.sub}</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{row.amount}</span>
    </button>
  );
}

function Grouped({ rows, go }: { rows: Item[]; go: Go }) {
  const home = rows.filter((row) => row.place !== 'vault');
  const vault = rows.filter((row) => row.place === 'vault');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Group label="Home" rows={home} empty="No home transactions yet." go={go} />
      <Group label="Vault" rows={vault} empty="No vault transactions yet. Private pay is filed here." go={go} />
    </div>
  );
}

function Group({ label, rows, empty, go }: { label: string; rows: Item[]; empty: string; go: Go }) {
  return (
    <div>
      <p style={{ margin: '4px 0 6px', fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#8c8f99' }}>{label}</p>
      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: '#8b9097', lineHeight: 1.35 }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => <HistoryLine key={`${row.hash ?? row.title}-${row.sub}`} row={row} go={go} />)}
        </div>
      )}
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
