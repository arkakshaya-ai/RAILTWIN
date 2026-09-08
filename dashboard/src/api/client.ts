import { API_BASE_URL, USE_MOCK_DATA } from './config';
import { MOCK_HEALTH, MOCK_NETWORK_STATE } from './mockData';
import type {
  BlockPlan,
  Conflict,
  ConflictOption,
  Defect,
  EmergencyTriggerPayload,
  EmergencyTriggerResult,
  HealthStatus,
  NetworkState,
  ResolveConflictPayload,
  ResolveConflictResult,
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
  return request<Conflict[]>('/conflicts');
}

export async function getConflictOptions(id: string): Promise<ConflictOption[]> {
  if (USE_MOCK_DATA) return [];
  return request<ConflictOption[]>(`/conflicts/${id}/options`);
}

export async function resolveConflict(
  id: string,
  payload: ResolveConflictPayload,
): Promise<ResolveConflictResult> {
  if (USE_MOCK_DATA) return { status: 'mocked' };
  return request<ResolveConflictResult>(`/conflicts/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDefects(): Promise<Defect[]> {
  if (USE_MOCK_DATA) return [];
  return request<Defect[]>('/defects');
}

export async function getWeeklyBlockPlan(): Promise<BlockPlan> {
  if (USE_MOCK_DATA) return {};
  return request<BlockPlan>('/blockplan/weekly');
}

export async function getMonthlyBlockPlan(): Promise<BlockPlan> {
  if (USE_MOCK_DATA) return {};
  return request<BlockPlan>('/blockplan/monthly');
}

export async function triggerEmergency(
  payload: EmergencyTriggerPayload,
): Promise<EmergencyTriggerResult> {
  if (USE_MOCK_DATA) return { status: 'mocked' };
  return request<EmergencyTriggerResult>('/emergency/trigger', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getHealth(): Promise<HealthStatus> {
  if (USE_MOCK_DATA) return MOCK_HEALTH;
  return request<HealthStatus>('/health');
}
