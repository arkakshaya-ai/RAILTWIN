/**
 * USE_MOCK_DATA contract — read this before touching client.ts or any live-data panel.
 *
 * - Default is FALSE. Driven by `VITE_USE_MOCK_DATA === 'true'` in the environment.
 * - When TRUE: every function in `client.ts` resolves immediately with hardcoded
 *   values lifted from the original static design (Home's stat pods / telemetry
 *   dock) instead of making a network call. Useful for design/demo work with no
 *   backend running.
 * - When FALSE (the default) and a fetch fails: `useApiPoll` surfaces the error
 *   via its `error` field. Consuming components MUST render a loading / empty /
 *   error state themselves — they must NEVER silently fall back to mock data,
 *   and a failed or absent backend must NEVER crash the page.
 *
 * Every Feature-page panel that shows live data is expected to follow this same
 * contract via `useApiPoll` + the functions exported from `client.ts`.
 */
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// Matches the ~5s cadence of services/producers/train_position_producer.py
// (DEFAULT_INTERVAL_SECONDS = 5.0) — polling faster than the producer emits
// would just re-fetch the same snapshot.
export const POLL_INTERVAL_MS = 5000;
