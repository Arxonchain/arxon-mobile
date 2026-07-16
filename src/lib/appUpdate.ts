import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export type AppVersionRequirement = {
  minBuild: number;
  latestBuild: number;
  message: string;
  storeUrl: string;
};

const ANDROID_PACKAGE = 'xyz.arxonchain.app';
import { PRODUCTION_APP_ORIGIN } from '@/lib/appOrigins';

export async function getNativeBuildNumber(): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!Capacitor.isPluginAvailable('App')) return null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const build = parseInt(info.build || '0', 10);
    return Number.isFinite(build) && build > 0 ? build : null;
  } catch (e) {
    console.warn('[appUpdate] getNativeBuildNumber failed:', e);
    return null;
  }
}

async function fetchFromSupabase(platform: string): Promise<AppVersionRequirement | null> {
  try {
    const { data, error } = await supabase
      .from('mobile_app_version' as never)
      .select('min_build, latest_build, message, store_url')
      .eq('platform', platform)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as {
      min_build: number;
      latest_build: number;
      message: string | null;
      store_url: string;
    };
    return {
      minBuild: row.min_build,
      latestBuild: row.latest_build,
      message: row.message || 'Please update Arxon to the latest version.',
      storeUrl: row.store_url,
    };
  } catch {
    return null;
  }
}

async function fetchFromJson(platform: string): Promise<AppVersionRequirement | null> {
  try {
    const origin = Capacitor.isNativePlatform() ? PRODUCTION_APP_ORIGIN : window.location.origin;
    const res = await fetch(`${origin}/app-version.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const minBuild = platform === 'ios' ? json.iosMinBuild : json.androidMinBuild;
    const storeUrl = platform === 'ios' ? json.iosStoreUrl : json.androidStoreUrl;
    if (typeof minBuild !== 'number') return null;
    return {
      minBuild,
      latestBuild: minBuild,
      message: json.message || 'Please update Arxon to the latest version.',
      storeUrl: storeUrl || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    };
  } catch {
    return null;
  }
}

export async function fetchVersionRequirement(): Promise<AppVersionRequirement | null> {
  const platform = Capacitor.getPlatform();
  if (platform !== 'android' && platform !== 'ios') return null;
  return (await fetchFromSupabase(platform)) ?? (await fetchFromJson(platform));
}

export async function openAppStore(storeUrl: string) {
  const platform = Capacitor.getPlatform();
  const marketUrl =
    platform === 'android'
      ? `market://details?id=${ANDROID_PACKAGE}`
      : storeUrl;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: marketUrl });
      return;
    } catch {
      try {
        window.location.href = marketUrl;
        return;
      } catch { /* fall through */ }
    }
  }
  window.open(storeUrl, '_blank', 'noopener,noreferrer');
}

export async function isUpdateRequired(): Promise<{
  required: boolean;
  currentBuild: number | null;
  requirement: AppVersionRequirement | null;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { required: false, currentBuild: null, requirement: null };
  }

  const [currentBuild, requirement] = await Promise.all([
    getNativeBuildNumber(),
    fetchVersionRequirement(),
  ]);

  if (currentBuild == null || requirement == null) {
    return { required: false, currentBuild, requirement };
  }

  return {
    required: currentBuild < requirement.minBuild,
    currentBuild,
    requirement,
  };
}
