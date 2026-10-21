import { Capacitor } from '@capacitor/core';
import { NETWORKS, type WalletNetworkId } from '@/chainWallet/networks';

export const HELP_URL = 'https://arxon.io';
export const TERMS_URL = 'https://arxonchain.xyz/terms';
export const PRIVACY_URL = 'https://arxonchain.xyz/privacy';
export const SUPPORT_EMAIL = 'security@arxonchain.xyz';
export const WEB_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || '1.0.0';

export async function appVersion() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      return info.version || WEB_VERSION;
    }
  } catch {
    /* web build */
  }
  return WEB_VERSION;
}

/** Native WebViews drop window.open, so use the in-app browser there. */
export async function openExternal(url: string) {
  if (url.startsWith('mailto:')) {
    window.location.href = url;
    return;
  }
  try {
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    }
  } catch {
    /* fall through to the web path */
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function explorerTxUrl(hash: string, network: WalletNetworkId) {
  return `${NETWORKS[network].explorer.replace(/\/$/, '')}/tx/${hash}`;
}
