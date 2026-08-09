import { Outlet } from 'react-router-dom';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { AppPreviewProvider } from './AppPreviewContext';
import PreviewBottomNav from './PreviewBottomNav';
import PreviewPageRail from './PreviewPageRail';

/** Full in-browser mobile app preview — layout shell; routes render via `<Outlet />`. */
export default function AppPreviewShell() {
  return (
    <AppPreviewProvider>
      <div style={{
        minHeight: '100vh', display: 'flex', background: '#030508',
        fontFamily: neon.font,
      }}>
        <PreviewPageRail />

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px 24px 24px 0', minWidth: 0,
        }}>
          <div style={{ marginBottom: 12, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.textMuted }}>
              Native app viewport · 390×844
            </p>
          </div>

          <div style={{
            width: 390, maxWidth: '100%', height: 'min(844px, calc(100vh - 80px))',
            borderRadius: 44, overflow: 'hidden', position: 'relative',
            border: '10px solid #141820', boxShadow: '0 24px 80px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)',
            background: neon.deep,
            transform: 'translateZ(0)',
            isolation: 'isolate',
          }}>
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 96, height: 28, borderRadius: 20, background: '#0a0e14', zIndex: 300, pointerEvents: 'none' }} />

            <div style={{
              height: '100%', overflowY: 'auto', overflowX: 'hidden', position: 'relative',
              touchAction: 'pan-y', overscrollBehaviorY: 'contain',
              // Own compositing layer so this scroll container isn't tied to the phone-frame's
              // transform/isolation context above — nesting a scrollable node inside a
              // transformed + overflow:hidden ancestor is a known WebKit cause of scroll
              // "freezing" mid-gesture on touch devices.
              transform: 'translateZ(0)', willChange: 'scroll-position',
            }}>
              <Outlet />
            </div>

            <PreviewBottomNav />
          </div>
        </div>
      </div>
    </AppPreviewProvider>
  );
}

export function PreviewSpinner() {
  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${neon.cyan}33`, borderTopColor: neon.cyan, animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
