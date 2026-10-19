import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { markBootOk } from '@/lib/bootState';
import FlowStudio from './walletFigma/flow/FlowStudio';

class FlowGuard extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || 'This screen failed to draw.' };
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ margin: 0, padding: 24, color: '#fff', background: '#07080c', whiteSpace: 'pre-wrap' }}>
          {this.state.error}
        </pre>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
document.title = 'Arxon wallet screens';
document.documentElement.style.background = '#07080c';
document.documentElement.style.height = '100%';
document.documentElement.style.overflow = 'hidden';
document.body.style.background = '#07080c';
document.body.style.color = '#ffffff';
document.body.style.height = '100%';
document.body.style.overflow = 'hidden';
if (rootEl) {
  rootEl.style.height = '100%';
  rootEl.style.overflow = 'hidden';
}

if (rootEl) {
  createRoot(rootEl).render(
    <FlowGuard>
      <FlowStudio />
    </FlowGuard>,
  );
}

markBootOk();
