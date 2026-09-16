import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 667 } });
await p.goto('https://babi-games.netlify.app/juste-prix', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /C'est parti/i }).click();
await p.waitForSelector('#saisie-prix');
const avant = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(x => /Valider/.test(x.textContent));
  const r = btn.getBoundingClientRect();
  const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
  return { top: Math.round(r.top), auPoint: e ? e.tagName.toLowerCase()+'.'+(e.className||'').toString().slice(0,30) : 'rien' };
});
await p.fill('#saisie-prix', '500');
await p.waitForTimeout(500);
const apres = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(x => /Valider/.test(x.textContent));
  const r = btn.getBoundingClientRect();
  const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
  // Qui se trouve au-dessus, et avec quel z-index ?
  const chaine = [];
  let cur = e;
  while (cur && cur !== document.documentElement) { chaine.push(cur.tagName.toLowerCase()+'.'+(cur.className||'').toString().slice(0,24)); cur = cur.parentElement; }
  const toast = document.querySelector('.toast-stack');
  const tr = toast ? toast.getBoundingClientRect() : null;
  return { top: Math.round(r.top), bottom: Math.round(r.bottom),
           auPoint: e ? e.tagName.toLowerCase()+'.'+(e.className||'').toString().slice(0,30) : 'rien',
           chaine: chaine.slice(0,4),
           toast: tr ? { top: Math.round(tr.top), bottom: Math.round(tr.bottom), h: Math.round(tr.height),
                         enfants: toast.children.length, pointer: getComputedStyle(toast).pointerEvents } : 'absent' };
});
console.log('avant saisie :', JSON.stringify(avant));
console.log('apres saisie :', JSON.stringify(apres, null, 1));
await p.screenshot({ path: 'scripts/logs/se-obstacle.png' });
await b.close();
