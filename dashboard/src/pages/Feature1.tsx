import { useEffect, useRef, useState } from 'react';
import { TabPanel } from '../components/TabPanel';
import { TabNav } from '../components/TabNav';
import { TabsProvider } from '../components/TabsProvider';
import { useApiPoll } from '../api/useApiPoll';
import { getHealth, getNetworkState } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'live-console', label: 'Live Console' },
  { id: 'comparison', label: 'RTIS Comparison' },
];

type FaultState = 'nominal' | 'tunnel' | 'multipath' | 'skew';

const FAULT_BANNER: Record<FaultState, { className: string; text: string }> = {
  nominal: {
    className: 'bg-surface-container text-on-surface',
    text: 'Downstream Interlock Confidence: 100% (Nominal)',
  },
  tunnel: {
    className: 'bg-error-container text-on-error-container',
    text: 'GPS Masked: Dead-Reckoning IMU active with 100% section safety confidence.',
  },
  multipath: {
    className: 'bg-tertiary-fixed text-on-tertiary-fixed',
    text: 'Multipath Spike Detected: HDOP degraded to 6.84. Digital twin Kalman filter smoothed variance.',
  },
  skew: {
    className: 'bg-primary-fixed text-on-primary-fixed',
    text: '500ms Clock Skew Injected: Kafka Consumer re-ordered frames via sliding partition buffer.',
  },
};

export function Feature1Page() {
  const {
    data: networkState,
    loading: netLoading,
    error: netError,
  } = useApiPoll(getNetworkState, POLL_INTERVAL_MS);
  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(
    getHealth,
    POLL_INTERVAL_MS,
  );

  const trains = networkState?.trains ?? [];
  const sensors = networkState?.sensors ?? [];
  const focusTrain = trains[0];

  const [simRunning, setSimRunning] = useState(true);
  const [activeTab, setActiveTab] = useState<'proto' | 'summary' | 'hex'>('proto');

  const [faultState, setFaultState] = useState<FaultState>('nominal');
  const faultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerFault(state: FaultState, durationMs: number) {
    if (faultTimeout.current) clearTimeout(faultTimeout.current);
    setFaultState(state);
    faultTimeout.current = setTimeout(() => setFaultState('nominal'), durationMs);
  }

  useEffect(() => {
    return () => {
      if (faultTimeout.current) clearTimeout(faultTimeout.current);
    };
  }, []);

  const banner = FAULT_BANNER[faultState];

  const healthOk = !healthLoading && !healthError && health?.ai_engine === 'up';

  return (
    <TabsProvider sections={SECTIONS}>
      <TabNav sections={SECTIONS} />
      <div className="max-w-[1480px] mx-auto px-gutter-desktop relative z-10">
        <TabPanel id="hero">
          <div className="w-full bg-surface-container-low -mx-gutter-desktop px-gutter-desktop rounded-xl">
            <div className="max-w-[1480px] mx-auto py-space-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Systems Architecture</span>
                <span className="material-symbols-outlined text-outline-variant text-[14px]">chevron_right</span>
                <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Telemetry Ingestion</span>
                <span className="material-symbols-outlined text-outline-variant text-[14px]">chevron_right</span>
                <span className="font-label-mono text-label-mono text-primary font-bold uppercase">RTIS Simulator (Feature #1 Specification)</span>
                <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-[10px] font-semibold uppercase">SIL-4 Compliant</span>
                <span className="px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-mono text-[10px] font-semibold">RTIS-SPEC-2024</span>
              </div>
              <div className="flex items-center gap-space-sm shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${healthOk ? 'bg-secondary animate-ping' : 'bg-outline'} inline-block`}></span>
                <span className="font-label-mono text-label-mono text-secondary font-bold tracking-wider">
                  {healthLoading ? 'CHECKING AI ENGINE…' : healthError ? 'HEALTH UNREACHABLE' : `AI ENGINE ${(health?.ai_engine ?? 'unknown').toUpperCase()}`}
                </span>
                <span className="font-label-mono text-label-mono text-on-surface-variant">GET /api/v1/health</span>
              </div>
            </div>
          </div>

          <div className="w-full bg-surface pb-space-xl pt-space-md">
            <div className="max-w-[1480px] mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
                <div className="lg:col-span-8 flex flex-col gap-space-xs">
                  <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-primary/10 text-primary w-fit font-label-caps uppercase">
                    <span className="material-symbols-outlined text-[15px]">satellite_alt</span>
                    High-Altitude Synthetic Telemetry Ingestion Layer
                  </div>
                  <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
                    Feature #1: Simulated Real-Time Train Tracking Engine
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl">
                    Sub-100ms synthetic NMEA &amp; Protobuf kinematics streaming, multi-constellation fake GPS generator, and dead-reckoning failover for high-altitude mountain shadow zones.
                  </p>
                </div>
                <div className="lg:col-span-4 flex flex-wrap lg:flex-col items-start lg:items-end justify-start gap-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <button
                      onClick={() => setSimRunning((r) => !r)}
                      className={`inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full text-on-primary font-body-md text-body-md hover:bg-primary transition-all shadow-sm ${simRunning ? 'bg-primary-container' : 'bg-secondary'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      <span>{simRunning ? 'Pause Simulator' : 'Resume Simulator'}</span>
                    </button>
                    <button className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface font-body-md text-body-md hover:bg-surface-container-highest transition-colors">
                      <span className="material-symbols-outlined text-[18px]">code</span>
                      Proto Schema
                    </button>
                  </div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">Active Topic: <code className="text-primary font-bold">train.telemetry.rtis-gps.v2</code></span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-sm mt-space-lg">
                <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Active Trains</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">train</span>
                  </div>
                  <div className="mt-space-xs flex items-baseline gap-space-xxs">
                    <span className="font-headline-xl text-headline-xl text-primary font-bold">
                      {netLoading ? '…' : netError ? '—' : trains.length}
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary font-semibold">Live Rakes</span>
                  </div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">GET /network/state</span>
                </div>
                <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Stream Rate</span>
                    <span className="material-symbols-outlined text-secondary text-[18px]">speed</span>
                  </div>
                  <div className="mt-space-xs flex items-baseline gap-space-xxs">
                    <span className="font-headline-xl text-headline-xl text-on-surface font-bold">10.0</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Hz / 100ms</span>
                  </div>
                  <span className="font-label-mono text-label-mono text-secondary">Zero dropped frames</span>
                </div>
                <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">GPS Precision</span>
                    <span className="material-symbols-outlined text-tertiary text-[18px]">track_changes</span>
                  </div>
                  <div className="mt-space-xs flex items-baseline gap-space-xxs">
                    <span className="font-headline-xl text-headline-xl text-on-surface font-bold">±0.8</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">cm accuracy</span>
                  </div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">Dual-Frequency RTK Synth</span>
                </div>
                <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">RTIS Feed Uptime</span>
                    <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                  </div>
                  <div className="mt-space-xs flex items-baseline gap-space-xxs">
                    <span className="font-headline-xl text-headline-xl text-secondary font-bold">99.999%</span>
                  </div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">HA Microservices Stack</span>
                </div>
                <div className="col-span-2 md:col-span-1 p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Mean Wire Drift</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">timeline</span>
                  </div>
                  <div className="mt-space-xs flex items-baseline gap-space-xxs">
                    <span className="font-headline-xl text-headline-xl text-on-surface font-bold">&lt; 1.2</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">cm / km</span>
                  </div>
                  <span className="font-label-mono text-label-mono text-secondary">Spline Projection Match</span>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="live-console">
          <div className="w-full py-space-md">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
              <div className="xl:col-span-7 flex flex-col gap-space-md">
                <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pb-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                        <span className="material-symbols-outlined text-[22px]">alt_route</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-headline-lg text-headline-lg text-on-surface">
                            {netLoading ? 'Loading…' : netError ? 'No live train' : (focusTrain?.train_id ?? 'No trains reporting')}
                          </span>
                          {focusTrain && <span className="font-body-md text-body-md text-on-surface-variant">{focusTrain.direction} direction</span>}
                        </div>
                        <span className="font-label-mono text-label-mono text-secondary font-medium">
                          {focusTrain ? `${focusTrain.section.toUpperCase()} • CHAINAGE KP ${focusTrain.chainage_km.toFixed(3)}` : 'DARJEELING ALPINE SEGMENT • AWAITING TELEMETRY'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className={`px-space-sm py-1 rounded-full font-label-mono text-label-mono font-semibold flex items-center gap-1 ${netError ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                        <span className={`w-2 h-2 rounded-full ${netError ? 'bg-error' : 'bg-secondary animate-pulse'}`}></span>
                        {netError ? 'RTIS FEED UNREACHABLE' : netLoading ? 'CONNECTING…' : 'PRIMARY RTIS ONLINE'}
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full h-80 rounded-xl overflow-hidden bg-surface-container-highest">
                    <img alt="Alpine mountain locomotive tracking visualization" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADfATQf00THPgRjtovdxwmKIS6rMhgyYtTsaAuIH-SuUbS3w54oh45wVqjKzDzyyf8tzC1fAIaVQsjEWFcnkHJV0gVD01GBGrbKEgsG0e-iV2noVFul0TupGx_9kVZH16XOM9rk7Nf3JZo4ACqLMhI1x2at32MxNmBNXOitwG5-twoXRLnuSwZsRhat5fiIhVgupbBkV9yxiTY6JUieT2dtvCWTSiRSe90rc1JID0hE6Gwxvhi6Jk3CH_RAOBrp8O8Qqk" />
                    <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/40 to-transparent flex flex-col justify-between p-space-md">
                      <div className="flex items-center justify-between">
                        <div className="px-space-sm py-1 rounded-full bg-inverse-surface/80 backdrop-blur-md text-inverse-on-surface font-label-mono text-label-mono flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary-fixed-dim"></span>
                          {focusTrain ? `LIVE GNSS: SECTION ${focusTrain.section.toUpperCase()}` : 'SYNTHETIC GNSS: WGS84 LOCK (27.042189° N, 88.267324° E)'}
                        </div>
                        <div className="px-space-sm py-1 rounded-full bg-inverse-surface/80 backdrop-blur-md text-inverse-on-surface font-label-mono text-label-mono">
                          SATS: 16 LOCKED (NavIC: 7 • GPS: 9)
                        </div>
                      </div>
                      <div className="relative w-full py-space-sm">
                        <div className="w-full h-1.5 bg-outline-variant/40 rounded-full relative overflow-hidden">
                          <div className="absolute left-0 top-0 h-full bg-secondary-container w-3/5"></div>
                        </div>
                        <div className="flex justify-between items-center text-inverse-on-surface font-label-mono text-[10px] mt-2">
                          <span>Ghum Loop (KP 110.4)</span>
                          <span className="text-primary-fixed-dim font-bold">
                            CURRENT: {focusTrain ? `${focusTrain.section} (KP ${focusTrain.chainage_km.toFixed(2)})` : 'Batasia Spiral (KP 114.28)'}
                          </span>
                          <span>Darjeeling Jct (KP 118.9)</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                        <div className="p-space-xs rounded-lg bg-surface-container-lowest/90 backdrop-blur-md flex flex-col">
                          <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">Ground Speed</span>
                          <span className="font-telemetry-data text-telemetry-data text-on-surface font-bold">
                            {focusTrain ? `${focusTrain.speed_kmph.toFixed(1)} km/h` : '— km/h'}
                          </span>
                        </div>
                        <div className="p-space-xs rounded-lg bg-surface-container-lowest/90 backdrop-blur-md flex flex-col">
                          <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">Track Gradient</span>
                          <span className="font-telemetry-data text-telemetry-data text-secondary font-bold">+3.42% (Climb)</span>
                        </div>
                        <div className="p-space-xs rounded-lg bg-surface-container-lowest/90 backdrop-blur-md flex flex-col">
                          <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">Section</span>
                          <span className="font-telemetry-data text-telemetry-data text-on-surface font-bold">{focusTrain?.section ?? '—'}</span>
                        </div>
                        <div className="p-space-xs rounded-lg bg-surface-container-lowest/90 backdrop-blur-md flex flex-col">
                          <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">Last Update</span>
                          <span className="font-telemetry-data text-telemetry-data text-primary font-bold">
                            {focusTrain ? new Date(focusTrain.timestamp).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Synthetic Elevation Profile • 5km Alpine Corridor</span>
                      <span className="font-label-mono text-label-mono text-on-surface-variant">Step: 10m Spline Mesh</span>
                    </div>
                    <div className="w-full h-24 mt-1">
                      <svg className="w-full h-full stroke-current text-primary fill-none" preserveAspectRatio="none" viewBox="0 0 700 80">
                        <defs>
                          <linearGradient id="elevationGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#1252a3" stopOpacity="0.25"></stop>
                            <stop offset="100%" stopColor="#1252a3" stopOpacity="0.0"></stop>
                          </linearGradient>
                        </defs>
                        <path className="stroke-none" d="M 0,65 Q 120,55 240,40 T 420,25 T 600,10 L 700,5 L 700,80 L 0,80 Z" fill="url(#elevationGrad)"></path>
                        <path d="M 0,65 Q 120,55 240,40 T 420,25 T 600,10 L 700,5" stroke="#1252a3" strokeLinecap="round" strokeWidth="2.5"></path>
                        <circle className="animate-pulse" cx="420" cy="25" fill="#3a6843" r="5"></circle>
                        <line stroke="#3a6843" strokeDasharray="2 2" strokeWidth="1" x1="420" x2="420" y1="0" y2="80"></line>
                      </svg>
                    </div>
                    <div className="flex justify-between font-label-mono text-[11px] text-on-surface-variant">
                      <span>1,850 m (Valley Floor)</span>
                      <span className="text-secondary font-semibold">• Active Locomotive (2,164.8 m)</span>
                      <span>2,258 m (Ghum Peak)</span>
                    </div>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                        <span className="material-symbols-outlined text-[20px]">sensors</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface">Dead-Reckoning Failover State</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Dual In-Cab Inertial Kalman Filter (IMU + Wheel Tachometer Pulse)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs shrink-0">
                      <span className={`px-space-sm py-1 rounded-full font-label-mono text-[11px] font-bold ${faultState === 'tunnel' ? 'bg-error text-on-error' : 'bg-secondary text-on-secondary'}`}>
                        {faultState === 'tunnel' ? 'ACTIVE • DEAD RECKONING' : 'ARMED • 300ms THRESHOLD'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">Synthetic GPS Producer Architecture</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">How mathematical track centerline splines transform into simulated RTIS broadcast signals</span>
                    </div>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container font-label-mono text-label-mono text-on-surface">v2.4-Pipeline</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm relative">
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-mono text-[11px] flex items-center justify-center">1</span>
                        <span className="material-symbols-outlined text-primary text-[16px]">shape_line</span>
                      </div>
                      <span className="font-headline-sm text-[14px] text-on-surface font-semibold">Track Spline Gen</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">Interpolates GIS track vectors &amp; chainage KP markers into millimeter coordinates.</p>
                      <div className="mt-auto pt-1 font-label-mono text-[10px] text-secondary font-medium">&gt; 100 Hz Interpolator</div>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-mono text-[11px] flex items-center justify-center">2</span>
                        <span className="material-symbols-outlined text-tertiary text-[16px]">blur_on</span>
                      </div>
                      <span className="font-headline-sm text-[14px] text-on-surface font-semibold">Noise &amp; Multipath</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">Applies ionospheric scintillation, canyon shadow masking, &amp; satellite GDOP jitter.</p>
                      <div className="mt-auto pt-1 font-label-mono text-[10px] text-tertiary font-medium">&gt; Alpine Canyon Mask</div>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-mono text-[11px] flex items-center justify-center">3</span>
                        <span className="material-symbols-outlined text-primary text-[16px]">find_replace</span>
                      </div>
                      <span className="font-headline-sm text-[14px] text-on-surface font-semibold">RTIS / NMEA Encode</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">Serializes vectors into GSAT-6 standard RTIS frames and gRPC Protobuf byte streams.</p>
                      <div className="mt-auto pt-1 font-label-mono text-[10px] text-primary font-medium">&gt; Proto 3 Enriched</div>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary font-label-mono text-[11px] flex items-center justify-center">4</span>
                        <span className="material-symbols-outlined text-secondary text-[16px]">broadcast_on_personal</span>
                      </div>
                      <span className="font-headline-sm text-[14px] text-on-surface font-semibold">Kafka Bus Dispatch</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">Streams to Digital Twin interlocking and wayside collision awareness engines.</p>
                      <div className="mt-auto pt-1 font-label-mono text-[10px] text-secondary font-medium">&gt; 14.8ms Max Latency</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-5 flex flex-col gap-space-md">
                <div className="rounded-2xl bg-inverse-surface text-inverse-on-surface p-space-md flex flex-col shadow-xl">
                  <div className="flex items-center justify-between pb-space-sm border-b border-outline/20">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-3 h-3 rounded-full bg-error inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-secondary inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-primary-container inline-block"></span>
                      <span className="font-label-mono text-label-mono text-inverse-on-surface ml-2">LIVE STREAM INSPECTOR</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className={`w-2 h-2 rounded-full bg-secondary ${simRunning ? 'animate-ping' : ''}`}></span>
                      <span className="font-label-mono text-[10px] text-secondary-fixed">
                        {netLoading ? 'CONNECTING' : netError ? 'OFFLINE' : `${POLL_INTERVAL_MS / 1000}s POLL`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs pt-space-xs pb-space-xs">
                    <button
                      onClick={() => setActiveTab('proto')}
                      className={`px-space-xs py-0.5 rounded text-left font-label-mono text-label-mono ${activeTab === 'proto' ? 'bg-primary-container text-on-primary' : 'text-inverse-on-surface/60 hover:text-inverse-on-surface'}`}
                    >
                      Live JSON
                    </button>
                    <button
                      onClick={() => setActiveTab('summary')}
                      className={`px-space-xs py-0.5 rounded text-left font-label-mono text-label-mono ${activeTab === 'summary' ? 'bg-primary-container text-on-primary' : 'text-inverse-on-surface/60 hover:text-inverse-on-surface'}`}
                    >
                      Kinematics Summary
                    </button>
                    <button
                      onClick={() => setActiveTab('hex')}
                      className={`px-space-xs py-0.5 rounded text-left font-label-mono text-label-mono ${activeTab === 'hex' ? 'bg-primary-container text-on-primary' : 'text-inverse-on-surface/60 hover:text-inverse-on-surface'}`}
                    >
                      Sensor Feed
                    </button>
                  </div>

                  <div className="mt-space-xs bg-black/40 rounded-xl p-space-sm font-telemetry-data text-[12px] leading-relaxed overflow-x-auto h-[320px] overflow-y-auto">
                    <pre className="text-primary-fixed-dim whitespace-pre-wrap selection:bg-primary selection:text-on-primary">
                      {netLoading
                        ? '// awaiting first live tick from GET /network/state …'
                        : netError
                          ? `// live feed unreachable: ${netError.message}`
                          : activeTab === 'proto'
                            ? JSON.stringify(trains.slice(0, 4), null, 2)
                            : activeTab === 'summary'
                              ? trains
                                  .slice(0, 8)
                                  .map(
                                    (t) =>
                                      `${t.train_id.padEnd(10)} ${t.section.padEnd(14)} ${t.speed_kmph.toFixed(1).padStart(6)} km/h  KP ${t.chainage_km.toFixed(2)}`,
                                  )
                                  .join('\n') || '// no trains currently reporting'
                              : JSON.stringify(sensors.slice(0, 6), null, 2) || '// no sensor readings currently reporting'}
                    </pre>
                  </div>
                  <div className="mt-space-sm pt-space-xs flex items-center justify-between text-inverse-on-surface/70 font-label-mono text-[10px]">
                    <span>Trains: {trains.length} • Sensors: {sensors.length}</span>
                    <span>Source: GET /api/v1/network/state</span>
                  </div>
                </div>

                <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border-2 border-dashed border-tertiary/50 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-tertiary text-[20px]">science</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface">Fault Injection &amp; Stress Bench</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className="px-space-xs py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-mono text-[10px] font-bold">MANUAL DEMO</span>
                      <span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-mono text-[10px] font-bold">CHAOS TESTER</span>
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Inject synthetic atmospheric degradation, canyon attenuation, and sensor outages to validate downstream digital twin safety interlocking. Client-side only — does not touch live telemetry.
                  </p>
                  <div className="flex flex-col gap-space-sm">
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-[13px] text-on-surface font-semibold">Simulate Alpine Tunnel Signal Loss</span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant">Forces 0 Satellites locked, triggers IMU Kalman dead reckoning</span>
                      </div>
                      <button
                        onClick={() => triggerFault('tunnel', 5000)}
                        className="px-space-sm py-1 rounded-full bg-surface-container-high hover:bg-error hover:text-on-error text-on-surface font-label-mono text-[11px] transition-colors"
                      >
                        Trigger Drop
                      </button>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-[13px] text-on-surface font-semibold">Inject Multipath Reflection Surge</span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant">Artificially shifts HDOP to 6.8 and introduces ±12m position jitter</span>
                      </div>
                      <button
                        onClick={() => triggerFault('multipath', 4000)}
                        className="px-space-sm py-1 rounded-full bg-surface-container-high hover:bg-tertiary hover:text-on-tertiary text-on-surface font-label-mono text-[11px] transition-colors"
                      >
                        Apply Jitter
                      </button>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-[13px] text-on-surface font-semibold">Inject 500ms Timestamp Skew</span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant">Tests out-of-order Kafka message resolution &amp; smoothing</span>
                      </div>
                      <button
                        onClick={() => triggerFault('skew', 4000)}
                        className="px-space-sm py-1 rounded-full bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-mono text-[11px] transition-colors"
                      >
                        Skew Clock
                      </button>
                    </div>
                    <div className={`p-space-xs px-space-sm rounded-lg font-label-mono text-[11px] flex items-center gap-space-xs ${banner.className}`}>
                      <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                      <span>{banner.text}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="comparison">
          <div className="w-full py-space-xl">
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs">
                <div>
                  <span className="font-label-caps text-label-caps text-primary uppercase font-bold">Comprehensive Telemetry Matrix</span>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface mt-1">Real RTIS vs RailTwin Synthetic Engine</h2>
                </div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">
                  Normative Reference: ISRO GSAT-6 Railway Transponder Spec Rev 4.2
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body-md text-body-md">
                  <thead>
                    <tr className="bg-surface-container text-on-surface font-label-caps text-label-caps">
                      <th className="py-space-sm px-space-md rounded-l-lg">Telemetry Feature Parameter</th>
                      <th className="py-space-sm px-space-md">Production Indian Railways RTIS</th>
                      <th className="py-space-sm px-space-md rounded-r-lg bg-primary/10 text-primary">RailTwin Synthetic Generator (Feature #1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-sm px-space-md font-semibold text-on-surface flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">satellite</span>
                        Ingestion &amp; Uplink Protocol
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant font-label-mono text-[12px]">ISRO GSAT-6 S-Band MSS Transponder / 4G Cellular Failover</td>
                      <td className="py-space-sm px-space-md text-primary font-label-mono text-[12px] font-semibold bg-primary/5">High-Throughput Kafka Stream + gRPC &amp; WebSockets</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-sm px-space-md font-semibold text-on-surface flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
                        Sampling &amp; Dispatch Frequency
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant">30 to 60 seconds interval (Stationary: 5 mins)</td>
                      <td className="py-space-sm px-space-md text-secondary font-semibold bg-primary/5 font-label-mono text-[12px]">10.0 Hz (Every 100 milliseconds real-time tick)</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-sm px-space-md font-semibold text-on-surface flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">data_object</span>
                        Packet Schema &amp; Payload Size
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant">128-byte binary frame (Speed, Lat/Lon, Heading, Signal aspect)</td>
                      <td className="py-space-sm px-space-md text-on-surface bg-primary/5 font-label-mono text-[12px]">256-byte enriched Protobuf with 6-DOF IMU &amp; GDOP vectors</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-sm px-space-md font-semibold text-on-surface flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">hourglass_empty</span>
                        End-to-End Ingestion Latency
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant">8 to 15 seconds (via Satellite Uplink &amp; CRIS Hub)</td>
                      <td className="py-space-sm px-space-md text-secondary font-semibold bg-primary/5 font-label-mono text-[12px]">&lt; 14.8 ms (Local Edge Broker to Digital Twin Viewport)</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-sm px-space-md font-semibold text-on-surface flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">graph_4</span>
                        Mountain Tunnel / Shadow Behavior
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant">Signal loss until portal exit; coarse axle-counter reconcile</td>
                      <td className="py-space-sm px-space-md text-on-surface bg-primary/5 font-label-mono text-[12px]">Dynamic Extended Kalman Filter IMU synthesis along 3D centerline</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-sm px-space-md font-semibold text-on-surface flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">developer_board</span>
                        Wayside Interlocking Integration
                      </td>
                      <td className="py-space-sm px-space-md text-on-surface-variant">Manual Central Dispatcher Table reconciliation</td>
                      <td className="py-space-sm px-space-md text-secondary font-semibold bg-primary/5 font-label-mono text-[12px]">Autonomous AI Section Lock, Virtual Block Moving Signalling</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabPanel>
      </div>
    </TabsProvider>
  );
}
