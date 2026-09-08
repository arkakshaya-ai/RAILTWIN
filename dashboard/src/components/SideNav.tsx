import { useState } from 'react';
import { useActiveSection } from '../hooks/useActiveSection';

export interface SideNavSection {
  id: string;
  label: string;
}

interface SideNavProps {
  sections: SideNavSection[];
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Desktop (>=lg): fixed dot+label rail on the right edge.
 * Mobile (<lg): the fixed rail would either overlap narrow content or need to
 * shrink to unreadable dots, so instead it collapses into a small floating
 * toggle (bottom-right) that opens a bottom-sheet drawer listing the same
 * sections — never overlaps page content either way.
 */
export function SideNav({ sections }: SideNavProps) {
  const ids = sections.map((s) => s.id);
  const activeId = useActiveSection(ids);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Section navigation"
        className="hidden lg:flex fixed right-space-lg top-1/2 -translate-y-1/2 z-40 flex-col gap-space-sm"
      >
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="group flex items-center gap-space-xs justify-end"
              aria-current={active ? 'true' : undefined}
            >
              <span
                className={`font-label-mono text-label-mono uppercase tracking-wider whitespace-nowrap transition-opacity ${
                  active ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-on-surface-variant'
                }`}
              >
                {s.label}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                  active ? 'bg-primary' : 'bg-outline-variant group-hover:bg-on-surface-variant'
                }`}
              />
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Open section navigation"
        className="lg:hidden fixed right-space-md bottom-space-md z-40 w-12 h-12 rounded-full bg-primary-container text-on-primary shadow-lg flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-[20px]">list</span>
      </button>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-on-surface/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-surface-container-lowest rounded-t-xl shadow-2xl p-space-lg flex flex-col gap-space-xs max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-space-xs">
              <span className="font-headline-sm text-headline-sm text-on-surface">Jump to section</span>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {sections.map((s) => {
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    scrollToSection(s.id);
                    setDrawerOpen(false);
                  }}
                  className={`flex items-center gap-space-sm px-space-sm py-space-xs rounded-full text-left font-body-md text-body-md ${
                    active ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-on-primary' : 'bg-outline-variant'}`} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
