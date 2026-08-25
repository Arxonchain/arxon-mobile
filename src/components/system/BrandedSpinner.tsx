import { errorUi } from './errorUiTokens';

interface Props {
  size?: number;
  label?: string;
}

/** Neon ring spinner used in loading overlays and Suspense fallbacks. */
export default function BrandedSpinner({ size = 44, label }: Props) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        fontFamily: errorUi.font,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3px solid ${errorUi.cyan}33`,
          borderTopColor: errorUi.cyan,
          animation: 'arxonSpin 0.9s linear infinite',
        }}
      />
      {label ? (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: errorUi.textMuted,
          }}
        >
          {label}
        </p>
      ) : null}
      <style>{'@keyframes arxonSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
