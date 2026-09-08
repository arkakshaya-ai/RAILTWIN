import { API_BASE_URL, USE_MOCK_DATA } from './config';
import { MOCK_HEALTH, MOCK_NETWORK_STATE } from './mockData';
import type {
  BlockPlanSlot,
  Conflict,
  ConflictOption,
  Defect,
  EmergencyTriggerPayload,
  EmergencyTriggerResult,
  HealthStatus,
  MonthlyBlockPlan,
  NetworkState,
  ResolveConflictPayload,
  ResolveConflictResult,
  WeeklyBlockPlan,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function getNetworkState(): Promise<NetworkState> {
  if (USE_MOCK_DATA) return MOCK_NETWORK_STATE;
  return request<NetworkState>('/network/state');
}

export async function getConflicts(): Promise<Conflict[]> {
  if (USE_MOCK_DATA) return [];
  const res = await request<{ conflicts: Conflict[] }>('/conflicts');
  return res.conflicts;
}

export async function getConflictOptions(id: string): Promise<ConflictOption[]> {
  if (USE_MOCK_DATA) return [];
  const res = await request<{ options: ConflictOption[] }>(`/conflicts/${id}/options`);
  return res.options;
}

export async function resolveConflict(
  id: string,
  payload: ResolveConflictPayload,
): Promise<ResolveConflictResult> {
  if (USE_MOCK_DATA) return { status: 'mocked', recommendation_id: 'mock' };
  return request<ResolveConflictResult>(`/conflicts/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDefects(): Promise<Defect[]> {
  if (USE_MOCK_DATA) return [];
  const res = await request<{ defects: Defect[] }>('/defects');
  return res.defects;
}

export async function getWeeklyBlockPlan(): Promise<WeeklyBlockPlan> {
  if (USE_MOCK_DATA) return { plan_id: 'mock', slots: [], source: 'fallback_solve' };
  return request<WeeklyBlockPlan>('/blockplan/weekly');
}

export async function getMonthlyBlockPlan(): Promise<MonthlyBlockPlan> {
  if (USE_MOCK_DATA) return { plan_id: 'mock', sections: [], source: 'fallback_solve' };
  return request<MonthlyBlockPlan>('/blockplan/monthly');
}

export async function triggerEmergency(
  payload: EmergencyTriggerPayload,
): Promise<EmergencyTriggerResult> {
  if (USE_MOCK_DATA) return { status: 'mocked', reoptimization_id: 'mock' };
  return request<EmergencyTriggerResult>('/emergency/trigger', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getHealth(): Promise<HealthStatus> {
  if (USE_MOCK_DATA) return MOCK_HEALTH;
  return request<HealthStatus>('/health');
}

// re-exported for callers that only need the plain slot type, not the
// weekly/monthly wrapper envelopes
export type { BlockPlanSlot };
