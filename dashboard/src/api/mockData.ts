// Representative hardcoded values lifted from the original static design
// (Home's floating quick-stats pod + hero telemetry HUD card). Used only
// when USE_MOCK_DATA is true — see config.ts.
import type { HealthStatus, NetworkState } from './types';

export const MOCK_NETWORK_STATE: NetworkState = {
  trains: Array.from({ length: 1482 }, (_, i) => ({
    train_id: `MOCK-${i}`,
    section: 'S-Line',
    chainage_km: 0,
    speed_kmph: 0,
    direction: 'up',
    timestamp: new Date().toISOString(),
  })),
  sensors: [],
  blocks: [],
};

export const MOCK_HEALTH: HealthStatus = {
  ai_engine: 'up',
  last_heartbeat: new Date().toISOString(),
};
