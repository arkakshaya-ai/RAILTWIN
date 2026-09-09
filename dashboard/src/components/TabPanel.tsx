import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTabs } from './TabsProvider';

interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

const FADE_MS = 200;

/**
 * Replaces ScrollSection: instead of every MODULE/SECTION block being
 * permanently mounted in one scroll-snap document, only the active tab's
 * panel is mounted at all. Each panel drives its own opacity independently
 * off the shared `activeId`, so the outgoing and incoming panel fade
 * concurrently (a real crossfade) rather than one waiting on the other —
 * plain `transition-opacity duration-200`, no animation library.
 */
export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const { activeId } = useTabs();
  const isActive = activeId === id;
  const [mounted, setMounted] = useState(isActive);
  const [visible, setVisible] = useState(isActive);
  const unmountTimer = useRef<number>();

  useEffect(() => {
    window.clearTimeout(unmountTimer.current);

    if (isActive) {
      setMounted(true);
      // Mount at opacity-0 first, then flip to opacity-100 next frame so the
      // transition actually animates instead of appearing instantly.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setVisible(false);
    unmountTimer.current = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(unmountTimer.current);
  }, [isActive]);

  if (!mounted) return null;

  return (
    <section
      id={id}
      className={`transition-opacity duration-200 ease-out ${visible ? 'opacity-100' : 'opacity-0'} py-space-lg desktop:min-h-[calc(100vh-5rem)] desktop:py-space-3xl desktop:flex desktop:flex-col desktop:justify-center ${className}`}
    >
      {children}
    </section>
  );
}
