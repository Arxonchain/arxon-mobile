/** Dispatch in-app navigation (works with HashRouter on native). */
export function dispatchAppNavigate(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.dispatchEvent(new CustomEvent('arxon:navigate', { detail: { path: normalized } }));
}
