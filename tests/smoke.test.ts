// The live-smoke runner is tested against a local synthetic HTTP server.
// These tests do NOT establish any real Qloo integration.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { afterEach, expect, it } from 'vitest';
const execute = promisify(execFile);
const servers: ReturnType<typeof createServer>[] = [];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));});
const id = (n:number) => `123e4567-e89b-42d3-a456-${String(n).padStart(12,'0')}`;
async function fixture(ambiguous=false, leakyExclusion=false) {
 let plans=0;
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');const url=new URL(req.url!,'http://127.0.0.1');
  if(url.pathname==='/api/config')return res.end(JSON.stringify({liveAvailable:true}));
  if(url.pathname==='/api/search'){
   const type=url.searchParams.get('type')!;
   const e={id:id(['movie','artist','book'].indexOf(type)+1),name:url.searchParams.get('q'),type};
   return res.end(JSON.stringify({mode:'live',source:'qloo-live',entities:ambiguous?[e,{...e,id:id(99)}]:[e]}));
  }
  plans++;let body='';for await(const c of req)body+=c;const input=JSON.parse(body);
  const steps=['artist','movie','book'].map((type,i)=>({entity:{id:id(100+i+(plans===2&&!leakyExclusion?10:0)),type,name:'synthetic'},minutes:20,alternatives:[]}));
  res.end(JSON.stringify({mode:'live',source:'qloo-live',steps,totalMinutes:input.minutes,trace:[{node:'verify'}]}));
 });
 servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const address=server.address();if(!address||typeof address==='string')throw Error('No fixture address');
 return {APP_URL:`http://127.0.0.1:${address.port}`};
}
it('live smoke validates its complete contract against synthetic local transport',async()=>{
 const result=await execute(process.execPath,['scripts/live-smoke.mjs'],{env:await fixture()});
 expect(result.stdout).toContain('PASS:');expect(result.stdout).toContain('not recommendation quality');
});
it('live smoke refuses ambiguous entity matches instead of choosing the first',async()=>{
 await expect(execute(process.execPath,['scripts/live-smoke.mjs'],{env:await fixture(true)})).rejects.toMatchObject({code:1,stderr:expect.stringContaining('will not guess')});
});
it('live smoke fails when a rejected entity survives replanning',async()=>{
 await expect(execute(process.execPath,['scripts/live-smoke.mjs'],{env:await fixture(false,true)})).rejects.toMatchObject({code:1,stderr:expect.stringContaining('exclusion invariant')});
});
it('live smoke refuses a non-local origin before making requests',async()=>{
 await expect(execute(process.execPath,['scripts/live-smoke.mjs'],{env:{APP_URL:'https://example.com'}})).rejects.toMatchObject({code:1,stderr:expect.stringContaining('local server origin')});
});
