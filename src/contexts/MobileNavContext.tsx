import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

type MobileNavContextValue = {
  hideNav: boolean;
  setHideNav: (hide: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue>({
  hideNav: false,
  setHideNav: () => {},
});

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [hideNav, setHideNav] = useState(false);
  const value = useMemo(() => ({ hideNav, setHideNav }), [hideNav]);
  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
