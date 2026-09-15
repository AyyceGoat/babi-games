/** Mesure les ecrans de jeu reels (duel en cours, manche en cours),
 *  pas seulement les ecrans d'accueil de chaque jeu. */
import { chromium } from 'playwright';
const BASE = process.env.URL_TEST || 'http://localhost:5987';
const ECRANS = [['iPhone SE',375,667],['iPhone 13',390,664],['Pixel 7',412,732],['PC 1366',1366,768],['PC 1920',1920,1080]];
const b = await chromium.launch();

const mesure = async (page) => page.evaluate(() => ({
  ratio: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
  largeur: document.documentElement.scrollWidth > innerWidth + 1,
}));

console.log('etat de jeu'.padEnd(26) + ECRANS.map(e => e[0].padEnd(12)).join(''));
console.log('-'.repeat(26 + ECRANS.length * 12));

const cas = [
  ['Versus — duel en cours', async (p) => {
    await p.goto(BASE + '/versus', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /Lancer le tournoi/i }).click();
    await p.waitForSelector('.duel-scene'); await p.waitForTimeout(400);
  }],
  ['Versus — celebration', async (p) => {
    await p.goto(BASE + '/versus', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /4 participants/i }).click();
    await p.getByRole('button', { name: /Lancer le tournoi/i }).click();
    for (let i = 0; i < 3; i++) {
      await p.waitForSelector('.carte-duel');
      await p.locator('.carte-duel').first().click();
      await p.waitForTimeout(550);
    }
    await p.waitForSelector('.celebration'); await p.waitForTimeout(300);
  }],
  ['Juste Prix — manche', async (p) => {
    await p.goto(BASE + '/juste-prix', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /C'est parti/i }).click();
    await p.waitForSelector('.prix-carte'); await p.waitForTimeout(400);
  }],
  ['Juste Prix — resultat', async (p) => {
    await p.goto(BASE + '/juste-prix', { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /C'est parti/i }).click();
    await p.waitForSelector('#saisie-prix');
    await p.fill('#saisie-prix', '500');
    await p.getByRole('button', { name: /Valider/i }).click();
    await p.waitForSelector('.prix-retour'); await p.waitForTimeout(300);
  }],
];

for (const [nom, prepare] of cas) {
  let ligne = nom.padEnd(26);
  for (const [, w, h] of ECRANS) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    try { await prepare(p); const m = await mesure(p);
      ligne += ((m.ratio > 1.02 ? m.ratio.toFixed(2) : 'OK  ') + (m.largeur ? ' <-X' : '')).padEnd(12);
    } catch (e) { ligne += 'ERR'.padEnd(12); }
    await p.close();
  }
  console.log(ligne);
}
await b.close();
