import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { createPlanner, rankCandidates } from '../server/agent.js';
import { createQlooProvider, demoEntities, demoProvider, parseEntities, type Provider } from '../server/provider.js';
import type { Entity, PlanRequest } from '../src/shared.js';
const input = (): PlanRequest => ({ mode:'demo', profiles:[{seeds:[demoEntities[0]]},{seeds:[demoEntities[2]]}], minutes:60, focus:'balanced', excludeIds:[] });
const entity = (id:string): Entity => ({id,name:id,type:'artist'});
describe('independent planner behavior', () => {
  it.each([30,60,90] as const)('produces exactly %s sampling minutes, distinct unseeded picks, provenance and full trace', async minutes => {
    const body={...input(),minutes}; const plan=await createPlanner(demoProvider)(body);
    expect(plan.source).toBe('curated-demo'); expect(plan.warnings.join(' ')).toMatch(/synthetic/);
    expect(plan.steps.reduce((n,s)=>n+s.minutes,0)).toBe(minutes);
    expect(new Set(plan.steps.map(s=>s.entity.id)).size).toBe(plan.steps.length);
    expect(plan.steps.every(s=>!body.profiles.flatMap(p=>p.seeds).some(e=>e.id===s.entity.id))).toBe(true);
    expect(plan.trace.map(t=>t.node)).toEqual(['retrieve','negotiate','compose','verify']);
  });
  it('changes rankings with different profiles and excludes skipped entities from alternatives too', async () => {
    const planner=createPlanner(demoProvider); const first=await planner(input());
    const changed=input(); changed.profiles[0].seeds=[demoEntities[8]];
    const next=await planner(changed);
    expect(next.steps.map(s=>[s.entity.id,s.entity.ranks])).not.toEqual(first.steps.map(s=>[s.entity.id,s.entity.ranks]));
    const rejected=first.steps.map(s=>s.entity.id); const adjusted=await planner({...input(),excludeIds:rejected});
    expect(adjusted.steps.flatMap(s=>[s.entity,...s.alternatives]).some(e=>rejected.includes(e.id))).toBe(false);
  });
  it('prefers shared candidates, marks unknown fit and supports a one-sided fallback warning', async () => {
    const ranked=rankCandidates([[entity('a'),entity('shared')],[entity('b'),entity('shared')]],new Set(),false);
    expect(ranked[0].id).toBe('shared'); expect(ranked.find(c=>c.id==='a')?.reason).toMatch(/unknown/);
    const provider:Provider={search:async()=>[],recommend:async(seeds,type)=>[{id:`${type}-${seeds[0].id}`,name:'fixture',type}]};
    const plan=await createPlanner(provider)(input());
    expect(plan.steps.every(s=>s.entity.ranks.includes(null))).toBe(true);
    expect(plan.warnings.join(' ')).toMatch(/one-sided|shared|overlap/i);
  });
  it('adventurous weighting can surface a one-sided discovery while balanced favors shared support',()=>{
    const a=Array.from({length:10},(_,i)=>entity('a'+i));const b=Array.from({length:10},(_,i)=>entity('b'+i));
    a[8]=entity('shared');b[8]=entity('shared');
    expect(rankCandidates([a,b],new Set(),false)[0].id).toBe('shared');
    expect(rankCandidates([a,b],new Set(),true)[0].id).toBe('a0');
  });
  it('redistributes missing-category time and reports exhaustion', async () => {
    const provider:Provider={search:async()=>[],recommend:async(_seeds,type)=>type==='book'?[{id:'new-book',name:'New',type}]:[]};
    const plan=await createPlanner(provider)(input()); expect(plan.steps).toHaveLength(1); expect(plan.steps[0].minutes).toBe(60);
    expect(plan.warnings.join(' ')).toMatch(/redistributed/);
    await expect(createPlanner({...provider,recommend:async()=>[]})(input())).rejects.toMatchObject({code:'NO_CANDIDATES'});
  });
});
describe('API contract and isolation',()=>{
  it('advertises only safe config and returns explicitly labelled fixture search',async()=>{
    const app=createApp({QLOO_API_KEY:'TEST_ONLY_NOT_A_REAL_SECRET'});
    const config=await request(app).get('/api/config'); expect(config.body).toEqual({liveAvailable:true,defaultMode:'demo',maxSeeds:5});
    expect(JSON.stringify(config.body)).not.toContain('TEST_ONLY');
    const search=await request(app).get('/api/search').query({q:'Am',type:'movie',mode:'demo'});
    expect(search.status).toBe(200);expect(search.body.source).toBe('curated-demo');expect(search.body.entities[0].name).toBe('Amélie');
  });
  it('fails closed without live credentials and never silently serves demo',async()=>{
    const app=createApp({});
    const result=await request(app).get('/api/search').query({q:'Amelie',type:'movie',mode:'live'});
    expect(result.status).toBe(503);expect(result.body.error.code).toBe('LIVE_UNAVAILABLE'); expect(result.body.entities).toBeUndefined();
    const live=input();live.mode='live';live.profiles=[{seeds:[{id:'123e4567-e89b-42d3-a456-426614174000',name:'A',type:'movie'}]},{seeds:[{id:'123e4567-e89b-42d3-a456-426614174001',name:'B',type:'book'}]}];
    const plan=await request(app).post('/api/plan').send(live);expect(plan.status).toBe(503);expect(plan.body.error.code).toBe('LIVE_UNAVAILABLE');
  });
  it('rejects unsupported budgets, missing seeds, extra inputs and demo IDs in live mode',async()=>{
    for(const bad of [{...input(),minutes:120},{...input(),profiles:[{seeds:[]},{seeds:[]}]},{...input(),apiKey:'never accepted'},{...input(),mode:'live'}]){
      const result=await request(createApp({})).post('/api/plan').send(bad);expect(result.status).toBe(400);expect(result.body.error.code).toBe('INVALID_INPUT');
    }
  });
  it('bounds request bodies and limits repeated API calls without upstream traffic',async()=>{
    const oversized=await request(createApp({})).post('/api/plan').send({padding:'a'.repeat(21*1024)});
    expect(oversized.status).toBe(413);expect(oversized.body.error.code).toBe('BODY_TOO_LARGE');
    const app=createApp({});
    for(let i=0;i<45;i++) expect((await request(app).get('/api/config')).status).toBe(200);
    const limited=await request(app).get('/api/config');expect(limited.status).toBe(429);expect(limited.body.error.code).toBe('RATE_LIMIT');
  });
  it('handles invalid JSON and unknown API routes without stack traces',async()=>{
    const result=await request(createApp({})).post('/api/plan').set('Content-Type','application/json').send('{broken');
    expect(result.status).toBe(400);expect(result.body).toEqual({error:{code:'INVALID_JSON',message:'Request body must be valid JSON.'}});
    const missing=await request(createApp({})).get('/api/missing');expect(missing.status).toBe(404);expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});
describe('Qloo transport contract (mocked, not live validation)',()=>{
  it('sends documented entity interests and API header to the approved host',async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({results:{entities:[{entity_id:'123e4567-e89b-42d3-a456-426614174099',name:'Found',type:'urn:entity:book'}]}})));
    const provider=createQlooProvider({key:'test-key',fetcher:fetcher as typeof fetch});
    expect(await provider.recommend([entity('seed-one'),entity('seed-two')],'book')).toEqual([{id:'123e4567-e89b-42d3-a456-426614174099',name:'Found',type:'book'}]);
    const [url,options]=fetcher.mock.calls[0] as unknown as [URL,RequestInit];
    expect(url.origin).toBe('https://api.qloo.com');expect(url.pathname).toBe('/v2/insights');
    expect(url.searchParams.get('signal.interests.entities')).toBe('seed-one,seed-two');expect(url.searchParams.get('filter.type')).toBe('urn:entity:book');
    expect(options.headers).toMatchObject({'X-Api-Key':'test-key'});expect(url.toString()).not.toContain('test-key');expect(options.redirect).toBe('error');
  });
  it('never reflects upstream bodies and retries transient failures only once',async()=>{
    const fetcher=vi.fn(async()=>new Response('secret upstream stack',{status:500}));
    await expect(createQlooProvider({key:'test-key',fetcher:fetcher as typeof fetch,retryDelayMs:0}).search('hello','movie')).rejects.toMatchObject({code:'QLOO_UPSTREAM',message:'Qloo could not complete this request. Check API access and retry.'});
    expect(fetcher).toHaveBeenCalledTimes(2);
    const denied=vi.fn(async()=>new Response('sensitive credential detail',{status:401}));
    await expect(createQlooProvider({key:'test-key',fetcher:denied as typeof fetch}).search('hello','movie')).rejects.toMatchObject({code:'QLOO_AUTH'});expect(denied).toHaveBeenCalledTimes(1);
  });
  it('distinguishes no search results, rate limits, malformed JSON, and network failures',async()=>{
    const notFound=vi.fn(async()=>new Response('{}',{status:404}));
    const provider=createQlooProvider({key:'test-key',fetcher:notFound as typeof fetch});
    expect(await provider.search('unknown','book')).toEqual([]);
    await expect(provider.recommend([entity('seed')],'book')).rejects.toMatchObject({code:'QLOO_UPSTREAM'});
    await expect(createQlooProvider({key:'test-key',fetcher:vi.fn(async()=>new Response('{}',{status:429})) as typeof fetch,retryDelayMs:0}).search('hello','book')).rejects.toMatchObject({code:'QLOO_RATE_LIMIT',status:429});
    await expect(createQlooProvider({key:'test-key',fetcher:vi.fn(async()=>new Response('not JSON')) as typeof fetch}).search('hello','book')).rejects.toMatchObject({code:'QLOO_RESPONSE'});
    const offline=vi.fn(async()=>{throw new Error('private network detail')});
    await expect(createQlooProvider({key:'test-key',fetcher:offline as typeof fetch,retryDelayMs:0}).search('hello','book')).rejects.toMatchObject({code:'QLOO_NETWORK'});expect(offline).toHaveBeenCalledTimes(2);
  });
  it('accepts Qloo generic entity/subtype responses and preserves disambiguation',()=>{
    expect(parseEntities({results:[{entity_id:'ABC',name:'Dune',type:'urn:entity',subtype:'urn:entity:book',disambiguation:'Frank Herbert'}]},'book')).toEqual([{id:'abc',name:'Dune',type:'book',disambiguation:'Frank Herbert'}]);
    expect(()=>parseEntities({success:false,results:[]},'book')).toThrow(/unsuccessful/);
  });
  it('rejects unapproved hosts and malformed response; filters wrong types and duplicates',()=>{
    expect(()=>createQlooProvider({baseUrl:'http://localhost'})).toThrow(/approved/);
    expect(()=>parseEntities({unexpected:[]},'book')).toThrow(/unexpected/);
    expect(parseEntities({results:[{id:'b',name:'Book',type:'book'},{id:'b',name:'Duplicate'},{id:'m',name:'Movie',type:'movie'},null]},'book')).toEqual([{id:'b',name:'Book',type:'book'}]);
  });
});
