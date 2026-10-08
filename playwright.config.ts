import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests', testMatch:'app.spec.ts', timeout:30_000, fullyParallel:false, workers:1,
  use:{baseURL:'http://127.0.0.1:5173', headless:true, launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}, screenshot:'only-on-failure', trace:'retain-on-failure'},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:false,timeout:30_000,env:{QLOO_API_KEY:'',QLOO_BASE_URL:'https://api.qloo.com'}},
  reporter:[['list'],['html',{open:'never'}]],
});
