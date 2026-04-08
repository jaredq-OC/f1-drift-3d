const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const canvas = await page.$('canvas');
    const hasCanvas = canvas !== null;
    
    const trackBtns = await page.$$('.track-btn');
    const hasTrackButtons = trackBtns.length >= 3;
    
    console.log('RESULT: OK');
    console.log('HAS_CANVAS:', hasCanvas);
    console.log('HAS_TRACK_BUTTONS:', hasTrackButtons, 'count=' + trackBtns.length);
    console.log('ERROR_COUNT:', errors.length);
    if (errors.length > 0) {
      console.log('ERRORS:');
      errors.forEach(e => console.log(' -', e));
    }
  } catch (e) {
    console.log('RESULT: FAIL');
    console.log('ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
