import { Capacitor } from "@capacitor/core";

/**
 * Public site origin for auth email links (confirm, reset, magic link).
 * Must NOT use capacitor://localhost or file:// — those break email links on mobile.
 */
export function getPublicSiteOrigin(): string {
  const configured = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/+$/, "");
  if (configured) return configured;

  if (typeof window === "undefined") {
    return "https://arxonchain.xyz";
  }

  const { origin, hostname, protocol } = window.location;

  if (Capacitor.isNativePlatform()) {
    return "https://arxonchain.xyz";
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    protocol === "file:" ||
    origin.startsWith("capacitor://")
  ) {
    return "https://arxonchain.xyz";
  }

  if (hostname.endsWith("vercel.app") || hostname.endsWith("pages.dev")) {
    return "https://arxonchain.xyz";
  }

  return origin.replace(/\/+$/, "");
}

export function getAuthRedirectUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteOrigin()}${normalizedPath}`;
}

/** Route through /auth/confirm — exact path for Supabase redirect allowlist. */
export function getPasswordResetRedirectUrl(): string {
  return getAuthRedirectUrl("/auth/confirm");
}

export function getEmailConfirmRedirectUrl(): string {
  return getAuthRedirectUrl("/auth/confirm");
}

export function getMagicLinkRedirectUrl(): string {
  return getAuthRedirectUrl("/auth/confirm");
}
