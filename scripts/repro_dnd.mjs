/**
 * Reproduction instrumentee du glisser-deposer casse sur navigateur de bureau.
 *
 * On n'applique aucun correctif ici : on observe. Pour chaque essai on
 * enregistre la sequence reelle d'evenements et on verifie que le point de
 * depart est bien SUR la vignette visee (elementFromPoint) avant de glisser.
 */

import { chromium } from 'playwright';

const URL = process.env.URL_TEST || 'http://localhost:5987/tier-list';
const TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'dragstart', 'drag', 'dragend'];

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1440, height: 2200 } });

async function instrumenter() {
  await page.evaluate((types) => {
    window.__journal = [];
    for (const type of types) {
      document.addEventListener(
        type,
        (e) => {
          const d = window.__journal[window.__journal.length - 1];
          if ((type === 'pointermove' || type === 'drag') && d && d.type === type) return void d.n++;
          window.__journal.push({ type, n: 1, cible: e.target?.tagName?.toLowerCase() ?? '?' });
        },
        true
      );
    }
  }, TYPES);
}

async function charger() {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tier-vignette');
  await instrumenter();
}

/**
 * Glisse une vignette de la reserve vers le rang S.
 * @param {number} index  position dans la reserve
 * @param {'image'|'etiquette'} zone  ou appuyer dans la vignette
 */
async function essai(index, zone) {
  // Fenetre assez haute pour que tout tienne : on isole le defaut de
  // glisser du defaut de dimensionnement (chantier 2).
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(60);
  await page.evaluate(() => (window.__journal = []));

  const geo = await page.evaluate(
    ({ i, zone }) => {
      const t = [...document.querySelectorAll('.tier-reserve .tier-vignette')][i];
      if (!t) return null;
      const img = t.querySelector('img');
      const cible = zone === 'image' ? img || t.querySelector('.item-visuel') : t.querySelector('.tier-vignette-nom');
      const r = cible.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const rs = document.querySelector('.rang-s .tier-zone').getBoundingClientRect();
      const sousLePoint = document.elementFromPoint(x, y);
      return {
        depart: { x, y },
        arrivee: { x: rs.left + 50, y: rs.top + rs.height / 2 },
        surQuoi: cible.tagName.toLowerCase(),
        avecImage: Boolean(img),
        nom: t.getAttribute('aria-label'),
        // Controle : le point de depart touche-t-il bien ce qu'on croit ?
        pointeSur: sousLePoint?.tagName?.toLowerCase() ?? 'rien',
        dansLaFenetre: y > 0 && y < innerHeight && x > 0 && x < innerWidth,
        rangSVisible: rs.top > 0 && rs.top < innerHeight,
      };
    },
    { i: index, zone }
  );
  if (!geo || !geo.dansLaFenetre) return { ...geo, horsFenetre: true };

  const avant = await page.evaluate(() => document.querySelectorAll('.rang-s .tier-vignette').length);

  await page.mouse.move(geo.depart.x, geo.depart.y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(
      geo.depart.x + ((geo.arrivee.x - geo.depart.x) * i) / 14,
      geo.depart.y + ((geo.arrivee.y - geo.depart.y) * i) / 14
    );
    await page.waitForTimeout(14);
  }
  await page.mouse.up();
  await page.waitForTimeout(150);

  const apres = await page.evaluate(() => document.querySelectorAll('.rang-s .tier-vignette').length);
  const j = await page.evaluate(() => window.__journal);

  return {
    ...geo,
    zone,
    deplace: apres > avant,
    dragstart: j.some((e) => e.type === 'dragstart'),
    pointercancel: j.some((e) => e.type === 'pointercancel'),
    nbMove: j.filter((e) => e.type === 'pointermove').reduce((s, e) => s + e.n, 0),
    sequence: j.map((e) => e.type + (e.n > 1 ? `x${e.n}` : '') + `(${e.cible})`).join(' > '),
  };
}

await charger();

const inventaire = await page.evaluate(() =>
  [...document.querySelectorAll('.tier-reserve .tier-vignette')].map((t, i) => ({
    i,
    avecImage: Boolean(t.querySelector('img')),
  }))
);
const avecImg = inventaire.filter((t) => t.avecImage).map((t) => t.i);
const sansImg = inventaire.filter((t) => !t.avecImage).map((t) => t.i);
console.log(`Reserve : ${inventaire.length} vignettes — ${avecImg.length} avec image, ${sansImg.length} sans image\n`);

const R = [];
const ligne = (r) =>
  `  ${r.deplace ? 'DEPLACE' : 'BLOQUE '} | ${(r.nom || '').slice(0, 24).padEnd(26)} | appui sur <${r.surQuoi}> (touche <${r.pointeSur}>) | dragstart=${r.dragstart} pointercancel=${r.pointercancel} moves=${r.nbMove}`;

console.log("=== A. AVEC image — appui au centre de l'image ===");
for (const i of avecImg.slice(0, 5)) {
  const r = await essai(i, 'image');
  if (r.horsFenetre) { console.log('  (hors fenetre)'); continue; }
  R.push({ ...r, cas: 'A' });
  console.log(ligne(r));
  console.log(`            ${r.sequence.slice(0, 130)}`);
  await charger();
}

console.log("\n=== B. AVEC image — appui sur l'etiquette du nom ===");
for (const i of avecImg.slice(0, 4)) {
  const r = await essai(i, 'etiquette');
  if (r.horsFenetre) { console.log('  (hors fenetre)'); continue; }
  R.push({ ...r, cas: 'B' });
  console.log(ligne(r));
  await charger();
}

console.log('\n=== C. SANS image ===');
for (const i of sansImg.slice(0, 5)) {
  const r = await essai(i, 'image');
  if (r.horsFenetre) { console.log('  (hors fenetre)'); continue; }
  R.push({ ...r, cas: 'C' });
  console.log(ligne(r));
  await charger();
}

const part = (cas) => {
  const s = R.filter((r) => r.cas === cas);
  return `${s.filter((r) => r.deplace).length}/${s.length}`;
};

console.log('\n=== SYNTHESE ===');
console.log(`  A. avec image, appui sur l'image    : ${part('A')} deplaces`);
console.log(`  B. avec image, appui sur le nom     : ${part('B')} deplaces`);
console.log(`  C. sans image                       : ${part('C')} deplaces`);
console.log(`  dragstart natif observe             : ${R.filter((r) => r.dragstart).length}/${R.length}`);
console.log(`  pointercancel observe               : ${R.filter((r) => r.pointercancel).length}/${R.length}`);
console.log(`  essais ou le point touchait un <img>: ${R.filter((r) => r.pointeSur === 'img').length}/${R.length}`);

await navigateur.close();
