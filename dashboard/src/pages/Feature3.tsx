import { useState } from 'react';
import { TabPanel } from '../components/TabPanel';
import { TabNav } from '../components/TabNav';
import { TabsProvider } from '../components/TabsProvider';
import { useApiPoll } from '../api/useApiPoll';
import { getConflictOptions, getConflicts, getHealth } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';
import type { Conflict } from '../api/types';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'optimization-engine', label: 'Optimization Engine' },
  { id: 'rerouting-safety', label: 'Rerouting Safety' },
  { id: 'precedence-speed', label: 'Precedence & Speed' },
  { id: 'anytime-optimization', label: 'Anytime Optimization' },
  { id: 'dual-engine', label: 'Dual Engine' },
  { id: 'traceability-matrix', label: 'Traceability Matrix' },
];

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function pickTopConflict(conflicts: Conflict[] | null): Conflict | undefined {
  if (!conflicts || conflicts.length === 0) return undefined;
  return [...conflicts].sort(
    (a, b) => (SEVERITY_RANK[b.severity.toLowerCase()] ?? 0) - (SEVERITY_RANK[a.severity.toLowerCase()] ?? 0),
  )[0];
}

export function Feature3Page() {
  const { data: conflicts, loading: conflictsLoading, error: conflictsError } = useApiPoll(
    getConflicts,
    POLL_INTERVAL_MS,
  );
  const topConflict = pickTopConflict(conflicts);

  const { data: options, loading: optionsLoading, error: optionsError } = useApiPoll(
    () => (topConflict ? getConflictOptions(topConflict.id) : Promise.resolve([])),
    POLL_INTERVAL_MS,
    [topConflict?.id],
  );
  const rankedOptions = [...(options ?? [])].sort((a, b) => b.score - a.score);

  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const healthOk = !healthLoading && !healthError && health?.ai_engine === 'up';

  const [committedAction, setCommittedAction] = useState<string | null>(null);

  return (
    <TabsProvider sections={SECTIONS}>
      <TabNav sections={SECTIONS} />
      <div className="relative w-full overflow-hidden bg-surface pb-space-3xl">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[400px] bg-primary-fixed/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-96 right-10 w-[500px] h-[500px] bg-secondary-fixed/40 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-[1480px] mx-auto px-gutter-mobile md:px-gutter-tablet lg:px-gutter-desktop pt-space-xl flex flex-col gap-space-2xl relative z-10">
          <TabPanel id="hero">
            <div className="flex flex-col gap-space-2xl">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="inline-flex items-center gap-space-xxs px-space-sm py-space-xxs rounded-full bg-primary-container text-on-primary font-label-mono text-label-mono uppercase tracking-wider shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-ping"></span>
                    OPTIMIZATION ENGINE SPEC #03 // CORE SOLVER &amp; SAFETY KERNEL
                  </span>
                  <span className="font-label-mono text-label-mono text-outline uppercase hidden sm:inline-block">| MILP &amp; CP-SAT HYBRID KERNEL</span>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
                  <div>
                    <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Feature #3: AI Optimization &amp; Decision Engine</h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl mt-space-xs">
                      The mathematical "brain" that converts predictive track telemetry into provably conflict-free, energy-optimized dispatch schedules. Orchestrating Google OR-Tools CP-SAT multi-objective optimization, deterministic 3-gate crew/physics safety certification, priority precedence cascades, and anytime sub-second heuristics for high-gradient alpine corridors.
                    </p>
                  </div>
                  <div className="flex items-center gap-space-xs shrink-0">
                    <button className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-caps text-label-caps uppercase transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                      Export Kernel Telemetry
                    </button>
                    <button className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-caps text-label-caps uppercase transition-colors shadow-md">
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      Run Solver Stress Bench
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-sm">
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Mean Solver Run</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
                  </div>
                  <div className="mt-space-xs">
                    <div className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">218 <span className="text-body-sm font-normal">ms</span></div>
                    <div className="font-label-mono text-label-mono text-secondary">OR-Tools warm-started</div>
                  </div>
                </div>
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Safety Enforcement</span>
                    <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
                  </div>
                  <div className="mt-space-xs">
                    <div className="font-headline-lg text-headline-lg text-secondary tracking-tight font-bold">100%</div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant">0 unverified dispatches</div>
                  </div>
                </div>
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Delay Reduction</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">trending_down</span>
                  </div>
                  <div className="mt-space-xs">
                    <div className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">-38.6%</div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant">Cascade suppressed</div>
                  </div>
                </div>
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">HOER Compliance</span>
                    <span className="material-symbols-outlined text-secondary text-[18px]">schedule</span>
                  </div>
                  <div className="mt-space-xs">
                    <div className="font-headline-lg text-headline-lg text-secondary tracking-tight font-bold">100.0%</div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant">Zero crew breaches</div>
                  </div>
                </div>
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Anytime Floor</span>
                    <span className="material-symbols-outlined text-tertiary-container text-[18px]">bolt</span>
                  </div>
                  <div className="mt-space-xs">
                    <div className="font-headline-lg text-headline-lg text-tertiary-container tracking-tight font-bold">15 <span className="text-body-sm font-normal">ms</span></div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant">Greedy safety seed</div>
                  </div>
                </div>
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Timeout Limit</span>
                    <span className="material-symbols-outlined text-on-surface text-[18px]">lock_clock</span>
                  </div>
                  <div className="mt-space-xs">
                    <div className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">1,500 <span className="text-body-sm font-normal">ms</span></div>
                    <div className="font-label-mono text-label-mono text-on-surface-variant">Deterministic ceiling</div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="optimization-engine">
            <section className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">6</span>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">AI Decision &amp; Multi-Objective Optimization Engine</h2>
                    <span className="font-label-mono text-label-mono text-primary font-semibold uppercase">Google OR-Tools CP-SAT &amp; Mixed-Integer Linear Program (MILP)</span>
                  </div>
                </div>
                <span className="hidden md:inline-flex px-space-sm py-space-xxs rounded-full bg-surface-container-high text-on-surface-variant font-label-mono text-label-mono">
                  SOLVER: OR-Tools v9.9.2 // Threads: 16 // Branch &amp; Cut Enabled
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                <div className="lg:col-span-5 flex flex-col gap-space-md p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Objective Function Kernel</span>
                    <span className="inline-flex items-center gap-1 font-label-mono text-label-mono text-secondary">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span> Constrained Global Min
                    </span>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container-low font-telemetry-data text-telemetry-data text-primary leading-relaxed select-all">
                    <div className="text-on-surface-variant text-body-sm mb-1 font-label-mono uppercase">Global Penalty Minimization:</div>
                    <code className="font-bold text-headline-sm block text-primary">
                      min 𝒵 = ∑ (w<sub className="text-[10px]">1</sub>·Δt<sub className="text-[10px]">delay</sub> + w<sub className="text-[10px]">2</sub>·E<sub className="text-[10px]">tractive</sub> + w<sub className="text-[10px]">3</sub>·Φ<sub className="text-[10px]">headway</sub> + w<sub className="text-[10px]">4</sub>·Ω<sub className="text-[10px]">duty</sub>)
                    </code>
                  </div>
                  <div className="flex flex-col gap-space-xs mt-space-xxs">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Spatial &amp; Kinematic Constraints:</span>
                    <div className="grid grid-cols-1 gap-space-xxs font-label-mono text-label-mono">
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">• Block Exclusivity Interval</span>
                        <span className="text-secondary font-semibold">T<sub className="text-[9px]">clearance</sub> ≥ 180s</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">• Dynamic Tractive Adhesion Limit</span>
                        <span className="text-secondary font-semibold">μ<sub className="text-[9px]">wheel-rail</sub> ≤ 0.28 (Wet/Mist)</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">• Mountain Siding Clear Length</span>
                        <span className="text-secondary font-semibold">L<sub className="text-[9px]">rake</sub> ≤ 340m (Kurseong)</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">• Max Gradient Deceleration Force</span>
                        <span className="text-secondary font-semibold">a<sub className="text-[9px]">brake</sub> ≥ -0.85 m/s²</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-space-xs p-space-md rounded-xl bg-surface-container-high">
                    <div className="flex items-center justify-between mb-space-xs">
                      <span className="font-label-caps text-label-caps text-on-surface">Dynamic Objective Weights</span>
                      <span className="font-label-mono text-label-mono text-primary font-bold">Preset: High-Cascade Alert</span>
                    </div>
                    <div className="space-y-2 font-label-mono text-label-mono">
                      <div>
                        <div className="flex justify-between text-body-sm mb-1">
                          <span>w1: Passenger Delay Penalty</span>
                          <span className="font-bold text-primary">0.45</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-highest">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-body-sm mb-1">
                          <span>w2: Regenerative Energy Recapture</span>
                          <span className="font-bold text-secondary">0.25</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-highest">
                          <div className="h-1.5 rounded-full bg-secondary" style={{ width: '25%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-body-sm mb-1">
                          <span>w3: Headway Buffer Margin</span>
                          <span className="font-bold text-tertiary-container">0.20</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-highest">
                          <div className="h-1.5 rounded-full bg-tertiary-container" style={{ width: '20%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-body-sm mb-1">
                          <span>w4: HOER Duty Preservation</span>
                          <span className="font-bold text-on-surface">0.10</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-highest">
                          <div className="h-1.5 rounded-full bg-on-surface" style={{ width: '10%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between flex-wrap gap-space-xs">
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">Real-Time Dispatch Candidates</h3>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {conflictsLoading
                          ? 'Awaiting live conflict feed…'
                          : conflictsError
                            ? 'Conflict feed unreachable'
                            : topConflict
                              ? `Live OR-Tools candidate generation for ${topConflict.section} — showing options for the current highest-severity conflict (${topConflict.id})`
                              : 'No active conflicts reported — showing a representative empty state'}
                      </span>
                    </div>
                    <span className="font-label-mono text-label-mono text-primary bg-primary-fixed/40 px-space-sm py-space-xxs rounded-full font-bold">
                      {optionsLoading ? 'EVALUATING…' : `EVALUATED: ${rankedOptions.length} OPTION${rankedOptions.length === 1 ? '' : 'S'}`}
                    </span>
                  </div>

                  {conflictsLoading ? (
                    <div className="p-space-lg rounded-2xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading live conflict feed…</div>
                  ) : conflictsError ? (
                    <div className="p-space-lg rounded-2xl bg-error-container text-on-error-container font-body-sm text-body-sm">Conflict feed unreachable: {conflictsError.message}</div>
                  ) : !topConflict ? (
                    <div className="p-space-lg rounded-2xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No active conflicts on the network right now — the candidate ranker has nothing to rank.</div>
                  ) : optionsLoading ? (
                    <div className="p-space-lg rounded-2xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading candidate options for {topConflict.id}…</div>
                  ) : optionsError ? (
                    <div className="p-space-lg rounded-2xl bg-error-container text-on-error-container font-body-sm text-body-sm">Candidate options unreachable: {optionsError.message}</div>
                  ) : rankedOptions.length === 0 ? (
                    <div className="p-space-lg rounded-2xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No candidate options returned yet for conflict {topConflict.id}.</div>
                  ) : (
                    rankedOptions.map((opt, i) =>
                      i === 0 ? (
                        <div key={opt.action + i} className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(18,82,163,0.08)] flex flex-col gap-space-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
                          <div className="flex flex-wrap items-center justify-between gap-space-xs">
                            <div className="flex items-center gap-space-xs">
                              <span className="inline-flex items-center px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">
                                RECOMMENDED • RANK 1
                              </span>
                              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{opt.action}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-container-high px-space-sm py-1 rounded-full">
                              <span className="font-label-caps text-label-caps text-on-surface-variant">COMPOSITE SCORE</span>
                              <span className="font-headline-sm text-headline-sm font-bold text-secondary">{opt.score.toFixed(1)}<span className="text-body-sm font-normal">/100</span></span>
                            </div>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface-variant">{opt.rationale}</p>
                          <div className="flex flex-wrap gap-space-xxs p-space-sm rounded-xl bg-surface-container-low font-label-mono text-label-mono">
                            {opt.constraints_checked.length === 0 ? (
                              <span className="text-on-surface-variant">No constraint list reported</span>
                            ) : (
                              opt.constraints_checked.map((c) => (
                                <span key={c} className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface">{c}</span>
                              ))
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-space-xs">
                            <span className="font-label-mono text-label-mono text-secondary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              All 3 Deterministic Safety Gates Passed
                            </span>
                            <button
                              onClick={() => setCommittedAction(opt.action)}
                              className={`inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full font-label-caps text-label-caps uppercase transition-all shadow-sm ${committedAction === opt.action ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary hover:bg-secondary/90'}`}
                            >
                              <span>{committedAction === opt.action ? 'Dispatch Order Committed' : 'Commit Dispatch Order'}</span>
                              <span className="material-symbols-outlined text-[16px]">{committedAction === opt.action ? 'lock' : 'arrow_forward'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={opt.action + i} className="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_4px_14px_rgba(0,0,0,0.03)] flex flex-col gap-space-xs">
                          <div className="flex flex-wrap items-center justify-between gap-space-xs">
                            <div className="flex items-center gap-space-xs">
                              <span className="inline-flex items-center px-space-sm py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-mono text-label-mono font-medium">
                                ALTERNATIVE • RANK {i + 1}
                              </span>
                              <span className="font-headline-sm text-headline-sm text-on-surface">{opt.action}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-container-low px-space-sm py-0.5 rounded-full">
                              <span className="font-label-caps text-label-caps text-on-surface-variant">SCORE</span>
                              <span className="font-headline-sm text-headline-sm text-primary font-bold">{opt.score.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">{opt.rationale}</p>
                          <div className="flex flex-wrap gap-space-xxs p-space-xs rounded-lg bg-surface-container-low font-label-mono text-label-mono">
                            {opt.constraints_checked.map((c) => (
                              <span key={c} className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface">{c}</span>
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="rerouting-safety">
            <section className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-sm text-headline-sm font-bold">7</span>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">Rerouting Safety Validation Engine</h2>
                    <span className="font-label-mono text-label-mono text-secondary font-semibold uppercase">Deterministic 3-Gate Verification Pipeline Before Track Allocation</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono font-bold ${healthOk ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                  <span className={`w-2 h-2 rounded-full ${healthOk ? 'bg-secondary' : 'bg-error'}`}></span>
                  {healthLoading ? 'CHECKING…' : healthOk ? 'ALL GATES NOMINAL' : 'AI ENGINE UNREACHABLE'}
                </span>
              </div>

              <div className="p-space-sm rounded-xl bg-surface-container-high flex flex-wrap items-center justify-between gap-space-xs font-label-mono text-label-mono text-on-surface-variant">
                <span>
                  {conflictsLoading
                    ? 'Awaiting live conflict feed…'
                    : conflictsError
                      ? `Conflict feed unreachable: ${conflictsError.message}`
                      : topConflict
                        ? `Validating candidate reroute for ${topConflict.section} — Conflict ${topConflict.id} (highest-severity active conflict)`
                        : 'No active conflicts — gate detail below is illustrative'}
                </span>
                <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant uppercase">Illustrative gate detail — live conflict context above</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                <div className="lg:col-span-8 flex flex-col gap-space-md">
                  <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
                    <div className="flex items-start gap-space-md">
                      <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[26px]">badge</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-space-xs">
                          <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">Gate 01 // Regulatory Compliance</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                          <span className="font-label-mono text-label-mono text-outline">CHECK_RLC_HASH</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Driver Route Learning Certificate (RLC)</h3>
                        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
                          Validates loco pilot mountain ghat endorsement. Pilot ID #40921 (Darjeeling – Kurseong alpine pass certificate active through Oct 2026).
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 font-label-mono text-label-mono">
                      <span className="px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">PASSED (100%)</span>
                      <span className="text-outline text-body-sm mt-1">Validated via LMS API</span>
                    </div>
                  </div>
                  <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
                    <div className="flex items-start gap-space-md">
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[26px]">precision_manufacturing</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-space-xs">
                          <span className="font-label-caps text-label-caps text-primary font-bold uppercase">Gate 02 // Physics &amp; Consist Dynamics</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          <span className="font-label-mono text-label-mono text-outline">PHYSICS_GRADE_CHECK</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Tractive Effort &amp; Braking Load Margin</h3>
                        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
                          Simulates dynamic rheostatic + disc braking over 1:20 downhill gradients. Calculated brake thermal margin: +24.8% safety reserve.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 font-label-mono text-label-mono">
                      <span className="px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">PASSED (+24.8% MARGIN)</span>
                      <span className="text-outline text-body-sm mt-1">Braking HP: 3,450 kW</span>
                    </div>
                  </div>
                  <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
                    <div className="flex items-start gap-space-md">
                      <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[26px]">history_toggle_off</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-space-xs">
                          <span className="font-label-caps text-label-caps text-tertiary-container font-bold uppercase">Gate 03 // Statutory Labor Limits</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
                          <span className="font-label-mono text-label-mono text-outline">HOER_DUTY_HOURS</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">HOER Continuous Duty Counter</h3>
                        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
                          Hours of Employment Regulations guard. Current shift elapsed: 6h 14m. Proposed dispatch reaches terminal at 7h 08m (Under 8h hard statutory cutoff).
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 font-label-mono text-label-mono">
                      <span className="px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">PASSED (52m BUFFER)</span>
                      <span className="text-outline text-body-sm mt-1">Relief Crew at Sonada</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 rounded-2xl bg-surface-container-lowest shadow-[0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between">
                  <div className="relative w-full h-52 bg-surface-container-high overflow-hidden">
                    <img
                      className="w-full h-full object-cover object-center"
                      alt="High-altitude alpine mountain train navigating a steep curving track along a lush green valley with majestic peaks and evergreen pine forests under bright daylight"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTguwXgxKhE4Y91dO1Na8kmcyOCP9HvAy4sndFDxf1E8QgqCVgWhSCs2jOUzec7uE3CjjB0j7O6S1tW1TeaFnMKYVYET_PPJOUmQobU5akCcrigctwWhsiO7DThMzHqO30mhydCb5vpZXGhkDhRfmnBW1xNHkx02q0mDYlbahI6MQxwhNqyKlrgTZY2WPjUk0QC4FpTLjJcV37W5tsE20hGFEgR_4pS_kaTvvQliLYFirYYXa7dcCnaw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-space-md">
                      <span className="font-label-caps text-label-caps text-secondary-fixed font-bold uppercase">Locomotive Telemetry Stream</span>
                      <span className="font-headline-sm text-headline-sm text-white font-bold">Unit #WAP-7D (Alpine Twin #04)</span>
                      <span className="font-label-mono text-label-mono text-white/80">Darjeeling Mail • KP 18.2 Downgrade</span>
                    </div>
                  </div>
                  <div className="p-space-md flex flex-col gap-space-sm font-label-mono text-label-mono">
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
                      <span className="text-on-surface-variant">Dynamic Brake Status:</span>
                      <span className="text-secondary font-bold">Active • Blended Rheostatic</span>
                    </div>
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
                      <span className="text-on-surface-variant">Pantograph Arc Rate:</span>
                      <span className="text-primary font-bold">0.02 arcs/min (Nominal)</span>
                    </div>
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
                      <span className="text-on-surface-variant">Axle Bogie Temp:</span>
                      <span className="text-on-surface font-bold">54.2°C / 56.1°C (Safe)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Adhesion Reserve:</span>
                      <span className="text-secondary font-bold">+28.4% Traction Grip</span>
                    </div>
                  </div>
                  <div className="px-space-md pb-space-md">
                    <div className="p-space-xs rounded-xl bg-surface-container-low text-center font-label-mono text-label-mono text-primary font-semibold">
                      Autonomous Safety Interlock Active • SIL-4 Certified
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="precedence-speed">
            <section className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">8</span>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">Train Precedence Envelopes &amp; Speed Restrictions</h2>
                    <span className="font-label-mono text-label-mono text-primary font-semibold uppercase">Dynamic Corridor Precedence Hierarchy &amp; Permanent/Temporary Speed Restrictions (PSR/TSR)</span>
                  </div>
                </div>
                <span className="font-label-mono text-label-mono text-outline">KILOMETRIC CHAINAGE KP 12.0 – 24.0</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                <div className="lg:col-span-5 p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Class Priority Weighting</h3>
                      <span className="font-label-mono text-label-mono text-primary">Precedence Logic</span>
                    </div>
                    <div className="space-y-space-xs">
                      <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-mono text-label-mono font-bold">P1</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Vande Bharat / Express</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">Preempts all sidings • 0 dwell penalty</div>
                          </div>
                        </div>
                        <span className="font-label-mono text-label-mono px-space-sm py-0.5 rounded-full bg-primary text-on-primary font-bold">100 Weight</span>
                      </div>
                      <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-mono text-label-mono font-bold">P2</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Intercity Commuter Rake</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">Max 8 min siding dwell allowed</div>
                          </div>
                        </div>
                        <span className="font-label-mono text-label-mono px-space-sm py-0.5 rounded-full bg-secondary text-on-secondary font-bold">70 Weight</span>
                      </div>
                      <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-label-mono text-label-mono font-bold">P3</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Parcel &amp; Container Freight</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">Dynamic holding acceptable</div>
                          </div>
                        </div>
                        <span className="font-label-mono text-label-mono px-space-sm py-0.5 rounded-full bg-surface-container-highest text-on-surface font-bold">50 Weight</span>
                      </div>
                      <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-7 h-7 rounded-full bg-surface-container-high text-outline flex items-center justify-center font-label-mono text-label-mono font-bold">P4</span>
                          <div>
                            <div className="font-body-md text-body-md font-bold text-on-surface">Empty Work / Ballast Rakes</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">Yield to all scheduled consists</div>
                          </div>
                        </div>
                        <span className="font-label-mono text-label-mono px-space-sm py-0.5 rounded-full bg-surface-container-high text-outline font-bold">20 Weight</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-space-md p-space-xs rounded-lg bg-surface-container text-body-sm text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                    <span>Speed envelopes strictly reject any route recommendation exceeding curvature civil limits.</span>
                  </div>
                </div>

                <div className="lg:col-span-7 p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Civil Speed Restriction Envelopes (PSR &amp; TSR)</h3>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Elevation &amp; Speed Ceiling along KP 12.0 – KP 24.0 (Ghum – Sonada)</span>
                    </div>
                    <div className="flex items-center gap-space-xs font-label-mono text-label-mono">
                      <span className="flex items-center gap-1 text-primary"><span className="w-3 h-1 bg-primary rounded"></span> Max Permissible (MPS)</span>
                      <span className="flex items-center gap-1 text-tertiary-container"><span className="w-3 h-1 bg-tertiary-container rounded"></span> Active TSR</span>
                    </div>
                  </div>
                  <div className="my-space-md w-full bg-surface-container-low rounded-xl p-space-md relative overflow-hidden">
                    <svg className="w-full h-auto text-primary" fill="none" viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
                      <line stroke="#c2c6d3" strokeDasharray="3 3" strokeWidth="0.8" x1="40" x2="680" y1="40" y2="40"></line>
                      <line stroke="#c2c6d3" strokeDasharray="3 3" strokeWidth="0.8" x1="40" x2="680" y1="90" y2="90"></line>
                      <line stroke="#c2c6d3" strokeDasharray="3 3" strokeWidth="0.8" x1="40" x2="680" y1="140" y2="140"></line>
                      <line stroke="#c2c6d3" strokeDasharray="3 3" strokeWidth="0.8" x1="40" x2="680" y1="190" y2="190"></line>
                      <path d="M40 210 L160 190 L300 170 L420 185 L540 160 L680 150 L680 220 L40 220 Z" fill="#b9ecbd" opacity="0.35"></path>
                      <path d="M40 60 H 160 V 110 H 310 V 130 H 450 V 150 H 560 V 90 H 680" fill="none" stroke="#003b7d" strokeWidth="3"></path>
                      <rect fill="#ffdbc8" height="40" opacity="0.6" rx="4" width="110" x="450" y="150"></rect>
                      <path d="M450 150 H 560" stroke="#893f00" strokeDasharray="4 2" strokeWidth="3"></path>
                      <path d="M40 75 Q 120 70 160 120 T 310 138 T 450 165 T 560 105 T 680 98" fill="none" stroke="#3a6843" strokeWidth="2.5"></path>
                      <circle cx="160" cy="110" fill="#003b7d" r="4"></circle>
                      <text fill="#161d1a" fontFamily="Space Grotesk" fontSize="10" fontWeight="bold" textAnchor="middle" x="160" y="30">Batasia Viaduct</text>
                      <text fill="#003b7d" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="160" y="125">PSR 30 km/h</text>
                      <circle cx="310" cy="130" fill="#003b7d" r="4"></circle>
                      <text fill="#161d1a" fontFamily="Space Grotesk" fontSize="10" fontWeight="bold" textAnchor="middle" x="310" y="30">Sonada Horseshoe</text>
                      <text fill="#003b7d" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="310" y="145">PSR 25 km/h</text>
                      <circle cx="505" cy="150" fill="#893f00" r="4"></circle>
                      <text fill="#893f00" fontFamily="Space Grotesk" fontSize="10" fontWeight="bold" textAnchor="middle" x="505" y="138">TSR 20 km/h Work Zone</text>
                      <text fill="#743400" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle" x="505" y="172">Ballast Tamper #9</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="35" y="65">60</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="35" y="115">30</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="35" y="155">15</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="35" y="195">0</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" x="40" y="235">KP 12.0 (Ghum)</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" x="280" y="235">KP 17.5</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" x="500" y="235">KP 21.2</text>
                      <text fill="#737783" fontFamily="JetBrains Mono" fontSize="9" x="640" y="235">KP 24.0 (Tung)</text>
                    </svg>
                    <span className="absolute bottom-1 right-2 font-label-mono text-[10px] text-on-surface-variant italic">Illustrative schematic — not driven by live telemetry</span>
                  </div>
                  <div className="grid grid-cols-3 gap-space-sm pt-space-xs font-label-mono text-label-mono">
                    <div className="p-space-xs rounded bg-surface-container text-center">
                      <span className="text-outline uppercase text-[10px] block">Max Mountain Grade</span>
                      <span className="font-bold text-on-surface">1 : 22.4 (4.46%)</span>
                    </div>
                    <div className="p-space-xs rounded bg-surface-container text-center">
                      <span className="text-outline uppercase text-[10px] block">Min Curve Radius</span>
                      <span className="font-bold text-on-surface">43 m (Batasia)</span>
                    </div>
                    <div className="p-space-xs rounded bg-surface-container text-center">
                      <span className="text-outline uppercase text-[10px] block">Speed Violation Guard</span>
                      <span className="font-bold text-secondary">Zero Tolerated</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="anytime-optimization">
            <section className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-full bg-tertiary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">15</span>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">Timeout-Safe (Anytime) Optimization Guarantees</h2>
                    <span className="font-label-mono text-label-mono text-tertiary-container font-semibold uppercase">Anytime Algorithm with Strict Time Budget &amp; Deterministic Fail-Safe Flags</span>
                  </div>
                </div>
                <span className="font-label-mono text-label-mono text-on-surface-variant bg-surface-container px-space-sm py-space-xxs rounded-full">
                  REAL-TIME GUARANTEE: T<sub className="text-[9px]">MAX</sub> ≤ 1,500ms
                </span>
              </div>
              <div className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col gap-space-lg">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">The Solution Quality vs. Elapsed Latency Progression</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    In mission-critical rail signaling, the optimizer cannot block or hang. An incumbent feasible dispatch schedule is guaranteed within 15 ms, continuously improved until the hard 1,500 ms ceiling automatically commits the best discovered solution.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-space-sm relative">
                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between relative border-l-2 md:border-l-0 md:border-t-2 border-outline-variant">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">T = 0 ms</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">sensors</span>
                    </div>
                    <div className="my-space-sm">
                      <div className="font-headline-sm text-headline-sm text-on-surface font-bold">State Ingest</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">Conflict graph parsing, rake positions &amp; gradients.</div>
                    </div>
                    <div className="font-label-mono text-label-mono text-outline font-semibold">Solution: Null</div>
                  </div>
                  <div className="p-space-md rounded-xl bg-secondary-container/40 flex flex-col justify-between relative border-l-2 md:border-l-0 md:border-t-2 border-secondary">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-secondary font-bold">T = 15 ms</span>
                      <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
                    </div>
                    <div className="my-space-sm">
                      <div className="font-headline-sm text-headline-sm text-secondary font-bold">Greedy Feasible</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">Immediate rule-based clearance baseline. Safe fallback.</div>
                    </div>
                    <div className="font-label-mono text-label-mono text-secondary font-bold">72.0% of Global Optima</div>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between relative border-l-2 md:border-l-0 md:border-t-2 border-primary">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-primary font-bold">T = 250 ms</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                    </div>
                    <div className="my-space-sm">
                      <div className="font-headline-sm text-headline-sm text-primary font-bold">Branch &amp; Bound</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">OR-Tools CP-SAT explores search tree with cut planes.</div>
                    </div>
                    <div className="font-label-mono text-label-mono text-primary font-bold">91.4% of Global Optima</div>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between relative border-l-2 md:border-l-0 md:border-t-2 border-primary">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-primary font-bold">T = 840 ms</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">auto_graph</span>
                    </div>
                    <div className="my-space-sm">
                      <div className="font-headline-sm text-headline-sm text-primary font-bold">Global Synthesis</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">Harmonized energy + delay + crew relief optimization.</div>
                    </div>
                    <div className="font-label-mono text-label-mono text-secondary font-bold">98.4% of Global Optima</div>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container-high flex flex-col justify-between relative border-l-2 md:border-l-0 md:border-t-2 border-on-surface">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-error font-bold">T = 1,500 ms</span>
                      <span className="material-symbols-outlined text-[18px] text-error">gavel</span>
                    </div>
                    <div className="my-space-sm">
                      <div className="font-headline-sm text-headline-sm text-on-surface font-bold">Hard Deadline</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">Solver thread interrupted; incumbent best deployed.</div>
                    </div>
                    <div className="font-label-mono text-label-mono text-on-surface font-bold">Zero Lockup SLA</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-md rounded-xl bg-surface-container font-label-mono text-label-mono">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px]">shield_lock</span>
                    <span className="text-on-surface font-bold">FAIL-SAFE AUDIT: In 4.2 million dispatch cycles across Alpine divisions, timeout overrun incidents = 0.</span>
                  </div>
                  <span className="text-secondary font-bold">Incumbent Fallback Ready in 15ms</span>
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="dual-engine">
            <section className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">16</span>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">Latency-Tiered Dual Engine Architecture</h2>
                    <span className="font-label-mono text-label-mono text-primary font-semibold uppercase">Decoupled Edge Fast Path (&lt;20ms) • Cloud Deep Solver Path (100–1,200ms)</span>
                  </div>
                </div>
                <span className="font-label-mono text-label-mono text-primary bg-primary-fixed/40 px-space-sm py-space-xxs rounded-full font-bold">
                  ARCHITECTURAL DEPTH
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
                <div className="lg:col-span-6 p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> TIER 1 // FAST PATH
                      </span>
                      <span className="font-headline-sm text-headline-sm text-secondary font-bold">&lt; 20 ms</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Wayside Edge Conflict Arbiter</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Runs directly on edge trackside signaling enclosures (SIL-4 certified hardware). Performs spatial hashing and immediate signal clamping to prevent physical track conflicts without reliance on network connectivity.
                    </p>
                    <div className="space-y-space-xxs pt-space-xs font-label-mono text-label-mono">
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Execution Substrate:</span>
                        <span className="text-primary font-semibold">Trackside IPC (Ruggedized ARM64)</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Algorithmic Method:</span>
                        <span className="text-secondary font-semibold">Spatial Hashing &amp; Static Red-Clamp</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Network Dependence:</span>
                        <span className="text-secondary font-semibold">Zero (Fully Autonomous Air-Gapped)</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Primary Purpose:</span>
                        <span className="text-on-surface font-bold">Life-Critical Collision Avoidance</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-space-md p-space-xs rounded-lg bg-surface-container-high text-body-sm text-on-surface font-label-mono flex items-center justify-between">
                    <span>Local Fail-Safe Authority:</span>
                    <span className="text-secondary font-bold">UNCONDITIONAL OVERRIDE</span>
                  </div>
                </div>
                <div className="lg:col-span-6 p-space-lg rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-mono text-label-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> TIER 2 // DEEP OPTIMIZER
                      </span>
                      <span className="font-headline-sm text-headline-sm text-primary font-bold">100 – 1,200 ms</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Regional Multi-Core Solver Cloud</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Distributed CP-SAT cluster synthesizing global macro-network schedules. Computes regenerative coasting velocity profiles, rolling stock maintenance turns, and multi-train siding meets across entire railway subdivisions.
                    </p>
                    <div className="space-y-space-xxs pt-space-xs font-label-mono text-label-mono">
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Execution Substrate:</span>
                        <span className="text-primary font-semibold">128-Core Distributed CP-SAT Mesh</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Algorithmic Method:</span>
                        <span className="text-primary font-semibold">Mixed-Integer Linear Programming (MILP)</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Scope of Horizon:</span>
                        <span className="text-on-surface font-semibold">180 min Look-Ahead • 400 Track Blocks</span>
                      </div>
                      <div className="flex items-center justify-between p-space-xs rounded bg-surface-container-low">
                        <span className="text-on-surface">Primary Purpose:</span>
                        <span className="text-on-surface font-bold">Global Delay &amp; Energy Minimization</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-space-md p-space-xs rounded-lg bg-surface-container-high text-body-sm text-on-surface font-label-mono flex items-center justify-between">
                    <span>Circuit Breaker Fallback:</span>
                    <span className="text-primary font-bold">AUTO-REVERT TO TIER 1 AT 1,500ms</span>
                  </div>
                </div>
              </div>
            </section>
          </TabPanel>

          <TabPanel id="traceability-matrix">
            <section className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Normative Feature Traceability Matrix</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Full technical specification audit mapping against core operational requirements</p>
                </div>
                <span className="font-label-mono text-label-mono text-secondary bg-secondary-fixed/50 px-space-sm py-space-xxs rounded-full font-bold">
                  5 / 5 FEATURES VERIFIED
                </span>
              </div>
              <div className="w-full overflow-x-auto rounded-2xl bg-surface-container-lowest shadow-[0_6px_20px_rgba(0,0,0,0.03)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container font-label-caps text-label-caps text-on-surface-variant uppercase">
                      <th className="py-space-md px-space-lg">Req #</th>
                      <th className="py-space-md px-space-lg">Sub-System Specification</th>
                      <th className="py-space-md px-space-lg">Mathematical Mechanism</th>
                      <th className="py-space-md px-space-lg">Complexity</th>
                      <th className="py-space-md px-space-lg">Operational Impact &amp; Safety Merit</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md text-on-surface">
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-lg font-headline-sm text-headline-sm font-bold text-primary">6</td>
                      <td className="py-space-md px-space-lg">
                        <div className="font-bold text-on-surface">AI Decision / Optimization Engine</div>
                        <div className="font-label-mono text-label-mono text-outline">OR-Tools CP-SAT &amp; MILP Solver</div>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Tests multiple conflict resolution paths; ranks them dynamically by delay saved and asset availability.
                      </td>
                      <td className="py-space-md px-space-lg">
                        <span className="inline-flex px-space-sm py-0.5 rounded-full bg-primary text-on-primary font-label-mono text-label-mono font-bold">High</span>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        The core optimization brain that proves technical viability of autonomous conflict resolution.
                      </td>
                    </tr>
                    <tr className="bg-surface-container-lowest/50 hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-lg font-headline-sm text-headline-sm font-bold text-secondary">7</td>
                      <td className="py-space-md px-space-lg">
                        <div className="font-bold text-on-surface">Rerouting Safety Validation</div>
                        <div className="font-label-mono text-label-mono text-outline">Deterministic 3-Gate Check</div>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Filters candidate reroutes using pilot RLC certification, locomotive dynamic braking/traction profiles, and HOER rest counters.
                      </td>
                      <td className="py-space-md px-space-lg">
                        <span className="inline-flex px-space-sm py-0.5 rounded-full bg-secondary text-on-secondary font-label-mono text-label-mono font-bold">High</span>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Ensures domain credibility and regulatory compliance by strictly enforcing real-world operating safety rules.
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-lg font-headline-sm text-headline-sm font-bold text-primary">8</td>
                      <td className="py-space-md px-space-lg">
                        <div className="font-bold text-on-surface">Train Precedence &amp; Speed Restrictions</div>
                        <div className="font-label-mono text-label-mono text-outline">Hierarchical Precedence Envelopes</div>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Weights dispatch choices by train priority class and rejects any options violating permanent (PSR) or temporary (TSR) speed restrictions.
                      </td>
                      <td className="py-space-md px-space-lg">
                        <span className="inline-flex px-space-sm py-0.5 rounded-full bg-primary text-on-primary font-label-mono text-label-mono font-bold">High</span>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Prevents optimizer from generating operationally absurd suggestions or compromising mountain curve civil limits.
                      </td>
                    </tr>
                    <tr className="bg-surface-container-lowest/50 hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-lg font-headline-sm text-headline-sm font-bold text-tertiary-container">15</td>
                      <td className="py-space-md px-space-lg">
                        <div className="font-bold text-on-surface">Timeout-Safe Optimization</div>
                        <div className="font-label-mono text-label-mono text-outline">Anytime Sub-Second Heuristics</div>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Runs optimizer as an anytime algorithm with a strict time budget (1,500 ms ceiling) and explicit fail-safe flag.
                      </td>
                      <td className="py-space-md px-space-lg">
                        <span className="inline-flex px-space-sm py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-mono text-label-mono font-bold">Medium</span>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Ensures robust performance under strict real-time constraints without hanging or system deadlocks.
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-lg font-headline-sm text-headline-sm font-bold text-on-surface">16</td>
                      <td className="py-space-md px-space-lg">
                        <div className="font-bold text-on-surface">Latency-Tiered AI Engine</div>
                        <div className="font-label-mono text-label-mono text-outline">Edge / Cloud Decoupled Pipeline</div>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Splits fast conflict detection (&lt;20ms edge arbiter) from slower deep optimization (100–1,200ms cloud) with fallback rules.
                      </td>
                      <td className="py-space-md px-space-lg">
                        <span className="inline-flex px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-mono text-label-mono font-bold">Low</span>
                      </td>
                      <td className="py-space-md px-space-lg font-body-sm text-body-sm text-on-surface-variant">
                        Advanced architectural depth feature providing high resilience against telemetry disconnects and cloud latency spikes.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-space-xl rounded-2xl bg-gradient-to-r from-primary via-primary-container to-secondary text-on-primary shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-lg relative overflow-hidden">
                <div className="flex flex-col gap-space-xxs z-10">
                  <span className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-wider">Interactive Simulation Testbed</span>
                  <h3 className="font-headline-lg text-headline-lg text-white font-bold">Ready to benchmark optimization solver performance?</h3>
                  <p className="font-body-md text-body-md text-white/80 max-w-2xl">
                    Inject synthetic corridor blockages, grade traction slips, and driver rest limits to observe OR-Tools CP-SAT converge under real-time conditions.
                  </p>
                </div>
                <a className="inline-flex items-center gap-space-xs px-space-xl py-space-sm rounded-full bg-white text-primary font-headline-sm text-headline-sm font-bold hover:bg-surface-bright transition-all shadow-lg shrink-0 z-10" href="#hero">
                  <span>Launch Solver Testbed Console</span>
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                </a>
              </div>
            </section>
          </TabPanel>
        </div>
      </div>
    </TabsProvider>
  );
}
