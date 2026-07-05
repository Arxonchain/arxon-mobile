/** Official Arxon community links — single source of truth for mobile + web. */
export const COMMUNITY_LINKS = {
  telegram: {
    label: 'Telegram',
    href: 'https://t.me/Arxonofficial',
  },
  x: {
    label: 'X',
    href: 'https://x.com/arxoninfra',
    handle: '@arxoninfra',
  },
  discord: {
    label: 'Discord',
    href: 'https://discord.gg/7FXxFDTqwj',
  },
} as const;

/** Terms that qualify social/X post submissions (mention or hashtag). */
export const SOCIAL_POST_REQUIRED_TERMS = [
  COMMUNITY_LINKS.x.handle,
  '#arxon',
  '#arxonmining',
  '#arxonchain',
  'arxon',
] as const;

/** Discord logo path (fill-based, works with fill="currentColor"). */
export const DISCORD_ICON_PATH =
  'M19.27 5.33C17.72 4.71 16.09 4.26 14.43 4c-.14.24-.29.57-.4.83-1.49-.22-2.97-.22-4.43 0-.11-.26-.26-.59-.41-.83-1.66.26-3.29.71-4.84 1.33C1.41 9.09.68 12.65 1.05 16.17c1.53 1.12 3.02 1.81 4.47 2.26.36-.5.68-1.03.96-1.59-.53-.2-1.04-.45-1.52-.73.13-.09.25-.19.37-.28 2.91 1.36 6.07 1.36 8.96 0 .12.1.24.2.37.28-.48.28-.99.53-1.52.73.28.56.6 1.09.96 1.59 1.45-.45 2.94-1.14 4.47-2.26.42-4.08-.72-7.67-3.23-10.84zM8.02 13.52c-.87 0-1.57-.78-1.57-1.74s.69-1.74 1.57-1.74 1.58.78 1.58 1.74-.71 1.74-1.58 1.74zm7.95 0c-.87 0-1.57-.78-1.57-1.74s.69-1.74 1.57-1.74 1.58.78 1.58 1.74-.71 1.74-1.58 1.74z';
