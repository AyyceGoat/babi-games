/**
 * Revue visuelle du lot importe depuis Images_CI/images (119 fichiers).
 *
 * Les 119 images ont ete regardees une par une, par planches-contact
 * (scripts/logs/planche-*.jpg). Ce script applique les rejets : le
 * fichier est supprime, l'element revient au placeholder, et le motif
 * est consigne dans db.json puis dans INVENTAIRE.md.
 *
 * Les images conservees restent en statut 'a_verifier_manuellement' :
 * elles proviennent d'une recherche d'images web, leur licence et leur
 * auteur ne sont pas connus, et la page Credits ne doit annoncer que ce
 * qui est sur.
 */

import fs from 'fs';
import path from 'path';
import { readDb, TYPE_TO_FOLDER, COLLECTIONS, isResolved } from './lib/store.js';

const ECARTES = {
  /* --- Artistes : peintures, pochettes, affiches, sujets faux ------- */
  art_23: 'pochette d album ("Le retour de la pierre"), pas une photo de l artiste',
  art_30: 'peinture contemporaine, et doublon exact partage par 7 artistes',
  art_32: 'affiche du spectacle musical francais "Moliere", pas l artiste zouglou',
  art_34: 'pochette d album miniature sur fond noir',
  art_36: 'peinture contemporaine, doublon du meme fichier que art_30',
  art_37: 'pochette de vinyle "Missounwa" avec filigrane, pas une photo',
  art_42: 'hors sujet : affiche d alphabet graffiti',
  art_43: 'affiche de concert avec dates et tarifs',
  art_46: 'pochette d album',
  art_47: 'pochette d album ("Triomphe")',
  art_48: 'affiche d evenement avec date et numero de telephone',
  art_49: 'pochette d album ("Brule en moi")',
  art_50: 'peinture contemporaine, doublon du meme fichier que art_30',
  art_54: 'salle de conference avec videoprojecteur, sujet non identifiable',
  art_57: 'affiche graphique avec texte en gros caracteres',
  art_58: 'photo d une peinture accrochee en galerie',
  art_59: 'portrait d un homme seul alors que VDA est un groupe',
  art_60: 'peinture contemporaine, doublon du meme fichier que art_30',
  art_62: 'hors sujet : photographie d architecture en noir et blanc',
  art_63: 'identite douteuse : jeune femme en maillot du Burkina Faso',
  art_65: 'peinture contemporaine, doublon du meme fichier que art_30',
  art_69: 'peinture contemporaine, doublon du meme fichier que art_30',
  art_70: 'visuel d hommage compose, pas une photo de l artiste',
  art_71: 'peinture, pas une photographie',
  art_75: 'peinture contemporaine, doublon du meme fichier que art_30',

  /* --- Footballeurs ------------------------------------------------- */
  foot_35: 'filigrane "alamy" repete sur toute l image',
  foot_40: 'filigrane "alamy" repete sur toute l image',
  foot_41: 'filigrane "alamy" repete sur toute l image',
  foot_42: 'filigrane "alamy" repete sur toute l image',
  foot_55: 'hors sujet : une de journal sur la presidentielle',
  foot_61: 'hors sujet : paysage de bord de mer mediterraneen',

  /* --- Personnalites publiques -------------------------------------- */
  pub_8: 'photo de groupe officielle, sujet non identifiable, et doublon de pub_18',
  pub_18: 'photo de groupe officielle, sujet non identifiable, doublon de pub_8',
  pub_12: 'montage de deux images accolees',
  pub_27: 'montage de plusieurs visages',

  /* --- Nourriture ---------------------------------------------------- */
  food_5: 'doublon exact de food_4, alors que ce sont deux sauces differentes',
  food_15: 'mauvais plat : foutou en sauce au lieu d une bouillie de mil',
  food_18: 'mauvais plat : attieke garni au lieu d une pate de mais',
  food_20: 'bandeau promotionnel sur un tiers de l image, et poulet au lieu de lapin',

  /* --- Produits ------------------------------------------------------ */
  prod_3: 'prospectus promotionnel AFFICHANT LE PRIX (600 FCFA) : la reponse du jeu serait donnee',
  prod_6: 'trompeur : riz cambodgien "Perle d Asie" pour un item nomme riz local',
  prod_11: 'hors sujet : batonnets glaces sucres au lieu d un sachet d eau',
  prod_13: 'trompeur : sardines crues a l etal au lieu d une boite de conserve',
  prod_15: 'prospectus promotionnel AFFICHANT LE PRIX (770 FCFA) : la reponse du jeu serait donnee',
  prod_16: 'couverture de rapport universitaire, le savon occupe un coin de l image',
  prod_17: 'hors sujet : ceremonie officielle, aucun paquet de cafe visible',
};

const PLACEHOLDER = {
  artiste: '/images/placeholders/artiste.svg',
  footballeur: '/images/placeholders/footballeur.svg',
  public: '/images/placeholders/artiste.svg',
  nourriture: '/images/placeholders/nourriture.svg',
  produit: '/images/placeholders/produit.svg',
};
const TYPE = { art: 'artiste', foot: 'footballeur', pub: 'public', food: 'nourriture', prod: 'produit' };

const db = readDb();
let ecartes = 0;
const supprimes = [];
const introuvables = [];

for (const collection of COLLECTIONS) {
  db[collection] = db[collection].map((item) => {
    const motif = ECARTES[item.id];
    if (!motif) return item;

    const type = TYPE[item.id.split('_')[0]];
    const fichier = path.join('public', 'images', TYPE_TO_FOLDER[type], `${item.id}.jpg`);
    if (fs.existsSync(fichier)) {
      fs.unlinkSync(fichier);
      supprimes.push(fichier);
    } else {
      introuvables.push(item.id);
    }
    ecartes++;

    const net = { ...item };
    delete net.attribution;
    delete net.importeLe;
    return {
      ...net,
      image: PLACEHOLDER[type],
      status: 'a_verifier_manuellement',
      source: 'N/A',
      license: 'N/A',
      author: 'N/A',
      failureReason: `ecarte a la revue de l import : ${motif}`,
      revueLe: new Date().toISOString().slice(0, 10),
    };
  });
}

fs.writeFileSync('src/data/db.json', JSON.stringify(db, null, 2) + '\n', 'utf8');

console.log(`Ecartes : ${ecartes} elements, ${supprimes.length} fichiers supprimes`);
if (introuvables.length) console.log(`  (fichiers deja absents : ${introuvables.join(', ')})`);

console.log('\nCouverture apres revue :');
let T = { n: 0, photo: 0, duo: 0, vide: 0 };
for (const c of COLLECTIONS) {
  const l = db[c];
  const photo = l.filter(isResolved).length;
  const duo = l.filter((i) => !isResolved(i) && !i.image.includes('/placeholders/')).length;
  const vide = l.length - photo - duo;
  T.n += l.length; T.photo += photo; T.duo += duo; T.vide += vide;
  console.log(`  ${c.padEnd(15)} ${String(l.length).padStart(3)} | verifiees ${String(photo).padStart(3)} | a verifier ${String(duo).padStart(3)} | sans visuel ${String(vide).padStart(3)}`);
}
console.log(`  ${'TOTAL'.padEnd(15)} ${String(T.n).padStart(3)} | verifiees ${String(T.photo).padStart(3)} | a verifier ${String(T.duo).padStart(3)} | sans visuel ${String(T.vide).padStart(3)}`);
