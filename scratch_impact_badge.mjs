import { chromium } from 'playwright';
const b = await chromium.launch();
// Quelles commandes le badge recouvre-t-il, sur chaque ecran de jeu ?
const BADGE = { x1: 178, y1: 603, x2: 375, y2: 667 };
const cas = [
  ['Juste Prix', '/juste-prix', async p => { await p.getByRole('button',{name:/C'est parti/i}).click(); await p.waitForSelector('.prix-carte'); }],
  ['Versus', '/versus', async p => { await p.getByRole('button',{name:/Lancer le tournoi/i}).click(); await p.waitForSelector('.duel-scene'); }],
  ['Tier List', '/tier-list', null],
];
for (const [nom, url, prep] of cas) {
  const p = await b.newPage({ viewport:{width:375,height:667} });
  await p.goto('https://babi-games.netlify.app'+url, { waitUntil:'networkidle' });
  if (prep) await prep(p);
  await p.waitForTimeout(600);
  const bloques = await p.evaluate((B) => {
    const interactifs = [...document.querySelectorAll('button, input, [role="button"], .tier-zone, .tier-etiquette')];
    return interactifs.filter(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      return !(r.right < B.x1 || r.left > B.x2 || r.bottom < B.y1 || r.top > B.y2);
    }).map(el => (el.textContent||'').trim().slice(0,22) || el.className.toString().slice(0,22) || el.tagName);
  }, BADGE);
  console.log(`${nom.padEnd(11)} : ${bloques.length} commande(s) sous le badge ${bloques.length?'-> '+JSON.stringify(bloques.slice(0,4)):''}`);
  await p.close();
}
await b.close();
