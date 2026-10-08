import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { resolve } from 'node:path';
import type { PlanRequest } from '../src/shared.js';
import { createPlanner } from './agent.js';
import { createQlooProvider, demoProvider, ServiceError } from './provider.js';
const entity = z.object({ id: z.string().trim().min(1).max(100).transform(id => id.toLowerCase()), name: z.string().min(1).max(250), type: z.enum(['movie', 'artist', 'book']), disambiguation: z.string().max(500).optional() }).strict();
export const planSchema = z.object({
  mode: z.enum(['demo', 'live']), profiles: z.tuple([z.object({ seeds: z.array(entity).min(1).max(25) }).strict(), z.object({ seeds: z.array(entity).min(1).max(25) }).strict()]),
  minutes: z.union([z.literal(30), z.literal(60), z.literal(90)]), focus: z.enum(['balanced', 'adventurous']), excludeIds: z.array(z.string().trim().min(1).max(100).transform(id => id.toLowerCase())).max(100),
}).strict().superRefine((input, ctx) => {
  const types = new Map<string, string>();
  for (const profile of input.profiles) {
    if (new Set(profile.seeds.map(s => s.id)).size > 5) ctx.addIssue({ code: 'custom', message: 'Choose at most five distinct seeds per person.' });
    for (const seed of profile.seeds) {
      if (types.has(seed.id) && types.get(seed.id) !== seed.type) ctx.addIssue({ code: 'custom', message: 'The same entity ID cannot have conflicting categories.' });
      types.set(seed.id, seed.type);
    }
  }
  if (input.mode === 'live' && [...input.profiles.flatMap(p => p.seeds.map(s => s.id)), ...input.excludeIds].some(id => !z.string().uuid().safeParse(id).success)) ctx.addIssue({ code: 'custom', message: 'Live mode requires Qloo entity UUIDs from live search.' });
}).transform(input => ({ ...input, profiles: input.profiles.map(p => ({ seeds: [...new Map(p.seeds.map(seed => [seed.id, seed])).values()] })) as PlanRequest['profiles'], excludeIds: [...new Set(input.excludeIds)] }));
export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 45, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a minute.' } } }));
  const maxCalls = env.QLOO_MAX_CALLS_PER_MINUTE === undefined ? 30 : Number(env.QLOO_MAX_CALLS_PER_MINUTE);
  const deadlineMs = env.REQUEST_TIMEOUT_MS === undefined ? 45000 : Number(env.REQUEST_TIMEOUT_MS);
  if (!Number.isInteger(deadlineMs) || deadlineMs < 100 || deadlineMs > 120000) throw new ServiceError('CONFIGURATION', 'REQUEST_TIMEOUT_MS must be an integer from 100 to 120000.', 503);
  const liveProvider = createQlooProvider({ key: env.QLOO_API_KEY, baseUrl: env.QLOO_BASE_URL, maxCallsPerMinute: maxCalls });
  const providerFor = (mode: 'demo' | 'live') => mode === 'demo' ? demoProvider : liveProvider;
  const planners = { demo: createPlanner(demoProvider), live: createPlanner(liveProvider) };
  function requestContext(req: express.Request, res: express.Response) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, deadlineMs);
    req.once('aborted', abort);
    res.once('close', abort);
    return { signal: controller.signal, cleanup: () => { clearTimeout(timer); req.removeListener('aborted', abort); res.removeListener('close', abort); } };
  }
  app.get('/api/config', (_req, res) => res.json({ liveAvailable: Boolean(env.QLOO_API_KEY?.trim()) && (!env.QLOO_BASE_URL || ['https://api.qloo.com', 'https://hackathon.api.qloo.com'].includes(env.QLOO_BASE_URL)), defaultMode: 'demo', maxSeeds: 5 }));
  app.get('/api/search', async (req, res, next) => {
    const context = requestContext(req, res);
    try {
      const input = z.object({ q: z.string().max(120), type: z.enum(['movie', 'artist', 'book']), mode: z.enum(['demo', 'live']) }).parse(req.query);
      if (input.mode === 'live' && input.q.trim().length < 2) throw new ServiceError('INVALID_INPUT', 'Enter at least two characters for live search.', 400);
      const entities = await providerFor(input.mode).search(input.q.trim(), input.type, { signal: context.signal });
      res.json({ mode: input.mode, source: input.mode === 'demo' ? 'curated-demo' : 'qloo-live', entities });
    } catch (error) { next(error); } finally { context.cleanup(); }
  });
  app.post('/api/plan', async (req, res, next) => {
    const context = requestContext(req, res);
    try { const input = planSchema.parse(req.body); res.json(await planners[input.mode](input, context.signal)); } catch (error) { next(context.signal.aborted ? new ServiceError('REQUEST_ABORTED', 'The request was cancelled or exceeded its time limit.', 408) : error); } finally { context.cleanup(); }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } }));
  if (env.NODE_ENV === 'production') {
    const dist = resolve(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: { code: 'INVALID_INPUT', message: error.issues.map(i => i.message).join('; ') } }); return; }
    if (error instanceof ServiceError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    const parserError = error as { type?: string };
    if (parserError.type === 'entity.too.large') { res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request is too large.' } }); return; }
    if (parserError.type === 'entity.parse.failed') { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }); return; }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed. Please try again.' } });
  });
  return app;
}
