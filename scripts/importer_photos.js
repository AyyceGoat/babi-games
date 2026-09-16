/**
 * Importe les images deposees dans photos/ vers la base du site.
 *
 * Usage :
 *   npm run importer-photos                     importe tout le dossier
 *   npm run importer-photos -- --essai          montre ce qui serait fait
 *   npm run importer-photos -- --only=art_2,food_5
 *   npm run importer-photos -- --dossier=chemin/vers/un/autre/dossier
 *
 * Regles
 *  - le nom du fichier porte l'identifiant de l'element : art_2.jpg ;
 *  - un element deja pourvu n'est remplace que si un fichier a son nom
 *    est present dans le dossier : c'est un remplacement explicite ;
 *  - les 107 images deja en place ne sont jamais touchees autrement ;
 *  - relancable autant de fois que voulu, par lots ;
 *  - un fichier dont le nom ne correspond a aucun identifiant connu est
 *    signale, avec une suggestion, jamais ignore en silence.
 *
 * Origine des images : renseignez photos/origines.json pour que la page
 * Credits reste exacte. Voir le README.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  readDb, mergeDb, commitDb, appendLicences,
  TYPE_TO_FOLDER, COLLECTIONS, isResolved,
} from './lib/store.js';

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const opt = (n, d = null) => {
  const h = argv.find((a) => a.startsWith(`--${n}=`));
  return h ? h.split('=').slice(1).join('=') : d;
};
const flag = (n) => argv.includes(`--${n}`);

const DOSSIER = opt('dossier', 'photos');
const ESSAI = flag('essai');
const SEULEMENT = opt('only') ? opt('only').split(',').map((s) => s.trim()) : null;

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff', '.heic', '.heif'];

/* Memes regles de traitement que la collecte automatique. */
const TAILLE = 500;
const QUALITE = 82;
const PETIT_COTE_MIN = 200; // plus permissif que la collecte : ce sont vos fichiers

const PREFIXE_TYPE = { art: 'artiste', foot: 'footballeur', pub: 'public', food: 'nourriture', prod: 'produit' };

/* ------------------------------------------------------------------ */
/* Recadrage : decision D-07                                           */
/* ------------------------------------------------------------------ */

/**
 * Sur une photo de personne le visage est presque toujours dans le haut
 * du cadre. `sharp.strategy.attention` optimise la saillance et se
 * verrouille volontiers sur un logo de vetement : il decapitait les
 * portraits. On prend donc un carre pris en haut, descendu de 12 %.
 */
function carrePortrait(largeur, hauteur) {
  const cote = Math.min(largeur, hauteur);
  return {
    left: Math.round((largeur - cote) / 2),
    top: hauteur > largeur ? Math.round((hauteur - cote) * 0.12) : Math.round((hauteur - cote) / 2),
    width: cote,
    height: cote,
  };
}

async function traiter(fichierSource, fichierCible, cadrage) {
  const entree = fs.readFileSync(fichierSource);

  // Controle de lisibilite : on veut l'erreur, pas la valeur.
  try {
    await sharp(entree).metadata();
  } catch (e) {
    throw new Error(`fichier illisible par sharp (${e.message})`);
  }

  // L'orientation EXIF doit etre appliquee AVANT de calculer le recadrage,
  // sinon largeur et hauteur sont inversees sur les photos pivotees.
  const droit = await sharp(entree).rotate().toBuffer({ resolveWithObject: true });
  const { width: l, height: h } = droit.info;

  const petitCote = Math.min(l, h);
  if (petitCote < PETIT_COTE_MIN) {
    throw new Error(`image trop petite : ${l}x${h}, petit cote ${petitCote} px (minimum ${PETIT_COTE_MIN})`);
  }

  let pipeline = sharp(droit.data);
  if (cadrage === 'personne') {
    pipeline = pipeline.extract(carrePortrait(l, h)).resize(TAILLE, TAILLE, { fit: 'fill' });
  } else {
    pipeline = pipeline.resize(TAILLE, TAILLE, {
      fit: 'cover',
      position: sharp.strategy.attention,
      withoutEnlargement: false,
    });
  }

  fs.mkdirSync(path.dirname(fichierCible), { recursive: true });
  const sortie = await pipeline.jpeg({ quality: QUALITE, progressive: true, mozjpeg: true }).toFile(fichierCible);

  return { sourceLargeur: l, sourceHauteur: h, octets: sortie.size, petitCote };
}

/* ------------------------------------------------------------------ */
/* Origines renseignees par l'utilisateur                              */
/* ------------------------------------------------------------------ */

/**
 * photos/origines.json, facultatif :
 *   {
 *     "_defaut": { "source": "Photo personnelle", "license": "Tous droits reserves",
 *                  "author": "Yann Ahouet" },
 *     "art_2":   { "source": "Instagram officiel", "license": "Autorisation de l artiste",
 *                  "author": "Ariel Sheney", "page": "https://..." }
 *   }
 */
function lireOrigines(dossier) {
  const chemin = path.join(dossier, 'origines.json');
  if (!fs.existsSync(chemin)) return { defaut: null, parId: {} };
  let brut;
  try {
    brut = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  } catch (e) {
    console.warn(`  ! origines.json illisible (${e.message}). Les origines seront demandees autrement.`);
    return { defaut: null, parId: {} };
  }
  const { _defaut, ...parId } = brut;
  return { defaut: _defaut || null, parId };
}

const rempli = (v) => typeof v === 'string' && v.trim() !== '' && v.trim().toUpperCase() !== 'N/A';

/* ------------------------------------------------------------------ */
/* Programme                                                           */
/* ------------------------------------------------------------------ */

async function run() {
  console.log(`=== Import des photos depuis ${DOSSIER}/ ===${ESSAI ? '  (essai, rien ne sera ecrit)' : ''}\n`);

  if (!fs.existsSync(DOSSIER)) {
    console.log(`Le dossier ${DOSSIER}/ n'existe pas encore.`);
    console.log(`Creez-le a la racine du projet, deposez-y vos images nommees`);
    console.log(`d'apres les identifiants d'INVENTAIRE.md, puis relancez.`);
    fs.mkdirSync(DOSSIER, { recursive: true });
    console.log(`\nDossier ${DOSSIER}/ cree, il est vide.`);
    return;
  }

  const db = readDb();

  /* Index des identifiants connus */
  const connus = new Map();
  for (const c of COLLECTIONS) {
    for (const item of db[c] || []) connus.set(item.id.toLowerCase(), { collection: c, item });
  }

  const origines = lireOrigines(DOSSIER);

  /* Lecture du dossier */
  const entrees = fs
    .readdirSync(DOSSIER, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => !n.startsWith('.') && !['origines.json', 'README.md', 'LISEZMOI.txt', 'Thumbs.db', 'desktop.ini'].includes(n));

  if (!entrees.length) {
    console.log(`Le dossier ${DOSSIER}/ est vide. Rien a importer.`);
    return;
  }

  const aTraiter = [];
  const inconnus = [];
  const ignores = [];

  for (const nom of entrees) {
    const ext = path.extname(nom).toLowerCase();
    const base = path.basename(nom, path.extname(nom));
    const id = base.toLowerCase().trim();

    if (!EXTENSIONS.includes(ext)) {
      ignores.push({ nom, raison: `extension non prise en charge (${ext || 'aucune'})` });
      continue;
    }
    if (SEULEMENT && !SEULEMENT.includes(id)) continue;

    const trouve = connus.get(id);
    if (!trouve) {
      inconnus.push({ nom, id, suggestion: suggerer(id, connus) });
      continue;
    }
    aTraiter.push({ nom, id: trouve.item.id, ...trouve });
  }

  /* --- Fichiers dont le nom ne correspond a rien : on le dit ---------- */
  if (inconnus.length) {
    console.log(`!! ${inconnus.length} fichier(s) sans identifiant correspondant, NON importes :\n`);
    for (const { nom, id, suggestion } of inconnus) {
      console.log(`   ${nom}`);
      console.log(`      "${id}" ne figure dans aucune collection.`);
      if (suggestion) console.log(`      Vouliez-vous dire "${suggestion}" ? Renommez le fichier en ${suggestion}${path.extname(nom)}`);
      else console.log(`      Verifiez l'identifiant exact dans INVENTAIRE.md.`);
    }
    console.log('');
  }

  if (ignores.length) {
    console.log(`Fichiers ignores (${ignores.length}) :`);
    for (const { nom, raison } of ignores) console.log(`   ${nom} — ${raison}`);
    console.log(`   Formats acceptes : ${EXTENSIONS.join(', ')}\n`);
  }

  if (!aTraiter.length) {
    console.log('Aucune image a importer.');
    if (inconnus.length) process.exitCode = 1;
    return;
  }

  /* --- Traitement ---------------------------------------------------- */

  const frais = [];
  const licences = [];
  const bilan = { importes: 0, remplaces: 0, echecs: 0, sansOrigine: 0 };

  console.log(`${aTraiter.length} image(s) a importer.\n`);

  for (const { nom, id, collection, item } of aTraiter) {
    const type = PREFIXE_TYPE[id.split('_')[0]];
    const dossierCible = TYPE_TO_FOLDER[type];
    const cheminRelatif = `/images/${dossierCible}/${id}.jpg`;
    const cheminAbsolu = path.join('public', 'images', dossierCible, `${id}.jpg`);
    const remplacement = isResolved(item);

    // Origine : entree dediee, sinon defaut, sinon ce que portait l'item.
    const o = origines.parId[id] || origines.defaut || {};
    const source = rempli(o.source) ? o.source.trim() : 'Fourni par l’éditeur du site';
    const license = rempli(o.license) ? o.license.trim() : null;
    const author = rempli(o.author) ? o.author.trim() : null;

    if (!license || !author) bilan.sansOrigine++;

    process.stdout.write(`  ${nom.padEnd(24)} -> ${id.padEnd(10)} ${remplacement ? '[REMPLACE]' : '[nouveau] '} `);

    if (ESSAI) {
      console.log(`essai, non ecrit${!license || !author ? '  (origine incomplete)' : ''}`);
      continue;
    }

    let infos;
    try {
      infos = await traiter(
        path.join(DOSSIER, nom),
        cheminAbsolu,
        type === 'artiste' || type === 'footballeur' || type === 'public' ? 'personne' : 'objet'
      );
    } catch (e) {
      console.log(`ECHEC : ${e.message}`);
      bilan.echecs++;
      continue;
    }

    console.log(`${infos.sourceLargeur}x${infos.sourceHauteur} -> 500x500, ${(infos.octets / 1024).toFixed(1)} Ko`);
    if (remplacement) bilan.remplaces++;
    else bilan.importes++;

    const enrichi = {
      ...item,
      image: cheminRelatif,
      // Sans licence ni auteur renseignes, l'element reste signale a
      // verifier : la page Credits ne doit annoncer que ce qui est sur.
      status: license && author ? 'ok' : 'a_verifier_manuellement',
      source,
      license: license || 'N/A',
      author: author || 'N/A',
      importeLe: new Date().toISOString(),
      attribution: {
        origine: 'import local',
        fichier: nom,
        ...(o.page ? { page: o.page } : {}),
      },
    };
    delete enrichi.failureReason;
    delete enrichi.lastFailureReason;
    delete enrichi.reserveVisuelle;

    frais.push({ collection, item: enrichi });

    if (license && author) {
      licences.push({
        id, name: item.name, type,
        source, license, author,
        descriptionUrl: o.page || null,
        file: nom,
        storedAs: cheminRelatif,
      });
    }
  }

  if (ESSAI) {
    console.log('\nEssai termine. Relancez sans --essai pour ecrire.');
    return;
  }

  if (!frais.length) {
    console.log('\nAucune image n’a pu etre traitee. db.json est inchange.');
    process.exitCode = 1;
    return;
  }

  /* --- Fusion et ecriture, par le chemin atomique existant ------------ */

  // On ne soumet a la fusion QUE les elements importes : les autres
  // restent tels quels, la regle de non-regression s'applique.
  const { merged, report } = mergeDb(db, frais);
  const ecriture = commitDb(merged);

  if (!ecriture.written) {
    console.log(`\n!! ${ecriture.reason}`);
    process.exitCode = 2;
    return;
  }

  const ajoutees = appendLicences(licences);

  console.log(`\n--- Bilan ---`);
  console.log(`  nouvelles images      : ${bilan.importes}`);
  console.log(`  remplacements         : ${bilan.remplaces}`);
  console.log(`  echecs de traitement  : ${bilan.echecs}`);
  console.log(`  fichiers non reconnus : ${inconnus.length}`);
  console.log(`  sans origine complete : ${bilan.sansOrigine}${bilan.sansOrigine ? '  (marquees a verifier)' : ''}`);
  console.log(`  journal des licences  : ${ajoutees} entree(s) ajoutee(s)`);
  console.log(`  db.json               : ${ecriture.before} -> ${ecriture.after} elements avec attribution complete`);
  console.log(`  sauvegarde            : ${ecriture.backup}`);
  console.log(`  fusion                : ${report.nouveaux} nouveaux, ${report.conserves} conserves, ${report.preserves} preserves`);

  if (bilan.sansOrigine) {
    console.log(`\n  Pour que la page Credits soit exacte, renseignez ${DOSSIER}/origines.json`);
    console.log(`  puis relancez l'import sur les memes fichiers.`);
  }
  console.log(`\n  Pensez a relancer : npm run inventaire`);
}

/** Suggere l'identifiant connu le plus proche d'un nom de fichier fautif. */
function suggerer(id, connus) {
  let meilleur = null;
  let score = Infinity;
  for (const cle of connus.keys()) {
    const d = distance(id, cle);
    if (d < score) {
      score = d;
      meilleur = cle;
    }
  }
  return score <= Math.max(2, Math.floor(id.length * 0.34)) ? connus.get(meilleur).item.id : null;
}

/** Distance de Levenshtein, pour la suggestion. */
function distance(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

run().catch((e) => {
  console.error(`\nECHEC DE L'IMPORT : ${e.stack || e.message}`);
  console.error('db.json n’a pas ete modifie.');
  process.exit(1);
});
