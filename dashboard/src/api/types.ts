/**
 * BUILD_SPEC.md Section 5 documents the route contract (paths + intent) but not
 * exact response schemas, and no backend is reachable from this sandbox to infer
 * them from. Every shape below is intentionally permissive (an index signature
 * alongside the fields we expect) so a real response that differs in shape still
 * renders instead of crashing — components must read fields defensively
 * (`data?.field ?? fallback`) and treat anything missing as "unknown", not fatal.
 */

export interface NetworkState {
  active_trains?: number;
  total_trains?: number;
  on_time_percent?: number;
  active_conflicts?: number;
  track_km_monitored?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface Conflict {
  id: string;
  severity?: string;
  description?: string;
  location?: string;
  detected_at?: string;
  [key: string]: unknown;
}

export interface ConflictOption {
  id: string;
  description?: string;
  score?: number;
  [key: string]: unknown;
}

export interface ResolveConflictPayload {
  option_id: string;
  [key: string]: unknown;
}

export interface ResolveConflictResult {
  status?: string;
  [key: string]: unknown;
}

export interface Defect {
  id: string;
  severity?: string;
  asset_id?: string;
  description?: string;
  detected_at?: string;
  [key: string]: unknown;
}

export interface BlockPlan {
  id?: string;
  blocks?: unknown[];
  [key: string]: unknown;
}

export interface EmergencyTriggerPayload {
  type: string;
  location?: string;
  [key: string]: unknown;
}

export interface EmergencyTriggerResult {
  status?: string;
  incident_id?: string;
  [key: string]: unknown;
}

export interface HealthStatus {
  status?: string;
  latency_ms?: number;
  version?: string;
  [key: string]: unknown;
}
