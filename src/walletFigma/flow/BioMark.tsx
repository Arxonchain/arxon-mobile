export function FingerprintMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 11.2a3.2 3.2 0 0 1 3.2 3.2v1.8" />
      <path d="M8.8 12.1V14a3.2 3.2 0 0 0 6.4 0" />
      <path d="M7.2 10.6v3.2a4.8 4.8 0 0 0 8.2 3.4" />
      <path d="M12 7.6A6 6 0 0 0 6 13.6v.6" />
      <path d="M12 7.6A6 6 0 0 1 18 13.6v2.2" />
      <path d="M12 5.2A8.4 8.4 0 0 0 3.6 13.6" />
      <path d="M12 5.2A8.4 8.4 0 0 1 20.4 13.6v1.4" />
    </svg>
  );
}
