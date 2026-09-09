import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface TabSection {
  id: string;
  label: string;
}

interface TabsContextValue {
  activeId: string;
  setActiveId: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within a TabsProvider');
  return ctx;
}

/**
 * Replaces the old scroll-snap document with click-to-switch tabs. The
 * active tab is kept in the URL hash (not just component state) so the
 * header/footer's existing `/#hero`-style anchors (Layout.tsx) and the
 * browser back/forward buttons keep working exactly as before — this is
 * the "client-side routing" half of the tab restructure, the hash change
 * itself needs no route/page reload since BrowserRouter tracks it.
 */
export function TabsProvider({ sections, children }: { sections: TabSection[]; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const ids = sections.map((s) => s.id);
  const hashId = location.hash.replace(/^#/, '');
  const [activeId, setActiveIdState] = useState<string>(ids.includes(hashId) ? hashId : (ids[0] ?? ''));

  useEffect(() => {
    const currentHashId = location.hash.replace(/^#/, '');
    if (ids.includes(currentHashId) && currentHashId !== activeId) {
      setActiveIdState(currentHashId);
    }
    // Only the hash should re-sync this; re-running on every `ids`/`activeId`
    // identity change would fight the click-driven update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  function setActiveId(id: string) {
    if (!ids.includes(id) || id === activeId) return;
    setActiveIdState(id);
    navigate(`${location.pathname}#${id}`, { replace: false });
  }

  return <TabsContext.Provider value={{ activeId, setActiveId }}>{children}</TabsContext.Provider>;
}
