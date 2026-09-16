/** Verifie qu'aucune commande ne reste prisonniere sous le badge Netlify. */
import { chromium } from 'playwright';
const BASE = process.env.URL_TEST || 'https://babi-games.netlify.app';
const b = await chromium.launch();
const p0 = await b.newPage({ viewport: { width: 375, height: 667 } });
await p0.goto(BASE, { waitUntil: 'networkidle' });
await p0.waitForTimeout(700);
const zone = await p0.evaluate(() => {
  const f = document.querySelector('iframe#nl-badge-frame');
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
});
await p0.close();
console.log('  badge Netlify :', zone ? `${Math.round(zone.x2-zone.x1)}x${Math.round(zone.y2-zone.y1)} px a (${Math.round(zone.x1)},${Math.round(zone.y1)})` : 'absent');
if (!zone) { await b.close(); process.exit(0); }

for (const [nom, url, prep] of [
  ['Juste Prix', '/juste-prix', async (p) => { await p.getByRole('button', { name: /C'est parti/i }).click(); await p.waitForSelector('.prix-carte'); }],
  ['Tier List', '/tier-list', null],
  ['Versus', '/versus', async (p) => { await p.getByRole('button', { name: /Lancer le tournoi/i }).click(); await p.waitForSelector('.duel-scene'); }],
]) {
  const p = await b.newPage({ viewport: { width: 375, height: 667 } });
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  if (prep) await prep(p);
  await p.waitForTimeout(700);
  const bloques = await p.evaluate((Z) => [...document.querySelectorAll('button, input, [role="button"]')]
    .filter((el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
      return !(r.right < Z.x1 || r.left > Z.x2 || r.bottom < Z.y1 || r.top > Z.y2); })
    .map((el) => (el.textContent || '').trim().slice(0, 20) || el.tagName), zone);
  console.log(`  ${nom.padEnd(11)} : ${bloques.length} commande(s) sous le badge ${bloques.length ? JSON.stringify(bloques) : ''}`);
  await p.close();
}
await b.close();
