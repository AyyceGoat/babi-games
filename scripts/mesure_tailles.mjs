/** Mesure le debordement vertical de chaque page, a plusieurs tailles d'ecran. */
import { chromium, devices } from 'playwright';

const BASE = process.env.URL_TEST || 'http://localhost:5987';
const PAGES = [
  ['Accueil', '/'], ['Versus', '/versus'], ['Tier List', '/tier-list'],
  ['Juste Prix', '/juste-prix'], ['Personnaliser', '/personnaliser'], ['Credits', '/credits'],
];
const ECRANS = [
  ['iPhone SE', 375, span => 667], ['iPhone 13', 390, () => 664],
  ['Pixel 7', 412, () => 732], ['iPad', 820, () => 1080],
  ['PC 1366', 1366, () => 768], ['PC 1920', 1920, () => 1080],
];

const b = await chromium.launch();
console.log('Hauteur de page / hauteur d ecran  (>1 = defilement necessaire)\n');
console.log('page'.padEnd(14) + ECRANS.map(e => e[0].padEnd(12)).join(''));
console.log('-'.repeat(14 + ECRANS.length * 12));

for (const [nom, chemin] of PAGES) {
  let ligne = nom.padEnd(14);
  for (const [, w, h] of ECRANS) {
    const page = await b.newPage({ viewport: { width: w, height: h() } });
    await page.goto(BASE + chemin, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => ({
      page: document.documentElement.scrollHeight,
      ecran: window.innerHeight,
      largeurDeborde: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    const ratio = m.page / m.ecran;
    ligne += ((ratio > 1.02 ? ratio.toFixed(2) : 'OK  ') + (m.largeurDeborde ? ' <-X' : '')).padEnd(12);
    await page.close();
  }
  console.log(ligne);
}

// Detail tier list : le rang S est-il atteignable depuis la reserve ?
console.log('\nTier list — le rang S est-il visible en meme temps que la reserve ?\n');
for (const [nom, w, h] of ECRANS) {
  const page = await b.newPage({ viewport: { width: w, height: h() } });
  await page.goto(BASE + '/tier-list', { waitUntil: 'networkidle' });
  await page.waitForSelector('.tier-vignette');
  await page.waitForTimeout(250);
  const d = await page.evaluate(() => {
    const s = document.querySelector('.rang-s .tier-zone').getBoundingClientRect();
    const r = document.querySelector('.tier-reserve').getBoundingClientRect();
    return {
      sHaut: Math.round(s.top), reserveBas: Math.round(r.bottom),
      ecran: innerHeight, page: document.documentElement.scrollHeight,
      ensemble: s.top >= 0 && r.bottom <= innerHeight,
    };
  });
  console.log(`  ${nom.padEnd(11)} ecran ${String(d.ecran).padStart(4)} | page ${String(d.page).padStart(4)} | rang S a ${String(d.sHaut).padStart(5)} | bas reserve ${String(d.reserveBas).padStart(5)} | ${d.ensemble ? 'OUI' : 'NON'}`);
  await page.close();
}
await b.close();
