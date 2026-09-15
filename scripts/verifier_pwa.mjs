/** Verifie l'installabilite (manifeste, icones, balises iOS, service
 *  worker) et le renommage de la section Personnaliser. */
import { chromium, devices } from 'playwright';
const BASE = process.env.URL_TEST || 'http://localhost:5987';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], hasTouch: true, isMobile: true, serviceWorkers: 'allow' });
const page = await ctx.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });

console.log('=== Manifeste ===');
const lienManifeste = await page.getAttribute('link[rel="manifest"]', 'href');
console.log('  <link rel=manifest> :', lienManifeste || 'ABSENT');
const m = await (await page.request.get(BASE + lienManifeste)).json();
for (const c of ['name','short_name','start_url','scope','display','theme_color','background_color','orientation']) {
  console.log(`  ${c.padEnd(18)} ${JSON.stringify(m[c])}`);
}
console.log(`  icons              ${m.icons.length} (${m.icons.map(i=>i.sizes+'/'+i.purpose).join(', ')})`);
console.log(`  raccourcis         ${(m.shortcuts||[]).length}`);

console.log('\n=== Icones reellement servies ===');
for (const i of m.icons) {
  const r = await page.request.get(BASE + i.src);
  console.log(`  ${String(r.status()).padEnd(4)} ${i.src.padEnd(34)} ${(Number(r.headers()['content-length'])/1024).toFixed(1)} Ko  ${r.headers()['content-type']}`);
}
for (const s of ['/icones/apple-touch-icon.png','/icones/apple-touch-icon-167.png','/icones/apple-touch-icon-152.png','/favicon.svg','/sw.js']) {
  const r = await page.request.get(BASE + s);
  console.log(`  ${String(r.status()).padEnd(4)} ${s}`);
}

console.log('\n=== Balises iOS (sans lesquelles le manifeste ne suffit pas) ===');
for (const [sel, attr, nom] of [
  ['meta[name="apple-mobile-web-app-capable"]','content','apple-mobile-web-app-capable'],
  ['meta[name="mobile-web-app-capable"]','content','mobile-web-app-capable'],
  ['meta[name="apple-mobile-web-app-status-bar-style"]','content','status-bar-style'],
  ['meta[name="apple-mobile-web-app-title"]','content','app-title'],
  ['meta[name="theme-color"]','content','theme-color'],
  ['meta[name="viewport"]','content','viewport'],
  ['link[rel="apple-touch-icon"]','href','apple-touch-icon'],
]) {
  let v = null; try { v = await page.getAttribute(sel, attr); } catch {}
  console.log(`  ${v ? 'OK ' : 'ABSENT'} ${nom.padEnd(32)} ${v ?? ''}`);
}

console.log('\n=== Service worker ===');
await page.waitForTimeout(2500);
const sw = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return { dispo: false };
  const regs = await navigator.serviceWorker.getRegistrations();
  return { dispo: true, nombre: regs.length, portee: regs[0]?.scope ?? null, actif: Boolean(regs[0]?.active) };
});
console.log('  ', JSON.stringify(sw));

console.log('\n=== Mode application installee (standalone) ===');
const st = await page.evaluate(() => ({
  standaloneSupporte: typeof window.matchMedia === 'function',
  enNavigateur: matchMedia('(display-mode: browser)').matches,
}));
console.log('  ', JSON.stringify(st), ' (en navigateur ici, c est attendu)');

console.log('\n=== Chantier 4 : renommage ===');
await page.goto(BASE + '/personnaliser', { waitUntil: 'networkidle' });
console.log('  titre onglet      :', await page.title());
console.log('  titre page        :', (await page.locator('h1.titre-ecran').innerText()).trim());
console.log('  phrase explicative:', (await page.locator('.ecran-admin .sous-titre').innerText()).trim().replace(/\s+/g,' ').slice(0,120));
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.locator('.nav-burger').click();
const liens = await page.locator('.nav-mobile .nav-link').allInnerTexts();
console.log('  menu              :', liens.map(t=>t.trim()).join(' | '));
console.log('  mot "Admin" encore present dans le menu :', liens.some(t => /admin/i.test(t)));

console.log('\n=== Ancien lien /admin ===');
await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
console.log('  /admin redirige vers :', new URL(page.url()).pathname);

await b.close();
