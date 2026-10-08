import { ServiceError } from './provider.js';
export function aborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ServiceError('REQUEST_ABORTED', 'The request was cancelled or exceeded its time limit.', 408);
}
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  aborted(signal);
  return new Promise((resolve, reject) => {
    const stop = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); reject(new ServiceError('REQUEST_ABORTED', 'The request was cancelled or exceeded its time limit.', 408)); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    signal?.addEventListener('abort', stop, { once: true });
  });
}
/** Process-local safety budget, not a claim about Qloo account quotas. */
export class Governor {
  private active = 0;
  private attempts: number[] = [];
  private cooldownUntil = 0;
  private pending: Array<{ wake: () => void; reject: (e: unknown) => void; signal?: AbortSignal; stop: () => void }> = [];
  constructor(private readonly perMinute = 30) {
    if (!Number.isInteger(perMinute) || perMinute < 1 || perMinute > 10000) throw new ServiceError('CONFIGURATION', 'QLOO_MAX_CALLS_PER_MINUTE must be an integer from 1 to 10000.', 503);
  }
  cooldown(ms: number) { this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + ms); }
  private check() {
    if (Date.now() < this.cooldownUntil) throw new ServiceError('QLOO_RATE_LIMIT', 'Qloo requested a pause. Please wait and try again later.', 429);
    this.attempts = this.attempts.filter(time => time > Date.now() - 60000);
    if (this.attempts.length >= this.perMinute) throw new ServiceError('APP_CALL_LIMIT', 'The application’s upstream call budget is temporarily exhausted. Please wait a minute.', 429);
  }
  async run<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    aborted(signal); this.check();
    if (this.active >= 2) {
      if (this.pending.length >= 16) throw new ServiceError('UPSTREAM_BUSY', 'The application is busy. Please try again shortly.', 503);
      await new Promise<void>((resolve, reject) => {
        const entry = { wake: resolve, reject, signal, stop: () => {} };
        entry.stop = () => { const index = this.pending.indexOf(entry); if (index >= 0) this.pending.splice(index, 1); reject(new ServiceError('REQUEST_ABORTED', 'The request was cancelled or exceeded its time limit.', 408)); };
        this.pending.push(entry);
        signal?.addEventListener('abort', entry.stop, { once: true });
      });
    } else this.active++;
    try { aborted(signal); this.check(); this.attempts.push(Date.now()); return await operation(); }
    finally {
      const next = this.pending.shift();
      if (next) { next.signal?.removeEventListener('abort', next.stop); next.wake(); }
      else this.active--;
    }
  }
}
