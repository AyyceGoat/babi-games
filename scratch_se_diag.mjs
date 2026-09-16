import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 667 } });
await p.goto('https://babi-games.netlify.app/juste-prix', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /C'est parti/i }).click();
await p.waitForSelector('.prix-carte'); await p.waitForTimeout(600);
const d = await p.evaluate(() => {
  const carte = document.querySelector('.prix-carte');
  const btn = [...document.querySelectorAll('.prix-form button')].pop();
  const inp = document.querySelector('#saisie-prix');
  const main = document.querySelector('.main-content');
  const r = el => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
  return {
    fenetre: innerHeight,
    main: r(main),
    carte: { ...r(carte), defile: carte.scrollHeight > carte.clientHeight + 1, contenu: carte.scrollHeight, visible: carte.clientHeight },
    champ: inp ? r(inp) : null,
    bouton: btn ? { ...r(btn), texte: btn.textContent.trim() } : null,
    boutonDansLaFenetre: btn ? (btn.getBoundingClientRect().bottom <= innerHeight && btn.getBoundingClientRect().top >= 0) : null,
    elementAuPointDuBouton: btn ? (()=>{const b=btn.getBoundingClientRect(); const e=document.elementFromPoint(b.left+b.width/2, b.top+b.height/2); return e ? e.tagName.toLowerCase()+'.'+(e.className||'').toString().slice(0,24) : 'rien'})() : null,
  };
});
console.log(JSON.stringify(d, null, 1));
await p.screenshot({ path: 'scripts/logs/se-juste-prix.png' });
await b.close();
