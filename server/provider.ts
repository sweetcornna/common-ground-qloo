import { z } from 'zod';
import { aborted, Governor, pause } from './governor.js';
import type { Entity, EntityType } from '../src/shared.js';
export class ServiceError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export interface ProviderOptions { signal?: AbortSignal; excludeIds?: string[] }
export interface Provider {
  search(query: string, type: EntityType, options?: ProviderOptions): Promise<Entity[]>;
  recommend(seeds: Entity[], type: EntityType, options?: ProviderOptions): Promise<Entity[]>;
}
const collections: Record<EntityType, string[]> = {
  movie: ['Amélie', 'Spirited Away', 'Before Sunrise', 'Moonrise Kingdom', 'Perfect Days', 'Paterson', 'The Grand Budapest Hotel', 'Fantastic Mr. Fox', 'My Neighbor Totoro', 'Soul', 'The Secret Life of Walter Mitty', 'Cinema Paradiso'],
  artist: ['Bon Iver', 'Nina Simone', 'Khruangbin', 'Nujabes', 'Sufjan Stevens', 'Alice Coltrane', 'Björk', 'The Cinematic Orchestra', 'Nick Drake', 'Air', 'Ólafur Arnalds', 'Yussef Dayes'],
  book: ['The Little Prince', 'Piranesi', 'The Alchemist', 'A Psalm for the Wild-Built', 'Invisible Cities', 'The Housekeeper and the Professor', 'The Wind in the Willows', 'The Art of Noticing', 'The Book of Tea', 'Letters to a Young Poet', 'Braiding Sweetgrass', 'The Creative Act'],
};
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const demoEntities: Entity[] = Object.entries(collections).flatMap(([type, names]) => names.map(name => ({ id: `${type}-${slug(name)}`, name, type: type as EntityType })));
export const demoProvider: Provider = {
  async search(query, type) { return demoEntities.filter(e => e.type === type && e.name.toLowerCase().includes(query.toLowerCase())); },
  async recommend(seeds, type) {
    // Reproducible fixture rankings exercise negotiation. These are not cultural predictions.
    const fingerprint = seeds.map(s => s.id).sort().join('|');
    const hash = [...fingerprint].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const entities = demoEntities.filter(e => e.type === type);
    const offset = hash % entities.length;
    return [...entities.slice(offset), ...entities.slice(0, offset)].filter(e => !seeds.some(s => s.id === e.id));
  },
};
export function parseEntities(payload: unknown, type: EntityType, strict = false): Entity[] {
  if (!payload || typeof payload !== 'object') throw new ServiceError('QLOO_RESPONSE', 'Qloo returned an unexpected response structure.');
  const root = payload as Record<string, unknown>;
  if (root.success === false) throw new ServiceError('QLOO_RESPONSE', 'Qloo reported an unsuccessful request.');
  const results = root.results as Record<string, unknown> | undefined;
  const raw = Array.isArray(root.results) ? root.results : root.entities ?? results?.entities;
  if (!Array.isArray(raw)) throw new ServiceError('QLOO_RESPONSE', 'Qloo returned an unexpected response structure.');
  const seen = new Set<string>();
  const parsed = raw.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') { if (strict) throw new ServiceError('QLOO_RESPONSE', 'Qloo returned malformed entity data.'); return []; }
    const e = item as Record<string, unknown>;
    if (strict && (!z.string().uuid().safeParse(e.entity_id).success || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 250 || (e.subtype ?? e.type) !== `urn:entity:${type}` || (e.disambiguation !== undefined && (typeof e.disambiguation !== 'string' || e.disambiguation.length > 500)))) throw new ServiceError('QLOO_RESPONSE', 'Qloo returned malformed or mismatched entity data.');
    const rawId = e.entity_id ?? e.id;
    const id = typeof rawId === 'string' ? rawId.toLowerCase() : rawId;
    if (typeof id !== 'string' || typeof e.name !== 'string' || !id || !e.name || seen.has(id)) return [];
    const declared = e.subtype ?? (e.type === 'urn:entity' ? undefined : e.type);
    if (typeof declared === 'string' && declared !== type && declared !== `urn:entity:${type}`) return [];
    seen.add(id);
    return [{ id, name: e.name, type, ...(typeof e.disambiguation === 'string' ? { disambiguation: e.disambiguation } : {}) }];
  });
  if (raw.length > 0 && parsed.length === 0) throw new ServiceError('QLOO_RESPONSE', 'Qloo returned no valid entities in a nonempty result.');
  return parsed;
}
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
async function readBoundedBody(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  let finished = false;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      aborted(signal);
      const chunk = await reader.read();
      aborted(signal);
      if (chunk.done) { finished = true; return text + decoder.decode(); }
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new ServiceError('QLOO_RESPONSE', 'Qloo returned a response exceeding the application’s 2 MiB limit.');
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function createQlooProvider(options: { key?: string; baseUrl?: string; fetcher?: typeof fetch; retryDelayMs?: number; maxCallsPerMinute?: number } = {}): Provider {
  const key = options.key?.trim();
  const baseUrl = options.baseUrl ?? 'https://api.qloo.com';
  if (!['https://hackathon.api.qloo.com', 'https://api.qloo.com'].includes(baseUrl)) throw new ServiceError('CONFIGURATION', 'QLOO_BASE_URL must be an approved Qloo HTTPS host.', 503);
  const fetcher = options.fetcher ?? fetch;
  const governor = new Governor(options.maxCallsPerMinute ?? 30);
  async function request(path: string, params: Record<string, string>, signal?: AbortSignal) {
    aborted(signal);
    if (!key) throw new ServiceError('LIVE_UNAVAILABLE', 'Live mode needs a server-side QLOO_API_KEY. Configure it locally or in your deployment secret settings.', 503);
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      let payload: unknown;
      try {
        const result = await governor.run(async () => {
          const timeout = AbortSignal.timeout(10_000);
          const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
          const response = await fetcher(url, { headers: { 'X-Api-Key': key, Accept: 'application/json' }, signal: requestSignal, redirect: 'error' });
          if (response.status === 429 || (response.status >= 500 && response.headers.has('retry-after'))) {
            const header = response.headers.get('retry-after');
            const numeric = header === null ? Number.NaN : Number(header);
            const delay = Number.isFinite(numeric) ? Math.max(0, numeric * 1000) : header ? Math.max(0, Date.parse(header) - Date.now()) : Number.NaN;
            governor.cooldown(Number.isFinite(delay) ? delay : options.retryDelayMs ?? 500);
          }
          // Hold the slot through body consumption, so slow response bodies cannot evade concurrency control.
          let body: string | undefined;
          if (response.ok) body = await readBoundedBody(response, requestSignal);
          else await response.body?.cancel();
          return { response, body };
        }, signal);
        response = result.response;
        if (response.ok) { try { payload = JSON.parse(result.body!); } catch { throw new ServiceError('QLOO_RESPONSE', 'Qloo returned invalid JSON.'); } }
      } catch (error) {
        aborted(signal);
        if (error instanceof ServiceError) throw error;
        if (attempt === 0) { await pause(options.retryDelayMs ?? 300, signal); continue; }
        throw new ServiceError('QLOO_NETWORK', 'Qloo could not be reached. Please try again shortly.');
      }
      const retryAfter = response.headers.get('retry-after');
      const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
      const suggested = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : retryAfter ? Math.max(0, Date.parse(retryAfter) - Date.now()) : Number.NaN;
      if (response.status === 429 || (response.status >= 500 && retryAfter !== null)) {
        // Never shorten a server-requested pause. Longer pauses fail fast, preserving the shared cooldown.
        const delay = Number.isFinite(suggested) ? suggested : options.retryDelayMs ?? 500;
        governor.cooldown(delay);
        if (delay > 2000 || attempt === 1) throw new ServiceError('QLOO_RATE_LIMIT', 'Qloo is rate limiting requests. Please wait and try again.', 429);
        await pause(delay, signal);
        continue;
      }
      if (response.status >= 500 && attempt === 0) { await pause(options.retryDelayMs ?? 500, signal); continue; }
      if (response.status === 404 && path === '/search') return { results: { entities: [] } };
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new ServiceError('QLOO_AUTH', 'Qloo rejected the server credentials. Check your key and API access.', 503);
        throw new ServiceError('QLOO_UPSTREAM', 'Qloo could not complete this request. Check API access and retry.');
      }
      return payload;
    }
    throw new ServiceError('QLOO_UPSTREAM', 'Qloo could not complete this request.');
  }
  return {
    async search(query, type, opts) { return parseEntities(await request('/search', { query, types: `urn:entity:${type}`, take: '12' }, opts?.signal), type, true); },
    async recommend(seeds, type, opts) {
      const excluded = [...new Set([...seeds.map(s => s.id), ...(opts?.excludeIds ?? [])])];
      return parseEntities(await request('/v2/insights', { 'filter.type': `urn:entity:${type}`, 'signal.interests.entities': [...new Set(seeds.map(s => s.id))].join(','), ...(excluded.length ? { 'filter.exclude.entities': excluded.join(',') } : {}), take: '20' }, opts?.signal), type, true);
    },
  };
}
