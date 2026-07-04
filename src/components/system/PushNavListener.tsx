import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_EVENT = 'arxon:navigate';

export default function PushNavListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const onNav = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail?.path;
      if (path) navigate(path);
    };
    window.addEventListener(NAV_EVENT, onNav);
    return () => window.removeEventListener(NAV_EVENT, onNav);
  }, [navigate]);

  return null;
}
