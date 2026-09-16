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
  /* On teste l'atteignabilite REELLE, pas le chevauchement de
     rectangles : une tuile sortie d'un conteneur defilant garde des
     coordonnees hors de ce conteneur et donnait un faux positif.
     Un controle n'est bloque que si, a son centre, elementFromPoint
     renvoie autre chose que lui-meme ou un de ses descendants. */
  const bloques = await p.evaluate(() =>
    [...document.querySelectorAll('button, input, [role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false; // hors ecran

        /* Un element sorti d'un conteneur defilant est simplement
           invisible, pas bloque : on l'ecarte avant de conclure. */
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (!/auto|scroll|hidden/.test(cs.overflowY + cs.overflowX)) continue;
          const ar = a.getBoundingClientRect();
          if (cy < ar.top - 1 || cy > ar.bottom + 1 || cx < ar.left - 1 || cx > ar.right + 1) return false;
        }

        const dessus = document.elementFromPoint(cx, cy);
        if (!dessus) return false;
        return !(el === dessus || el.contains(dessus) || dessus.contains(el));
      })
      .map((el) => ({
        quoi: (el.textContent || '').trim().slice(0, 20) || el.tagName,
        recouvertPar: (() => {
          const r = el.getBoundingClientRect();
          const d = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return d ? d.tagName.toLowerCase() + (d.id ? '#' + d.id : '') : '?';
        })(),
      })));
  console.log(`  ${nom.padEnd(11)} : ${bloques.length} commande(s) sous le badge ${bloques.length ? JSON.stringify(bloques) : ''}`);
  await p.close();
}
await b.close();
