import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [ou, url] of [['EN LIGNE','https://babi-games.netlify.app/juste-prix'],['LOCAL','http://localhost:5987/juste-prix']]) {
  const p = await b.newPage({ viewport: { width: 375, height: 667 } });
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(800);
    const d = await p.evaluate(() => [...document.querySelectorAll('iframe')].map(f => {
      const r = f.getBoundingClientRect();
      const cs = getComputedStyle(f);
      return { src: (f.src||'(vide)').slice(0,80), id: f.id||'-', title: f.title||'-',
               boite: `${Math.round(r.width)}x${Math.round(r.height)} a (${Math.round(r.left)},${Math.round(r.top)})`,
               position: cs.position, zIndex: cs.zIndex, pointerEvents: cs.pointerEvents,
               display: cs.display, visibility: cs.visibility, opacity: cs.opacity };
    }));
    console.log(`${ou} : ${d.length} iframe(s)`);
    d.forEach(f => console.log('   ' + JSON.stringify(f)));
  } catch (e) { console.log(`${ou} : ${e.message.split('\n')[0]}`); }
  await p.close();
}
await b.close();
