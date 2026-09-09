import { useState } from 'react';
import { TabPanel } from '../components/TabPanel';
import { TabNav } from '../components/TabNav';
import { TabsProvider } from '../components/TabsProvider';
import { useApiPoll } from '../api/useApiPoll';
import { getHealth } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'fallback-mode', label: 'Fallback & Heartbeat' },
  { id: 'latency-tiers', label: 'Latency-Tiered Engine' },
  { id: 'data-replication', label: 'Data Replication' },
  { id: 'spec-matrix', label: 'SRE Verification' },
];

export function Feature8Page() {
  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const healthUp = !healthLoading && !healthError && health?.ai_engine === 'up';
  const services = (health as { services?: Record<string, string> } | null | undefined)?.services;

  const [blackout, setBlackout] = useState(false);
  const [heartbeatDrop, setHeartbeatDrop] = useState(false);

  return (
    <TabsProvider sections={SECTIONS}>
      <TabNav sections={SECTIONS} />
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="absolute top-48 left-12 w-80 h-80 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>

        <div className="max-w-[1480px] mx-auto px-gutter-mobile md:px-gutter-tablet xl:px-gutter-desktop py-space-xl flex flex-col gap-space-2xl relative z-10">
          <TabPanel id="hero">
            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col gap-space-md">
                <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant flex-wrap font-body-sm">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">account_tree</span>
                    Systems Architecture
                  </span>
                  <span className="text-outline-variant font-label-mono">/</span>
                  <span>High-Availability Core &amp; Reliability Engineering</span>
                  <span className="text-outline-variant font-label-mono">/</span>
                  <span className="text-primary font-semibold">Feature #8 Spec (Reliability, Fallback &amp; Fast-Slow Split)</span>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono ${healthUp ? 'bg-surface-container-high text-on-surface' : 'bg-error-container text-on-error-container'}`}>
                    <span className={`w-2 h-2 rounded-full ${healthUp ? 'bg-primary animate-pulse' : 'bg-error'}`}></span>
                    SIL-4 HIGH AVAILABILITY
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-space-xxs rounded-full bg-surface-container-high text-on-surface font-label-mono text-label-mono">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    DUAL-TIER ENGINE ARCHITECTURE
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-space-xxs rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-semibold">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    CENELEC EN 50128/50129 CERTIFIED
                  </span>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pt-space-xs">
                  <div className="flex flex-col gap-space-xs max-w-4xl">
                    <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-tight">
                      Feature #8: Platform Reliability, Autonomous Resilience &amp; Latency-Tiered AI Architecture
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
                      Ensuring zero-downtime mission-critical rail dispatch even under catastrophic alpine network cutoffs, server dropouts, and sensor packet loss. Orchestrating sub-50ms deterministic local heartbeat failover, air-gapped wayside fallback autonomy (#17), and a decoupled fast/slow latency-tiered solver pipeline (#16).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-space-xs shrink-0">
                    <button
                      onClick={() => setBlackout((v) => !v)}
                      className={`inline-flex items-center gap-2 px-space-md py-space-sm rounded-full transition-all shadow-sm font-label-mono text-label-mono cursor-pointer ${blackout ? 'bg-error text-on-error' : 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{blackout ? 'restart_alt' : 'signal_cellular_connected_no_internet_4_bar'}</span>
                      <span>{blackout ? 'Restore Cloud Backbone' : 'Trigger Simulated Backbone Blackout'}</span>
                    </button>
                    <button
                      onClick={() => setHeartbeatDrop((v) => !v)}
                      className={`inline-flex items-center gap-2 px-space-md py-space-sm rounded-full transition-all shadow-sm font-label-mono text-label-mono cursor-pointer ${heartbeatDrop ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-highest text-on-surface hover:bg-surface-dim'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">heart_broken</span>
                      <span>Simulate Wayside Heartbeat Drop</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-space-sm">
                <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Uptime Availability</span><span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span></div>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-primary tracking-tight font-bold">99.999%</span></div>
                  <div className="flex items-center gap-1 font-label-mono text-label-mono text-secondary"><span className="w-1.5 h-1.5 rounded-full bg-secondary"></span><span>SIL-4 Five-Nines Target</span></div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Heartbeat Sweep</span><span className="material-symbols-outlined text-primary text-[18px]">ecg</span></div>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">50 ms</span></div>
                  <div className="flex items-center gap-1 font-label-mono text-label-mono text-on-surface-variant"><span>Sub-second UDP Beacon</span></div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Failover Transition</span><span className="material-symbols-outlined text-secondary text-[18px]">fast_forward</span></div>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-secondary tracking-tight font-bold">&lt; 12 ms</span></div>
                  <div className="flex items-center gap-1 font-label-mono text-label-mono text-secondary"><span>Bumpless Local Takeover</span></div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Tier 1 Edge Latency</span><span className="material-symbols-outlined text-primary text-[18px]">speed</span></div>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">18 ms</span></div>
                  <div className="flex items-center gap-1 font-label-mono text-label-mono text-on-surface-variant"><span>Spatial Hash Clamp</span></div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Alpine MTBF</span><span className="material-symbols-outlined text-primary-container text-[18px]">build_circle</span></div>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-primary-container tracking-tight font-bold">18,400 h</span></div>
                  <div className="flex items-center gap-1 font-label-mono text-label-mono text-on-surface-variant"><span>Continuous Field Operation</span></div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Packet Loss Immunity</span><span className="material-symbols-outlined text-secondary text-[18px]">security</span></div>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-secondary tracking-tight font-bold">100%</span></div>
                  <div className="flex items-center gap-1 font-label-mono text-label-mono text-secondary"><span>Zero Deadlock on LTE-R Cut</span></div>
                </div>
              </div>

              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
                <div className="flex items-center justify-between flex-wrap gap-space-xs">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Platform Status • Live from GET /api/v1/health</span>
                  <span className={`px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono font-bold ${healthUp ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                    {healthLoading ? 'CHECKING…' : healthError ? 'UNREACHABLE' : healthUp ? 'OPERATIONAL' : 'DOWN'}
                  </span>
                </div>
                {healthLoading ? (
                  <div className="p-space-sm rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Checking AI engine heartbeat…</div>
                ) : healthError ? (
                  <div className="p-space-sm rounded bg-error-container text-on-error-container font-body-sm text-body-sm">Health endpoint unreachable: {healthError.message} — system reporting DOWN pending reconnection.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs font-label-mono text-label-mono text-on-surface-variant">
                    <div className="p-space-xs rounded bg-surface-container-low flex flex-col">
                      <span className="uppercase text-[10px]">ai_engine</span>
                      <span className={`font-bold ${healthUp ? 'text-secondary' : 'text-error'}`}>{(health?.ai_engine ?? 'unknown').toUpperCase()}</span>
                    </div>
                    <div className="p-space-xs rounded bg-surface-container-low flex flex-col">
                      <span className="uppercase text-[10px]">last_heartbeat</span>
                      <span className="font-bold text-on-surface">{health?.last_heartbeat ? new Date(health.last_heartbeat).toLocaleString() : 'not reported'}</span>
                    </div>
                    <div className="p-space-xs rounded bg-surface-container-low flex flex-col">
                      <span className="uppercase text-[10px]">services</span>
                      <span className="font-bold text-on-surface">
                        {services ? Object.entries(services).map(([k, v]) => `${k}:${v}`).join(', ') : 'not reported by API'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabPanel>

          <TabPanel id="fallback-mode">
            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-xs">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-primary text-on-primary font-label-mono text-label-mono font-bold">SPEC #17</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Independent Fallback Pipeline</span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-1">Independent Fallback Mode with Microsecond Heartbeat Checks (#17)</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-1">
                    Safety Core Axiom: <span className="font-semibold text-on-surface">"Keeps the system trustworthy when parts of it fail."</span> Air-gapped wayside autonomy seizes immediate headway authority if cloud telemetry drops, eliminating frozen points, phantom track occupancy, or emergency fleet standstills.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs shrink-0">
                  <span className="font-label-mono text-label-mono px-space-sm py-space-xxs rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">SIL-4 CERTIFIED</span>
                  <span className={`font-label-mono text-label-mono px-space-sm py-space-xxs rounded-full ${healthUp ? 'bg-surface-container-high text-on-surface' : 'bg-error-container text-on-error-container'}`}>
                    HEARTBEAT: {healthUp ? 'ACTIVE 50ms' : 'STALE'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
                <div className="lg:col-span-7 flex flex-col gap-space-sm">
                  <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider px-1">Tri-State Failover Automaton</div>
                  <div className={`bg-surface-container-lowest rounded p-space-md transition-all shadow-sm flex flex-col gap-space-xs relative overflow-hidden ${blackout ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full bg-secondary ring-4 ring-secondary/20 ${blackout ? '' : 'animate-pulse'}`}></span>
                        <span className="font-headline-sm text-headline-sm text-on-surface">STATE A: Nominal Cloud Synchronization</span>
                      </div>
                      <span className="px-space-xs py-space-xxs rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">ONLINE DUPLEX</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Active bi-directional WebSocket &amp; secure gRPC streaming back to Regional Operations Center (ROC). Cloud CP-SAT optimizer recalculates 400km network throughput every 120ms with full wayside optical and acoustic telemetry integration.
                    </p>
                    <div className="grid grid-cols-3 gap-space-xs pt-space-xs font-label-mono text-label-mono text-on-surface-variant bg-surface-container-low p-space-xs rounded">
                      <div>Ping: <span className="font-bold text-secondary">24 ms</span></div>
                      <div>Packet Loss: <span className="font-bold text-secondary">0.00%</span></div>
                      <div>Authority: <span className="font-bold text-primary">Global Cloud Orchestrator</span></div>
                    </div>
                  </div>
                  <div className={`bg-surface-container-lowest rounded p-space-md transition-all shadow-sm flex flex-col gap-space-xs relative ${heartbeatDrop ? '' : 'opacity-90'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-tertiary-container"></span>
                        <span className="font-headline-sm text-headline-sm text-on-surface">STATE B: Degraded / Intermittent Connectivity</span>
                      </div>
                      <span className="px-space-xs py-space-xxs rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-mono text-label-mono font-bold">WARNING CACHE</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Triggered when heartbeat jitter exceeds 150ms or &gt;3 packets drop sequentially. Cloud state is soft-frozen; local edge node activates predictive lookahead extrapolation using localized velocity and grade sensors.
                    </p>
                    <div className="grid grid-cols-3 gap-space-xs pt-space-xs font-label-mono text-label-mono text-on-surface-variant bg-surface-container-low p-space-xs rounded">
                      <div>Jitter: <span className="font-bold text-tertiary">{heartbeatDrop ? '188.4 ms (STRIKE 2/3)' : '1.84 ms'}</span></div>
                      <div>Dropped: <span className="font-bold text-tertiary">2 / 50ms</span></div>
                      <div>Authority: <span className="font-bold text-on-surface">Pre-Cached Predictive Window</span></div>
                    </div>
                  </div>
                  <div className={`bg-surface-container-lowest rounded p-space-md transition-all shadow-sm flex flex-col gap-space-xs relative ${blackout ? 'ring-4 ring-error bg-error-container/20' : 'opacity-90'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-error"></span>
                        <span className="font-headline-sm text-headline-sm text-on-surface">STATE C: Autonomous Air-Gapped Fallback</span>
                      </div>
                      <span className="px-space-xs py-space-xxs rounded bg-error-container text-on-error-container font-label-mono text-label-mono font-bold">ISOLATED SIL-4</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Full uplink loss (≥ 3 lost pulses / 150ms). Trackside ARM64 industrial IPC instantly seizes absolute physical interlocking authority. Headway margins clamp deterministically from 90s to 180s, defaulting switch tracks to static fail-safe diversion.
                    </p>
                    <div className="grid grid-cols-3 gap-space-xs pt-space-xs font-label-mono text-label-mono text-on-surface-variant bg-surface-container-low p-space-xs rounded">
                      <div>Cloud Uplink: <span className="font-bold text-error">{blackout ? 'SEVERED (0 bps)' : 'Nominal'}</span></div>
                      <div>Failover Transfer: <span className="font-bold text-secondary">8.4 ms</span></div>
                      <div>Authority: <span className="font-bold text-error">Trackside Edge Node #402</span></div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 flex flex-col gap-space-sm">
                  <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider px-1">Trackside Edge Node Hardware Telemetry</div>
                  <div className="bg-surface-container-lowest rounded p-space-md shadow-sm flex flex-col gap-space-sm h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-space-xs">
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">NODE #EDGE-GHUM-402</span>
                          <span className="font-label-mono text-label-mono text-on-surface-variant">Alpine Switch Block 14 // 2,258m Elev.</span>
                        </div>
                        <span className={`px-space-xs py-space-xxs rounded-full font-label-mono text-label-mono ${blackout ? 'bg-error text-on-error' : 'bg-secondary text-on-secondary'}`}>
                          BEACON: {blackout ? 'LOST' : 'NOMINAL'}
                        </span>
                      </div>
                      <div className="bg-surface-container p-space-sm rounded flex flex-col gap-2 my-space-xs">
                        <div className="flex items-center justify-between text-label-mono font-label-mono text-body-sm text-on-surface-variant">
                          <span>UDP 50ms Pulse Oscilloscope</span>
                          <span className="text-secondary font-bold">Jitter: {blackout ? 'TIMEOUT (>5000ms)' : heartbeatDrop ? '188.4 ms' : '1.84 ms'}</span>
                        </div>
                        <div className="w-full h-16 relative overflow-hidden bg-surface-container-lowest rounded p-1">
                          <svg className="w-full h-full text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 300 60">
                            <path d="M0,30 L30,30 L35,28 L40,32 L45,10 L50,50 L55,25 L60,30 L100,30 L105,28 L110,32 L115,8 L120,52 L125,24 L130,30 L170,30 L175,28 L180,32 L185,12 L190,48 L195,26 L200,30 L240,30 L245,28 L250,32 L255,10 L260,50 L265,24 L270,30 L300,30" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>
                        <div className="flex items-center justify-between font-label-mono text-label-mono text-on-surface-variant">
                          <span>Cryptographic Monotonic Token: <span className="text-on-surface font-semibold">0x9F4C2...A88</span></span>
                          <span>Loss: 0 / 12,490</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-space-xs text-body-sm font-body-sm text-on-surface-variant">
                        <div className="flex items-center justify-between"><span>Arbiter Logic Execution Target:</span><span className="font-label-mono text-on-surface font-semibold">Sub-15ms deterministic cycle</span></div>
                        <div className="flex items-center justify-between"><span>Consecutive Dropped Pulse Quorum:</span><span className="font-label-mono text-on-surface font-semibold">3 Frames (150ms timeout)</span></div>
                        <div className="flex items-center justify-between"><span>Recovery Backoff Window:</span><span className="font-label-mono text-on-surface font-semibold">5,000ms stable return loop</span></div>
                      </div>
                    </div>
                    <div className="relative rounded overflow-hidden mt-space-sm h-32 group">
                      <img
                        alt="Vibrant red Swiss electric train locomotive winding through high-altitude mountain railway curve in the Alps"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAt7MsDHhPkOOaBILtGIzv39IgUN2M5WLzbN6LnqdzT2opBVNzyrNImwoWbtRLIaUt5ce29e-Fd33dtOARUhiP1ac1w451ybL_B3M0Y3skDr4Uny9PR6VdWpjeRGBxUvQvxGPZffUnwtZeRevhrRMcZFZvJXaAouHUvVq1kJYKLzAiQ2HEnOtr11CqC06s83XAHK06dz4SC09pQJ8Xflq06B1egkNaDR-xM2CAgjKEv47f2fOxOYTOVsg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent flex items-end p-space-xs">
                        <span className="text-inverse-on-surface font-label-mono text-label-mono">Locomotive #RhB-653 Interlocked to Edge Node #402</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="latency-tiers">
            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-xs">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-secondary text-on-secondary font-label-mono text-label-mono font-bold">SPEC #16</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Decoupled Co-Processor Pipeline</span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-1">Latency-Tiered AI Architecture (#16) — Dual Co-Processors</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-1">
                    Splits fast deterministic conflict detection (&lt;20ms) from slower deep mathematical network optimization (100–1,200ms) with guaranteed zero-lock safety circuit breakers.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-label-mono text-label-mono px-space-sm py-space-xxs rounded-full bg-surface-container-high text-on-surface">BOUNDED O(1) FAST PATH</span>
                  <span className="font-label-mono text-label-mono px-space-sm py-space-xxs rounded-full bg-primary-fixed text-on-primary-fixed">CP-SAT MILP ASYNC SOLVER</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="bg-surface-container-lowest rounded p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[24px]">flash_on</span><h3 className="font-headline-lg text-headline-lg text-on-surface">TIER 1 // FAST PATH</h3></div>
                      <span className="px-space-sm py-space-xxs rounded-full bg-primary-container text-on-primary font-label-mono text-label-mono font-bold">&lt; 20 ms BOUNDED</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">Trackside Immediate Safety Envelope Arbiter. Executes continuously on ruggedized ARM64 hardware situated directly in wayside signal bungalows.</p>
                    <div className="flex flex-col gap-space-xs mt-space-xs">
                      <div className="bg-surface-container p-space-sm rounded"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Hardware Substrate:</span><p className="font-telemetry-data text-telemetry-data text-on-surface mt-0.5">Trackside Industrial IPC (SIL-4 Ruggedized Quad ARM64 @ 1.8GHz, ECC RAM)</p></div>
                      <div className="bg-surface-container p-space-sm rounded"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Algorithmic Method:</span><p className="font-telemetry-data text-telemetry-data text-on-surface mt-0.5">Spatial Hashing &amp; Static Deterministic Red-Signal Collision Envelope Clamp</p></div>
                      <div className="bg-surface-container p-space-sm rounded"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Network Dependency:</span><p className="font-telemetry-data text-telemetry-data text-secondary font-bold mt-0.5">ZERO (100% Air-Gapped Local Autonomy, Fully Standalone)</p></div>
                    </div>
                  </div>
                  <div className="mt-space-md pt-space-xs flex items-center justify-between font-label-mono text-label-mono text-on-surface-variant bg-surface-container-low p-space-sm rounded">
                    <span>Avg Execution Time: <strong className="text-primary font-bold">14.2 ms</strong></span>
                    <span>Complexity: <strong className="text-on-surface">Strict O(1)</strong></span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full pointer-events-none"></div>
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[24px]">hub</span><h3 className="font-headline-lg text-headline-lg text-on-surface">TIER 2 // DEEP OPTIMIZER</h3></div>
                      <span className="px-space-sm py-space-xxs rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">100 - 1,200 ms MULTI-CORE</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">Regional Multi-Objective Macro Solver. Computes globally optimal timetables, energy conservation, and train meets across extensive alpine networks.</p>
                    <div className="flex flex-col gap-space-xs mt-space-xs">
                      <div className="bg-surface-container p-space-sm rounded"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Hardware Substrate:</span><p className="font-telemetry-data text-telemetry-data text-on-surface mt-0.5">128-Core Distributed Google OR-Tools CP-SAT High-Performance Cluster</p></div>
                      <div className="bg-surface-container p-space-sm rounded"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Algorithmic Method:</span><p className="font-telemetry-data text-telemetry-data text-on-surface mt-0.5">Mixed-Integer Linear Programming (MILP) &amp; Multi-Objective Pareto Curve Optimization</p></div>
                      <div className="bg-surface-container p-space-sm rounded"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Network Dependency:</span><p className="font-telemetry-data text-telemetry-data text-primary mt-0.5">High-Speed Optical Wayside Trunk / Dual LTE-R (Non-safety critical)</p></div>
                    </div>
                  </div>
                  <div className="mt-space-md pt-space-xs flex items-center justify-between font-label-mono text-label-mono text-on-surface-variant bg-surface-container-low p-space-sm rounded">
                    <span>Circuit Breaker Cutoff: <strong className="text-tertiary font-bold">1,500 ms Anytime</strong></span>
                    <span>Fallback: <strong className="text-secondary font-bold">Incumbent Slot Clamp</strong></span>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between flex-wrap gap-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Concurrent Execution Pipeline Flow (Incoming Telemetry Event T=0ms)</span>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">Zero Real-Time Safety Hazard Execution</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
                  <div className="bg-surface-container p-space-md rounded flex flex-col gap-1">
                    <div className="flex items-center justify-between font-label-mono text-label-mono text-primary font-bold"><span>PHASE 01</span><span>T + 0.0 ms</span></div>
                    <span className="font-headline-sm text-headline-sm text-on-surface mt-1">Sensor Ingestion</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Axle counter pulse + GNSS differential broadcast enters trackside Edge Node buffer simultaneously with cloud Kafka ingestion stream.</p>
                  </div>
                  <div className="bg-surface-container p-space-md rounded flex flex-col gap-1">
                    <div className="flex items-center justify-between font-label-mono text-label-mono text-secondary font-bold"><span>PHASE 02</span><span>T + 14.2 ms</span></div>
                    <span className="font-headline-sm text-headline-sm text-on-surface mt-1">Tier 1 Edge Interlock</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Local ARM64 runs spatial hash collision verification. Instantly clamps signal to green or applies immediate interlocking brake envelope without waiting for WAN.</p>
                  </div>
                  <div className="bg-surface-container p-space-md rounded flex flex-col gap-1">
                    <div className="flex items-center justify-between font-label-mono text-label-mono text-primary-container font-bold"><span>PHASE 03</span><span>T + 340.0 ms</span></div>
                    <span className="font-headline-sm text-headline-sm text-on-surface mt-1">Tier 2 Deep Solving</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Distributed CP-SAT cluster evaluates macro timetable impacts across all 30 trains in corridor, optimizing energy regeneration and siding meets.</p>
                  </div>
                  <div className="bg-surface-container p-space-md rounded flex flex-col gap-1">
                    <div className="flex items-center justify-between font-label-mono text-label-mono text-secondary font-bold"><span>PHASE 04</span><span>T + 420.0 ms</span></div>
                    <span className="font-headline-sm text-headline-sm text-on-surface mt-1">Non-Blocking Commit</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Optimized route advisory updates train cabin displays. If solving took &gt;1,500ms, Tier 1 fallback retains complete uninterrupted safety jurisdiction.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="data-replication">
            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-xs">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-primary-container text-on-primary font-label-mono text-label-mono font-bold">DATA CORE</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Dual-Sync Data Replication Pipeline</span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-1">Resilient Alpine Telemetry Cache (Kafka + SQLite Edge Sync)</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-1">
                    Guarantees zero data loss across Himalayan blizzard fiber cuts and cellular dead-zones through Conflict-Free Replicated Data Types (CRDTs) and local Write-Ahead Logging.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-label-mono text-label-mono px-space-sm py-space-xxs rounded-full bg-secondary-fixed text-on-secondary-fixed">CRDT DELTA MERGE</span>
                  <span className="font-label-mono text-label-mono px-space-sm py-space-xxs rounded-full bg-surface-container-high text-on-surface">72-HR FLASHLOG RETENTION</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
                <div className="bg-surface-container-lowest rounded p-space-md shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between"><span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Cloud Event Stream</span><span className="material-symbols-outlined text-primary text-[20px]">cloud_sync</span></div>
                    <span className="font-label-mono text-label-mono text-primary">Apache Kafka Topic: corridor.telemetry.events</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Distributed 3-zone replicated broker ingestion. Ingests 45,000 telemetry packets/sec containing pantograph voltages, wheelset acoustic spectrums, and track deflection metrics.</p>
                  </div>
                  <div className="mt-space-md p-space-xs bg-surface-container-low rounded font-label-mono text-label-mono text-on-surface-variant flex flex-col gap-1">
                    <div>Partitions: <span className="font-bold text-on-surface">32 Balanced</span></div>
                    <div>Retention: <span className="font-bold text-on-surface">365 Days Cold Storage</span></div>
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between"><span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Trackside Edge Cache</span><span className="material-symbols-outlined text-secondary text-[20px]">storage</span></div>
                    <span className="font-label-mono text-label-mono text-secondary">Embedded SQLite in WAL Mode</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Ultra-rugged local persistent datastore residing on industrial SLC NAND flash. Atomic write commitments guarantee zero database corruption even under unexpected catenary power surges.</p>
                  </div>
                  <div className="mt-space-md p-space-xs bg-surface-container-low rounded font-label-mono text-label-mono text-on-surface-variant flex flex-col gap-1">
                    <div>Sync Protocol: <span className="font-bold text-on-surface">CRDT Delta Sync</span></div>
                    <div>Write Latency: <span className="font-bold text-secondary">0.42 ms Local</span></div>
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded p-space-md shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between"><span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Offline Survival Buffer</span><span className="material-symbols-outlined text-tertiary-container text-[20px]">ac_unit</span></div>
                    <span className="font-label-mono text-label-mono text-tertiary">72-Hour Autonomous Storage</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Buffers up to 72 hours of track circuit events, axle counter telemetry, and pilot biometric logs locally during severe mountain storms or severed optical backhaul cables.</p>
                  </div>
                  <div className="mt-space-md p-space-xs bg-surface-container-low rounded font-label-mono text-label-mono text-on-surface-variant flex flex-col gap-1">
                    <div>Reconnection Drain: <span className="font-bold text-primary">120 MB/s Compressed</span></div>
                    <div>Duplicate Rejection: <span className="font-bold text-secondary">Guaranteed (Idempotent)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="spec-matrix">
            <div className="flex flex-col gap-space-md pb-space-2xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-xs">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-surface-container-highest text-on-surface font-label-mono text-label-mono font-bold">VERIFICATION</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Engineering Compliance Matrix</span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-1">Platform Reliability &amp; SRE Verification Matrix</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-1">Traceable engineering verification satisfying International Electrotechnical Commission (IEC) rail automation safety norms.</p>
                </div>
                <span className="font-label-mono text-label-mono text-on-surface-variant">Standard: EN 50128:2011 / A1:2020 Rail Software</span>
              </div>
              <div className="bg-surface-container-lowest rounded shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container text-on-surface font-label-caps text-label-caps uppercase">
                        <th className="py-space-sm px-space-md font-semibold">Req #</th>
                        <th className="py-space-sm px-space-md font-semibold">Sub-System Specification</th>
                        <th className="py-space-sm px-space-md font-semibold">Technical Mechanism &amp; Fail-Safe Rule</th>
                        <th className="py-space-sm px-space-md font-semibold">Safety Integrity</th>
                        <th className="py-space-sm px-space-md font-semibold">Resilience &amp; Operational Impact</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm text-on-surface-variant">
                      <tr className="hover:bg-surface-container-low transition-colors">
                        <td className="py-space-sm px-space-md font-label-mono text-primary font-bold">#17</td>
                        <td className="py-space-sm px-space-md font-semibold text-on-surface">Independent Fallback Mode</td>
                        <td className="py-space-sm px-space-md">Air-gapped local controller seizes custody upon cloud disconnect; executes static headway table.</td>
                        <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">SIL-4</span></td>
                        <td className="py-space-sm px-space-md text-on-surface font-medium">Eliminates corridor blackouts &amp; traffic paralysis during cloud sever.</td>
                      </tr>
                      <tr className="hover:bg-surface-container-low transition-colors">
                        <td className="py-space-sm px-space-md font-label-mono text-primary font-bold">#16 (Edge)</td>
                        <td className="py-space-sm px-space-md font-semibold text-on-surface">Tier 1 Fast Conflict Arbiter</td>
                        <td className="py-space-sm px-space-md">Deterministic spatial hash boundary check under 20ms; triggers physical relay drops.</td>
                        <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">SIL-4</span></td>
                        <td className="py-space-sm px-space-md text-on-surface font-medium">Guaranteed immediate collision envelope clamp independent of WAN jitter.</td>
                      </tr>
                      <tr className="hover:bg-surface-container-low transition-colors">
                        <td className="py-space-sm px-space-md font-label-mono text-primary font-bold">#16 (Cloud)</td>
                        <td className="py-space-sm px-space-md font-semibold text-on-surface">Tier 2 Deep Optimization Engine</td>
                        <td className="py-space-sm px-space-md">Distributed OR-Tools CP-SAT solver with 1,500ms anytime circuit breaker cutoff.</td>
                        <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-surface-container-high text-on-surface font-label-mono text-label-mono font-bold">SIL-2 / Ops</span></td>
                        <td className="py-space-sm px-space-md text-on-surface font-medium">Maximizes network throughput &amp; energy recapture without safety exposure.</td>
                      </tr>
                      <tr className="hover:bg-surface-container-low transition-colors">
                        <td className="py-space-sm px-space-md font-label-mono text-primary font-bold">Spec-HBT</td>
                        <td className="py-space-sm px-space-md font-semibold text-on-surface">50ms UDP Heartbeat Monitor</td>
                        <td className="py-space-sm px-space-md">Cryptographic monotonic counter with 3-strike (150ms) timeout failover arbiter.</td>
                        <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">SIL-4</span></td>
                        <td className="py-space-sm px-space-md text-on-surface font-medium">Sub-second bumpless transition without human re-entry or safety compromises.</td>
                      </tr>
                      <tr className="hover:bg-surface-container-low transition-colors">
                        <td className="py-space-sm px-space-md font-label-mono text-primary font-bold">Spec-CRDT</td>
                        <td className="py-space-sm px-space-md font-semibold text-on-surface">Resilient Edge Data Sync</td>
                        <td className="py-space-sm px-space-md">Offline SQLite WAL store with bi-directional conflict-free delta reconciliation.</td>
                        <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-surface-container-high text-on-surface font-label-mono text-label-mono font-bold">HA Enterprise</span></td>
                        <td className="py-space-sm px-space-md text-on-surface font-medium">72-hour alpine blizzard survival with zero log degradation or replay errors.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-primary text-on-primary rounded p-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg shadow-xl relative overflow-hidden">
                <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-surface-tint/30 blur-2xl pointer-events-none"></div>
                <div className="flex flex-col gap-space-xs relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-space-sm py-space-xxs rounded-full bg-primary-container text-on-primary font-label-mono text-label-mono w-fit">
                    <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-ping"></span>
                    TEST ENVIRONMENT READY
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-primary tracking-tight">Ready to stress-test platform resilience under simulated corridor outage?</h2>
                  <p className="font-body-md text-body-md text-primary-fixed-dim">Inject synthetic fiber breaks, 4G packet-loss storms, and trackside IPC failovers live in the RailTwin Alpine Simulation Sandbox.</p>
                </div>
                <button
                  onClick={() => {
                    setBlackout(true);
                    setHeartbeatDrop(true);
                  }}
                  className="relative z-10 shrink-0 inline-flex items-center gap-2 px-space-xl py-space-md rounded-full bg-secondary text-on-secondary font-headline-sm text-headline-sm hover:bg-secondary/90 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">science</span>
                  <span>Launch Chaos Engineering Simulator Console</span>
                </button>
              </div>
            </div>
          </TabPanel>
        </div>
      </div>
    </TabsProvider>
  );
}
