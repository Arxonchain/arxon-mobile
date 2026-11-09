import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Clock,
  Download,
  Globe,
  RefreshCw,
  ServerCrash,
  ShieldOff,
  WifiOff,
  Wrench,
} from 'lucide-react';

export type FailureType =
  | 'ota_load_failed'
  | 'offline'
  | 'backend_down'
  | 'session_expired'
  | 'timeout'
  | 'maintenance'
  | 'update_required'
  | 'not_found'
  | 'unknown';

export interface FailureCopy {
  title: string;
  message: string;
  icon: LucideIcon;
  primaryLabel: string;
  secondaryLabel?: string;
}

export const failureCatalog: Record<FailureType, FailureCopy> = {
  ota_load_failed: {
    title: "Can't reach Arxon",
    message: 'The latest app version could not load. Check internet, then retry.',
    icon: Globe,
    primaryLabel: 'Retry',
    secondaryLabel: 'Restart app',
  },
  offline: {
    title: 'No connection',
    message: 'Arxon needs internet to load. Check Wi‑Fi or mobile data, then retry.',
    icon: WifiOff,
    primaryLabel: 'Retry',
  },
  backend_down: {
    title: 'Service unavailable',
    message: 'Our servers are unreachable right now. Your account is safe — try again shortly.',
    icon: ServerCrash,
    primaryLabel: 'Retry',
  },
  session_expired: {
    title: 'Session expired',
    message: 'Sign in again to continue.',
    icon: ShieldOff,
    primaryLabel: 'Sign in',
  },
  timeout: {
    title: 'Taking too long',
    message: 'The connection timed out. Retry, or restart the app if it stays stuck.',
    icon: Clock,
    primaryLabel: 'Retry',
    secondaryLabel: 'Restart app',
  },
  maintenance: {
    title: 'Maintenance in progress',
    message: 'Arxon is upgrading. Check back in a few minutes.',
    icon: Wrench,
    primaryLabel: 'Retry',
  },
  update_required: {
    title: 'Update required',
    message: 'A new version is available. Update from the store to continue.',
    icon: Download,
    primaryLabel: 'Update app',
  },
  not_found: {
    title: 'Page not found',
    message: "This page doesn't exist or has moved.",
    icon: AlertTriangle,
    primaryLabel: 'Go home',
  },
  unknown: {
    title: 'Something went wrong',
    message: 'Refresh the app and try again.',
    icon: AlertTriangle,
    primaryLabel: 'Refresh',
  },
};

export type LoadFailureKind = 'network' | 'dns' | 'server' | 'timeout' | 'unknown';

export function loadFailureToType(kind: LoadFailureKind): FailureType {
  switch (kind) {
    case 'dns':
    case 'network':
      return 'ota_load_failed';
    case 'server':
      return 'backend_down';
    case 'timeout':
      return 'timeout';
    default:
      return 'unknown';
  }
}

export function getFailureCopy(type: FailureType): FailureCopy {
  return failureCatalog[type];
}
