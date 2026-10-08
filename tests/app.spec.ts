import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
test('demo session, seed search, feedback, evidence, export and reset',async({page})=>{
  const browserErrors:string[]=[];page.on('pageerror',error=>browserErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Offline demo',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Live Qloo/})).toBeDisabled();
  await page.getByRole('textbox',{name:'Find a favorite movie for person A'}).fill('Perfect');
  await page.getByRole('button',{name:/Perfect Days/}).click();
  await expect(page.getByRole('button',{name:'Remove Perfect Days from person A'})).toBeVisible();
  await page.getByRole('button',{name:/^30 min$/}).click();
  await page.getByRole('button',{name:'Build our session'}).click();
  await expect(page.getByRole('heading',{name:'A small departure from the usual.'})).toBeVisible();
  await expect(page.getByText('30 minutes · 3 cultural stops · Scripted demo results')).toBeVisible();
  const firstTitle=await page.locator('.plan-card h3').first().innerText();
  await page.getByRole('button',{name:'Not for us. Find another'}).first().click();
  await expect(page.locator('.plan-card h3').first()).not.toHaveText(firstTitle);
  await page.getByRole('button',{name:'View agent steps'}).click();
  await expect(page.locator('#agent-trace li')).toHaveCount(4);
  await page.locator('.alternatives summary').first().click();
  await expect(page.locator('.alternatives').first().locator('.alternative')).toHaveCount(3);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export session and provenance as JSON'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('common-ground-demo.json');
  const file=await download.path();expect(file).toBeTruthy();const data=JSON.parse(await readFile(file!,'utf8'));
  expect(data.plan.source).toBe('curated-demo');expect(data.plan.totalMinutes).toBe(30);expect(data.request.excludeIds).toHaveLength(1);
  await mkdir('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/desktop-session.png',fullPage:true});
  await page.getByRole('textbox',{name:'Find a favorite movie for person A'}).fill('Perfect');
  await page.getByRole('button',{name:'Start fresh'}).click();
  await expect(page.getByRole('textbox',{name:'Find a favorite movie for person A'})).toHaveValue('');
  await expect(page.getByRole('heading',{name:'A small departure from the usual.'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Remove Perfect Days from person A'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/^60 min$/})).toHaveAttribute('aria-pressed','true');expect(browserErrors).toEqual([]);
});
test('mobile session has no horizontal overflow at 375px',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/');
  await page.getByRole('button',{name:'Build our session'}).click();
  await expect(page.locator('.plan-card')).toHaveCount(3);
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  await mkdir('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/mobile-session.png',fullPage:true});
});
test('mode switch clears demo seeds and live search errors are actionable (config mocked)',async({page})=>{
  await page.route('**/api/config',route=>route.fulfill({json:{liveAvailable:true,defaultMode:'demo',maxSeeds:5}}));
  await page.goto('/');await page.getByRole('button',{name:/Live Qloo/}).click();
  await expect(page.getByText('Live Qloo mode',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Remove .* from person/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Build our session'})).toBeDisabled();
  await page.getByRole('textbox',{name:'Find a favorite movie for person A'}).fill('Amelie');
  await expect(page.getByRole('alert')).toContainText('server-side QLOO_API_KEY');
  await page.getByRole('button',{name:'Demo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Remove Amélie from person A'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Build our session'})).toBeEnabled();
});

test('failed configuration can be retried without losing defaults', async ({page}) => {
  let healthy=false;
  await page.route('**/api/config',route=>healthy?route.fulfill({json:{liveAvailable:false,defaultMode:'demo',maxSeeds:5}}):route.fulfill({status:503,json:{error:{code:'TEST_FAILURE',message:'Temporary local test failure'}}}));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Temporary local test failure');
  await expect(page.getByRole('button',{name:'Build our session'})).toBeDisabled();
  healthy=true;await page.getByRole('button',{name:'Retry connection'}).click();
  await expect(page.getByRole('button',{name:'Build our session'})).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Remove Amélie from person A'})).toBeVisible();
});

test('cancelled stale plan cannot overwrite a later successful plan', async ({page}) => {
  const fixture=JSON.parse(await readFile('docs/examples/demo-response.json','utf8'));
  await page.addInitScript(() => {
    const originalFetch=window.fetch.bind(window);
    let count=0;
    window.fetch=(input,init)=>{
      if(String(input)==='/api/plan' && ++count===1){
        return new Promise<Response>(resolve=>{
          (window as unknown as {resolveOld:(body:unknown)=>void}).resolveOld=(body)=>resolve(new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}}));
        });
      }
      return originalFetch(input,init);
    };
  });
  await page.goto('/');await page.getByRole('button',{name:'Build our session'}).click();
  await page.getByRole('button',{name:'Cancel planning'}).click();
  await expect(page.getByRole('status')).toContainText(/cancelled/i);
  await expect(page.getByRole('button',{name:'Build our session'})).toBeEnabled();
  await page.getByRole('button',{name:/^30 min$/}).click();
  await page.getByRole('button',{name:'Build our session'}).click();
  await expect(page.getByText('30 minutes · 3 cultural stops · Scripted demo results')).toBeVisible();
  await page.evaluate(body=>(window as unknown as {resolveOld:(body:unknown)=>void}).resolveOld(body),fixture);
  await expect(page.getByText('30 minutes · 3 cultural stops · Scripted demo results')).toBeVisible();
  await expect(page.locator('#results-title')).toBeFocused();
});

test('planning timeout unlocks controls and communicates a retry path', async ({page}) => {
  await page.clock.install();
  await page.route('**/api/plan',()=>{});
  await page.goto('/');await page.getByRole('button',{name:'Build our session'}).click();
  await expect(page.getByRole('button',{name:'Cancel planning'})).toBeVisible();
  await page.clock.fastForward(51_000);
  await expect(page.getByRole('alert')).toContainText(/timed out/i);
  await expect(page.getByRole('button',{name:'Build our session'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Start fresh'})).toBeEnabled();
});

test('exhaustion error preserves a plan and clearing skips recovers', async ({page}) => {
  let fail=false;
  await page.route('**/api/plan',route=>fail?route.fulfill({status:422,json:{error:{code:'NO_CANDIDATES',message:'No new candidates remain. Try different seeds or clear skipped suggestions.'}}}):route.continue());
  await page.goto('/');await page.getByRole('button',{name:'Build our session'}).click();
  await expect(page.locator('.plan-card')).toHaveCount(3);
  await page.getByRole('button',{name:'Not for us. Find another'}).first().click();
  await expect(page.getByRole('button',{name:'Reconsider skipped picks'})).toBeVisible();
  const titles=await page.locator('.plan-card h3').allTextContents();fail=true;
  await page.getByRole('button',{name:'Not for us. Find another'}).first().click();
  await expect(page.getByRole('alert')).toContainText('No new candidates');
  await expect(page.locator('.plan-card h3')).toHaveText(titles);fail=false;
  await page.getByRole('button',{name:'Reconsider skipped picks'}).click();
  await expect(page.getByRole('button',{name:'Reconsider skipped picks'})).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('supplied recommendation disambiguation survives display and text export', async ({page}) => {
  const fixture=JSON.parse(await readFile('docs/examples/demo-response.json','utf8'));
  fixture.steps[2].entity.name='Dune';fixture.steps[2].entity.disambiguation='Frank Herbert · 1965';
  fixture.steps[2].alternatives[0].name='Dune';fixture.steps[2].alternatives[0].disambiguation='Different author · 2001';
  await page.route('**/api/plan',route=>route.fulfill({json:fixture}));
  await page.goto('/');await page.getByRole('button',{name:'Build our session'}).click();
  await expect(page.getByText('Frank Herbert · 1965',{exact:true})).toBeVisible();
  await page.locator('.plan-card').last().locator('summary').click();
  await expect(page.getByText('Different author · 2001',{exact:true})).toBeVisible();
  const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Save session'}).click();const download=await promise;
  expect(await readFile((await download.path())!,'utf8')).toContain('Frank Herbert · 1965');
});

test('keyboard results focus, responsive layout and automated accessibility scans', async ({page}) => {
  const {default:AxeBuilder}=await import('@axe-core/playwright');
  await page.goto('/');
  const start=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(start.violations).toEqual([]);
  await page.getByRole('button',{name:'Build our session'}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('#results-title')).toBeFocused();
  await page.locator('.alternatives summary').first().click();
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(results.violations).toEqual([]);
  await page.setViewportSize({width:320,height:812});
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  const mobile=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(mobile.violations).toEqual([]);
});

test('empty search and delayed stale responses recover to the current query', async ({page}) => {
  let slowRoute: import('@playwright/test').Route | undefined;
  await page.route('**/api/search?**',async route=>{
    const query=new URL(route.request().url()).searchParams.get('q');
    if(query==='slow'){slowRoute=route;return;}
    await route.fulfill({json:{mode:'demo',source:'curated-demo',entities:query==='nothing'?[]:[{id:'movie-current',name:'Current result',type:'movie'}]}});
  });
  await page.goto('/');const search=page.getByRole('textbox',{name:'Find a favorite movie for person A'});
  await search.fill('slow');await expect.poll(()=>Boolean(slowRoute)).toBe(true);
  await search.fill('nothing');await expect(page.getByText(/No matches/)).toBeVisible();
  await search.fill('current');await expect(page.getByRole('button',{name:/Current result/})).toBeVisible();
  await slowRoute!.fulfill({json:{mode:'demo',source:'curated-demo',entities:[{id:'movie-stale',name:'Stale result',type:'movie'}]}}).catch(()=>{});
  await expect(page.getByRole('button',{name:/Stale result/})).toHaveCount(0);
  await page.getByRole('button',{name:/Current result/}).click();
  await expect(page.getByRole('button',{name:'Remove Current result from person A'})).toBeVisible();
});
