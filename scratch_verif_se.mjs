import { chromium } from 'playwright';
const b = await chromium.launch();
for (let essai = 1; essai <= 3; essai++) {
  const p = await b.newPage({ viewport: { width: 375, height: 667 } });
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  try {
    await p.goto('https://babi-games.netlify.app/juste-prix', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /C'est parti/i }).click();
    await p.waitForSelector('#saisie-prix', { timeout: 8000 });
    await p.fill('#saisie-prix', '500');
    await p.getByRole('button', { name: /Valider/i }).click();
    await p.waitForSelector('.prix-retour', { timeout: 8000 });
    await p.waitForTimeout(400);
    const m = await p.evaluate(() => ({
      ratio: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
      largeur: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    console.log(`essai ${essai} : OK  ratio ${m.ratio}  debordement horizontal ${m.largeur}  erreurs JS ${erreurs.length}`);
  } catch (e) {
    console.log(`essai ${essai} : ECHEC  ${e.message.split('\n')[0]}  erreurs JS: ${erreurs.join('|') || 'aucune'}`);
    await p.screenshot({ path: `scripts/logs/se-echec-${essai}.png` });
  }
  await p.close();
}
await b.close();
