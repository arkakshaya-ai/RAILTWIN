import { useState } from 'react';
import { ScrollSection } from '../components/ScrollSection';
import { SideNav } from '../components/SideNav';
import { useApiPoll } from '../api/useApiPoll';
import { getConflictOptions, getConflicts, getHealth, resolveConflict } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';
import type { ConflictOption, ResolveConflictResult } from '../api/types';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'review-form', label: 'Review & Explainability' },
  { id: 'feedback-loop', label: 'Feedback Loop' },
  { id: 'ergonomics', label: 'Cognitive Safeguards' },
  { id: 'spec-matrix', label: 'Traceability Matrix' },
];

type ResolveState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'done'; result: ResolveConflictResult }
  | { phase: 'error'; message: string };

export function Feature7Page() {
  const { data: conflicts, loading: conflictsLoading, error: conflictsError } = useApiPoll(getConflicts, POLL_INTERVAL_MS);
  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const healthOk = !healthLoading && !healthError && health?.ai_engine === 'up';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: options, loading: optionsLoading, error: optionsError } = useApiPoll(
    () => (selectedId ? getConflictOptions(selectedId) : Promise.resolve<ConflictOption[]>([])),
    POLL_INTERVAL_MS,
    [selectedId],
  );

  const selectedConflict = (conflicts ?? []).find((c) => c.id === selectedId) ?? null;
  const topOption = options?.[0] ?? null;
  const [editNote, setEditNote] = useState('');
  const [resolveState, setResolveState] = useState<ResolveState>({ phase: 'idle' });

  async function resolve(action: 'accept' | 'edit' | 'reject') {
    if (!selectedId) return;
    setResolveState({ phase: 'pending' });
    try {
      const result = await resolveConflict(selectedId, {
        option: (topOption ?? {}) as Record<string, unknown>,
        controller_action: action,
        edits: action === 'edit' ? { note: editNote } : undefined,
      });
      setResolveState({ phase: 'done', result });
    } catch (err) {
      setResolveState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <>
      <SideNav sections={SECTIONS} />
      <div className="max-w-[1480px] mx-auto px-gutter-desktop relative z-10">
        <ScrollSection id="hero">
          <div className="flex flex-col gap-space-lg">
            <div className="w-full bg-surface-container-low -mx-gutter-desktop px-gutter-desktop py-space-md rounded-xl">
              <div className="max-w-[1480px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
                <div className="flex flex-col gap-space-xxs min-w-0">
                  <div className="flex items-center gap-space-xs flex-wrap font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    <span>SYSTEMS ARCHITECTURE</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span>HUMAN-MACHINE INTERFACE &amp; TRUST ARCHITECTURE</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-primary font-bold">FEATURE #7 SPEC (CONTROLLER-IN-THE-LOOP &amp; EXPLAINABILITY)</span>
                  </div>
                  <div className="flex items-center gap-space-xs flex-wrap mt-space-xxs">
                    <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                      <span>HITL VERIFIED (SIL-2)</span>
                    </div>
                    <div className={`inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono ${healthOk ? 'bg-surface-container-high text-on-surface' : 'bg-error-container text-on-error-container'}`}>
                      <span className="material-symbols-outlined text-[14px]">verified_user</span>
                      <span>{healthLoading ? 'CHECKING AI ENGINE…' : healthError ? 'AI ENGINE UNREACHABLE' : `AI ENGINE ${(health?.ai_engine ?? 'unknown').toUpperCase()}`}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap shrink-0">
                  <a href="#review-form" className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary text-on-primary font-body-md text-body-md hover:bg-primary-container transition-colors shadow-md">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    <span>Open Live Review Console</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs max-w-4xl">
              <div className="inline-flex items-center gap-space-xs text-primary font-label-caps uppercase tracking-widest">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>HUMAN-CENTRIC COGNITIVE CO-PILOT SPECIFICATION</span>
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-tight">
                Feature #7: Human Interface, Trust, Explainability &amp; Feedback Loop
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Where controllers stay firmly in the loop and the algorithmic twin explains itself in real time. An enterprise human-centered AI interface orchestrating pre-filled dispatch review forms, transparent multi-factor attribution audit trails, deterministic override handling, and closed-loop reinforcement feedback across complex mountain rail corridors.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-md">
              <div className="p-space-md rounded bg-surface-container-low flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-on-surface-variant"><span className="font-label-caps text-label-caps uppercase tracking-wider">TRUST CONFIDENCE</span><span className="material-symbols-outlined text-[18px] text-secondary">handshake</span></div>
                <div className="mt-space-sm"><span className="font-headline-xl text-headline-xl text-secondary">98.6%</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">Advisory acceptance rate</p></div>
              </div>
              <div className="p-space-md rounded bg-surface-container-low flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-on-surface-variant"><span className="font-label-caps text-label-caps uppercase tracking-wider">AVG REVIEW LATENCY</span><span className="material-symbols-outlined text-[18px] text-primary">timer</span></div>
                <div className="mt-space-sm"><span className="font-headline-xl text-headline-xl text-primary">4.2 s</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">Pre-filled clearance time</p></div>
              </div>
              <div className="p-space-md rounded bg-surface-container-low flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-on-surface-variant"><span className="font-label-caps text-label-caps uppercase tracking-wider">XPL COVERAGE</span><span className="material-symbols-outlined text-[18px] text-secondary">fact_check</span></div>
                <div className="mt-space-sm"><span className="font-headline-xl text-headline-xl text-on-surface">100%</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">All AI advisories attributed</p></div>
              </div>
              <div className="p-space-md rounded bg-surface-container-low flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-on-surface-variant"><span className="font-label-caps text-label-caps uppercase tracking-wider">OVERRIDE LATENCY</span><span className="material-symbols-outlined text-[18px] text-primary-container">bolt</span></div>
                <div className="mt-space-sm"><span className="font-headline-xl text-headline-xl text-primary-container">&lt; 120 ms</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">SIL-4 safety interlock clamp</p></div>
              </div>
              <div className="p-space-md rounded bg-surface-container-low flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-on-surface-variant"><span className="font-label-caps text-label-caps uppercase tracking-wider">AUDIT TRAIL</span><span className="material-symbols-outlined text-[18px] text-on-surface">lock</span></div>
                <div className="mt-space-sm"><span className="font-headline-xl text-headline-xl text-on-surface">SIL-2</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">CENELEC tamper-proof</p></div>
              </div>
              <div className="p-space-md rounded bg-surface-container-low flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-on-surface-variant"><span className="font-label-caps text-label-caps uppercase tracking-wider">RETRAIN CYCLE</span><span className="material-symbols-outlined text-[18px] text-tertiary">sync</span></div>
                <div className="mt-space-sm"><span className="font-headline-xl text-headline-xl text-tertiary">24 hrs</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xxs">Surrogate edge re-calibration</p></div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="review-form">
          <div className="flex flex-col gap-space-2xl">
            <div className="flex flex-col gap-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                <div>
                  <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">MODULE 1 // LIVE CONTROLLER REVIEW CONSOLE</span>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface">Controller Dashboard: Accept / Edit / Reject Live Conflicts</h2>
                </div>
                <div className="flex items-center gap-space-xs font-label-mono text-label-mono text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span>DISPATCH INTERFACE ACTIVE • Live from GET /conflicts</span>
                </div>
              </div>

              <div className="w-full bg-surface-container-lowest rounded-lg p-space-lg sm:p-space-xl shadow-md flex flex-col gap-space-lg">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Step 1 — Select an active conflict</span>
                  {conflictsLoading ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading conflict feed…</div>
                  ) : conflictsError ? (
                    <div className="p-space-md rounded bg-error-container text-on-error-container font-body-sm text-body-sm">Conflict feed unreachable: {conflictsError.message}</div>
                  ) : (conflicts ?? []).length === 0 ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No active conflicts reported by the network.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-xs">
                      {(conflicts ?? []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedId(c.id);
                            setResolveState({ phase: 'idle' });
                          }}
                          className={`p-space-sm rounded text-left font-body-sm text-body-sm flex items-center justify-between transition-colors ${
                            selectedId === c.id ? 'bg-primary-container text-on-primary' : 'bg-surface-container hover:bg-surface-container-high'
                          }`}
                        >
                          <span>{c.id} • {c.section}</span>
                          <span className="font-label-mono text-label-mono uppercase">{c.severity}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedConflict && (
                  <>
                    <div className="w-full p-space-md rounded bg-primary-container text-on-primary flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-sm">
                      <div className="flex items-start gap-space-md">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-white text-[24px]">priority_high</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-space-xs flex-wrap">
                            <span className="font-headline-sm text-headline-sm font-bold">Conflict {selectedConflict.id}</span>
                            <span className="px-space-xs py-0.5 rounded-full bg-white/25 font-label-mono text-label-mono text-white">
                              {optionsLoading ? 'SCORING…' : topOption ? `TOP SCORE: ${topOption.score}` : 'NO OPTIONS'}
                            </span>
                          </div>
                          <p className="font-body-md text-body-md text-on-primary-container mt-0.5">
                            Section {selectedConflict.section} • Severity {selectedConflict.severity.toUpperCase()} • ETA {new Date(selectedConflict.eta).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-space-xs">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Step 2 — Explainability: ranked options from GET /conflicts/{selectedConflict.id}/options</span>
                      {optionsLoading ? (
                        <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading resolution options…</div>
                      ) : optionsError ? (
                        <div className="p-space-md rounded bg-error-container text-on-error-container font-body-sm text-body-sm">Options feed unreachable: {optionsError.message}</div>
                      ) : (options ?? []).length === 0 ? (
                        <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No resolution options returned for this conflict.</div>
                      ) : (
                        <div className="space-y-space-sm">
                          {(options ?? []).map((opt, i) => (
                            <div key={`${opt.action}-${i}`} className={`p-space-sm rounded ${i === 0 ? 'bg-surface-container-high ring-2 ring-primary/40' : 'bg-surface-container'}`}>
                              <div className="flex justify-between font-body-sm text-body-sm mb-1">
                                <span className="font-semibold text-on-surface">{opt.action}</span>
                                <span className="font-label-mono text-label-mono text-secondary font-bold">{opt.score}</span>
                              </div>
                              <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden">
                                <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(100, Math.max(0, opt.score))}%` }}></div>
                              </div>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 italic">{opt.rationale}</p>
                              {opt.constraints_checked?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {opt.constraints_checked.map((cc) => (
                                    <span key={cc} className="px-space-xs py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-mono text-[10px]">{cc}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-space-xs">
                      <label htmlFor="controller-edit-note" className="font-label-caps text-label-caps text-on-surface-variant uppercase">Controller edit notes (used when choosing Modify)</label>
                      <textarea
                        id="controller-edit-note"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full p-space-sm rounded bg-surface-container text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary placeholder-on-surface-variant/60"
                        placeholder="e.g. Held for additional 4 mins to allow platform clearance."
                        rows={3}
                      />
                    </div>

                    {resolveState.phase !== 'idle' && (
                      <div
                        className={`p-space-sm rounded font-label-mono text-label-mono ${
                          resolveState.phase === 'error' ? 'bg-error-container text-on-error-container' : resolveState.phase === 'done' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {resolveState.phase === 'pending' && <span>POST /conflicts/{selectedConflict.id}/resolve dispatched…</span>}
                        {resolveState.phase === 'done' && (
                          <span>status: <strong>{resolveState.result.status}</strong> • recommendation_id: <strong>{resolveState.result.recommendation_id}</strong></span>
                        )}
                        {resolveState.phase === 'error' && <span>Resolve failed: {resolveState.message}</span>}
                      </div>
                    )}

                    <div className="pt-space-md flex flex-col md:flex-row items-center justify-between gap-space-md border-t border-surface-dim">
                      <button
                        onClick={() => resolve('accept')}
                        disabled={resolveState.phase === 'pending'}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-space-sm px-space-xl py-space-sm rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container transition-all shadow-md active:scale-95 disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        <span>Authorize &amp; Commit Dispatch Order</span>
                      </button>
                      <div className="flex items-center gap-space-xs w-full md:w-auto justify-end">
                        <button
                          onClick={() => resolve('edit')}
                          disabled={resolveState.phase === 'pending'}
                          className="flex-1 md:flex-none inline-flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-full bg-surface-container text-on-surface font-body-md text-body-md hover:bg-surface-container-high transition-colors disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                          <span>Modify Parameters</span>
                        </button>
                        <button
                          onClick={() => resolve('reject')}
                          disabled={resolveState.phase === 'pending'}
                          className="flex-1 md:flex-none inline-flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-full bg-error-container text-on-error-container font-body-md text-body-md hover:bg-error hover:text-on-error transition-colors disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[18px]">block</span>
                          <span>Reject &amp; Escalate</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {!selectedConflict && !conflictsLoading && !conflictsError && (conflicts ?? []).length > 0 && (
                  <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Select a conflict above to load its explainability panel and resolution actions.</div>
                )}
              </div>
            </div>

            <div className="p-space-lg rounded-lg bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs text-primary font-label-caps uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">psychology_alt</span>
                <span>Deterministic Safety Tree (Illustrative Reference)</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Step-by-step fail-safe interlock ladder confirming safety envelope integrity before any advisory reaches the controller — shown here as the reference design; live rationale for the selected conflict appears above.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm font-body-sm text-body-sm">
                <div className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container">
                  <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[16px]">check</span></div>
                  <div className="flex flex-col"><span className="font-semibold text-on-surface">Track Siding Clear &amp; Gauge Valid</span><span className="font-label-mono text-label-mono text-secondary">Batasia Loop 2: 0 Occupancy</span></div>
                </div>
                <div className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container">
                  <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[16px]">check</span></div>
                  <div className="flex flex-col"><span className="font-semibold text-on-surface">Grade Feasibility &amp; Braking Ratio</span><span className="font-label-mono text-label-mono text-secondary">Retardation 1.12 m/s² (Safe)</span></div>
                </div>
                <div className="flex items-start gap-space-sm p-space-sm rounded bg-primary-container text-on-primary">
                  <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[16px]">lock</span></div>
                  <div className="flex flex-col"><span className="font-semibold">Terminal Gate: Route Committed to Controller</span><span className="font-label-mono text-label-mono text-on-primary-container">Awaiting single-click authorization</span></div>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="feedback-loop">
          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div>
                <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">MODULE 3 // FEATURE #13 SPEC</span>
                <h2 className="font-headline-xl text-headline-xl text-on-surface">Closed-Loop Controller Feedback, Override Reason Capture &amp; Continuous Learning</h2>
              </div>
              <div className="flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-surface-container font-label-mono text-label-mono text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span>KAFKA EVENT STREAM: controller.decision.events</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
              <div className="lg:col-span-7 bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-lg shadow-sm flex flex-col gap-space-lg">
                <div className="flex items-center justify-between pb-space-sm border-b border-surface-dim">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-tertiary text-[22px]">edit_attributes</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface">Structured Controller Override Taxonomy</span>
                  </div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">CONTROLLER ID: #CTC-402</span>
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Select Override Taxonomy Category (Required for SIL-2 Compliance)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
                    <button className="p-space-sm rounded bg-surface-container text-left font-body-sm text-body-sm hover:bg-surface-container-high transition-colors flex items-center justify-between" type="button">
                      <span>[Local Track Visibility / Dense Alpine Fog]</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">cloud</span>
                    </button>
                    <button className="p-space-sm rounded bg-primary-container text-on-primary text-left font-body-sm text-body-sm transition-colors flex items-center justify-between" type="button">
                      <span>[Unscheduled VIP / Special Movement]</span>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    </button>
                    <button className="p-space-sm rounded bg-surface-container text-left font-body-sm text-body-sm hover:bg-surface-container-high transition-colors flex items-center justify-between" type="button">
                      <span>[Loco Pilot Medical / Fatigue Advisory]</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">medical_services</span>
                    </button>
                    <button className="p-space-sm rounded bg-surface-container text-left font-body-sm text-body-sm hover:bg-surface-container-high transition-colors flex items-center justify-between" type="button">
                      <span>[Station Master Local Platform Request]</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">store</span>
                    </button>
                    <button className="p-space-sm rounded bg-surface-container text-left font-body-sm text-body-sm hover:bg-surface-container-high transition-colors flex items-center justify-between sm:col-span-2" type="button">
                      <span>[Ballast Slippage Unreported by Wayside Optical Sensors]</span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">warning</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-xs flex-wrap gap-xs">
                  <div className="flex items-center gap-space-xxs text-on-surface-variant font-label-mono text-label-mono">
                    <span className="material-symbols-outlined text-[16px] text-secondary">fingerprint</span>
                    <span>SHA-256: 7f8a92c...e1b04 tamper-proof chained</span>
                  </div>
                  <span className="font-label-mono text-[10px] text-on-surface-variant italic">Live accept/edit/reject actions are wired above in the Review Console — this taxonomy panel mirrors the source design.</span>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col gap-space-md">
                <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-sm">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">ACTIVE TELEMETRY STREAM • DECISION LEDGER</span>
                  <div className="space-y-space-xs mt-space-xxs">
                    <div className="p-space-sm rounded bg-surface-container font-label-mono text-label-mono flex flex-col gap-space-xxs">
                      <div className="flex justify-between items-center text-body-sm">
                        <span className="text-on-surface font-bold">14:02:18 • ORD #9021</span>
                        <span className="px-space-xs py-0.5 rounded bg-secondary-container text-on-secondary-container text-[10px]">APPROVED</span>
                      </div>
                      <div className="text-on-surface-variant">ALP-102 • Siding Dwell 2.0m • Controller #CTC-402</div>
                    </div>
                    <div className="p-space-sm rounded bg-surface-container font-label-mono text-label-mono flex flex-col gap-space-xxs">
                      <div className="flex justify-between items-center text-body-sm">
                        <span className="text-on-surface font-bold">13:48:02 • ORD #9019</span>
                        <span className="px-space-xs py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed text-[10px]">OVERRIDDEN</span>
                      </div>
                      <div className="text-on-surface-variant">FRT-308 • Hold Mainline • Tag: [Unscheduled VIP]</div>
                    </div>
                  </div>
                  <div className="mt-space-sm p-space-sm rounded bg-surface-container-high flex items-center justify-between font-label-mono text-label-mono">
                    <span className="text-on-surface-variant">FEEDBACK RETRAIN IMPACT:</span>
                    <span className="text-secondary font-bold">-41% Recurring False Advisories</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="ergonomics">
          <div className="flex flex-col gap-space-2xl">
            <div className="flex flex-col gap-space-xxs max-w-3xl">
              <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">MODULE 4 // HUMAN FACTORS &amp; ERGONOMICS</span>
              <h2 className="font-headline-xl text-headline-xl text-on-surface">Cognitive Load Safeguards for High-Altitude Dispatchers</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Engineered for extreme environmental stress, monsoons, and rockfall corridors to ensure controllers remain alert, never saturated.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <div className="p-space-lg rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">filter_center_focus</span></div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mt-space-xs">Attention Budgeting</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Dynamic alarm throttling suppresses non-critical informational warnings during maneuvers. Only the top 3 ranked safety interventions are surfaced simultaneously.</p>
                </div>
                <div className="font-label-mono text-label-mono text-primary font-bold">MAX 3 ADVISORIES QUEUED</div>
              </div>
              <div className="p-space-lg rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">lock_clock</span></div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mt-space-xs">Fail-Safe Default to Human</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">If sensor or network telemetry latency exceeds 800ms, the system transitions to manual controller lock with automated SIL-4 track headway spacing.</p>
                </div>
                <div className="font-label-mono text-label-mono text-secondary font-bold">LATENCY THRESHOLD: 800ms</div>
              </div>
              <div className="p-space-lg rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">record_voice_over</span></div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mt-space-xs">Multi-Lingual Audio Synthesis</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Real-time dispatch synthesized voice readouts in Hindi, Bengali, and English for high-stress mountain operations, ensuring instant comprehension without looking away.</p>
                </div>
                <div className="font-label-mono text-label-mono text-on-surface font-bold">EN • HI • BN SYNTHESIZED</div>
              </div>
              <div className="rounded-lg overflow-hidden relative shadow-sm min-h-[220px] flex flex-col justify-end p-space-md">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBjUAa9Qc2GG7NpX8V00fruiCPITrjufo92aHNIKZJAnrAd4KtALG1NrVcK2LNocMFryqQy8Qhi434j8aUVW8_yCIq9dsA8InNVFX2_1dH1qt5JZJSNpCGql7fjlk5KMeCZ4LiOT-RYNfz0uU5BDYPEz9VKvGov1XeeK6vtGm5lytYFA13-HvKl9Zq-fwoncd3AuDO8hD2zoWbUw7NR3xhh-gLLF5Gjd74XLNHuP4puGdd24KT7xVmYrA')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="relative z-10 text-white flex flex-col gap-1">
                  <span className="font-label-mono text-label-mono uppercase text-white/80">DARJEELING ALPINE ROUTE</span>
                  <span className="font-headline-sm text-headline-sm font-bold leading-tight">Ghum-Kurseong Pass KP 72-88</span>
                  <div className="flex items-center gap-space-xs text-[11px] font-label-mono text-secondary-fixed">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                    <span>2,258m Elevation • Active Monitored</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection id="spec-matrix">
          <div className="flex flex-col gap-space-xl pb-space-2xl">
            <div className="flex flex-col gap-space-xxs">
              <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">MODULE 5 // REGULATORY COMPLIANCE MATRIX</span>
              <h2 className="font-headline-xl text-headline-xl text-on-surface">Traceability &amp; Engineering Specifications Audit Matrix</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Complete normative mapping of human-machine interaction specifications, safety classification levels, and operational impacts.</p>
            </div>
            <div className="w-full overflow-x-auto rounded-lg shadow-sm bg-surface-container-lowest">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container font-label-caps text-label-caps text-on-surface-variant uppercase">
                    <th className="py-space-md px-space-md">#</th>
                    <th className="py-space-md px-space-md">FEATURE / SUB-ROUTINE</th>
                    <th className="py-space-md px-space-md">DESCRIPTION &amp; MECHANISM</th>
                    <th className="py-space-md px-space-md">SAFETY LEVEL</th>
                    <th className="py-space-md px-space-md">OPERATIONAL IMPACT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-dim font-body-sm text-body-sm text-on-surface">
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">#12</td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">Controller Dashboard &amp; Pre-Filled Form</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">Context-aware pre-compiled dispatch forms eliminating manual parameter typing; 1-click biometric/token safe sign-off.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono">SIL-2 / HITL</span></td>
                    <td className="py-space-md px-space-md font-medium text-secondary">Reduces review latency from 3.5m to 4.2s; zero manual data-entry errors.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">#13</td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">Feedback &amp; Continuous Logging Loop</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">Event-driven override taxonomy logging and surrogate retraining pipeline with SHA-256 tamper-evident chaining.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-mono text-label-mono">AUDIT / COMPLIANCE</span></td>
                    <td className="py-space-md px-space-md font-medium text-on-surface">Creates legally binding incident trail; cuts recurring false advisories by 41%.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-XPL</td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">Feature-Importance Explainability Panel</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">Local linear explanation and counterfactual 'What-If' reasoning displayed alongside advisory.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-mono text-label-mono">TRANSPARENCY / HIGH</span></td>
                    <td className="py-space-md px-space-md font-medium text-primary">Eliminates 'black-box' hesitation; controller recommendation acceptance at 98.6%.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-OVR</td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">Deterministic Manual Override Interlock</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">Instantaneous priority pre-emption allowing human operator to seize corridor control with automatic collision envelope clamps.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-mono text-label-mono">SIL-4 FAIL-SAFE</span></td>
                    <td className="py-space-md px-space-md font-medium text-error">Guarantees safety during deviation; enforces 120ms override collision clamping.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="py-space-md px-space-md font-label-mono text-label-mono text-primary font-bold">Spec-COG</td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">Cognitive Load &amp; Attention Throttling</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">Priority queuing displaying max 3 critical interventions simultaneously with graduated multi-modal alerts.</td>
                    <td className="py-space-md px-space-md"><span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-mono text-label-mono">HUMAN FACTORS</span></td>
                    <td className="py-space-md px-space-md font-medium text-on-surface">Mitigates controller fatigue during complex monsoon and landslide disruptions.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-space-xl rounded-lg bg-surface-container-lowest shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-xl">
              <div className="flex flex-col gap-space-xs max-w-2xl">
                <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">INTERACTIVE HITL DISPATCH TERMINAL</span>
                <h2 className="font-headline-xl text-headline-xl text-on-surface">Ready to inspect Controller Trust &amp; Explainability Workflows?</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Experience the live CTC dispatcher console equipped with real-time option decomposition, instant pre-filled review cards, and closed-loop continuous feedback logging.</p>
              </div>
              <a
                href="#review-form"
                className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container transition-all shadow-md shrink-0"
              >
                <span>Launch Dispatcher HITL Console</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </ScrollSection>
      </div>
    </>
  );
}
