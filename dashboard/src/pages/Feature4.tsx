import { TabPanel } from '../components/TabPanel';
import { TabNav } from '../components/TabNav';
import { TabsProvider } from '../components/TabsProvider';
import { useApiPoll } from '../api/useApiPoll';
import { getHealth, getMonthlyBlockPlan, getWeeklyBlockPlan } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'scheduling', label: 'AI Timetabling' },
  { id: 'asset-availability', label: 'Asset Availability' },
  { id: 'spec-matrix', label: 'Spec Matrix' },
];

const DEPARTMENT_ICONS = ['train', 'view_carousel', 'badge'];

export function Feature4Page() {
  const { data: weeklyPlan, loading: weeklyLoading, error: weeklyError } = useApiPoll(
    getWeeklyBlockPlan,
    POLL_INTERVAL_MS,
  );
  const { data: monthlyPlan, loading: monthlyLoading, error: monthlyError } = useApiPoll(
    getMonthlyBlockPlan,
    POLL_INTERVAL_MS,
  );
  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const healthOk = !healthLoading && !healthError && health?.ai_engine === 'up';

  const slots = weeklyPlan?.slots ?? [];
  const representativeSlot = slots[0];

  return (
    <TabsProvider sections={SECTIONS}>
      <TabNav sections={SECTIONS} />
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-96 right-10 w-[450px] h-[450px] bg-secondary/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="max-w-[1480px] mx-auto px-gutter-desktop py-space-xl flex flex-col gap-space-2xl relative z-10">
          <TabPanel id="hero">
            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
                <div className="flex flex-wrap items-center gap-space-xs text-body-sm font-body-sm text-on-surface-variant">
                  <span className="hover:text-on-surface transition-colors cursor-pointer">Systems Architecture</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="hover:text-on-surface transition-colors cursor-pointer">Fleet Logistics &amp; Timetabling</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-primary font-bold">Feature #4 Spec (OR-Tools / Asset Availability)</span>
                </div>
                <div className="flex flex-wrap items-center gap-space-sm">
                  <div className={`inline-flex items-center gap-space-xxs px-space-sm py-space-xxs rounded-full backdrop-blur-md shadow-sm ${healthOk ? 'bg-secondary-container/50' : 'bg-error-container'}`}>
                    <span className={`w-2 h-2 rounded-full ${healthOk ? 'bg-secondary animate-pulse' : 'bg-error'}`}></span>
                    <span className={`font-label-mono text-label-mono ${healthOk ? 'text-on-secondary-container' : 'text-on-error-container'}`}>
                      {healthLoading ? 'CHECKING SOLVER…' : healthOk ? 'SOLVER KERNEL ONLINE' : 'SOLVER KERNEL UNREACHABLE'}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-space-xxs px-space-sm py-space-xxs rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-sm">
                    <span className="material-symbols-outlined text-primary text-[14px]">verified</span>
                    <span className="font-label-mono text-label-mono text-on-surface">SIH OBJECTIVE VERIFIED</span>
                  </div>
                  <div className="inline-flex items-center gap-space-xxs px-space-sm py-space-xxs rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-sm">
                    <span className="material-symbols-outlined text-secondary text-[14px]">link</span>
                    <span className="font-label-mono text-label-mono text-on-surface">
                      {weeklyLoading ? 'LOADING DUTY CHAINS…' : weeklyError ? 'DUTY CHAINS UNREACHABLE' : `${slots.length} DUTY CHAIN${slots.length === 1 ? '' : 'S'} MONITORED`}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs ml-auto lg:ml-space-md">
                    <button className="px-space-md py-space-xs rounded-full bg-surface-container-highest text-on-surface font-body-sm text-body-sm hover:bg-surface-variant transition-colors flex items-center gap-space-xxs shadow-sm">
                      <span className="material-symbols-outlined text-[16px]">play_circle</span>
                      <span>Run Base Timetable Gen</span>
                    </button>
                    <button className="px-space-md py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-body-md hover:bg-primary transition-colors flex items-center gap-space-xxs shadow-[0_4px_12px_rgba(18,82,163,0.15)]">
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      <span>Simulate Rake Disruption</span>
                    </button>
                    <button className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors">
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-space-sm max-w-5xl">
                <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-primary/10 text-primary w-fit">
                  <span className="material-symbols-outlined text-[15px]">psychology</span>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider">Optimization Engine Spec #04</span>
                </div>
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-tight">
                  Feature #4: AI Timetabling, Incremental Scheduling &amp; Asset Availability Tracking
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  Mathematical multi-resource scheduling engine combining loco-rake-crew duty chain graphs, dynamic turnaround buffer modeling, and real-time incremental re-optimization under steep mountain corridor disruptions.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-md">
                <div className="flex flex-col justify-between p-space-md rounded bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Timetable Stability</span>
                    <span className="material-symbols-outlined text-secondary text-[16px]">query_stats</span>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-headline-lg text-headline-lg text-on-surface">99.4%</div>
                    <div className="font-label-mono text-label-mono text-secondary mt-space-xxs flex items-center gap-space-xxs">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span>Zero Cascading Slip</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-between p-space-md rounded bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Duty Chains</span>
                    <span className="material-symbols-outlined text-primary text-[16px]">hub</span>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-headline-lg text-headline-lg text-primary">
                      {weeklyLoading ? '…' : weeklyError ? '—' : `${slots.length} Chains`}
                    </div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant mt-space-xxs">
                      {weeklyError ? 'GET /blockplan/weekly unreachable' : `Source: ${weeklyPlan?.source ?? '—'}`}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-between p-space-md rounded bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Re-Opt P99 Latency</span>
                    <span className="material-symbols-outlined text-tertiary-container text-[16px]">speed</span>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-headline-lg text-headline-lg text-on-surface">320 ms</div>
                    <div className="font-label-mono text-label-mono text-tertiary mt-space-xxs">Anytime Incremental MILP</div>
                  </div>
                </div>
                <div className="flex flex-col justify-between p-space-md rounded bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Asset Utilization</span>
                    <span className="material-symbols-outlined text-secondary text-[16px]">trending_up</span>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-headline-lg text-headline-lg text-secondary">+26.8%</div>
                    <div className="font-label-mono text-label-mono text-secondary mt-space-xxs">SIH Primary Objective</div>
                  </div>
                </div>
                <div className="flex flex-col justify-between p-space-md rounded bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Turnaround Buffer</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[16px]">schedule</span>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-headline-lg text-headline-lg text-on-surface">18.5 min</div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant mt-space-xxs">Dynamic Slack Managed</div>
                  </div>
                </div>
                <div className="flex flex-col justify-between p-space-md rounded bg-surface-container-lowest/80 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Cascade Damping</span>
                    <span className="material-symbols-outlined text-primary text-[16px]">waves</span>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-headline-lg text-headline-lg text-primary">0.88 ξ</div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant mt-space-xxs">Exponential Attenuation</div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="scheduling">
            <section className="flex flex-col gap-space-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shadow-md">10</div>
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">AI-Customized Scheduling / Timetabling</h2>
                      <span className="px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-mono text-label-mono uppercase">Level: High</span>
                      <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono text-label-mono">SIH Requirement</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                      Builds realistic base timetable and incrementally re-optimizes affected trains during disruptions. Prevents cascading uncertainty across the entire day's schedule.
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-space-xs text-primary font-body-md text-body-md">
                  <span className="material-symbols-outlined text-[18px]">alt_route</span>
                  <span>Conflict-Free Resolution Kernel</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                <div className="lg:col-span-8 flex flex-col p-space-lg rounded bg-surface-container-lowest/90 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between pb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">show_chart</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface">Darjeeling - Ghum - Kurseong Corridor: Conflict-Free Time-Distance Ribbon</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <span className="font-label-mono text-label-mono text-on-surface-variant">Scheduled Slot</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container ml-space-xs"></span>
                      <span className="font-label-mono text-label-mono text-on-surface-variant">Dynamic AI Re-route</span>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container-low/70 rounded p-space-md relative overflow-hidden">
                    <div className="flex justify-between text-body-sm font-label-mono text-on-surface-variant pb-space-xs">
                      <span>08:00 AM</span>
                      <span>09:30 AM</span>
                      <span>11:00 AM</span>
                      <span>12:30 PM</span>
                      <span>02:00 PM</span>
                      <span>03:30 PM</span>
                    </div>
                    <svg className="w-full h-52 text-on-surface-variant" fill="none" viewBox="0 0 760 220" xmlns="http://www.w3.org/2000/svg">
                      <line stroke="currentColor" strokeDasharray="2 4" strokeOpacity="0.2" x1="60" x2="740" y1="20" y2="20"></line>
                      <text className="text-[10px] font-mono" fill="currentColor" x="10" y="24">Ghum (2,258m)</text>
                      <line stroke="currentColor" strokeDasharray="2 4" strokeOpacity="0.2" x1="60" x2="740" y1="75" y2="75"></line>
                      <text className="text-[10px] font-mono" fill="currentColor" x="10" y="79">Batasia Loop</text>
                      <line stroke="currentColor" strokeDasharray="2 4" strokeOpacity="0.2" x1="60" x2="740" y1="130" y2="130"></line>
                      <text className="text-[10px] font-mono" fill="currentColor" x="10" y="134">Darjeeling Stn</text>
                      <line stroke="currentColor" strokeDasharray="2 4" strokeOpacity="0.2" x1="60" x2="740" y1="185" y2="185"></line>
                      <text className="text-[10px] font-mono" fill="currentColor" x="10" y="189">Kurseong Jct</text>
                      <path d="M 80 185 L 210 130 L 250 130 L 370 75 L 440 20" stroke="#1252a3" strokeLinecap="round" strokeWidth="3"></path>
                      <circle cx="230" cy="130" fill="#1252a3" r="4"></circle>
                      <rect fill="#1252a3" fillOpacity="0.1" height="20" rx="10" width="80" x="260" y="95"></rect>
                      <text className="text-[9px] font-bold" fill="#1252a3" x="268" y="109">ALP-104 (Pass)</text>
                      <path d="M 120 20 L 260 75 L 340 130 L 460 185" stroke="#3a6843" strokeDasharray="4 2" strokeLinecap="round" strokeWidth="2.5"></path>
                      <circle cx="260" cy="75" fill="#3a6843" r="4"></circle>
                      <text className="text-[9px] font-bold" fill="#3a6843" x="350" y="145">DHR-308</text>
                      <line stroke="#ba1a1a" strokeDasharray="3 3" strokeWidth="1.5" x1="410" x2="410" y1="10" y2="210"></line>
                      <rect fill="#ffdad6" height="18" rx="4" width="90" x="365" y="4"></rect>
                      <text className="text-[9px] font-mono font-bold" fill="#93000a" x="372" y="16">! DISRUPTION Km 18.4</text>
                      <path d="M 370 75 L 430 75 L 530 20" stroke="#893f00" strokeDasharray="2 3" strokeWidth="2.5"></path>
                      <circle cx="430" cy="75" fill="#893f00" r="3.5"></circle>
                      <text className="text-[9px] font-mono font-semibold" fill="#893f00" x="442" y="70">+14m Hold at Siding #2</text>
                      <path d="M 460 185 L 540 185 L 670 130" stroke="#3a6843" strokeWidth="2"></path>
                      <text className="text-[9px] font-mono" fill="#3a6843" x="550" y="180">DHR-308 Cleared</text>
                    </svg>
                    <div className="mt-space-xs flex flex-wrap items-center justify-between text-body-sm font-label-mono text-on-surface-variant pt-space-xs">
                      <span className="flex items-center gap-space-xxs">
                        <span className="material-symbols-outlined text-secondary text-[15px]">check_circle</span>
                        Branch Interlocking: Conflict Matrix Cleared (0 headways violated)
                      </span>
                      <span className="text-primary font-bold">OR-Tools MILP Solver: Converged in 218ms</span>
                    </div>
                    <div className="mt-space-xxs flex items-center justify-between text-body-sm font-label-mono text-on-surface-variant">
                      <span>Live weekly block plan:</span>
                      <span className={weeklyError ? 'text-error font-bold' : 'text-secondary font-bold'}>
                        {weeklyLoading ? 'loading…' : weeklyError ? `unreachable: ${weeklyError.message}` : `${slots.length} slot${slots.length === 1 ? '' : 's'} • source ${weeklyPlan?.source}`}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mt-space-md">
                    <div className="p-space-sm rounded bg-surface-container/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-space-xs text-primary font-label-mono text-label-mono uppercase">
                          <span className="material-symbols-outlined text-[16px]">calculate</span>
                          <span>Mathematical Objective Formulation</span>
                        </div>
                        <div className="mt-space-xs p-space-xs rounded bg-surface-container-highest/70 font-label-mono text-body-sm text-on-surface text-center">
                          min Σ (w<sub>i</sub> · (t<sub>act</sub> - t<sub>base</sub>)² + λ·CrewOvertime + γ·Deadheading)
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs leading-normal">
                          Penalty matrices ensure minimal deviation from advertised passenger timetables while rigorously enforcing strict headway and siding capacities.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-space-xs font-label-mono text-label-mono text-secondary">
                        <span>Cascading Slip Suppression</span>
                        <span className="font-bold">84.2% schedule retention</span>
                      </div>
                    </div>
                    <div className="p-space-sm rounded bg-surface-container/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-label-mono text-label-mono uppercase text-tertiary">Disruption Event Injected</span>
                          <span className="px-space-xxs py-0.5 rounded bg-tertiary-fixed font-label-mono text-[10px] text-on-tertiary-fixed font-bold">SIMULATED</span>
                        </div>
                        <div className="font-headline-sm text-headline-sm text-on-surface mt-space-xs">
                          Km 18.4 Track Debris / Mudslip
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">
                          Corridor blockage duration: 45 min. Incremental solver recalculates 12 passenger &amp; cargo paths in 240ms without resetting the master network schedule.
                        </p>
                      </div>
                      <div className="mt-space-xs flex items-center gap-space-xs">
                        <div className="flex-1 bg-surface-container-high rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: '88%' }}></div>
                        </div>
                        <span className="font-label-mono text-label-mono text-on-surface font-bold">88% Resilient</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-space-md">
                  <div className="p-space-md rounded bg-surface-container-lowest/90 backdrop-blur-md shadow-sm flex flex-col gap-space-sm">
                    <div className="relative h-48 w-full rounded overflow-hidden shadow-inner">
                      <img
                        alt="High-altitude alpine electric locomotive climbing steep grade through snow-capped mountain pass"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida/AEtjO1W18gZvTvjmWhQofH72U7mUWvM-mi9R3L5DmWH47F11fD9EN4T6x3cNDx9RmcGOsokH-af6AkTl5YJO60uXUvLRCVgO9vzjAxFcgeXizc1VJcZZ5lPPI_1xvLzqSPhi54lozy9gduuw0_vwuGWK8Pq8iW3ijLVnjDmWgaiOrbm4Ejwm2yqBGk2dLz_bQzF63bf2H2iE3xqj3FEX5xW5WUAxMmlYNFIMXvgLr7mEEzkSRQCuZRfIea3C5COf"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-on-primary">
                        <div>
                          <div className="font-headline-sm text-headline-sm leading-tight text-on-primary">Unit Ge 4/4 III #653</div>
                          <div className="font-label-mono text-label-mono text-primary-fixed">Albula-Bernina Sector</div>
                        </div>
                        <span className="px-space-xs py-0.5 rounded-full bg-secondary text-on-secondary font-label-mono text-label-mono font-bold">ON-TRACK</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between py-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Timetable Deviation</span>
                        <span className="font-label-mono text-telemetry-data text-secondary">-0.8 min (AHEAD)</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Dynamic Grade Resistance</span>
                        <span className="font-label-mono text-telemetry-data text-on-surface">3.8% Incline</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Scheduled Dwell Buffer</span>
                        <span className="font-label-mono text-telemetry-data text-on-surface">4.5 min (Loop 3)</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Solver Priority Weight</span>
                        <span className="font-label-mono text-telemetry-data text-primary font-bold">w = 0.95 (High Express)</span>
                      </div>
                    </div>
                    <div className="p-space-xs rounded bg-surface-container flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
                      <span className="font-body-sm text-body-sm text-on-surface leading-tight">
                        Disruption containment validated: Zero cascading delay on returning rake duty.
                      </span>
                    </div>
                  </div>
                  <div className="p-space-md rounded bg-surface-container-high/60 backdrop-blur-md shadow-sm flex flex-col gap-space-xs">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Solver Engine Core</span>
                    <div className="font-headline-sm text-headline-sm text-on-surface">Google OR-Tools CP-SAT + Linear Relaxation</div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Hybrid Constraint Programming engine paired with piecewise linear tractive effort envelopes to model actual train acceleration curves on grades.
                    </p>
                    <div className="flex flex-wrap gap-space-xxs mt-space-xxs">
                      <span className="px-space-xs py-0.5 rounded-full bg-surface-container-lowest font-label-mono text-label-mono text-on-surface">Sub-second warm start</span>
                      <span className="px-space-xs py-0.5 rounded-full bg-surface-container-lowest font-label-mono text-label-mono text-on-surface">Rolling horizon 24h</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="asset-availability">
            <section className="flex flex-col gap-space-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-sm text-headline-sm shadow-md">11</div>
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">Asset Availability Tracking &amp; Duty Chain Scoring</h2>
                      <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono text-label-mono uppercase">Level: High</span>
                      <span className="px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-mono text-label-mono">SIH Primary Objective</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                      Tracks loco/rake/crew duty chains and scores options on future assignments. Directly aligns with the primary SIH objective of maximizing asset availability.
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-space-xs text-secondary font-body-md text-body-md">
                  <span className="material-symbols-outlined text-[18px]">insights</span>
                  <span>Predictive Turnaround Intelligence</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                <div className="lg:col-span-7 flex flex-col p-space-lg rounded bg-surface-container-lowest/90 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between pb-space-sm flex-wrap gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Triple-Resource Duty Chain Visualizer</span>
                    <span className="font-label-mono text-label-mono text-primary bg-primary-fixed/40 px-space-xs py-0.5 rounded-full">
                      {weeklyLoading ? 'LOADING…' : representativeSlot ? `CHAIN #${representativeSlot.slot_id}` : 'NO ACTIVE CHAIN'}
                    </span>
                  </div>

                  {weeklyLoading ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading live duty chains from GET /blockplan/weekly…</div>
                  ) : weeklyError ? (
                    <div className="p-space-md rounded bg-error-container text-on-error-container font-body-sm text-body-sm">Duty chain feed unreachable: {weeklyError.message}</div>
                  ) : !representativeSlot ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No block plan slots currently scheduled.</div>
                  ) : (
                    <div className="flex flex-col gap-space-md py-space-sm">
                      <div className="p-space-sm rounded bg-surface-container-low flex items-center justify-between gap-space-sm">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">location_on</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-space-xs">
                              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Section &amp; Window</span>
                              <span className="w-2 h-2 rounded-full bg-secondary"></span>
                            </div>
                            <div className="font-headline-sm text-headline-sm text-on-surface">{representativeSlot.section ?? 'Unassigned section'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-label-mono text-telemetry-data text-secondary font-bold">
                            {representativeSlot.window_start ? new Date(representativeSlot.window_start).toLocaleTimeString() : '—'}
                            {' → '}
                            {representativeSlot.window_end ? new Date(representativeSlot.window_end).toLocaleTimeString() : '—'}
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">{representativeSlot.task_ids.length} task(s) linked</div>
                        </div>
                      </div>
                      {representativeSlot.departments.length === 0 ? (
                        <div className="p-space-sm rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No departments assigned to this slot.</div>
                      ) : (
                        representativeSlot.departments.map((dept, i) => (
                          <div key={dept}>
                            {i > 0 && (
                              <div className="flex items-center justify-center -my-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[18px]">link</span>
                                <span className="font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant px-space-xs">Coupled Duty Assignment</span>
                              </div>
                            )}
                            <div className="p-space-sm rounded bg-surface-container-low flex items-center justify-between gap-space-sm">
                              <div className="flex items-center gap-space-sm">
                                <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                                  <span className="material-symbols-outlined">{DEPARTMENT_ICONS[i % DEPARTMENT_ICONS.length]}</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-space-xs">
                                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Department</span>
                                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                  </div>
                                  <div className="font-headline-sm text-headline-sm text-on-surface">{dept}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-label-mono text-telemetry-data text-primary font-bold">Slot {representativeSlot.slot_id}</div>
                                <div className="font-body-sm text-body-sm text-on-surface-variant">Live from GET /blockplan/weekly</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="mt-space-md pt-space-sm">
                    <div className="flex items-center justify-between mb-space-sm flex-wrap gap-space-xs">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">star</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface">AI Future Assignment Scoring Matrix</span>
                      </div>
                      <span className="font-label-mono text-label-mono text-on-surface-variant">Illustrative — no live scoring feed wired</span>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <div className="p-space-sm rounded bg-surface-container/60 hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs cursor-pointer">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-mono text-label-mono font-bold">A</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Quick Turnaround: Kurseong Alpine Shuttle (#1209)</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">Turnaround buffer: 24 min | Crew rest satisfied | Battery reserve: 94%</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-space-sm self-end sm:self-center">
                          <div className="text-right">
                            <span className="font-headline-sm text-headline-sm text-secondary">96.2</span>
                            <span className="font-label-mono text-[10px] text-on-surface-variant"> / 100</span>
                          </div>
                          <button className="px-space-sm py-space-xxs rounded-full bg-secondary text-on-secondary font-label-mono text-label-mono font-bold">ASSIGN</button>
                        </div>
                      </div>
                      <div className="p-space-sm rounded bg-surface-container/40 hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs cursor-pointer">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-7 h-7 rounded-full bg-surface-variant text-on-surface flex items-center justify-center font-label-mono text-label-mono font-bold">B</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Depot Secondary Inspection &amp; Brake Test (Siliguri Pit #3)</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">Rake inspection window opens 16:30 | Pre-emptive bogie acoustic scan</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-space-sm self-end sm:self-center">
                          <div className="text-right">
                            <span className="font-headline-sm text-headline-sm text-on-surface">82.5</span>
                            <span className="font-label-mono text-[10px] text-on-surface-variant"> / 100</span>
                          </div>
                          <button className="px-space-sm py-space-xxs rounded-full bg-surface-container-high text-on-surface font-label-mono text-label-mono">QUEUE</button>
                        </div>
                      </div>
                      <div className="p-space-sm rounded bg-surface-container/20 opacity-75 hover:opacity-100 transition-opacity flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs cursor-pointer">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-7 h-7 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-label-mono text-label-mono font-bold">C</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Deadhead Transfer to Siliguri Goods Yard</div>
                            <div className="font-body-sm text-body-sm text-error">Infeasible: Pilot Crew HOER 10h continuous duty envelope exceeded</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-space-sm self-end sm:self-center">
                          <div className="text-right">
                            <span className="font-headline-sm text-headline-sm text-error">41.0</span>
                            <span className="font-label-mono text-[10px] text-on-surface-variant"> / 100</span>
                          </div>
                          <span className="px-space-sm py-space-xxs rounded-full bg-error-container text-on-error-container font-label-mono text-label-mono font-bold">BLOCKED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-space-md">
                  <div className="p-space-md rounded bg-surface-container-lowest/90 backdrop-blur-md shadow-sm flex flex-col gap-space-sm">
                    <div className="relative h-48 w-full rounded overflow-hidden shadow-inner">
                      <img
                        alt="Passenger carriage interior looking out picturesque wooden train window across alpine meadow and mountain ranges"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida/AEtjO1X9BpiIcB2Sjzj_Tq2-R3uEqMy0q61zTB_98t31uRVRhoQ1a4jkXZWr-52egNaow-QNGNE30-oc-CC77ak0uoliMxLgFnr8rwEhPZH2787wMLtN3BZDOlA47rNi--bRkXtwK3ppUctLs7h8lODEk68xjddfBKJhprI_QpA2n_2qJl2E77yGbNnmZtB_CHcbaiMsH_HsvrAXk7ws-BXdURVnj5wefSPvEXHjMqsTTve_dV4LrVFaFYEhMuI"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-on-primary">
                        <div>
                          <div className="font-headline-sm text-headline-sm leading-tight text-on-primary">Panoramic Alpine Rake #1204</div>
                          <div className="font-label-mono text-label-mono text-primary-fixed">Scheduled: 6 Daily Roundtrips</div>
                        </div>
                        <span className="px-space-xs py-0.5 rounded-full bg-secondary text-on-secondary font-label-mono text-label-mono font-bold">99.8% AVAIL</span>
                      </div>
                    </div>
                    <div className="p-space-sm rounded bg-secondary-container/30 flex flex-col gap-space-xs">
                      <div className="flex items-center gap-space-xs text-secondary font-label-caps text-label-caps uppercase">
                        <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                        <span>Primary SIH Mandate Alignment</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-secondary-container font-medium leading-relaxed">
                        "Directly aligns with the primary SIH objective of maximizing asset availability." Continuous multi-modal linking reduces locomotive turnaround idle times from 42 min to 18.5 min, raising overall fleet throughput by +26.8%.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-space-xs pt-space-xxs">
                      <div className="p-space-xs rounded bg-surface-container flex flex-col">
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Sections Tracked</span>
                        <span className="font-headline-sm text-headline-sm text-secondary">
                          {monthlyLoading ? '…' : monthlyError ? '—' : monthlyPlan?.sections.length ?? 0}
                        </span>
                        <span className="font-label-mono text-[10px] text-on-surface-variant">
                          {monthlyError ? 'GET /blockplan/monthly unreachable' : `Source: ${monthlyPlan?.source ?? '—'}`}
                        </span>
                      </div>
                      <div className="p-space-xs rounded bg-surface-container flex flex-col">
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Crew HOER Violations</span>
                        <span className="font-headline-sm text-headline-sm text-primary">0 Incidents</span>
                        <span className="font-label-mono text-[10px] text-on-surface-variant">Zero Safety Breaches</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-space-md rounded bg-surface-container-high/60 backdrop-blur-md shadow-sm flex flex-col gap-space-xs">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Wayside &amp; Telemetry Interlock</span>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-on-surface-variant">Loco Axle Acoustic Health</span>
                      <span className="font-label-mono text-secondary font-bold">Nominal (0.12 mm/s RMS)</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-on-surface-variant">Pantograph Contact Strip Wear</span>
                      <span className="font-label-mono text-on-surface font-bold">2.4 mm (88% Left)</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-on-surface-variant">Regenerative Braking Capacity</span>
                      <span className="font-label-mono text-primary font-bold">98.4% Grid Fed</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-on-surface-variant">Crew Mandatory Rest Verification</span>
                      <span className="font-label-mono text-secondary font-bold">Auto-Logged &amp; Certified</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="spec-matrix">
            <section className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-space-xxs">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface">Feature Specification Summary Matrix</h3>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Official operational specification excerpt comparing algorithmic features #10 and #11 in RailTwin deployment architecture.
                </p>
              </div>
              <div className="overflow-x-auto rounded shadow-sm bg-surface-container-lowest">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-primary text-on-primary">
                      <th className="py-space-sm px-space-md font-label-mono text-label-mono uppercase tracking-wider w-12 text-center">#</th>
                      <th className="py-space-sm px-space-md font-label-caps text-label-caps uppercase tracking-wider w-64">Feature Name</th>
                      <th className="py-space-sm px-space-md font-label-caps text-label-caps uppercase tracking-wider">Description</th>
                      <th className="py-space-sm px-space-md font-label-caps text-label-caps uppercase tracking-wider w-24 text-center">Level</th>
                      <th className="py-space-sm px-space-md font-label-caps text-label-caps uppercase tracking-wider">Benefit &amp; Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-0">
                    <tr className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-md font-headline-sm text-headline-sm text-center text-on-surface font-bold">10</td>
                      <td className="py-space-md px-space-md align-top">
                        <div className="font-headline-sm text-headline-sm text-on-surface font-bold leading-snug">AI-Customized Scheduling/Timetabling</div>
                        <div className="font-label-mono text-[11px] text-primary mt-1">MODULE: OR-TOOLS CP-SAT + DISRUPTION NLP</div>
                      </td>
                      <td className="py-space-md px-space-md align-top font-body-md text-body-md text-on-surface leading-relaxed">
                        Builds realistic base timetable and incrementally re-optimizes affected trains during disruptions.
                      </td>
                      <td className="py-space-md px-space-md align-top text-center">
                        <span className="inline-block px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-mono text-label-mono font-bold">High</span>
                      </td>
                      <td className="py-space-md px-space-md align-top font-body-md text-body-md text-on-surface leading-relaxed">
                        Prevents cascading uncertainty across the entire day's schedule.
                      </td>
                    </tr>
                    <tr className="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-md font-headline-sm text-headline-sm text-center text-on-surface font-bold">11</td>
                      <td className="py-space-md px-space-md align-top">
                        <div className="font-headline-sm text-headline-sm text-on-surface font-bold leading-snug">Asset Availability Tracking</div>
                        <div className="font-label-mono text-[11px] text-secondary mt-1">MODULE: DUTY CHAIN GRAPH &amp; ROSTER OPTIMIZER</div>
                      </td>
                      <td className="py-space-md px-space-md align-top font-body-md text-body-md text-on-surface leading-relaxed">
                        Tracks loco/rake/crew duty chains and scores options on future assignments.
                      </td>
                      <td className="py-space-md px-space-md align-top text-center">
                        <span className="inline-block px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-mono text-label-mono font-bold">High</span>
                      </td>
                      <td className="py-space-md px-space-md align-top font-body-md text-body-md text-on-surface leading-relaxed font-semibold text-secondary">
                        Directly aligns with the primary SIH objective of maximizing asset availability.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-space-lg rounded bg-primary text-on-primary shadow-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="w-12 h-12 rounded-full bg-on-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[28px] text-on-primary">instant_mix</span>
                  </div>
                  <div>
                    <div className="font-headline-lg text-headline-lg text-on-primary leading-snug">Ready to evaluate dynamic timetabling and asset duty chains?</div>
                    <p className="font-body-md text-body-md text-on-primary-container">
                      Execute live corridor simulations on the Darjeeling-Ghum sector with synthetic landslip and power outage scenarios.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm shrink-0">
                  <a
                    href="#hero"
                    className="px-space-lg py-space-sm rounded-full bg-surface-container-lowest text-primary font-body-lg text-body-lg font-bold hover:bg-surface transition-colors flex items-center gap-space-xs shadow-md"
                  >
                    <span>Launch Asset &amp; Timetable Simulator</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            </section>
          </TabPanel>
        </div>
      </div>
    </TabsProvider>
  );
}
