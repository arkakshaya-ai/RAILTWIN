// Representative hardcoded values lifted from the original static design
// (Home's floating quick-stats pod + hero "Live System Health" pill + hero
// telemetry HUD card). Used only when USE_MOCK_DATA is true — see config.ts.
import type { HealthStatus, NetworkState } from './types';

export const MOCK_NETWORK_STATE: NetworkState = {
  active_trains: 1482,
  total_trains: 1482,
  on_time_percent: 99.98,
  active_conflicts: 6,
  track_km_monitored: 28450,
  timestamp: new Date().toISOString(),
};

export const MOCK_HEALTH: HealthStatus = {
  status: 'ok',
  latency_ms: 12,
  version: 'mock',
};
