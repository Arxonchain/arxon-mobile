import { useCallback, useState } from 'react';
import { storage } from './storage';

export function useHideBalance() {
  const [hidden, setHidden] = useState(() => storage.getHideBalance());

  const toggle = useCallback(() => {
    setHidden((on) => {
      const next = !on;
      storage.setHideBalance(next);
      return next;
    });
  }, []);

  const show = useCallback((value: string | null | undefined) => (hidden ? '••••' : value ?? '—'), [hidden]);

  return { hidden, toggle, show };
}
