/**
 * Mirrors services/planning_api/models.py verbatim (the actual FastAPI
 * response models, built in parallel against BUILD_SPEC.md Section 5).
 * Optional fields follow the Pydantic models' own `Optional[...] = None`.
 */

export interface TrainState {
  train_id: string;
  section: string;
  chainage_km: number;
  speed_kmph: number;
  direction: string;
  timestamp: string;
}

export interface SensorState {
  sensor_id: string;
  section: string;
  chainage_km: number;
  timestamp: string;
  sensor_type: 'axle' | 'hotbox';
  attributes: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BlockSlot {
  slot_id: string;
  section?: string;
  window_start?: string;
  window_end?: string;
  block_type?: string;
  traffic_density?: number;
  [key: string]: unknown;
}

export interface NetworkState {
  trains: TrainState[];
  sensors: SensorState[];
  blocks: BlockSlot[];
}

export interface Conflict {
  id: string;
  section: string;
  eta: string;
  severity: string;
}

export interface ConflictOption {
  action: string;
  score: number;
  rationale: string;
  constraints_checked: string[];
  [key: string]: unknown;
}

export interface ConflictOptionsResult {
  options: ConflictOption[];
  rejected: Record<string, unknown>[];
  proven_optimal?: boolean | null;
  fail_safe?: boolean | null;
}

export interface ResolveConflictPayload {
  option: Record<string, unknown>;
  edits?: Record<string, unknown>;
  controller_action?: string;
  realized_outcome?: string;
}

export interface ResolveConflictResult {
  status: string;
  recommendation_id: string;
}

export interface Defect {
  defect_id: string;
  priority_score: number;
  top_features: Record<string, unknown>[];
  escalation_risk?: number;
}

export interface BlockPlanSlot {
  slot_id: string;
  section?: string;
  window_start?: string;
  window_end?: string;
  departments: string[];
  task_ids: string[];
}

export interface WeeklyBlockPlan {
  plan_id: string;
  slots: BlockPlanSlot[];
  source: 'db' | 'fallback_solve';
}

export interface BlockPlanSection {
  section: string;
  departments: string[];
  task_ids: string[];
  slot_ids: string[];
}

export interface MonthlyBlockPlan {
  plan_id: string;
  sections: BlockPlanSection[];
  source: 'db' | 'fallback_solve';
}

export interface EmergencyTriggerPayload {
  section?: string;
  asset_id?: string;
  reason?: string;
}

export interface EmergencyTriggerResult {
  status: string;
  reoptimization_id: string;
}

export interface HealthStatus {
  ai_engine: 'up' | 'down';
  last_heartbeat?: string;
}
