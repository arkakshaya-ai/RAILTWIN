import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApiPoll } from '../api/useApiPoll';
import { getHealth } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1UAX_MmG-Gyj54FxNVXaMoFdC6GVo2n7LShSf6aQLUbc0-onpLnnfBJu9Dr2avmSEgnvKJAvojHSmjYwZUvatqCLRTqCyFVW99CAijHQKmoL1VNZEjktf5WGpVeDoXtYW2xlRCuYgcnSuYEtDiKycfVuXmr6Yvvcn54DDwN79uvFjBZw63dUnrkdEkMR-cpfKDr1BXmSNhIe3P4EgDn55c4bMI9nfLoJGi93LzKSrXDj339QwSSq4b3fs6R';

// Same-page section anchors (Digital Twin, Features, Live Telemetry) are plain
// <a href="/#id">, not react-router <Link>: from Home this lets the browser's
// native same-document fragment navigation smooth-scroll with no route change;
// from any other route it's a normal full navigation to "/" that lands and
// then auto-scrolls to the fragment on load. A <Link> would need custom
// post-navigation scroll logic to get the same result for both cases.
const ANCHOR_NAV_ITEMS = [
  { label: 'Digital Twin', href: '/#hero' },
  { label: 'Features', href: '/#feature-matrix' },
  { label: 'Live Telemetry', href: '/#telemetry-dock' },
];

// Simulations -> Feature 1 (Simulated Real-Time Train Tracking): the one
// Feature page that is literally about live simulation/tracking.
// Network Map -> also Feature 1: Home's ported content has no dedicated
// network/corridor-map section of its own (the closest, the telemetry dock,
// is already claimed by "Live Telemetry"), and Feature 1's live train
// tracking is the closest fit to a "network map" among the 8 Feature pages.
// Documentation -> in-app placeholder route: no README.md existed in the repo
// at build time, so linking to one would be a dead link.
const ROUTE_NAV_ITEMS = [
  { label: 'Simulations', to: '/feature/1' },
  { label: 'Network Map', to: '/feature/1' },
  { label: 'Documentation', to: '/documentation' },
];

function HealthPill() {
  const { data, loading, error } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const ok = !loading && !error && data?.ai_engine === 'up';
  const label = loading ? 'Checking…' : error ? 'Health Unreachable' : `AI Engine ${data?.ai_engine ?? 'unknown'}`;
  return (
    <div
      className={`hidden md:inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono uppercase tracking-wider ${
        ok
          ? 'bg-secondary-container text-on-secondary-container'
          : error
            ? 'bg-error-container text-on-error-container'
            : 'bg-surface-container-high text-on-surface-variant'
      }`}
      title="GET /api/v1/health"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-secondary animate-pulse' : 'bg-outline'}`} />
      {label}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-[1480px] mx-auto px-gutter-desktop flex items-center justify-between gap-space-md">
          <Link to="/" className="flex items-center gap-space-md shrink-0">
            <img alt="RailTwin Brand Logo" className="h-8 w-auto object-contain" src={LOGO_URL} />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none">
                RailTwin
              </span>
              <span className="font-label-mono text-label-mono text-secondary tracking-wider uppercase">
                Digital Twin AI
              </span>
            </div>
          </Link>

          <nav className="hidden xl:flex items-center gap-space-lg">
            {ANCHOR_NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {item.label}
              </a>
            ))}
            {ROUTE_NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                className={`font-body-md text-body-md transition-colors ${
                  location.pathname === item.to
                    ? 'text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-space-sm shrink-0">
            <HealthPill />
            <Link
              to="/feature/1"
              className="hidden sm:inline-flex items-center justify-center px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface font-body-md text-body-md hover:bg-surface-container-highest hover:text-on-surface transition-colors"
            >
              Request Demo
            </Link>
            <Link
              to="/feature/1"
              className="inline-flex items-center justify-center px-space-md py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-body-md hover:bg-primary transition-colors shadow-[0_4px_12px_rgba(18,82,163,0.15)]"
            >
              Launch Simulator
            </Link>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">{children}</div>
      </main>

      <footer className="w-full bg-surface-container-low mt-space-3xl py-space-2xl">
        <div className="max-w-[1480px] mx-auto px-gutter-desktop">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-space-xl pb-space-xl">
            <div className="md:col-span-1 flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <img alt="RailTwin Brand Logo" className="h-6 w-auto object-contain" src={LOGO_URL} />
                <span className="font-headline-sm text-headline-sm text-on-surface">RailTwin</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                High-altitude precision telemetry, wayside dynamic diagnostics, and autonomous AI interlocking for
                next-generation rail networks.
              </p>
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-surface-container w-fit">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-mono text-label-mono text-on-surface">All Twin Systems Operational</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Telemetry Systems
              </span>
              <a
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                href="/#telemetry-dock"
              >
                Bogie &amp; Wheelset Acoustic Feeds
              </a>
              <a
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                href="/#telemetry-dock"
              >
                Pantograph Arc Detection
              </a>
              <a
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                href="/#telemetry-dock"
              >
                Dynamic Grade Traction Loss
              </a>
              <a
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                href="/#telemetry-dock"
              >
                Wayside Optical Interlocks
              </a>
            </div>
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Global Twin Network
              </span>
              <div className="flex flex-col gap-space-xxs">
                <span className="font-headline-sm text-headline-sm text-primary">42,850 km</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Active Monitored Main Line</span>
              </div>
              <div className="flex flex-col gap-space-xxs mt-space-xs">
                <span className="font-headline-sm text-headline-sm text-secondary">1,420 Units</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Connected Locomotives</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Platform Governance
              </span>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                Safety Interlock Certification
              </Link>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                API Real-time Feeds
              </Link>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                Enterprise Security SLAs
              </Link>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                Incident Response Desk
              </Link>
            </div>
          </div>
          <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              © 2025 RailTwin Platform Technologies. Alpine Heavy Rail Automation.
            </span>
            <div className="flex items-center gap-space-md">
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                Privacy Policy
              </Link>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                System Architecture
              </Link>
              <Link
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
                to="/documentation"
              >
                Status Portal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
