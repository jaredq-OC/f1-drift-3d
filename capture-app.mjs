import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREEN_DIR = path.join(__dirname, 'active', 'screenshots', 'smoke');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
});

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(1500);

const p1 = path.join(SCREEN_DIR, '01-launch.png');
await page.screenshot({ path: p1, fullPage: false });
console.log('01-launch.png saved');

const title = await page.title();
console.log('Title:', title);

const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
console.log('Canvas:', hasCanvas);

if (errors.length > 0) {
  errors.forEach(e => console.log(e));
} else {
  console.log('No errors');
}

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);