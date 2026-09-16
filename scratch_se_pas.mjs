import { chromium } from 'playwright';
const b = await chromium.launch();
for (let n = 1; n <= 5; n++) {
  const p = await b.newPage({ viewport: { width: 375, height: 667 } });
  let etape = 'goto';
  try {
    await p.goto('https://babi-games.netlify.app/juste-prix', { waitUntil: 'networkidle' });
    etape = 'clic C-est-parti';
    await p.getByRole('button', { name: /C'est parti/i }).click({ timeout: 6000 });
    etape = 'attente champ';
    await p.waitForSelector('#saisie-prix', { timeout: 6000 });
    etape = 'saisie';
    await p.fill('#saisie-prix', '500');
    etape = 'clic Valider';
    const btn = p.getByRole('button', { name: /Valider/i });
    console.log(`  n${n} boutons "Valider" trouves : ${await btn.count()}`);
    await btn.click({ timeout: 6000 });
    etape = 'attente retour';
    await p.waitForSelector('.prix-retour', { timeout: 6000 });
    console.log(`  n${n} OK`);
  } catch (e) {
    const geo = await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(x => /valider|parti/i.test(x.textContent));
      return btns.map(x => { const r = x.getBoundingClientRect();
        return { t: x.textContent.trim().slice(0,14), top: Math.round(r.top), bottom: Math.round(r.bottom),
                 dansFenetre: r.top >= 0 && r.bottom <= innerHeight, h: Math.round(r.height) }; });
    }).catch(() => 'illisible');
    console.log(`  n${n} ECHEC a l'etape "${etape}" : ${e.message.split('\n')[0]}`);
    console.log(`     boutons : ${JSON.stringify(geo)}`);
  }
  await p.close();
}
await b.close();
