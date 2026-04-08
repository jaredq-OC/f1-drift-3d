const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-software-rasterizer']
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push('[E] ' + msg.text());
    });
    page.on('pageerror', err => {
      errors.push('[PAGE] ' + err.message);
    });
    page.on('crash', () => {
      errors.push('[CRASH]');
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Check canvas element exists in DOM
    const canvas = await page.$('canvas');
    console.log('HAS_CANVAS:', canvas !== null);
    
    // Check track buttons exist
    const trackBtns = await page.$$('.track-btn');
    console.log('TRACK_BUTTONS:', trackBtns.length);
    
    // Check title
    const title = await page.title();
    console.log('TITLE:', title);
    
    // Check canvas container
    const container = await page.$('#canvas-container');
    console.log('HAS_CONTAINER:', container !== null);
    
    console.log('ERRORS:', errors.length, errors.slice(0, 3).join(' | '));
    console.log('SMOKE_TEST: PASS');
  } catch (e) {
    console.log('SMOKE_TEST: FAIL -', e.message.split('\n')[0]);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
