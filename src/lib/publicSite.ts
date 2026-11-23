const CANONICAL_SITE = 'https://arxonchain.xyz';

/** Public website origin for referral links. Never uses localhost / USB origin. */
export function publicSiteUrl() {
  const configured = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').replace(/\/+$/, '').trim();
  if (configured && !/localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{2,5}$/i.test(configured) && !configured.startsWith('http://')) {
    return configured;
  }
  return CANONICAL_SITE;
}

export function publicReferralUrl(code: string) {
  return `${publicSiteUrl()}/?ref=${encodeURIComponent(code)}`;
}

/** Truncated label for UI. Copy/share still use the full URL. */
export function displayReferralLink(full: string) {
  try {
    const url = new URL(full);
    const ref = url.searchParams.get('ref') || '';
    const short = ref.length > 8 ? `${ref.slice(0, 7)}…` : ref;
    return `arxonchain.xyz/?ref=${short}`;
  } catch {
    return 'arxonchain.xyz/?ref=…';
  }
}
