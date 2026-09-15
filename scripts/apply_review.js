/**
 * Applique les decisions de la revue visuelle (LOT 4).
 *
 * ECARTES  : le fichier est supprime, l'item revient au placeholder et la
 *            raison est consignee. Ce sont les sujets manifestement faux,
 *            les dessins et les doublons.
 * SIGNALES : l'image et son attribution sont conservees, mais le statut
 *            passe a 'a_verifier_manuellement', ce qui declenche le
 *            traitement duotone cote interface.
 */

import fs from 'fs';
import path from 'path';
import { readDb, TYPE_TO_FOLDER, isResolved, COLLECTIONS } from './lib/store.js';

const ECARTES = {
  // Nourriture
  food_1:  'sujet faux : photo de la danse indienne Garba (Navratri, temple d Ambaji)',
  food_6:  'illustration dessinee, pas une photographie',
  food_15: 'sujet faux : photo de theatre avec Faye Dunaway, resultat du nom "Baka"',
  food_18: 'sujet faux : carte du district de Kabato au Japon',
  food_19: 'doublon de prod_2, et montre de l attieke blanc au lieu d attieke a l huile rouge',
  food_20: 'doublon exact de food_2 (meme fichier Kedjenou.JPG)',
  // Produits
  prod_1:  'sujet faux : photo de la danse indienne Garba',
  prod_3:  'hors sujet : table de reveillon de Noel, pain noye dans la scene',
  prod_6:  'sujet faux : l acteur Riz Ahmed, resultat de la recherche "riz"',
  prod_7:  'sujet faux : bouteille de gaz explosee sur un site en ruine, illisible',
  prod_11: 'sujet faux : installation artistique "Reservoir" de John Grade',
  prod_15: 'trompeur : macro de sucre blanc en cristaux, l item est du sucre roux en paquet de 1 kg',
  prod_16: 'trompeur : savons de Marseille et d Alep, l item est un savon local Kabakrou',
  prod_17: 'trompeur : une tasse de cafe servie, l item est un paquet de 250 g',
  prod_19: 'trompeur : poudre de cacao, l item est une tablette de chocolat',
  prod_22: 'trompeur : ecouteurs sans fil, l item est un casque audio (gamme de prix differente)',
  // Artistes
  art_37:  'illustration vectorielle, pas une photographie',
  art_41:  'illustration dessinee, pas une photographie',
};

const SIGNALES = {
  art_5:   'plan de scene sombre, sujet petit dans le cadre',
  art_8:   'conference de presse a quatre personnes, ce n est pas un portrait du groupe',
  art_61:  'plan de scene large, visage peu lisible en vignette',
  pub_33:  'plan large de conference, visage petit dans le cadre',
  food_3:  'photo de nuit tres sombre, sujet correct',
  food_14: 'choukouya de poulet alors que l item nomme du mouton',
  prod_2:  'scene de preparation de l attieke, pas le produit tel qu il est vendu',
  prod_21: 'site de fabrication du koutoukou, pas le verre servi',
};

const PLACEHOLDER = {
  artiste: '/images/placeholders/artiste.svg',
  footballeur: '/images/placeholders/footballeur.svg',
  public: '/images/placeholders/artiste.svg',
  nourriture: '/images/placeholders/nourriture.svg',
  produit: '/images/placeholders/produit.svg',
};

const typeDepuisId = (id) =>
  ({ art: 'artiste', foot: 'footballeur', pub: 'public', food: 'nourriture', prod: 'produit' })[
    id.split('_')[0]
  ];

const db = readDb();
let ecartes = 0;
let signales = 0;
const supprimes = [];

for (const collection of COLLECTIONS) {
  db[collection] = db[collection].map((item) => {
    if (ECARTES[item.id]) {
      const type = typeDepuisId(item.id);
      const fichier = path.join('public', 'images', TYPE_TO_FOLDER[type], `${item.id}.jpg`);
      if (fs.existsSync(fichier)) {
        fs.unlinkSync(fichier);
        supprimes.push(fichier);
      }
      ecartes++;
      return {
        ...item,
        image: PLACEHOLDER[type],
        status: 'a_verifier_manuellement',
        source: 'N/A',
        license: 'N/A',
        author: 'N/A',
        attribution: undefined,
        failureReason: `ecarte a la revue visuelle : ${ECARTES[item.id]}`,
        revueLe: new Date().toISOString().slice(0, 10),
      };
    }
    if (SIGNALES[item.id]) {
      signales++;
      return {
        ...item,
        status: 'a_verifier_manuellement',
        reserveVisuelle: SIGNALES[item.id],
        revueLe: new Date().toISOString().slice(0, 10),
      };
    }
    return item;
  });
}

fs.writeFileSync('src/data/db.json', JSON.stringify(db, null, 2) + '\n', 'utf8');

console.log(`Ecartes  : ${ecartes} items, ${supprimes.length} fichiers supprimes`);
console.log(`Signales : ${signales} items passes en duotone`);
console.log('\nCouverture apres revue :');
let totalOk = 0;
let totalAvecImage = 0;
let total = 0;
for (const c of COLLECTIONS) {
  const liste = db[c];
  const ok = liste.filter(isResolved).length;
  const avecImage = liste.filter((i) => i.image && !i.image.includes('/placeholders/')).length;
  totalOk += ok;
  totalAvecImage += avecImage;
  total += liste.length;
  console.log(`  ${c.padEnd(15)} ${String(ok).padStart(3)} verifies + ${avecImage - ok} en duotone = ${avecImage}/${liste.length}`);
}
console.log(`  ${'TOTAL'.padEnd(15)} ${totalOk} verifies, ${totalAvecImage - totalOk} en duotone, ${totalAvecImage}/${total} avec visuel`);
