import type { ReactNode } from 'react';

interface ScrollSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps one MODULE/SECTION block from the source design. At >=1440px
 * ("desktop" in tailwind.config.js) the section is viewport-height and
 * vertically centers its content, echoing the source's slide-like module
 * rhythm; below that it is content-sized with normal padding — no forced
 * empty space on laptop/tablet. `scroll-snap-align: start` pairs with the
 * `scroll-snap-container` class on <body> (see index.css) for `proximity`
 * (not `mandatory`) snap.
 */
export function ScrollSection({ id, children, className = '' }: ScrollSectionProps) {
  return (
    <section
      id={id}
      className={`[scroll-snap-align:start] py-space-lg desktop:min-h-screen desktop:py-space-3xl desktop:flex desktop:flex-col desktop:justify-center ${className}`}
    >
      {children}
    </section>
  );
}
