import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createQlooProvider, demoEntities, demoProvider, parseEntities } from '../server/provider.js';
import { createApp, planSchema } from '../server/app.js';
import { createPlanner } from '../server/agent.js';
import { Governor } from '../server/governor.js';
import type { PlanRequest } from '../src/shared.js';
const empty = () => new Response(JSON.stringify({results:{entities:[]}}));
const tick = () => new Promise(resolve=>setTimeout(resolve,5));
const input = ():PlanRequest => ({mode:'demo',profiles:[{seeds:[demoEntities[0]]},{seeds:[demoEntities[1]]}],minutes:60,focus:'balanced',excludeIds:[]});
describe('shared upstream guardrails',()=>{
  it('holds global concurrency at two across independent searches, and caps the pending queue',async()=>{
    let active=0, maximum=0; const releases:Array<()=>void>=[];
    const fetcher=vi.fn(async()=>{active++;maximum=Math.max(maximum,active);await new Promise<void>(resolve=>releases.push(resolve));active--;return empty();});
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch});
    const calls=Array.from({length:18},()=>provider.search('hello','book'));
    await expect(provider.search('overflow','book')).rejects.toMatchObject({code:'UPSTREAM_BUSY'});
    for(let n=0;n<9;n++){await tick();releases.splice(0).forEach(r=>r());}
    await Promise.all(calls);expect(maximum).toBe(2);expect(fetcher).toHaveBeenCalledTimes(18);
  });
  it('counts retries against an operator budget',async()=>{
    const fetcher=vi.fn(async()=>new Response('{}',{status:500}));
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch,maxCallsPerMinute:1,retryDelayMs:0});
    await expect(provider.search('hello','book')).rejects.toMatchObject({code:'APP_CALL_LIMIT'});expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not shorten Retry-After and prevents further fetches during shared cooldown',async()=>{
    const fetcher=vi.fn(async()=>new Response('{}',{status:429,headers:{'Retry-After':'60'}}));
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch,retryDelayMs:0});
    await expect(provider.search('hello','book')).rejects.toMatchObject({code:'QLOO_RATE_LIMIT'});
    await expect(provider.search('again','book')).rejects.toMatchObject({code:'QLOO_RATE_LIMIT'});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('cancels queued and active work without retries',async()=>{
    const signals:AbortSignal[]=[];
    const fetcher=vi.fn(async(_url:unknown,options?:RequestInit)=>{const signal=options!.signal!;signals.push(signal);await new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));return empty();});
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch});
    const controller=new AbortController();
    const result=Promise.allSettled(Array.from({length:3},()=>provider.search('hello','book',{signal:controller.signal})));
    await tick();controller.abort();const settled=await result;
    expect(settled.every(r=>r.status==='rejected')).toBe(true);expect(fetcher).toHaveBeenCalledTimes(2);expect(signals.every(s=>s.aborted)).toBe(true);
  });
  it('propagates planner abort into providers and stops later category calls',async()=>{
    const calls:AbortSignal[]=[];
    const planner=createPlanner({search:async()=>[],recommend:async(_s,_t,options)=>{const signal=options!.signal!;calls.push(signal);await new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));return [];}});
    const controller=new AbortController();const promise=planner(input(),controller.signal);const observed=expect(promise).rejects.toBeDefined();
    await tick();controller.abort();await observed;expect(calls).toHaveLength(2);expect(calls.every(s=>s.aborted)).toBe(true);
  });
});
describe('normalized feedback and strict live responses',()=>{
  it('deduplicates seeds and exclusions; rejects conflicting categories and six distinct seeds',async()=>{
    const repeated=input();repeated.profiles[0].seeds=[...repeated.profiles[0].seeds,{...demoEntities[0],id:demoEntities[0].id.toUpperCase()}];repeated.excludeIds=['X','x'];
    const normalized=planSchema.parse(repeated);expect(normalized.profiles[0].seeds).toHaveLength(1);expect(normalized.excludeIds).toEqual(['x']);
    expect((await createPlanner(demoProvider)(normalized)).steps).toEqual((await createPlanner(demoProvider)(planSchema.parse({...input(),excludeIds:['x']}))).steps);
    const conflict=input();conflict.profiles[1].seeds=[{...demoEntities[0],type:'book'}];expect(()=>planSchema.parse(conflict)).toThrow(/conflicting/);
    const tooMany=input();tooMany.profiles[0].seeds=demoEntities.slice(0,6);expect(()=>planSchema.parse(tooMany)).toThrow(/five distinct/);
  });
  it('passes both profiles and feedback to upstream exclusion filtering',async()=>{
    const fetcher=vi.fn(async()=>empty());const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch});
    const value=input();value.excludeIds=['rejected'];await expect(createPlanner(provider)(value)).rejects.toMatchObject({code:'NO_CANDIDATES'});
    expect(fetcher).toHaveBeenCalledTimes(6);
    for(const [url] of fetcher.mock.calls as unknown as [URL][]) expect(url.searchParams.get('filter.exclude.entities')?.split(',').sort()).toEqual(['rejected',...value.profiles.flatMap(p=>p.seeds.map(s=>s.id))].sort());
  });
  it('rejects live records that cannot round-trip through plan validation',()=>{
    for(const bad of [{entity_id:'not-uuid',name:'Book',type:'urn:entity:book'},{entity_id:'123e4567-e89b-42d3-a456-426614174000',name:'Book'},{entity_id:'123e4567-e89b-42d3-a456-426614174000',name:'x'.repeat(251),type:'urn:entity:book'}]) expect(()=>parseEntities({results:[bad]},'book',true)).toThrow(/malformed/);
  });
  it('prevents HTTP caching of API search results',async()=>{
    const result=await request(createApp({})).get('/api/search').query({mode:'demo',type:'book',q:'Prince'});expect(result.headers['cache-control']).toBe('no-store');
  });
  it('rejects invalid operator configs before serving',()=>{
    for(const limit of ['0','NaN','2.5',''])expect(()=>createApp({QLOO_MAX_CALLS_PER_MINUTE:limit})).toThrow(/integer/);
    expect(()=>createApp({REQUEST_TIMEOUT_MS:'bogus'})).toThrow(/integer/);
    expect(()=>new Governor(0)).toThrow(/integer/);
  });
  it('aborts the in-flight API plan when its client disconnects',async()=>{
    const signals:AbortSignal[]=[];
    const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,options)=>{const signal=options!.signal!;signals.push(signal);await new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('abort')),{once:true}));return empty();});
    const server=createApp({QLOO_API_KEY:'test'}).listen(0,'127.0.0.1');
    await new Promise<void>(resolve=>server.once('listening',resolve));
    try {
      const value=input();value.mode='live';value.profiles[0].seeds=[{id:'123e4567-e89b-42d3-a456-426614174000',name:'A',type:'movie'}];value.profiles[1].seeds=[{id:'123e4567-e89b-42d3-a456-426614174001',name:'B',type:'book'}];
      const client=httpRequest({host:'127.0.0.1',port:(server.address() as AddressInfo).port,path:'/api/plan',method:'POST',headers:{'Content-Type':'application/json'} });
      client.on('error',()=>{});client.end(JSON.stringify(value));
      await vi.waitFor(()=>expect(signals).toHaveLength(2));client.destroy();
      await vi.waitFor(()=>expect(signals.every(s=>s.aborted)).toBe(true));expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));fetcher.mockRestore(); }
  });
  it('enforces an API request deadline and aborts upstream fetch',async()=>{
    let signal:AbortSignal|undefined;
    const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,options)=>{signal=options!.signal!;await new Promise((_resolve,reject)=>signal!.addEventListener('abort',()=>reject(new Error('abort')),{once:true}));return empty();});
    try{const result=await request(createApp({QLOO_API_KEY:'test',REQUEST_TIMEOUT_MS:'100'})).get('/api/search').query({mode:'live',type:'book',q:'hello'});expect(result.status).toBe(408);expect(signal?.aborted).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1);}finally{fetcher.mockRestore();}
  });
});

describe('upstream response resource limits',()=>{
  it.each([401,404,429,500])('cancels unread HTTP %s bodies before releasing resources',async status=>{
    let cancellations=0;
    const fetcher=vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({cancel(){cancellations++;}}),{status}));
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch,retryDelayMs:0});
    if(status===404)expect(await provider.search('hello','book')).toEqual([]);
    else await expect(provider.search('hello','book')).rejects.toBeDefined();
    expect(cancellations).toBe(fetcher.mock.calls.length);
  });
  it('rejects oversized successful streams, cancels them, and releases both occupied slots',async()=>{
    let cancellations=0;
    const fetcher=vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(2*1024*1024+1));},cancel(){cancellations++;}})));
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch});
    const results=await Promise.allSettled(Array.from({length:3},()=>provider.search('hello','book')));
    expect(results.every(result=>result.status==='rejected' && result.reason.code==='QLOO_RESPONSE')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);expect(cancellations).toBe(3);
  });
  it('cancels a stalled successful response body when the request aborts',async()=>{
    let cancellations=0;
    const fetcher=vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({cancel(){cancellations++;}})));
    const provider=createQlooProvider({key:'test',fetcher:fetcher as typeof fetch});const controller=new AbortController();
    const promise=provider.search('hello','book',{signal:controller.signal});const observed=expect(promise).rejects.toMatchObject({code:'REQUEST_ABORTED'});
    await tick();controller.abort();await observed;expect(cancellations).toBe(1);expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
