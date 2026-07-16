import { useWebBundleRefresh } from '@/hooks/useWebBundleRefresh';

/** Native-only: reload WebView when Cloudflare Pages deploys a new bundle. */
export default function WebBundleRefreshInit() {
  useWebBundleRefresh();
  return null;
}
