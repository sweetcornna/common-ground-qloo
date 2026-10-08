// Opt-in only. This calls a keyed LOCAL server; it never reads a Qloo credential.
// Minimum Qloo consumption: 3 searches + 2 six-call plans = 15 upstream attempts.
const base = process.env.APP_URL || 'http://127.0.0.1:3001';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
async function request(path, body) {
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET', headers: body ? {'Content-Type':'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Local API returned HTTP ${res.status}; use the app's safe error message to diagnose. No upstream response was printed.`);
  return res.json();
}
function verifyPlan(plan, input) {
  if (plan.source !== 'qloo-live' || plan.mode !== 'live' || !Array.isArray(plan.steps) || plan.steps.length !== 3) throw new Error('Expected three live categories. Try other confirmed seed entities if a category is empty.');
  const ids = new Set();const types = new Set();const forbidden = new Set([...input.excludeIds, ...input.profiles.flatMap(p => p.seeds.map(s=>s.id))]);
  for (const step of plan.steps) {
    if (!uuid.test(step.entity.id) || forbidden.has(step.entity.id) || ids.has(step.entity.id)) throw new Error('Live plan identity or exclusion invariant failed.');
    if (!['movie','artist','book'].includes(step.entity.type) || !Number.isInteger(step.minutes) || step.minutes <= 0) throw new Error('Live plan category/time invariant failed.');
    ids.add(step.entity.id);types.add(step.entity.type);
    for (const candidate of step.alternatives ?? []) if (!uuid.test(candidate.id) || forbidden.has(candidate.id)) throw new Error('An alternative violated identity/exclusion constraints.');
  }
  if (types.size !== 3 || plan.totalMinutes !== input.minutes || plan.steps.reduce((sum,s)=>sum+s.minutes,0)!==input.minutes) throw new Error('Category coverage or exact sampling budget failed.');
  if (!Array.isArray(plan.trace) || !plan.trace.some(item=>item.node==='verify')) throw new Error('Live workflow verification trace is missing.');
}
async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('APP_URL must be a local server origin. Remote checks require separate review.');
  const config = await request('/api/config');
  if (!config.liveAvailable) throw new Error('Live configuration absent. Set the Qloo key in your local server environment and restart.');
  const searches = [];
  for (const [q,type] of [['Spirited Away','movie'],['Radiohead','artist'],['Piranesi','book']]) {
    const result = await request(`/api/search?mode=live&type=${type}&q=${encodeURIComponent(q)}`);
    if (result.source !== 'qloo-live' || result.mode !== 'live' || !Array.isArray(result.entities)) throw new Error('Live search provenance/shape failed.');
    const matches=result.entities.filter(e=>e.type===type && uuid.test(e.id) && normalize(e.name)===normalize(q));
    if (matches.length!==1) throw new Error(`Search for ${q} did not yield one unambiguous exact title match. Confirm entities in the UI; this smoke test will not guess.`);
    searches.push(matches[0]);
  }
  const input={mode:'live',profiles:[{seeds:[searches[0],searches[2]]},{seeds:[searches[1]]}],minutes:60,focus:'balanced',excludeIds:[]};
  const plan=await request('/api/plan',input);verifyPlan(plan,input);
  const revisedInput={...input,focus:'adventurous',excludeIds:[plan.steps[0].entity.id]};
  verifyPlan(await request('/api/plan',revisedInput),revisedInput);
  console.log('PASS: exact-match movie/artist/book search; mixed-domain seeds; three-category live plan; source, identity and time invariants; excluded-pick replan with alternate policy.');
  console.log('This verifies API operation only, not recommendation quality, ownership or event eligibility.');
}
main().catch(error=>{console.error(error instanceof Error ? error.message : 'Live smoke test failed.');process.exitCode=1;});
