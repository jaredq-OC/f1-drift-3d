import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshot-debug.png');

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
});

await page.goto('http://localhost:5177/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000); // Let scene render

// Try toDataURL approach
const dataUrl = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'no canvas' };
  try {
    const url = canvas.toDataURL('image/png');
    return { success: true, url, width: canvas.width, height: canvas.height };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('toDataURL result:', JSON.stringify(dataUrl, null, 2));

// Also check readPixels
const pixels = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'no canvas' };
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'no webgl context' };
    const buf = new Uint8Array(4);
    gl.readPixels(canvas.width/2, canvas.height/2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return { centerPixel: Array.from(buf), width: canvas.width, height: canvas.height };
  } catch(e) {
    return { error: e.message };
  }
});
console.log('readPixels result:', JSON.stringify(pixels, null, 2));

// Check if app is accessible
const appExists = await page.evaluate(() => !!(window as any).__f1app);
console.log('App accessible:', appExists);

// Try screenshot
const ssPath = path.join(__dirname, 'screenshot-debug.png');
await page.screenshot({ path: ssPath, fullPage: false });
console.log('Screenshot saved to', ssPath);

if (errors.length > 0) {
  errors.forEach(e => console.log(e));
} else {
  console.log('No errors');
}

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
