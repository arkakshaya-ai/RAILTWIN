import { useState } from 'react';
import { ScrollSection } from '../components/ScrollSection';
import { SideNav } from '../components/SideNav';
import { useApiPoll } from '../api/useApiPoll';
import { getConflicts, getHealth, triggerEmergency } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';
import type { EmergencyTriggerResult } from '../api/types';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'cross-cutting-pipeline', label: 'Fail-Safe Pipeline' },
  { id: 'rescheduling-engine', label: 'Rescheduling Engine' },
  { id: 'cabin-telemetry', label: 'Kinetic Interlock' },
  { id: 'dept-coordination', label: 'Crisis Coordination' },
  { id: 'spec-matrix', label: 'Traceability Matrix' },
];

type TriggerState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'done'; result: EmergencyTriggerResult }
  | { phase: 'error'; message: string };

export function Feature6Page() {
  const { data: conflicts, loading: conflictsLoading, error: conflictsError } = useApiPoll(getConflicts, POLL_INTERVAL_MS);
  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const healthOk = !healthLoading && !healthError && health?.ai_engine === 'up';

  const [trigger, setTrigger] = useState<TriggerState>({ phase: 'idle' });

  async function fireEmergency(reason: string) {
    setTrigger({ phase: 'pending' });
    try {
      const result = await triggerEmergency({ section: 'DHR04-ALPINE', reason });
      setTrigger({ phase: 'done', result });
    } catch (err) {
      setTrigger({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <>
      <SideNav sections={SECTIONS} />
      <div className="max-w-[1480px] mx-auto px-gutter-desktop relative z-10">
        <ScrollSection id="hero">
          <div className="flex flex-col gap-space-lg">
            <div className="w-full bg-surface-container-low -mx-gutter-desktop px-gutter-desktop py-space-sm rounded-xl">
              <div className="max-w-[1480px] mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md">
                <div className="flex flex-col gap-space-xxs min-w-0">
                  <div className="flex flex-wrap items-center gap-space-xs font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    <span>SYSTEMS ARCHITECTURE</span>
                    <span className="text-outline">/</span>
                    <span>EMERGENCY DISPATCH &amp; SAFETY RE-OPTIMIZATION</span>
                    <span className="text-outline">/</span>
                    <span className="text-primary font-bold">FEATURE #6 SPEC (CROSS-CUTTING FAIL-SAFE &amp; MULTI-OBJECTIVE SOLVER)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-mono text-label-mono font-bold">
                      <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                      SIL-4 FAIL-SAFE ARMED
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-primary-container text-on-primary font-label-mono text-label-mono">
                      <span className="material-symbols-outlined text-[13px]">developer_board</span>
                      OR-TOOLS JOINT DISPATCH KERNEL
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full font-label-mono text-label-mono ${healthOk ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                      <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                      {healthLoading ? 'CHECKING AI ENGINE…' : healthError ? 'AI ENGINE UNREACHABLE' : `AI ENGINE ${(health?.ai_engine ?? 'unknown').toUpperCase()}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-space-xs shrink-0">
                  <button
                    onClick={() => fireEmergency('Major corridor landslip / mudslide')}
                    disabled={trigger.phase === 'pending'}
                    className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-error text-on-error font-body-sm text-body-sm font-semibold hover:bg-error-container hover:text-on-error-container transition-all shadow-sm disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">landslide</span>
                    <span>{trigger.phase === 'pending' ? 'Dispatching…' : 'Simulate Major Corridor Landslip'}</span>
                  </button>
                  <button
                    onClick={() => fireEmergency('Kavach / LTE-R emergency halt')}
                    disabled={trigger.phase === 'pending'}
                    className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-highest text-on-surface font-body-sm text-body-sm font-semibold hover:bg-error/10 hover:text-error transition-all shadow-sm disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>Trigger Emergency Halt (Kavach / LTE-R)</span>
                  </button>
                </div>
              </div>
            </div>

            {trigger.phase !== 'idle' && (
              <div
                className={`p-space-md rounded-xl font-label-mono text-label-mono flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm ${
                  trigger.phase === 'error' ? 'bg-error-container text-on-error-container' : trigger.phase === 'done' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface'
                }`}
              >
                {trigger.phase === 'pending' && <span>POST /api/v1/emergency/trigger dispatched — awaiting re-optimization…</span>}
                {trigger.phase === 'done' && (
                  <span>
                    status: <strong>{trigger.result.status}</strong> • reoptimization_id: <strong>{trigger.result.reoptimization_id}</strong>
                  </span>
                )}
                {trigger.phase === 'error' && <span>Emergency trigger unreachable: {trigger.message}</span>}
                <button onClick={() => setTrigger({ phase: 'idle' })} className="font-bold underline shrink-0 text-left">Dismiss</button>
              </div>
            )}

            <div className="flex flex-col gap-space-xs max-w-5xl">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-surface-container-high text-primary font-label-caps text-label-caps uppercase w-fit">
                <span className="material-symbols-outlined text-[14px]">shield_with_heart</span>
                EMERGENCY PROTOCOL &amp; MULTI-LAYER RE-SOLVE SPEC #06
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Feature #6: Emergency Response &amp; Cross-Cutting Real-Time Rescheduling
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl">
                Production-grade cross-cutting incident mitigation engine. Upon sudden track obstructions, flash floods, derailment risks, or catenary snaps, Feature #6 fires simultaneously across Categories 2 through 5—orchestrating instant kinetic braking (#2), cascade delay containment (#2), rerouting safety validation (#3), dynamic rake/crew reallocation (#4), and instant maintenance block reallocation (#5) via a unified MILP solver.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm">
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">CROSS-LAYER RE-SOLVE TIME</span>
                <div className="my-space-xs"><span className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">340</span> <span className="font-label-mono text-label-mono text-outline">ms</span></div>
                <span className="font-body-sm text-body-sm text-secondary">Joint MILP Convergence</span>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">CATEGORIES SYNCHRONIZED</span>
                <div className="my-space-xs"><span className="font-display-lg-mobile text-display-lg-mobile text-on-surface font-bold">4</span> <span className="font-label-mono text-label-mono text-outline">Domains</span></div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Cat 2 · 3 · 4 · 5 Sync</span>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">CASCADE BUFFER RETENTION</span>
                <div className="my-space-xs"><span className="font-display-lg-mobile text-display-lg-mobile text-secondary font-bold">91.4%</span></div>
                <span className="font-body-sm text-body-sm text-secondary">Delay Damping Factor</span>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">BRAKE DECEL VERIF</span>
                <div className="my-space-xs"><span className="font-display-lg-mobile text-display-lg-mobile text-error font-bold">SIL-4</span></div>
                <span className="font-body-sm text-body-sm text-error font-medium">Kavach Auto-Dump Lock</span>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">ZERO-DEADHEAD RECOVERY</span>
                <div className="my-space-xs"><span className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">88.5%</span></div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Auto Duty Chain Swap</span>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">CORRIDOR CLEARANCE SPEED</span>
                <div className="my-space-xs"><span className="font-display-lg-mobile text-display-lg-mobile text-secondary font-bold">+42.0%</span></div>
                <span className="font-body-sm text-body-sm text-secondary">Single-Line Evac Rate</span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between flex-wrap gap-space-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Current Conflicts Near This Emergency • Live from GET /conflicts</span>
                <span className="font-label-mono text-label-mono text-on-surface-variant">{conflicts?.length ?? 0} tracked</span>
              </div>
              {conflictsLoading ? (
                <div className="p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading conflict feed…</div>
              ) : conflictsError ? (
                <div className="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">Conflict feed unreachable: {conflictsError.message}</div>
              ) : (conflicts ?? []).length === 0 ? (
                <div className="p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No active conflicts reported by the network.</div>
              ) : (
                <div className="flex flex-col gap-space-xs">
                  {(conflicts ?? []).slice(0, 5).map((c) => (
                    <div key={c.id} className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between font-label-mono text-label-mono">
                      <span className="font-bold text-on-surface">{c.id} • {c.section}</span>
                      <span className="text-on-surface-variant">ETA {new Date(c.eta).toLocaleTimeString()}</span>
                      <span className="text-error font-bold uppercase">{c.severity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="cross-cutting-pipeline">
          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md">
              <div className="flex flex-col gap-space-xxs">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary uppercase">MODULE 1 / SPEC ARCHITECTURE</span>
                  <span className="px-space-xs py-0.5 rounded-full bg-error text-on-error font-label-mono text-[10px] font-bold">CRITICAL SYSTEM THREAD</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Cross-Cutting Multi-Category Fail-Safe Trigger Pipeline</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Deterministic broadcast firing across Categories 2 through 5 simultaneously within 340ms of sensor confirmation.</p>
              </div>
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-highest text-on-surface font-label-mono text-label-mono">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span>DISPATCH KERNEL LATENCY: 18.2ms</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-space-md items-stretch">
              <div className="bg-error-container text-on-error-container p-space-lg rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps uppercase text-error font-bold">EVENT INITIATOR</span>
                    <span className="material-symbols-outlined text-error text-[20px]">crisis_alert</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-error-container">Km 116.4 Alpine Landslip &amp; Mudslide</h3>
                  <p className="font-body-sm text-body-sm text-on-error-container">Detected via wayside DAS optical acoustic strain fibers + train cab dual emergency dead-man trip.</p>
                </div>
                <div className="mt-space-md p-space-xs bg-surface-container-lowest/80 rounded text-on-surface flex flex-col gap-1 font-label-mono text-label-mono">
                  <div className="flex justify-between"><span>GEO LOCK:</span><span className="font-bold">27°02'44"N 88°15'11"E</span></div>
                  <div className="flex justify-between"><span>TRACK POS:</span><span>Single Main Alpine</span></div>
                  <div className="flex justify-between"><span>GRADE:</span><span className="text-error font-bold">1:22.5 Steep</span></div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">CATEGORY 2</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">alt_route</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Dynamic Lookahead Clamp</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Injects virtual Red Signal Block across 6 km up/down tracks. Clamps oncoming Consists ALP-104 and FR-401 with kinetic damping curves.</p>
                </div>
                <div className="mt-space-md pt-space-xs bg-surface-container-low p-space-xs rounded">
                  <span className="font-label-mono text-label-mono text-secondary font-bold">STATUS: DAMPED CASCADE</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Upstream throttle inhibitor broadcast verified in 42ms.</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">CATEGORY 3</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">3-Gate Safety Re-Solve</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Validates diversion route through Batasia auxiliary siding. Checks driver RLC alpine certificates and downhill wheel-slip friction margins.</p>
                </div>
                <div className="mt-space-md pt-space-xs bg-surface-container-low p-space-xs rounded">
                  <span className="font-label-mono text-label-mono text-primary font-bold">STATUS: SIDING PERMITTED</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Interlocking switch #22-B aligned and point-locked.</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">CATEGORY 4</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Dynamic Crew &amp; Rake Swap</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Prevents Railway HOER (Hours of Employment) limit breaches. Swaps Locomotive Crew LP-49 with relief crew resting at Kurseong base.</p>
                </div>
                <div className="mt-space-md pt-space-xs bg-surface-container-low p-space-xs rounded">
                  <span className="font-label-mono text-label-mono text-secondary font-bold">STATUS: ZERO HOER BREACH</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Standby rake coupled at Batasia loop without deadhead.</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">CATEGORY 5</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">engineering</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Emergency Block Insertion</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Auto-schedules 90-minute Category-A possession window. Dispatches P-Way Earthmover Train EM-08 and TRD OHE catenary repair trolley.</p>
                </div>
                <div className="mt-space-md pt-space-xs bg-surface-container-low p-space-xs rounded">
                  <span className="font-label-mono text-label-mono text-tertiary font-bold">STATUS: P-WAY MOBILIZED</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Arrival ETA at slip location: 14 mins.</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="rescheduling-engine">
          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
              <div className="flex flex-col gap-space-xxs max-w-3xl">
                <div className="inline-flex items-center gap-space-xs text-primary font-label-caps text-label-caps uppercase">
                  <span className="material-symbols-outlined text-[15px]">model_training</span>
                  FEATURE #21 CORE KERNEL ENGINE
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Real-Time Joint Rescheduling Multi-Objective Solver</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Simultaneous mixed-integer linear programming (MILP) solving passenger path retiming, emergency possession block insertion, and rake-crew continuity within an ultra-low latency solve loop.</p>
              </div>
              <div className="flex items-center gap-space-xs p-space-xs bg-surface-container rounded-full font-label-mono text-label-mono text-on-surface-variant">
                <span className="px-space-xs py-1 rounded-full bg-primary-container text-on-primary font-bold">MILP SOLVER v4.9</span>
                <span className="px-space-xs py-1">CP-SAT ENGINE</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm bg-surface-container-low/60 p-space-md rounded">
                <div className="flex flex-col gap-1">
                  <span className="font-label-caps text-label-caps text-primary uppercase">UNIFIED RE-OPTIMIZATION OBJECTIVE FUNCTION</span>
                  <span className="font-label-mono text-body-lg text-on-surface font-bold tracking-tight">
                    Minimize Z = w₁·∑(Delay_Trainᵢ) + w₂·∑(Penalty_MaintBlockⱼ) + w₃·∑(Cost_HOER_Swapₖ) + w₄·∑(SlipRisk_Gradientₘ)
                  </span>
                </div>
                <div className="flex items-center gap-space-sm shrink-0 font-label-mono text-label-mono flex-wrap">
                  <span className="px-space-xs py-1 rounded-full bg-surface-container-high text-on-surface">w₁ = 0.45</span>
                  <span className="px-space-xs py-1 rounded-full bg-surface-container-high text-on-surface">w₂ = 0.25</span>
                  <span className="px-space-xs py-1 rounded-full bg-surface-container-high text-on-surface">w₃ = 0.20</span>
                  <span className="px-space-xs py-1 rounded-full bg-surface-container-high text-on-surface">w₄ = 0.10</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
                <div className="bg-secondary-container/20 p-space-md rounded flex flex-col justify-between relative shadow-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded-full bg-secondary text-on-secondary font-label-mono text-label-mono font-bold">STRATEGY ALPHA</span>
                      <span className="font-headline-sm text-headline-sm text-secondary font-bold">97.2 / 100</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Coordinated Siding Divert + Instant 90-min P-Way Block</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Train ALP-104 held safely at Batasia Loop; Downbound Freight 401 diverted via Kurseong Auxiliary Siding. Zero cancellations.</p>
                    <div className="mt-space-sm flex flex-col gap-1.5 font-label-mono text-body-sm">
                      <div className="flex justify-between text-on-surface"><span>Max Train Delay:</span><span className="font-bold text-secondary">+18 mins</span></div>
                      <div className="flex justify-between text-on-surface"><span>P-Way Window:</span><span className="font-bold text-secondary">90 min Granted</span></div>
                      <div className="flex justify-between text-on-surface"><span>HOER Duty Margin:</span><span className="font-bold text-secondary">+2.4 hrs left</span></div>
                    </div>
                  </div>
                  <div className="mt-space-md pt-space-xs flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-secondary font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> RECOMMENDED</span>
                    <button
                      onClick={() => fireEmergency('Execute Strategy Alpha')}
                      className="px-space-md py-space-xs rounded-full bg-secondary text-on-secondary font-body-sm text-body-sm font-semibold hover:bg-on-secondary-container transition-all"
                    >
                      Execute Plan
                    </button>
                  </div>
                </div>
                <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between shadow-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-mono text-label-mono font-bold">STRATEGY BETA</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">76.5 / 100</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Unilateral Line Halt &amp; Full Downstream Standstill</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Emergency halts all trains in the division simultaneously without smart siding divert. Heavy knock-on delays.</p>
                    <div className="mt-space-sm flex flex-col gap-1.5 font-label-mono text-body-sm">
                      <div className="flex justify-between text-on-surface-variant"><span>Max Train Delay:</span><span className="font-bold text-error">+140 mins</span></div>
                      <div className="flex justify-between text-on-surface-variant"><span>HOER Duty Margin:</span><span className="font-bold text-error">Crew Expired</span></div>
                    </div>
                  </div>
                  <div className="mt-space-md pt-space-xs flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">info</span> PASSIVE STANDBY</span>
                  </div>
                </div>
                <div className="bg-error-container/20 p-space-md rounded flex flex-col justify-between shadow-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded-full bg-error text-on-error font-label-mono text-label-mono font-bold">STRATEGY GAMMA</span>
                      <span className="font-headline-sm text-headline-sm text-error font-bold">28.0 / 100</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Force Single-Line Gradient Bypass</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Attempting to run trains through un-inspected rockfall-adjacent loop without ultrasonic rail flaw detection.</p>
                    <div className="mt-space-sm flex flex-col gap-1.5 font-label-mono text-body-sm">
                      <div className="flex justify-between text-on-surface-variant"><span>Safety Interlock:</span><span className="font-bold text-error">REJECTED</span></div>
                    </div>
                  </div>
                  <div className="mt-space-md pt-space-xs flex items-center justify-between">
                    <span className="font-label-mono text-label-mono text-error font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">block</span> GATE 3 BLOCKED</span>
                    <span className="font-label-caps text-[10px] text-error uppercase">Violates SIL-4 Rules</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="cabin-telemetry">
          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col gap-space-xxs max-w-3xl">
              <span className="font-label-caps text-label-caps text-primary uppercase">MODULE 3 / CABIN TELEMETRY HUD</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Locomotive Kinetic Interlock &amp; Rapid Pressure Dump</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Live high-altitude telematics stream from Swiss-built Alpine electric consist ALP-104 en route to Batasia Loop.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
              <div className="lg:col-span-6 relative rounded-xl overflow-hidden shadow-md group">
                <img
                  alt="Vibrant red Swiss electric alpine passenger locomotive on curved mountain ballast track against high snow-capped mountain peaks"
                  className="w-full h-[460px] object-cover transition-transform duration-700 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAD4olcVKrEr3ZpYs36r_MA-bUmzBLE7SObZtkVeyj_53u-34LDg9Z2Qy2XjXNUU_NBISlpfOY5IQ26pJBbGsgeDnsKpNUmDaBUDAnEoao0bU9ZdXkNnQT3TJP4tjPkiXN7tC1UuH0qCH07nW8_WEalZ6nmXxYdteoRXbNEBXfJWadU0SK9jsAvtuuiNxkoTcbe2KsNWtRxi0YIslxtdm0bJqt5js6eujyPwrCZqmnitMteDf3jk9aKuQ"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex flex-col justify-between p-space-lg">
                  <div className="flex justify-between items-start flex-wrap gap-xs">
                    <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-mono text-label-mono font-bold">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                      ACTIVE CABIN LINK: ALP-104
                    </span>
                    <span className="px-space-xs py-1 rounded-full bg-error text-on-error font-label-mono text-label-mono font-bold uppercase">EMERGENCY STOP ADVISORY</span>
                  </div>
                  <div className="flex flex-col gap-space-xs text-inverse-on-surface">
                    <span className="font-headline-sm text-headline-sm">Locomotive Unit #653 [Darjeeling Alpine Express]</span>
                    <p className="font-body-sm text-body-sm text-surface-container-highest">
                      Automatic brake pipe pressure dump initiated at 14:02:18 UTC via radio telemetry interlock. Full wheel-slip ABS anti-lock modulation active on 1:20 descending gradient.
                    </p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6 flex flex-col gap-space-md">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between pb-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Kinetic Braking Profile</span>
                    <span className="font-label-mono text-label-mono text-error font-bold">PRESSURE DUMP: -3.5 kg/cm²/s</span>
                  </div>
                  <div className="w-full bg-surface-container-low p-space-sm rounded">
                    <div className="flex justify-between font-label-mono text-body-sm mb-2 text-on-surface-variant">
                      <span>SPEED: 54 km/h → 0 km/h</span>
                      <span>BRAKE DISTANCE: 142m / 210m SAFE</span>
                    </div>
                    <svg className="w-full h-24 text-primary" fill="none" viewBox="0 0 500 100">
                      <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" x1="0" x2="500" y1="20" y2="20"></line>
                      <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" x1="0" x2="500" y1="50" y2="50"></line>
                      <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" x1="0" x2="500" y1="80" y2="80"></line>
                      <path d="M0 20 Q 200 25 350 85 T 450 90" stroke="currentColor" strokeDasharray="3 3" strokeOpacity="0.3" strokeWidth="2"></path>
                      <path d="M0 20 C 120 22, 180 75, 310 90 L 500 90" stroke="#ba1a1a" strokeWidth="3.5"></path>
                      <circle cx="0" cy="20" fill="#003b7d" r="4"></circle>
                      <circle cx="310" cy="90" fill="#ba1a1a" r="5"></circle>
                      <text fill="#ba1a1a" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" x="320" y="85">HALT POINT: +142m</text>
                    </svg>
                    <div className="flex justify-between font-label-mono text-[11px] text-outline mt-1">
                      <span>T=0s (Obstruction Trigger)</span>
                      <span>T=3.8s (Full Stop Achieved)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                    <div className="p-space-xs bg-surface-container rounded flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">BRAKE PIPE</span>
                      <span className="font-telemetry-data text-telemetry-data text-error font-bold">0.0 kg/cm²</span>
                      <span className="font-label-mono text-[10px] text-outline">Was: 5.0 kg/cm²</span>
                    </div>
                    <div className="p-space-xs bg-surface-container rounded flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">CATENARY DRAW</span>
                      <span className="font-telemetry-data text-telemetry-data text-primary font-bold">0.0 kV (Cut)</span>
                      <span className="font-label-mono text-[10px] text-secondary">Trip OK in 14ms</span>
                    </div>
                    <div className="p-space-xs bg-surface-container rounded flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">WHEEL ADHESION</span>
                      <span className="font-telemetry-data text-telemetry-data text-secondary font-bold">0.34 μ</span>
                      <span className="font-label-mono text-[10px] text-secondary">Sanders Deployed</span>
                    </div>
                    <div className="p-space-xs bg-surface-container rounded flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">LTE-R PACKET</span>
                      <span className="font-telemetry-data text-telemetry-data text-primary font-bold">ACK 100%</span>
                      <span className="font-label-mono text-[10px] text-outline">Latency: 8.4ms</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-space-sm bg-surface-container-high rounded flex-wrap gap-xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[20px]">lock_reset</span>
                      <span className="font-body-sm text-body-sm font-medium text-on-surface">Emergency Stop Lock Override</span>
                    </div>
                    <span className="px-space-xs py-1 rounded-full bg-surface-container-highest text-outline font-label-mono text-label-mono">REQUIRES 2-KEY SIL-4 AUTH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="dept-coordination">
          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col gap-space-xxs max-w-3xl">
              <span className="font-label-caps text-label-caps text-primary uppercase">MODULE 4 / DIVISIONAL COMMAND CONSOLE</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Multi-Department Incident Orchestration Bridge</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Instant unified dispatch feeds broadcasting real-time operational state transitions across all railway verticals.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">OPERATING / STATION MASTER</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">desk</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Kurseong &amp; Batasia Loop</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Station interlocking console automatically locked in All-Red hold mode. Passenger platform announcements generated via multi-lingual TTS.</p>
                </div>
                <div className="mt-space-md flex flex-col gap-1 font-label-mono text-body-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>Platform 1:</span><span className="text-secondary font-bold">Clear</span></div>
                  <div className="flex justify-between"><span>Siding Line:</span><span className="text-primary font-bold">Held for ALP-104</span></div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">CIVIL / P-WAY DISPATCH</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">construction</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Mountain Track Maintenance</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Heavy earthmover train EM-08 and 24-man gang mobilized from Kurseong yard with rail alignment laser rigs and stone clearing ballast tools.</p>
                </div>
                <div className="mt-space-md flex flex-col gap-1 font-label-mono text-body-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>Consist EM-08:</span><span className="text-secondary font-bold">En Route (12km)</span></div>
                  <div className="flex justify-between"><span>ETA Slip Site:</span><span className="text-primary font-bold">14 mins</span></div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">TRD / ELECTRICAL TRACTION</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">electric_bolt</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Sector 4 Catenary Isolation</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Remote circuit breaker CB-116 tripped in 12ms preventing catenary arcing over mudslide debris. Auto-grounding switch locked for linesmen safety.</p>
                </div>
                <div className="mt-space-md flex flex-col gap-1 font-label-mono text-body-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>OHE Line Volts:</span><span className="text-error font-bold">0.0 kV (Isolated)</span></div>
                  <div className="flex justify-between"><span>Grounding:</span><span className="text-secondary font-bold">Verified Clamped</span></div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase">DIVISIONAL / PASSENGER SOS</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">cell_tower</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Passenger Notifications</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Geo-targeted SMS notifications pushed to 412 passengers on train ALP-104 with delay estimates, medical contacts, and road feeder bus connections.</p>
                </div>
                <div className="mt-space-md flex flex-col gap-1 font-label-mono text-body-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>SMS Gateway:</span><span className="text-secondary font-bold">412 Delivered</span></div>
                  <div className="flex justify-between"><span>Feeder Buses:</span><span className="text-primary font-bold">3 Dispatched</span></div>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="spec-matrix">
          <div className="flex flex-col gap-space-xl pb-space-2xl">
            <div className="flex flex-col gap-space-xxs max-w-3xl">
              <span className="font-label-caps text-label-caps text-primary uppercase">MODULE 5 / SIH TRACEABILITY &amp; COMPLIANCE MATRIX</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Feature #21 Emergency Specifications Audit</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Comprehensive breakdown of technical sub-routines, SIL-4 safety ratings, and operational impact metrics.</p>
            </div>
            <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface font-label-mono text-label-mono uppercase">
                    <th className="py-space-sm px-space-md"># ID</th>
                    <th className="py-space-sm px-space-md">Feature / Sub-Routine</th>
                    <th className="py-space-sm px-space-md">Description &amp; Mathematical Mechanism</th>
                    <th className="py-space-sm px-space-md">Safety Level</th>
                    <th className="py-space-sm px-space-md">SIH Operational Impact</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm">
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">#21</td>
                    <td className="py-space-md px-space-md font-bold text-on-surface">Real-Time Emergency Rescheduling</td>
                    <td className="py-space-md px-space-md text-on-surface-variant max-w-md">Joint mixed-integer optimization formulating trains, emergency maintenance blocks, and rerouting via OR-Tools CP-SAT kernel.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-[11px] font-bold">HIGH / SIH CORE</span></td>
                    <td className="py-space-md px-space-md text-secondary font-medium">Eliminates deadlock during track obstructions; reduces cascade recovery time from 4.2h to 58m.</td>
                  </tr>
                  <tr className="bg-surface-container-low/30 hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-XCAT</td>
                    <td className="py-space-md px-space-md font-bold text-on-surface">Cross-Cutting Category 2-5 Trigger</td>
                    <td className="py-space-md px-space-md text-on-surface-variant max-w-md">Deterministic event bus publishing incident payloads simultaneously to lookahead clamp (Cat 2), physics gate (Cat 3), roster engine (Cat 4), and block allocator (Cat 5).</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-mono text-[11px] font-bold">CRITICAL / SIL-4</span></td>
                    <td className="py-space-md px-space-md text-on-surface font-medium">Zero departmental silos; synchronizes dispatcher, P-Way, and loco crew in under 350ms.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-SIL4</td>
                    <td className="py-space-md px-space-md font-bold text-on-surface">Kavach / LTE-R Emergency Interlock</td>
                    <td className="py-space-md px-space-md text-on-surface-variant max-w-md">Direct in-cab wireless brake intervention dumping brake pipe pressure to 0 kg/cm² if cab acknowledgement exceeds 3.0s window.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-mono text-[11px] font-bold">SIL-4 CERTIFIED</span></td>
                    <td className="py-space-md px-space-md text-secondary font-medium">Guarantees zero secondary collisions with landslide or stalled consist on single lines.</td>
                  </tr>
                  <tr className="bg-surface-container-low/30 hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-DUTY</td>
                    <td className="py-space-md px-space-md font-bold text-on-surface">HOER Crew &amp; Rake Emergency Restructure</td>
                    <td className="py-space-md px-space-md text-on-surface-variant max-w-md">Continuous monitoring of loco pilot duty hours. Automatically initiates driver relief swap at sidings before statutory 8-hour shift ceiling breach.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-mono text-[11px] font-bold">COMPLIANCE</span></td>
                    <td className="py-space-md px-space-md text-secondary font-medium">Saves 88.5% of deadhead costs; avoids stranded trains due to pilot shift timeouts.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-EMBLK</td>
                    <td className="py-space-md px-space-md font-bold text-on-surface">Emergency Joint Possession Insertion</td>
                    <td className="py-space-md px-space-md text-on-surface-variant max-w-md">Dynamic slot injection into running timetables reserving safe corridors for P-Way earthmovers, overhead wire towers, and inspection trolleys.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-[11px] font-bold">HIGH</span></td>
                    <td className="py-space-md px-space-md text-secondary font-medium">Reduces line clearance time by 42%; guarantees safe track access without manual coordination overhead.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-primary text-on-primary p-space-xl rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-xl relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary-container rounded-full blur-3xl opacity-50 pointer-events-none"></div>
              <div className="flex flex-col gap-space-xs max-w-2xl relative z-10">
                <span className="font-label-caps text-label-caps text-on-primary-container uppercase">READY FOR SYSTEM DEPLOYMENT</span>
                <h3 className="font-headline-xl text-headline-xl text-on-primary">Ready to simulate multi-factor emergency corridor response?</h3>
                <p className="font-body-md text-body-md text-on-primary-container">Run high-altitude stress tests simulating simultaneous landslide blockages, catenary failures, and single-line siding diversions with SIL-4 safety interlocks.</p>
              </div>
              <button
                onClick={() => fireEmergency('Chaos test: simulated corridor stress run')}
                className="inline-flex items-center gap-space-xs px-space-xl py-space-md rounded-full bg-surface text-primary font-headline-sm text-headline-sm hover:bg-surface-bright transition-all shadow-md relative z-10 shrink-0"
              >
                <span>Launch Emergency Simulator</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </ScrollSection>
      </div>
    </>
  );
}
