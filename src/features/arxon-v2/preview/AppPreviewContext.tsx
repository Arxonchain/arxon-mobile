import { createContext, useContext, type ReactNode } from 'react';

export const APP_PREVIEW_BASE = '/ui-preview';

const AppPreviewContext = createContext(false);

export function AppPreviewProvider({ children }: { children: ReactNode }) {
  return <AppPreviewContext.Provider value={true}>{children}</AppPreviewContext.Provider>;
}

export function useIsAppPreview() {
  return useContext(AppPreviewContext);
}

/** Map an in-app path to the preview route (e.g. `/mining` → `/ui-preview/mining`). */
export function toPreviewPath(path: string, base = APP_PREVIEW_BASE) {
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
