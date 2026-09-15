/**
 * Collecte des visuels de Babi Games.
 *
 * Orchestrateur. Toute la logique vit dans scripts/lib/ :
 *   http.js    - reseau resilient, gestion du 429, rythme adaptatif
 *   resolve.js - resolution Wikidata avec validation P31
 *   images.js  - controle qualite et traitement des vignettes
 *   store.js   - fusion non regressive, ecriture atomique, journal des licences
 *
 * Usage :
 *   node scripts/seed_images.js                  collecte complete (reprise auto)
 *   node scripts/seed_images.js --only=food_1,art_3
 *   node scripts/seed_images.js --type=nourriture
 *   node scripts/seed_images.js --fresh          ignore l'etat de reprise
 *   node scripts/seed_images.js --limit=20
 *   node scripts/seed_images.js --force          passe outre le garde-fou d'ecriture
 *
 * Ce script ne peut plus detruire db.json : il fusionne, sauvegarde avant
 * ecriture, et refuse d'ecrire si le taux de reussite s'effondre.
 */

import fs from 'fs';
import path from 'path';
import { resolveItem } from './lib/resolve.js';
import { commonsImageInfo, openverseSearch, downloadAndProcess, attributionComplete, ImageError, MIN_SIDE } from './lib/images.js';
import { pacerReport, FetchError, ERR } from './lib/http.js';
import {
  readDb, mergeDb, commitDb, appendLicences, readState, writeState,
  TYPE_TO_COLLECTION, TYPE_TO_FOLDER, countResolved, isResolved, PATHS,
} from './lib/store.js';

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const OPTIONS = {
  only: opt('only') ? opt('only').split(',').map((s) => s.trim()) : null,
  type: opt('type'),
  limit: opt('limit') ? Number(opt('limit')) : null,
  fresh: flag('fresh'),
  force: flag('force'),
};

/* Marques deposees : pas de visuel libre exploitable, on n'interroge pas les API. */
const BRANDS_TO_SKIP = ['dinor', 'maggi', 'beaufort', 'peak', 'pénélope', 'penelope', 'sotra', 'kirène', 'kirene', 'tecno'];
const isBrand = (item) => {
  const hay = `${item.name} ${item.search_query || ''}`.toLowerCase();
  return BRANDS_TO_SKIP.some((b) => hay.includes(b));
};

const PLACEHOLDER = {
  artiste: '/images/placeholders/artiste.svg',
  footballeur: '/images/placeholders/footballeur.svg',
  public: '/images/placeholders/artiste.svg',
  nourriture: '/images/placeholders/nourriture.svg',
  produit: '/images/placeholders/produit.svg',
};

/* ------------------------------------------------------------------ */
/* Journalisation                                                      */
/* ------------------------------------------------------------------ */

const LOG_DIR = 'scripts/logs';
fs.mkdirSync(LOG_DIR, { recursive: true });
const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = path.join(LOG_DIR, `seed-${runId}.log`);

function log(line = '') {
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

/* ------------------------------------------------------------------ */
/* Disjoncteur : les 429 n'y entrent jamais                            */
/* ------------------------------------------------------------------ */

class Breaker {
  constructor(name, threshold = 8) {
    this.name = name;
    this.threshold = threshold;
    this.hard = 0;
    this.open = false;
  }
  /** Seul un echec DUR compte. Un 429 est un signal de rythme, pas une panne. */
  record(err) {
    if (err instanceof FetchError && !err.isHardFailure) {
      if (err.kind === ERR.RATE_LIMIT) {
        log(`    quota atteint, le rythme s'adapte automatiquement (aucun impact sur le disjoncteur)`);
      }
      return;
    }
    this.hard++;
    if (this.hard >= this.threshold) {
      this.open = true;
      log(`\n  [SYSTEME] ${this.name} desactive apres ${this.hard} echecs DURS consecutifs (reseau/serveur).\n`);
    }
  }
  success() {
    this.hard = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Traitement d'un item                                                */
/* ------------------------------------------------------------------ */

async function processItem(item, breakers) {
  const folder = TYPE_TO_FOLDER[item.type];
  const relPath = `/images/${folder}/${item.id}.jpg`;
  const absPath = path.join('public', 'images', folder, `${item.id}.jpg`);

  const base = {
    id: item.id,
    name: item.name,
    image: PLACEHOLDER[item.type],
    status: 'a_verifier_manuellement',
    source: 'N/A',
    license: 'N/A',
    author: 'N/A',
    lastAttempt: new Date().toISOString(),
  };
  if (item.category) base.category = item.category;
  if (item.price !== undefined) base.price = item.price;

  const fail = (reason, extra = {}) => ({ ...base, failureReason: reason, ...extra });

  if (isBrand(item)) {
    return { item: fail('marque deposee, exclue volontairement (BRANDS_TO_SKIP)'), licence: null, outcome: 'marque' };
  }

  // --- 1. Resolution Wikidata -----------------------------------------
  let resolution = null;
  if (!breakers.wikidata.open) {
    try {
      resolution = await resolveItem(item, { log: (m) => log(m) });
      breakers.wikidata.success();
    } catch (e) {
      breakers.wikidata.record(e);
      log(`    resolution impossible : ${e.kind || 'ERREUR'} - ${e.message}`);
      return { item: fail(`resolution Wikidata en echec : ${e.kind || 'erreur'}`), licence: null, outcome: 'erreur' };
    }
  }

  let meta = null;

  if (resolution?.found) {
    log(`    retenu [${resolution.qid}] ${resolution.label} :: ${(resolution.description || '').slice(0, 56)}`);
    log(`    motif : ${resolution.reason}`);
    try {
      meta = await commonsImageInfo(resolution.imageFile);
      if (meta) meta.qid = resolution.qid;
    } catch (e) {
      breakers.wikidata.record(e);
      log(`    fiche Commons illisible : ${e.message}`);
    }
  } else if (resolution) {
    const top = resolution.rejected?.slice(0, 2).map((r) => `${r.qid || '-'} (${r.reason})`).join(' ; ');
    log(`    ecarte : ${resolution.reason}${top ? ` | ${top}` : ''}`);
  }

  // --- 2. Repli Openverse, plats et produits uniquement ---------------
  if (!meta && (item.type === 'nourriture' || item.type === 'produit') && !breakers.openverse.open) {
    try {
      meta = await openverseSearch(item.search_query || item.name);
      if (meta) log(`    repli Openverse : ${meta.width}x${meta.height}, ${meta.license || 'licence non precisee'}`);
      breakers.openverse.success();
    } catch (e) {
      breakers.openverse.record(e);
      log(`    Openverse en echec : ${e.kind || 'ERREUR'} - ${e.message}`);
    }
  }

  if (!meta) {
    const reason = resolution?.found
      ? 'entite validee mais fiche image inaccessible'
      : resolution
        ? `aucune entite valide (${resolution.reason})`
        : 'source desactivee (disjoncteur ouvert)';
    return { item: fail(reason), licence: null, outcome: 'sans_source' };
  }

  // --- 3. Attribution obligatoire -------------------------------------
  // Consigne produit : aucune image sans source + licence + auteur complets.
  if (!attributionComplete(meta)) {
    const manque = [
      !meta.source && 'source',
      !meta.license && 'licence',
      !meta.author && 'auteur',
    ].filter(Boolean).join(', ');
    log(`    ECARTE : attribution incomplete (${manque || 'champs vides ou "unknown"'})`);
    return { item: fail(`attribution incomplete : ${manque || 'auteur ou licence non renseigne'}`), licence: null, outcome: 'attribution_incomplete' };
  }

  // --- 4. Controle de taille annonce ----------------------------------
  if (meta.width && meta.height && Math.min(meta.width, meta.height) < MIN_SIDE) {
    log(`    ECARTE : source ${meta.width}x${meta.height}, sous le seuil de ${MIN_SIDE} px`);
    return { item: fail(`source trop petite (${meta.width}x${meta.height})`), licence: null, outcome: 'trop_petite' };
  }

  // --- 5. Telechargement et vignette ----------------------------------
  let processed;
  try {
    const cadrage = (item.type === 'artiste' || item.type === 'footballeur' || item.type === 'public') ? 'personne' : 'objet';
    processed = await downloadAndProcess(meta.url, absPath, cadrage);
  } catch (e) {
    const why = e instanceof ImageError ? e.message : `${e.kind || 'ERREUR'} - ${e.message}`;
    if (!(e instanceof ImageError)) breakers.wikidata.record(e);
    log(`    ECARTE : ${why}`);
    return { item: fail(`traitement image : ${why}`), licence: null, outcome: 'image_rejetee' };
  }

  log(`    OK ${processed.sourceWidth}x${processed.sourceHeight} -> 500x500, ${(processed.bytes / 1024).toFixed(1)} Ko`);

  const resolved = {
    ...base,
    image: relPath,
    status: 'ok',
    source: meta.source,
    license: meta.license,
    author: meta.author,
    attribution: {
      qid: meta.qid || null,
      fichier: meta.filename,
      page: meta.descriptionUrl,
    },
  };
  delete resolved.failureReason;

  const licence = {
    id: item.id,
    name: item.name,
    type: item.type,
    source: meta.source,
    license: meta.license,
    author: meta.author,
    qid: meta.qid || null,
    file: meta.filename,
    descriptionUrl: meta.descriptionUrl,
    originalUrl: meta.originalUrl || meta.url,
    sourceSize: `${processed.sourceWidth}x${processed.sourceHeight}`,
    storedAs: relPath,
  };

  return { item: resolved, licence, outcome: 'ok' };
}

/* ------------------------------------------------------------------ */
/* Boucle principale                                                   */
/* ------------------------------------------------------------------ */

async function run() {
  log(`=== Collecte Babi Games - ${runId} ===`);
  log(`Journal : ${LOG_FILE}\n`);

  const rawPath = 'src/data/rawItems.json';
  if (!fs.existsSync(rawPath)) throw new Error(`${rawPath} introuvable`);
  let items = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

  if (OPTIONS.type) items = items.filter((i) => i.type === OPTIONS.type);
  if (OPTIONS.only) items = items.filter((i) => OPTIONS.only.includes(i.id));
  if (OPTIONS.limit) items = items.slice(0, OPTIONS.limit);

  const existingDb = readDb();
  const before = countResolved(existingDb);
  log(`Base actuelle : ${before.total} items avec attribution complete`);
  log(`A traiter     : ${items.length} items\n`);

  const state = OPTIONS.fresh ? { items: {}, startedAt: runId } : readState();
  state.startedAt ||= runId;

  const breakers = {
    wikidata: new Breaker('Wikidata/Commons'),
    openverse: new Breaker('Openverse'),
  };

  const fresh = [];
  const licences = [];
  const outcomes = {};
  let done = 0;

  for (const item of items) {
    done++;
    const prefix = `[${String(done).padStart(3)}/${items.length}]`;

    // Reprise : on ne retraite pas ce qui a deja abouti.
    const prior = state.items[item.id];
    if (!OPTIONS.fresh && prior?.outcome === 'ok') {
      const existing = (existingDb[TYPE_TO_COLLECTION[item.type]] || []).find((x) => x.id === item.id);
      if (existing && isResolved(existing)) {
        fresh.push({ collection: TYPE_TO_COLLECTION[item.type], item: existing });
        outcomes.repris = (outcomes.repris || 0) + 1;
        log(`${prefix} ${item.name.slice(0, 34).padEnd(36)} deja resolu, ignore`);
        continue;
      }
    }

    log(`${prefix} ${item.type.padEnd(12)} ${item.name.slice(0, 40)}`);

    let result;
    try {
      result = await processItem(item, breakers);
    } catch (e) {
      log(`    ERREUR INATTENDUE : ${e.message}`);
      result = {
        item: {
          id: item.id, name: item.name, image: PLACEHOLDER[item.type],
          status: 'a_verifier_manuellement', source: 'N/A', license: 'N/A', author: 'N/A',
          failureReason: `erreur inattendue : ${e.message}`, lastAttempt: new Date().toISOString(),
          ...(item.category ? { category: item.category } : {}),
          ...(item.price !== undefined ? { price: item.price } : {}),
        },
        licence: null, outcome: 'erreur',
      };
    }

    fresh.push({ collection: TYPE_TO_COLLECTION[item.type], item: result.item });
    if (result.licence) licences.push(result.licence);
    outcomes[result.outcome] = (outcomes[result.outcome] || 0) + 1;

    state.items[item.id] = { outcome: result.outcome, at: new Date().toISOString() };
    if (done % 10 === 0) writeState(state); // sauvegarde de progression reguliere
  }

  writeState(state);

  /* --- Journal des licences : ajout seul, avant toute ecriture de db --- */
  const added = appendLicences(licences);
  log(`\nJournal des licences : ${added} entrees ajoutees dans ${PATHS.LICENCE_JOURNAL}`);

  /* --- Fusion non regressive --- */
  const { merged, report } = mergeDb(existingDb, fresh);
  log(
    `Fusion : ${report.nouveaux} nouveaux, ${report.conserves} conserves, ` +
    `${report.regressionsEvitees} regressions evitees, ${report.preserves} items hors rawItems preserves, ` +
    `${report.placeholders} placeholders`
  );

  /* --- Ecriture protegee --- */
  const commit = commitDb(merged, { force: OPTIONS.force });
  if (!commit.written) {
    log(`\n!! ${commit.reason}`);
    log('db.json est INCHANGE. Le journal des licences, lui, a bien ete complete.');
    writeReport(merged, outcomes, items.length, commit);
    process.exitCode = 2;
    return;
  }
  log(`db.json ecrit (${commit.before} -> ${commit.after} items resolus). Sauvegarde : ${commit.backup}`);

  writeReport(merged, outcomes, items.length, commit);

  log('\n--- Bilan ---');
  for (const [k, v] of Object.entries(outcomes)) log(`  ${k.padEnd(24)} ${v}`);
  log(`  rythme final : ${JSON.stringify(pacerReport())}`);
}

function writeReport(db, outcomes, traites, commit) {
  const rapport = {
    execution: runId,
    traites,
    resultats: outcomes,
    ecriture: commit.written ? 'effectuee' : `refusee : ${commit.reason}`,
    compteurs: {},
    valides: [],
    a_verifier_manuellement: {},
  };

  for (const [type, collection] of Object.entries(TYPE_TO_COLLECTION)) {
    const list = db[collection] || [];
    const ok = list.filter(isResolved);
    const pending = list.filter((i) => !isResolved(i));
    rapport.compteurs[collection] = `${ok.length}/${list.length} avec attribution complete`;
    rapport.valides.push(...ok.map((i) => ({
      id: i.id, name: i.name, type, image: i.image,
      source: i.source, license: i.license, author: i.author,
    })));
    rapport.a_verifier_manuellement[collection] = pending.map((i) => ({
      id: i.id, name: i.name, raison: i.failureReason || i.lastFailureReason || 'non renseignee',
    }));
  }

  fs.writeFileSync('public/rapport.json', JSON.stringify(rapport, null, 2), 'utf8');
  log(`rapport.json ecrit : ${rapport.valides.length} items avec attribution complete`);
}

run().catch((e) => {
  log(`\nECHEC DE LA COLLECTE : ${e.stack || e.message}`);
  log('db.json n\'a pas ete modifie.');
  process.exit(1);
});
