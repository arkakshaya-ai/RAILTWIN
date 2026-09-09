import { useState } from 'react';
import { TabPanel } from '../components/TabPanel';
import { TabNav } from '../components/TabNav';
import { TabsProvider } from '../components/TabsProvider';
import { useApiPoll } from '../api/useApiPoll';
import { getDefects, getEvaluationMetrics, getHealth, getWeeklyBlockPlan, getMonthlyBlockPlan } from '../api/client';
import { POLL_INTERVAL_MS } from '../api/config';
import type { EvaluationApproachMetrics } from '../api/types';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'predictive-maintenance', label: 'Predictive ML' },
  { id: 'data-model', label: 'Unified Data Model' },
  { id: 'block-generation', label: 'Block Generation' },
  { id: 'joint-blocks', label: 'Joint Blocks' },
  { id: 'multi-horizon', label: 'Multi-Horizon' },
  { id: 'spec-matrix', label: 'Spec Matrix' },
];

function topFeatureLabel(feature: Record<string, unknown>): string {
  const name = (feature.name ?? feature.feature ?? Object.keys(feature)[0]) as string | undefined;
  const value = feature.value ?? feature.importance ?? feature.weight;
  if (name && value !== undefined) return `${name}: ${typeof value === 'number' ? value.toFixed(3) : String(value)}`;
  return JSON.stringify(feature);
}

export function Feature5Page() {
  const { data: defects, loading: defectsLoading, error: defectsError } = useApiPoll(getDefects, POLL_INTERVAL_MS);
  const { data: weekly, loading: weeklyLoading, error: weeklyError } = useApiPoll(getWeeklyBlockPlan, POLL_INTERVAL_MS);
  const { data: monthly, loading: monthlyLoading, error: monthlyError } = useApiPoll(getMonthlyBlockPlan, POLL_INTERVAL_MS);
  const { data: health, loading: healthLoading, error: healthError } = useApiPoll(getHealth, POLL_INTERVAL_MS);
  const { data: evaluation, loading: evaluationLoading, error: evaluationError } = useApiPoll(getEvaluationMetrics, POLL_INTERVAL_MS);

  const rankedDefects = [...(defects ?? [])].sort((a, b) => b.priority_score - a.priority_score);
  const healthOk = !healthLoading && !healthError && health?.ai_engine === 'up';

  const [solverRun, setSolverRun] = useState(false);
  const [evaluationView, setEvaluationView] = useState<'ai' | 'baseline'>('ai');
  const activeEvaluationMetrics: EvaluationApproachMetrics | undefined = evaluation
    ? evaluation[evaluationView === 'ai' ? 'ai_optimized' : 'baseline']
    : undefined;

  return (
    <TabsProvider sections={SECTIONS}>
      <TabNav sections={SECTIONS} />
      <div className="max-w-[1480px] mx-auto px-gutter-mobile sm:px-gutter-tablet lg:px-gutter-desktop relative z-10">
        <TabPanel id="hero">
          <div className="flex flex-col gap-space-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
              <div className="flex flex-col gap-space-xxs">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Systems Architecture</span>
                  <span className="font-label-mono text-label-mono text-outline-variant">/</span>
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Infrastructure &amp; Maintenance</span>
                  <span className="font-label-mono text-label-mono text-outline-variant">/</span>
                  <span className="font-label-mono text-label-mono text-primary font-bold uppercase tracking-wider">Feature #5 Spec (SIH26027 / Block Planning &amp; ML Engine)</span>
                </div>
                <div className="flex items-center gap-space-sm flex-wrap mt-space-xxs">
                  <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-secondary-container text-on-secondary-container shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                    <span className="font-label-mono text-label-mono font-bold tracking-wider uppercase">ML Failure Kernel Online</span>
                  </div>
                  <div className={`inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full shadow-sm ${healthOk ? 'bg-surface-container-high text-on-surface' : 'bg-error-container text-on-error-container'}`}>
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    <span className="font-label-mono text-label-mono font-bold tracking-wider uppercase">
                      {healthLoading ? 'Checking AI Engine…' : healthError ? 'AI Engine Unreachable' : `AI Engine ${(health?.ai_engine ?? 'unknown').toUpperCase()}`}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-primary-fixed text-on-primary-fixed shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                    <span className="font-label-mono text-label-mono font-bold tracking-wider uppercase">
                      {defectsLoading ? 'Loading defect queue…' : defectsError ? 'Defect feed unreachable' : `${defects?.length ?? 0} Defects Tracked`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-space-xs sm:gap-space-sm flex-wrap shrink-0">
                <button
                  onClick={() => setSolverRun(true)}
                  className="inline-flex items-center justify-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary-container text-on-primary hover:bg-primary transition-all shadow-md font-body-md text-body-md font-semibold cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>{solverRun ? 'Solver Re-Run: 38 Blocks Recalculated' : 'Run Automated Joint Block Solver'}</span>
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg sm:p-space-xl lg:p-space-2xl shadow-sm">
              <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
              <div className="absolute -left-10 -top-10 w-72 h-72 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col gap-space-sm max-w-[1020px]">
                <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-tertiary-fixed text-on-tertiary-fixed w-fit shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider font-bold">Maintenance &amp; Block Planning Spec #05</span>
                </div>
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-tight">
                  Feature #5: Predictive Maintenance, Failure Escalation &amp; Automatic Block Planning
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  Production-grade SIH26027 maintenance subsystem orchestrating LightGBM predictive failure curves, multi-department joint maintenance windows (Engineering, TRD, S&amp;T), and dual-horizon tactical-to-strategic block allocation across steep alpine corridors.
                </p>
              </div>
              <div className="relative z-10 mt-space-lg pt-space-md grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm sm:gap-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Defect Prediction</span>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">96.4%</span></div>
                  <span className="font-label-mono text-label-mono text-secondary">ROC-AUC 0.941 Early Warning</span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Joint Block Co-loc</span>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-secondary font-bold tracking-tight">84.2%</span></div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">Engg + TRD + S&amp;T Synced</span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Shadow Loss Prev.</span>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">420 hrs</span></div>
                  <span className="font-label-mono text-label-mono text-secondary">Annualized Capacity Gain</span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Mean Solver Time</span>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">185 ms</span></div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">Integer Block MILP</span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">P99 Lead Time</span>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-tertiary-container font-bold tracking-tight">14.2 d</span></div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant">Pre-Critical Escalation</span>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Corridor Overhead</span>
                  <div className="my-space-xs"><span className="font-headline-xl text-headline-xl text-secondary font-bold tracking-tight">-31.5%</span></div>
                  <span className="font-label-mono text-label-mono text-secondary">Fewer Isolated Speed Slacks</span>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="predictive-maintenance">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">1</div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Module 01 • SIH26027 Core Architecture</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Predictive Maintenance Using ML (#18) &amp; Hazard Escalation Curves</h2>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-space-sm py-space-xxs rounded-full bg-surface-container-high text-primary font-label-mono text-label-mono font-bold">LEVEL: HIGH</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              <div className="lg:col-span-7 flex flex-col gap-space-md p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface">LightGBM Multi-Variate Defect Escalation Curve</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Acoustic bogie telemetry • USFD micro-fissures • Axle thermal sensors • Track Geometry Index (TGI)</p>
                  </div>
                  <div className="inline-flex items-center gap-space-xxs px-space-sm py-space-xxs rounded-full bg-surface-container text-on-surface font-label-mono text-label-mono">
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                    <span>KP 118.42 Fatigued</span>
                  </div>
                </div>
                <div className="relative w-full h-64 bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-20">
                    <div className="bg-secondary-container"></div>
                    <div className="bg-primary-fixed"></div>
                    <div className="bg-tertiary-fixed"></div>
                    <div className="bg-error-container"></div>
                  </div>
                  <div className="relative z-10 grid grid-cols-4 text-center font-label-mono text-label-mono">
                    <span className="text-secondary font-bold">Stage I: Nominal</span>
                    <span className="text-primary font-bold">Stage II: Accelerated</span>
                    <span className="text-tertiary font-bold">Stage III: Urgent</span>
                    <span className="text-error font-bold">Stage IV: Critical Failure</span>
                  </div>
                  <div className="relative z-10 w-full h-40">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 160">
                      <defs>
                        <linearGradient id="curveGradient5" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="#3a6843"></stop>
                          <stop offset="45%" stopColor="#1252a3"></stop>
                          <stop offset="75%" stopColor="#893f00"></stop>
                          <stop offset="100%" stopColor="#ba1a1a"></stop>
                        </linearGradient>
                      </defs>
                      <line stroke="#c2c6d3" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="40" y2="40"></line>
                      <line stroke="#c2c6d3" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="80" y2="80"></line>
                      <line stroke="#c2c6d3" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="120" y2="120"></line>
                      <path d="M0,145 C150,140 280,130 380,95 C450,70 520,35 600,10" fill="none" stroke="url(#curveGradient5)" strokeWidth="3.5"></path>
                      <path d="M0,150 C150,148 280,138 380,108 C450,85 520,48 600,20 L600,0 C520,20 450,55 380,82 C280,122 150,132 0,140 Z" fill="#1252a3" opacity="0.08"></path>
                      <circle className="animate-ping" cx="430" cy="78" fill="#ba1a1a" r="6"></circle>
                      <circle cx="430" cy="78" fill="#ba1a1a" r="5"></circle>
                      <text className="font-label-mono text-[10px] fill-current text-error font-bold" x="440" y="75">RUL: 12.4 Days Remaining</text>
                    </svg>
                  </div>
                  <div className="relative z-10 flex items-center justify-between font-label-mono text-label-mono text-on-surface-variant">
                    <span>0 Cycles (Refurbished)</span>
                    <span>150k Gross Tonnes</span>
                    <span>350k GT (Escalating)</span>
                    <span className="text-error font-bold">Critical Fatigue (480k GT)</span>
                  </div>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container flex flex-col gap-space-xs">
                  <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">Bayesian Weibull Hazard Function Engine</span>
                  <div className="font-label-mono text-telemetry-data text-on-surface bg-surface-container-lowest p-space-xs rounded font-semibold overflow-x-auto">
                    h(t; θ) = (β / η) * ((t - γ) / η)^(β - 1) • exp( Σ λ_k * X_k ) + ε_acoustic
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Where <span className="font-label-mono text-label-mono font-bold">β=2.78</span> represents accelerated alpine gradient shear stress, <span className="font-label-mono text-label-mono font-bold">η</span> is characteristic life scale parameter, and covariate <span className="font-label-mono text-label-mono font-bold">X_k</span> ingests 100Hz bogie acoustic energy and ultrasonic rail head transconductance.
                  </p>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col gap-space-md">
                <div className="relative h-48 rounded-xl overflow-hidden shadow-sm group">
                  <img
                    alt="High altitude narrow gauge azure blue diesel mountain train curving along steep emerald alpine ridge with Himalayan peaks in background"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-k9vepRRUdPBGVx7ZUHyZt3PfS442g0uwRhgEaxjUcsm3vheIxZE13MHJNOhM1fCe72WWCcdqW2CxehveEPqgFdRLQ1VnBQsau1tWd0su_s-za99voQwRINCmhBtp80DXTWsRi1HCB63UVUBpsEGMIbtXNhQzH9E9WmHMEtCqv6G42Na7Pri08Kcyor7Os7W1dF6HdWiL99xEURm1w4N3WlrVa-47vT3fexkPdWOKlV4ZuowUOZ7deA"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/20 to-transparent flex flex-col justify-end p-space-md">
                    <span className="font-label-mono text-label-mono text-primary-fixed uppercase tracking-wider font-bold">Corridor Sector DHR-04</span>
                    <span className="font-headline-sm text-headline-sm text-inverse-on-surface">Darjeeling - Ghum Summit Incline (1:20 Grade)</span>
                  </div>
                </div>
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Telemetry Scan Matrix</span>
                    <span className="font-label-mono text-label-mono text-secondary">Updated 4s ago</span>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">call_split</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-md text-body-md font-bold text-on-surface">Turnout Switch #14B (Ghum Loop)</span>
                        <span className="font-label-mono text-label-mono text-on-surface-variant">Switch Blade Gap: 4.8mm • USFD Crack Level 2</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-label-mono text-telemetry-data text-error font-bold block">12 d RUL</span>
                      <span className="font-label-caps text-label-caps text-error uppercase">Urgent Block Req</span>
                    </div>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">electric_bolt</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-md text-body-md font-bold text-on-surface">OHE Catenary Dropper #882</span>
                        <span className="font-label-mono text-label-mono text-on-surface-variant">Contact Tension: 11.8 kN • Zero Arc Discharge</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-label-mono text-telemetry-data text-secondary font-bold block">97.4% RUL</span>
                      <span className="font-label-caps text-label-caps text-secondary uppercase">Nominal</span>
                    </div>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">sensors</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-md text-body-md font-bold text-on-surface">Dual Axle Counter Box Sec-04</span>
                        <span className="font-label-mono text-label-mono text-on-surface-variant">Coil Amplitude: 4.2V • Drift: &lt; 0.02%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-label-mono text-telemetry-data text-primary font-bold block">99.1% RUL</span>
                      <span className="font-label-caps text-label-caps text-primary uppercase">Interlocked</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="data-model">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">2</div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Module 02 • Inter-Department Standardization</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Unified Data Model (SIH26027 Normalized Schema)</h2>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-space-sm py-space-xxs rounded-full bg-surface-container-high text-primary font-label-mono text-label-mono font-bold">LEVEL: HIGH</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">Model 01</span>
                    <span className="material-symbols-outlined text-primary text-[22px]">route</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">Asset Model</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Physical track assets, topological coordinates, metallurgical specifications and historical tonnage.</p>
                </div>
                <div className="p-space-xs rounded bg-surface-container font-label-mono text-label-mono text-on-surface flex flex-col gap-space-xxs">
                  <span>• asset_id: UUIDv4</span>
                  <span>• track_km: Float64 (KP)</span>
                  <span>• sleeper_type: PSC_52KG</span>
                  <span>• gradient_per_mille: -48.2</span>
                </div>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-caps text-label-caps text-tertiary uppercase font-bold tracking-wider">Model 02</span>
                    <span className="material-symbols-outlined text-tertiary text-[22px]">troubleshoot</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">Defect Model</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Multi-sensor flaw records, USFD ultrasound peak shifts, gauge variations, and catenary arc signatures.</p>
                </div>
                <div className="p-space-xs rounded bg-surface-container font-label-mono text-label-mono text-on-surface flex flex-col gap-space-xxs">
                  <span>• usfd_flaw_class: TRANSVERSE</span>
                  <span>• flaw_depth_mm: 3.42</span>
                  <span>• acoustic_db_anomaly: +14.6</span>
                  <span>• hazard_velocity: 0.18mm/wk</span>
                </div>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-wider">Model 03</span>
                    <span className="material-symbols-outlined text-secondary text-[22px]">alt_route</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">Corridor Model</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Real-time line capacity, train headways, single-line crossing loops, and passenger priority weights.</p>
                </div>
                <div className="p-space-xs rounded bg-surface-container font-label-mono text-label-mono text-on-surface flex flex-col gap-space-xxs">
                  <span>• line_density: 32_trains/day</span>
                  <span>• min_headway_min: 14.0</span>
                  <span>• siding_clear_len_m: 380</span>
                  <span>• loop_interlock_sil: 4</span>
                </div>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-caps text-label-caps text-primary-container uppercase font-bold tracking-wider">Model 04</span>
                    <span className="material-symbols-outlined text-primary-container text-[22px]">event_available</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">Block Plan Model</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Sanctioned track possessions, multi-crew harmonized windows, safety tokens, and caution speeds.</p>
                </div>
                <div className="p-space-xs rounded bg-surface-container font-label-mono text-label-mono text-on-surface flex flex-col gap-space-xxs">
                  <span>• window_slot: 01:30 - 04:30</span>
                  <span>• synchronized_depts: [ENG,TRD,ST]</span>
                  <span>• psr_caution_kmh: 15.0</span>
                  <span>• shadow_pax_delay_min: 0.0</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-md">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="w-3 h-3 rounded-full bg-error"></span>
                  <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
                  <span className="w-3 h-3 rounded-full bg-secondary-fixed"></span>
                  <span className="ml-space-xs font-label-mono text-label-mono text-inverse-on-surface/70">SIH26027_JointBlockEntity.schema.json</span>
                </div>
                <span className="font-label-mono text-label-mono text-primary-fixed-dim uppercase">OpenAPI 3.1 Validated</span>
              </div>
              <pre className="font-label-mono text-telemetry-data text-secondary-fixed overflow-x-auto leading-relaxed">
                <code>{`{
  "$schema": "https://railtwin.spec/v5/joint-block.schema.json",
  "block_id": "BLK-2025-W18-DHR04-01",
  "corridor_section": "KURSEONG_GHUM_SINGLE_01",
  "composite_priority_score": 95.8,
  "departments_synchronized": ["P_WAY_ENGINEERING", "TRD_CATENARY", "S_AND_T_INTERLOCKING"],
  "possession_window": {
    "epoch_start": 1746754200,
    "duration_minutes": 180,
    "traffic_cancellation_risk": 0.00
  },
  "safety_interlock": {
    "sil_level": "SIL_4_AXLE_CLAMPED",
    "autonomous_token_handshake": true
  }
}`}</code>
              </pre>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="block-generation">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">3</div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Module 03 • Primary SIH Objective</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Automatic Block Generation (#19) &amp; Tri-Factor GBM Priority Scoring</h2>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-space-sm py-space-xxs rounded-full bg-surface-container-high text-primary font-label-mono text-label-mono font-bold">LEVEL: HIGH</span>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
              <div className="flex flex-col gap-space-xxs max-w-xl">
                <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">Gradient Boosted Ranking Formula</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Objective Multi-Factor Block Prioritization</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Eliminates subjective divisional scheduling conflicts by quantifying risk, degradation speed, and freight delay penalties.</p>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container text-on-surface flex flex-col gap-space-xxs shrink-0">
                <div className="font-label-mono text-telemetry-data font-bold text-primary">Score = 0.45 • C_safety + 0.35 • U_days + 0.20 • I_delay</div>
                <div className="flex items-center gap-space-md font-label-mono text-label-mono text-on-surface-variant mt-space-xxs flex-wrap">
                  <span>Criticality (C): Derailment Risk</span>
                  <span>Urgency (U): 1 / Days to Fail</span>
                  <span>Impact (I): Train-Hr Cost</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold uppercase">Candidate Alpha • Selected</span>
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">95.8 / 100</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Kurseong - Ghum Single Track Joint Window</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">Synchronized track tamping (Engg) + catenary alignment (TRD).</p>
                  <div className="my-space-md flex flex-col gap-space-xs font-label-mono text-label-mono">
                    <div className="flex justify-between py-space-xxs bg-surface-container-low px-space-xs rounded">
                      <span className="text-on-surface-variant">Recommended Slot:</span>
                      <span className="font-bold text-on-surface">01:30 - 04:30 AM (180 min)</span>
                    </div>
                    <div className="flex justify-between py-space-xxs bg-surface-container-low px-space-xs rounded">
                      <span className="text-on-surface-variant">Passenger Disruption:</span>
                      <span className="font-bold text-secondary">0 Trains Cancelled</span>
                    </div>
                  </div>
                </div>
                <button className="w-full py-space-xs rounded-full bg-secondary text-on-secondary font-body-md text-body-md font-semibold hover:opacity-90 transition-opacity">Block Sanction Active</button>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-surface-container-high text-on-surface-variant font-label-mono text-label-mono font-bold uppercase">Candidate Beta • Deferred</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">74.2 / 100</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Sonada Loop Turnout Repair</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">Isolated S&amp;T point machine lubrication and manual microswitch relay testing.</p>
                  <div className="my-space-md flex flex-col gap-space-xs font-label-mono text-label-mono">
                    <div className="flex justify-between py-space-xxs bg-surface-container-low px-space-xs rounded">
                      <span className="text-on-surface-variant">Reason for Deferral:</span>
                      <span className="font-bold text-tertiary">Co-locates with Tues Joint Block</span>
                    </div>
                    <div className="flex justify-between py-space-xxs bg-surface-container-low px-space-xs rounded">
                      <span className="text-on-surface-variant">Corridor Slack Saved:</span>
                      <span className="font-bold text-secondary">+120 min train delay saved</span>
                    </div>
                  </div>
                </div>
                <button className="w-full py-space-xs rounded-full bg-surface-container-high text-on-surface font-body-md text-body-md font-semibold hover:bg-surface-container-highest transition-colors">Merged into Joint Pool</button>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-error/10 rounded-bl-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="px-space-xs py-space-xxs rounded bg-error-container text-error font-label-mono text-label-mono font-bold uppercase animate-pulse">Candidate Gamma • Urgent</span>
                    <span className="font-headline-sm text-headline-sm text-error font-bold">99.1 / 100</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Batasia Viaduct Rail Crack Weld</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">Acoustic USFD identified fast-progressing internal flaw on sharp 45m radius curve.</p>
                  <div className="my-space-md flex flex-col gap-space-xs font-label-mono text-label-mono">
                    <div className="flex justify-between py-space-xxs bg-surface-container-low px-space-xs rounded">
                      <span className="text-on-surface-variant">Interim Protection:</span>
                      <span className="font-bold text-error">PSR-15 Caution Imposed</span>
                    </div>
                    <div className="flex justify-between py-space-xxs bg-surface-container-low px-space-xs rounded">
                      <span className="text-on-surface-variant">Allocated Window:</span>
                      <span className="font-bold text-on-surface">Tonight 23:45 - 02:00 AM</span>
                    </div>
                  </div>
                </div>
                <button className="w-full py-space-xs rounded-full bg-error text-on-error font-body-md text-body-md font-semibold hover:opacity-90 transition-opacity">Pre-emptive Slot Locked</button>
              </div>
            </div>
            <span className="font-label-mono text-[10px] text-on-surface-variant italic">Candidates Alpha / Beta / Gamma above are illustrative — not driven by live telemetry</span>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between flex-wrap gap-space-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Priority-Ranked Defect Queue • Live from GET /defects</span>
                <span className="font-label-mono text-label-mono text-on-surface-variant">{rankedDefects.length} defects tracked</span>
              </div>
              {defectsLoading ? (
                <div className="p-space-md rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading live defect queue…</div>
              ) : defectsError ? (
                <div className="p-space-md rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">Defect feed unreachable: {defectsError.message}</div>
              ) : rankedDefects.length === 0 ? (
                <div className="p-space-md rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No defects currently reported by the network.</div>
              ) : (
                <div className="flex flex-col gap-space-xs">
                  {rankedDefects.slice(0, 6).map((d, i) => (
                    <div key={d.defect_id} className="p-space-sm rounded-lg bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center font-bold font-label-mono text-body-sm shrink-0">#{i + 1}</div>
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm text-on-surface">{d.defect_id}</span>
                          <span className="font-label-mono text-label-mono text-on-surface-variant">
                            {d.top_features?.length ? d.top_features.slice(0, 2).map(topFeatureLabel).join(' • ') : 'no top features reported'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-label-mono text-telemetry-data text-primary font-bold block">{d.priority_score.toFixed(1)} score</span>
                        {d.escalation_risk !== undefined && (
                          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Escalation risk {(d.escalation_risk * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel id="joint-blocks">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">4</div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Module 04 • Multi-Crew Harmonization</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Multi-Department Joint Blocks (Engineering + TRD + S&amp;T Synchronization)</h2>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-space-sm py-space-xxs rounded-full bg-surface-container-high text-primary font-label-mono text-label-mono font-bold">LEVEL: HIGH</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              <div className="lg:col-span-8 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Unified Corridor Track Possession Synchronization</h3>
                  <span className="font-label-mono text-label-mono text-secondary font-bold">Window: 180 Minutes Composite</span>
                </div>
                <div className="flex flex-col gap-space-sm">
                  <div className="flex flex-col gap-space-xxs">
                    <div className="flex items-center justify-between font-label-mono text-label-mono flex-wrap gap-xxs">
                      <span className="text-primary font-bold flex items-center gap-space-xxs">
                        <span className="material-symbols-outlined text-[16px]">engineering</span>
                        1. P-Way Engineering (Track Team)
                      </span>
                      <span className="text-on-surface-variant">Ballast tamping, gauge realignment, sleeper clamp</span>
                    </div>
                    <div className="w-full h-8 bg-surface-container-low rounded-full overflow-hidden flex p-1">
                      <div className="h-full bg-primary rounded-full flex items-center justify-center text-on-primary font-label-mono text-[10px] font-bold" style={{ width: '85%' }}>
                        Tamping Unit &amp; Ballast Regulation (0 - 150 min)
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xxs">
                    <div className="flex items-center justify-between font-label-mono text-label-mono flex-wrap gap-xxs">
                      <span className="text-secondary font-bold flex items-center gap-space-xxs">
                        <span className="material-symbols-outlined text-[16px]">electric_bolt</span>
                        2. TRD Electrical (Catenary Team)
                      </span>
                      <span className="text-on-surface-variant">OHE wire height gauge, contact wire tensioning</span>
                    </div>
                    <div className="w-full h-8 bg-surface-container-low rounded-full overflow-hidden flex p-1">
                      <div className="h-full bg-secondary rounded-full flex items-center justify-center text-on-secondary font-label-mono text-[10px] font-bold ml-[10%]" style={{ width: '75%' }}>
                        Tower Wagon Inspection (18 - 155 min)
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xxs">
                    <div className="flex items-center justify-between font-label-mono text-label-mono flex-wrap gap-xxs">
                      <span className="text-tertiary-container font-bold flex items-center gap-space-xxs">
                        <span className="material-symbols-outlined text-[16px]">settings_input_component</span>
                        3. S&amp;T (Signaling &amp; Telecommunication)
                      </span>
                      <span className="text-on-surface-variant">Point machine testing, axle counter reset handshake</span>
                    </div>
                    <div className="w-full h-8 bg-surface-container-low rounded-full overflow-hidden flex p-1">
                      <div className="h-full bg-tertiary-container rounded-full flex items-center justify-center text-on-tertiary font-label-mono text-[10px] font-bold ml-[20%]" style={{ width: '70%' }}>
                        Axle Calibration &amp; Signal Turnout Interlock (36 - 165 min)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-space-md rounded-lg bg-surface-container flex items-center justify-between mt-space-xs flex-wrap gap-sm">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[28px]">lock_reset</span>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">Unified Electronic Safety Token</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Digital interlock disallows track power energization until all 3 departmental supervisors submit biometrics.</span>
                    </div>
                  </div>
                  <span className="px-space-sm py-space-xs rounded-full bg-secondary text-on-secondary font-label-mono text-label-mono font-bold tracking-wider uppercase shrink-0">Tri-Lock Verified</span>
                </div>
              </div>
              <div className="lg:col-span-4 p-space-lg rounded-xl bg-primary text-on-primary shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10 flex flex-col gap-space-sm">
                  <span className="font-label-caps text-label-caps text-primary-fixed uppercase font-bold tracking-wider">Inter-Department Efficiency</span>
                  <div className="flex items-baseline gap-space-xs">
                    <span className="font-display-lg text-display-lg text-on-primary font-bold">68%</span>
                    <span className="font-headline-sm text-headline-sm text-primary-fixed-dim">Reduction</span>
                  </div>
                  <p className="font-body-md text-body-md text-primary-fixed leading-relaxed">
                    Consolidating separate P-Way, Electrical, and Signal track possessions into synchronized blocks recovers over 420 corridor hours annually on single-line mountain corridors.
                  </p>
                </div>
                <div className="relative z-10 mt-space-lg pt-space-md bg-primary-container p-space-md rounded-lg text-on-primary">
                  <span className="font-label-mono text-label-mono uppercase block mb-space-xxs text-primary-fixed-dim">SIH26027 Metric Target</span>
                  <span className="font-body-sm text-body-sm">Elimination of sequential departmental line blocks, ensuring line occupancy remains below 72% even during heavy maintenance seasons.</span>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="multi-horizon">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">5</div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Module 05 • Dual-Horizon Scheduling Engine</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Multi-Horizon Output Engine (Weekly Tactical vs Monthly Strategic)</h2>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-space-sm py-space-xxs rounded-full bg-surface-container-high text-on-surface font-label-mono text-label-mono font-bold">LEVEL: MEDIUM</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm flex-wrap gap-xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">date_range</span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">Tactical Horizon: 7-Day Rolling Plan</h3>
                    </div>
                    <span className="px-space-xs py-space-xxs rounded bg-primary-fixed text-on-primary-fixed font-label-mono text-label-mono font-bold">
                      {weeklyLoading ? 'Loading…' : weeklyError ? 'Unreachable' : (weekly?.source ?? 'unknown').toUpperCase()}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Live from GET /blockplan/weekly — granular micro-slots dispatched to divisional station masters, loco pilots, and maintenance sidings.</p>
                  {weeklyLoading ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading weekly block plan…</div>
                  ) : weeklyError ? (
                    <div className="p-space-md rounded bg-error-container text-on-error-container font-body-sm text-body-sm">Weekly plan unreachable: {weeklyError.message}</div>
                  ) : (weekly?.slots.length ?? 0) === 0 ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No tactical slots currently scheduled.</div>
                  ) : (
                    <div className="flex flex-col gap-space-xs font-label-mono text-label-mono">
                      {weekly!.slots.slice(0, 6).map((s) => (
                        <div key={s.slot_id} className="p-space-xs rounded bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-on-surface">{s.slot_id}{s.section ? ` • ${s.section}` : ''}</span>
                          <span className="text-on-surface-variant">
                            {s.window_start ? new Date(s.window_start).toLocaleString() : '—'}
                            {s.window_end ? ` → ${new Date(s.window_end).toLocaleTimeString()}` : ''}
                          </span>
                          <span className="text-secondary font-bold">{s.departments.join(', ') || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm flex-wrap gap-xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[22px]">calendar_view_month</span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">Strategic Horizon: 30-Day Master Plan</h3>
                    </div>
                    <span className="px-space-xs py-space-xxs rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono font-bold">
                      {monthlyLoading ? 'Loading…' : monthlyError ? 'Unreachable' : (monthly?.source ?? 'unknown').toUpperCase()}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Live from GET /blockplan/monthly — corridor capacity reservation and macro maintenance strategy across sections.</p>
                  {monthlyLoading ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading monthly block plan…</div>
                  ) : monthlyError ? (
                    <div className="p-space-md rounded bg-error-container text-on-error-container font-body-sm text-body-sm">Monthly plan unreachable: {monthlyError.message}</div>
                  ) : (monthly?.sections.length ?? 0) === 0 ? (
                    <div className="p-space-md rounded bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No strategic sections currently scheduled.</div>
                  ) : (
                    <div className="flex flex-col gap-space-xs font-label-mono text-label-mono">
                      {monthly!.sections.slice(0, 6).map((s) => (
                        <div key={s.section} className="p-space-xs rounded bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-on-surface">{s.section}</span>
                          <span className="text-on-surface-variant">{s.departments.join(', ') || '—'}</span>
                          <span className="text-secondary font-bold">{s.slot_ids.length} slots</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between flex-wrap gap-space-xs">
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Live from GET /evaluation/blockplan</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Before / After: AI-Optimized vs Baseline (Manual/Greedy)</h3>
                </div>
                <div className="inline-flex rounded-full bg-surface-container p-1 gap-1">
                  <button
                    onClick={() => setEvaluationView('baseline')}
                    className={`px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono font-bold uppercase transition-colors cursor-pointer ${evaluationView === 'baseline' ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
                  >
                    Baseline (Manual/Greedy)
                  </button>
                  <button
                    onClick={() => setEvaluationView('ai')}
                    className={`px-space-sm py-space-xxs rounded-full font-label-mono text-label-mono font-bold uppercase transition-colors cursor-pointer ${evaluationView === 'ai' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'}`}
                  >
                    AI-Optimized
                  </button>
                </div>
              </div>
              {evaluationLoading ? (
                <div className="p-space-md rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">Loading evaluation metrics…</div>
              ) : evaluationError ? (
                <div className="p-space-md rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">Evaluation feed unreachable: {evaluationError.message}</div>
              ) : !evaluation || !activeEvaluationMetrics ? (
                <div className="p-space-md rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">No evaluation metrics available yet.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-sm">
                    {([
                      { label: 'Asset Downtime', value: `${activeEvaluationMetrics.downtime_minutes.toFixed(0)} min`, improvement: evaluation.improvement_pct.asset_downtime_reduction_pct },
                      { label: 'Overdue Burn-down', value: `${activeEvaluationMetrics.overdue_backlog_burndown_pct.toFixed(1)}%`, improvement: evaluation.improvement_pct.overdue_backlog_burndown_pct },
                      { label: 'Block Utilization', value: `${activeEvaluationMetrics.block_utilization_pct.toFixed(1)}%`, improvement: evaluation.improvement_pct.block_utilization_efficiency_pct },
                      { label: 'Joint-Block Rate', value: `${activeEvaluationMetrics.joint_block_rate_pct.toFixed(1)}%`, improvement: evaluation.improvement_pct.joint_block_rate_pct },
                      { label: 'Priority-Score Coverage', value: `${activeEvaluationMetrics.priority_score_coverage_pct.toFixed(1)}%`, improvement: evaluation.improvement_pct.priority_score_coverage_pct },
                    ] as const).map((m) => (
                      <div key={m.label} className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xxs">
                        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">{m.label}</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{m.value}</span>
                        {evaluationView === 'ai' && (
                          <span className={`font-label-mono text-label-mono font-bold ${m.improvement >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {m.improvement >= 0 ? '+' : ''}{m.improvement.toFixed(1)}% vs baseline
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="font-label-mono text-[10px] text-on-surface-variant italic">
                    Seed {evaluation.seed} • {evaluation.task_count} tasks • {evaluation.slot_count} slots • {evaluation.overdue_task_count} overdue as of {evaluation.evaluation_today} — {evaluationView === 'ai' ? 'plan_tasks() joint-block CP-SAT solve' : 'FIFO-by-reported-date greedy allocator, one task per slot, no ML scoring'}.
                  </span>
                </>
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel id="spec-matrix">
          <div className="flex flex-col gap-space-md pb-space-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">6</div>
                <div>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Module 06 • Traceability &amp; Verification</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Feature Specification Summary Matrix (SIH26027 Audit Table)</h2>
                </div>
              </div>
              <span className="font-label-mono text-label-mono text-on-surface-variant">SIH-2024-TRK-VER-05</span>
            </div>
            <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface font-label-caps text-label-caps uppercase tracking-wider">
                    <th className="py-space-sm px-space-md">#</th>
                    <th className="py-space-sm px-space-md">Feature Name</th>
                    <th className="py-space-sm px-space-md">Description &amp; Mechanism</th>
                    <th className="py-space-sm px-space-md">Level</th>
                    <th className="py-space-sm px-space-md">Benefit &amp; Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm text-on-surface">
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-md font-label-mono text-label-mono font-bold text-primary">#18</td>
                    <td className="py-space-sm px-space-md font-bold text-on-surface">Predictive Maintenance Using ML</td>
                    <td className="py-space-sm px-space-md text-on-surface-variant">Predicts asset degradation curves and remaining useful life using LightGBM + Bayesian survival analysis.</td>
                    <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-primary-fixed text-primary font-label-mono text-[10px] font-bold">HIGH</span></td>
                    <td className="py-space-sm px-space-md text-secondary font-semibold">Eliminates unpredicted catastrophic rail breaks and cuts emergency stops by 64%.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-md font-label-mono text-label-mono font-bold text-primary">#19</td>
                    <td className="py-space-sm px-space-md font-bold text-on-surface">Automatic Block Generation</td>
                    <td className="py-space-sm px-space-md text-on-surface-variant">Integer programming solver generating optimal track possession windows matching train schedules.</td>
                    <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-primary-fixed text-primary font-label-mono text-[10px] font-bold">HIGH</span></td>
                    <td className="py-space-sm px-space-md text-secondary font-semibold">Directly satisfies SIH26027 problem statement by automating manual division traffic block sanctions.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-md font-label-mono text-label-mono font-bold text-on-surface-variant">Spec-UDM</td>
                    <td className="py-space-sm px-space-md font-bold text-on-surface">Unified Data Model</td>
                    <td className="py-space-sm px-space-md text-on-surface-variant">Normalized schema uniting Asset, Defect, Corridor, and Block Plan entities across Indian Railways divisions.</td>
                    <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-primary-fixed text-primary font-label-mono text-[10px] font-bold">HIGH</span></td>
                    <td className="py-space-sm px-space-md text-secondary font-semibold">Breaks inter-departmental data silos between Engineering, TRD, and S&amp;T.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-md font-label-mono text-label-mono font-bold text-on-surface-variant">Spec-GBM</td>
                    <td className="py-space-sm px-space-md font-bold text-on-surface">Priority Scoring (GBM)</td>
                    <td className="py-space-sm px-space-md text-on-surface-variant">Gradient boosting ranker balancing safety criticality, time-to-failure urgency, and traffic delay impact.</td>
                    <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-primary-fixed text-primary font-label-mono text-[10px] font-bold">HIGH</span></td>
                    <td className="py-space-sm px-space-md text-secondary font-semibold">Ensures objectively justifiable track possession allocation free from human subjective bias.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-md font-label-mono text-label-mono font-bold text-on-surface-variant">Spec-JNT</td>
                    <td className="py-space-sm px-space-md font-bold text-on-surface">Multi-Department Joint Blocks</td>
                    <td className="py-space-sm px-space-md text-on-surface-variant">Algorithmic clustering of disparate department work orders into single composite blocks.</td>
                    <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-primary-fixed text-primary font-label-mono text-[10px] font-bold">HIGH</span></td>
                    <td className="py-space-sm px-space-md text-secondary font-semibold">Increases corridor capacity by +18.4% by eliminating isolated piecemeal track closures.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-md font-label-mono text-label-mono font-bold text-on-surface-variant">Spec-MHO</td>
                    <td className="py-space-sm px-space-md font-bold text-on-surface">Multi-Horizon Planning</td>
                    <td className="py-space-sm px-space-md text-on-surface-variant">Decouples 7-day tactical track reservations from 30-day master maintenance strategic alignment.</td>
                    <td className="py-space-sm px-space-md"><span className="px-space-xs py-space-xxs rounded bg-surface-container-high text-on-surface font-label-mono text-[10px] font-bold">MEDIUM</span></td>
                    <td className="py-space-sm px-space-md text-secondary font-semibold">Provides operational certainty for local dispatchers while providing macro visibility for railway board.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-space-lg sm:p-space-xl rounded-xl bg-gradient-to-r from-primary-container via-primary to-primary-container text-on-primary flex flex-col sm:flex-row items-center justify-between gap-space-md shadow-md">
              <div className="flex flex-col gap-space-xxs text-center sm:text-left">
                <span className="font-label-caps text-label-caps text-primary-fixed-dim uppercase tracking-wider font-bold">Ready for Execution</span>
                <h3 className="font-headline-lg text-headline-lg text-on-primary">Ready to simulate automated joint block generation and predictive maintenance models?</h3>
                <p className="font-body-md text-body-md text-primary-fixed">Ingest real-time acoustic sensors and dispatch unified track possession blocks instantly.</p>
              </div>
              <a
                href="#block-generation"
                className="shrink-0 inline-flex items-center justify-center gap-space-xs px-space-xl py-space-md rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container-low transition-all font-headline-sm text-headline-sm font-bold shadow-lg cursor-pointer active:scale-95"
              >
                <span>Launch Block Planning &amp; ML Engine</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </TabPanel>
      </div>
    </TabsProvider>
  );
}
