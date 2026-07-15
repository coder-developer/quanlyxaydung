import { apiFetch } from './api';

export type RealtimeChannel = 'accounts' | 'notifications' | 'workforce_requests' | 'shifts' | 'payroll_periods' | 'operations';
export interface RealtimeEvent { id: number; channel: RealtimeChannel; event_type: string; created_at: string }

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export function subscribeRealtime(channels: RealtimeChannel[], onChange: (events: RealtimeEvent[]) => void) {
  let stopped = false;
  let controller: AbortController | null = null;
  const accepted = new Set(channels);

  void (async () => {
    let cursor: number | undefined;
    let failures = 0;
    while (!stopped) {
      try {
        controller = new AbortController();
        const suffix = cursor === undefined ? '' : `?after=${cursor}`;
        const response = await apiFetch(`/api/realtime/events${suffix}`, { signal: controller.signal }) as { cursor: number; events: RealtimeEvent[] };
        cursor = response.cursor;
        failures = 0;
        const relevant = response.events.filter(event => accepted.has(event.channel));
        if (relevant.length && !stopped) onChange(relevant);
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === 'AbortError')) break;
        failures += 1;
        await delay(Math.min(1_000 * failures, 5_000));
      }
    }
  })();

  return () => { stopped = true; controller?.abort(); };
}
