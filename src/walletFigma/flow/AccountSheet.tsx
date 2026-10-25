import { useRef, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { briefAddr } from './briefAddr';

type Go = (id: string, remember?: boolean) => void;
export type AccountSheetMode = 'list' | 'add' | null;

/** Account list and Add account. Create uses the next HD index. Import stays on the existing screen. */
export function AccountSheet({ mode, setMode, go }: { mode: AccountSheetMode; setMode: (mode: AccountSheetMode) => void; go: Go }) {
  const live = useLiveFrame();
  const [name, setName] = useState('');
  const creating = useRef(false);
  if (!mode || !live?.app) return null;

  async function create() {
    if (creating.current) return;
    creating.current = true;
    try {
      await live!.addAccount(name.trim() || undefined);
      setName('');
      setMode('list');
    } finally {
      creating.current = false;
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 24 }}>
      <button type="button" aria-label="Close" onClick={() => setMode(null)} style={dim} />
      <div style={sheet}>
        <div style={handle} />
        {mode === 'add' ? (
          <>
            <p style={title}>Add account</p>
            <p style={copy}>A new account is the next address from this recovery phrase. No new 12-word phrase is created.</p>
            <p style={label}>Account name (optional)</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Account name"
              placeholder="Account name"
              style={field}
            />
            <button type="button" onClick={() => void create()} style={primary}>Create account</button>
            <p style={{ ...copy, marginTop: 14 }}>Importing a different recovery phrase or private key replaces this wallet. It is not a second wallet.</p>
            <button type="button" onClick={() => { setMode(null); go('import'); }} style={textBtn}>Import a wallet instead</button>
          </>
        ) : (
          <>
            <p style={title}>Accounts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {live.accounts.map((row) => {
                const on = row.index === live.accountIndex;
                return (
                  <button
                    key={row.index}
                    type="button"
                    onClick={() => { void live.setAccountIndex(row.index); setMode(null); }}
                    style={accountRow}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 600 }}>{row.label}</span>
                      <span style={{ display: 'block', marginTop: 2, color: '#8b9097', fontSize: 12 }}>
                        {on && live.address ? briefAddr(live.address) : 'Same recovery phrase'}
                      </span>
                    </span>
                    {on ? <FigmaImg src="/wallet-figma/buy/check.svg" width={20} height={20} /> : null}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setMode('add')} style={outline}>Add account</button>
          </>
        )}
      </div>
    </div>
  );
}

const dim: CSSProperties = { position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.55)', padding: 0, cursor: 'pointer' };
const sheet: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 18px calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight: '86%', overflowY: 'auto' };
const handle: CSSProperties = { width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto 12px' };
const title: CSSProperties = { margin: '0 0 8px', fontSize: 20, fontWeight: 700 };
const copy: CSSProperties = { margin: 0, color: '#8b9097', fontSize: 13, lineHeight: 1.4 };
const label: CSSProperties = { margin: '14px 0 8px', color: '#8b9097', fontSize: 13 };
const field: CSSProperties = { width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 14, border: '1px solid #2a3447', background: '#1c2025', color: '#fff', padding: '0 14px', fontFamily: font.sans, fontSize: 16 };
const primary: CSSProperties = { width: '100%', height: 48, marginTop: 16, border: 'none', borderRadius: 12, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const outline: CSSProperties = { width: '100%', height: 48, marginTop: 12, borderRadius: 12, border: '1px solid #2a3447', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const textBtn: CSSProperties = { marginTop: 8, width: '100%', minHeight: 44, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const accountRow: CSSProperties = { width: '100%', minHeight: 64, border: 'none', borderRadius: 14, background: '#1c2025', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', cursor: 'pointer', boxSizing: 'border-box' };
