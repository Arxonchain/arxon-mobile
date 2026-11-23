export function FingerprintMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 11a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M19 13c0 1-.2 2.7-.5 4" />
      <path d="M20 10a8.1 8.1 0 0 0-7.7-6h-.6c-4.4 0-8 3.58-8 8 0 1 .2 2.3.5 3.3" />
      <path d="M21 12c0 1 0 4-2 7" />
      <path d="M9 14.5c-.12.9-.18 1.8-.18 2.5 0 1.5.2 3.3.5 4.5" />
      <path d="M9 12a3 3 0 0 1 6 0c0 1-.1 2.2-.3 3.2" />
      <path d="M6.15 17.05A7.2 7.2 0 0 0 6 15.5V14" />
    </svg>
  );
}

export function FaceScanMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9.5 15c.8.8 1.7 1.2 2.5 1.2s1.7-.4 2.5-1.2" />
    </svg>
  );
}
