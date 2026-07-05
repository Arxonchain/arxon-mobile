import { DISCORD_ICON_PATH } from '@/lib/communityLinks';

export default function DiscordIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={DISCORD_ICON_PATH} />
    </svg>
  );
}
