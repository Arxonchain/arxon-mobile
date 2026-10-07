import { useFourTxClaim } from '@/hooks/useFourTxClaim';
import { toast } from '@/hooks/use-toast';
import { neon } from '@/features/arxon-v2/design/neonTokens';

const STEPS: { key: 'shield' | 'privatePay' | 'unshieldSelf' | 'unshieldOther'; label: string }[] = [
  { key: 'shield', label: 'Shield' },
  { key: 'privatePay', label: 'Private pay' },
  { key: 'unshieldSelf', label: 'Unshield to you' },
  { key: 'unshieldOther', label: 'Unshield to other' },
];

export default function FourTxClaimCard({ preview = false }: { preview?: boolean }) {
  const { progress, claimedToday, claiming, error, claim, amount } = useFourTxClaim(!preview);

  if (preview || claimedToday || !progress) return null;

  const complete = progress.complete;
  const showOverlay = complete;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 16,
        borderRadius: neon.radius.md,
        background: showOverlay
          ? 'linear-gradient(180deg, rgba(79,216,235,0.18) 0%, rgba(9,26,48,0.96) 100%)'
          : 'rgba(9,26,48,0.72)',
        border: `1px solid ${showOverlay ? neon.panelBorder : 'rgba(79,216,235,0.18)'}`,
      }}
    >
      {showOverlay ? (
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.16em', fontWeight: 800, color: neon.cyan }}>
          FOUR-TX TEST
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.16em', fontWeight: 800, color: neon.textMuted }}>
          FOUR-TX TEST
        </p>
      )}
      {showOverlay ? (
        <p style={{ margin: '8px 0 4px', fontSize: 28, fontWeight: 900, color: neon.text, letterSpacing: '-0.6px' }}>
          {amount.toLocaleString()} ARX-P
        </p>
      ) : (
        <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: neon.text }}>
          Complete all four in this app today
        </p>
      )}
      <p style={{ margin: '0 0 12px', fontSize: 12, color: neon.textMuted }}>
        Same UTC day · Included txs only · not tARX
      </p>
      <div style={{ display: 'grid', gap: 8, marginBottom: showOverlay ? 14 : 0 }}>
        {STEPS.map((step) => {
          const done = !!progress[step.key];
          return (
            <label key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: neon.text }}>
              <input type="checkbox" checked={done} readOnly />
              {step.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p style={{ fontSize: 12, color: '#ff8a7a', margin: '0 0 10px' }}>{error}</p>
      ) : null}
      {showOverlay ? (
        <button
          type="button"
          disabled={claiming}
          onClick={() => {
            void claim().then((res) => {
              if (res.success && !res.already) {
                toast({ title: `+${amount} ARX-P`, description: 'Four-tx test claimed for today.' });
              } else if (res.already) {
                toast({ title: 'Already claimed', description: 'This UTC day is already credited.' });
              }
            });
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 14,
            border: `1px solid ${neon.panelBorder}`,
            background: neon.cyan,
            color: '#041018',
            fontSize: 14,
            fontWeight: 800,
            cursor: claiming ? 'wait' : 'pointer',
          }}
        >
          {claiming ? 'Claiming…' : 'Claim'}
        </button>
      ) : null}
    </div>
  );
}
