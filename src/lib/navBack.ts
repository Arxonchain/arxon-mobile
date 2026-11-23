import { useCallback } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';

export const NAV_BACK_FALLBACK = '/mine';

/** React Router records `idx` on history.state. Only then is -1 an in-app page. */
export function routerCanGoBack(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

export function goBack(navigate: NavigateFunction, fallback = NAV_BACK_FALLBACK, preview = false) {
  if (routerCanGoBack()) {
    navigate(-1);
    return;
  }
  navigate(preview ? toPreviewPath(fallback) : fallback);
}

export function useGoBack(fallback = NAV_BACK_FALLBACK) {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  return useCallback(() => {
    goBack(navigate, fallback, preview);
  }, [fallback, navigate, preview]);
}
