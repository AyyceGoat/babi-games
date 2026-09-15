/**
 * Persistance du seeder.
 *
 * Corrige le comportement destructif decrit dans DIAGNOSTIC.md section C.1 :
 * l'ancien script reconstruisait db.json integralement et l'ecrivait sans
 * condition, meme quand zero item avait ete resolu.
 *
 * Regles appliquees ici :
 *  1. sauvegarde horodatee avant toute ecriture ;
 *  2. ecriture atomique (fichier temporaire puis rename) ;
 *  3. FUSION et jamais remplacement ;
 *  4. aucune regression : un item resolu ne retombe jamais en placeholder ;
 *  5. les items absents de rawItems.json (ajouts via l'ecran Admin) survivent ;
 *  6. refus d'ecrire si le taux de reussite s'effondre ;
 *  7. journal des licences separe, cumulatif, qu'aucune execution n'ecrase.
 */

import fs from 'fs';
import path from 'path';

export const COLLECTIONS = ['artists', 'footballers', 'publicFigures', 'foods', 'products'];

export const TYPE_TO_COLLECTION = {
  artiste: 'artists',
  footballeur: 'footballers',
  public: 'publicFigures',
  nourriture: 'foods',
  produit: 'products',
};

export const TYPE_TO_FOLDER = {
  artiste: 'artistes',
  footballeur: 'footballeurs',
  public: 'publicfigures',
  nourriture: 'nourriture',
  produit: 'produits',
};

const DB_PATH = 'src/data/db.json';
const BACKUP_DIR = 'backup_db';
const LICENCE_JOURNAL = 'data/licences.jsonl';
const STATE_PATH = 'scripts/logs/seed_state.json';

const emptyDb = () => COLLECTIONS.reduce((acc, c) => ((acc[c] = []), acc), {});

/** Un item est considere comme resolu s'il porte une vraie image ET une attribution complete. */
export function isResolved(item) {
  if (!item || !item.image) return false;
  if (item.image.includes('/placeholders/')) return false;
  if (item.status !== 'ok') return false;
  const filled = (v) => typeof v === 'string' && v.trim() !== '' && v !== 'N/A';
  return filled(item.source) && filled(item.license) && filled(item.author);
}

export function readDb() {
  if (!fs.existsSync(DB_PATH)) return emptyDb();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const db = emptyDb();
    for (const c of COLLECTIONS) if (Array.isArray(parsed[c])) db[c] = parsed[c];
    return db;
  } catch (e) {
    throw new Error(`db.json illisible (${e.message}). Refus de continuer pour ne pas l'ecraser.`);
  }
}

export function countResolved(db) {
  const per = {};
  let total = 0;
  for (const c of COLLECTIONS) {
    per[c] = (db[c] || []).filter(isResolved).length;
    total += per[c];
  }
  return { per, total };
}

/* ------------------------------------------------------------------ */
/* Fusion non regressive                                               */
/* ------------------------------------------------------------------ */

/**
 * Fusionne les resultats d'une execution dans la base existante.
 *
 * - item resolu par cette execution      -> on prend le nouveau
 * - item non resolu mais deja resolu     -> ON GARDE L'ANCIEN (pas de regression)
 * - item non resolu et jamais resolu     -> placeholder, avec la raison consignee
 * - item present en base mais absent de rawItems.json -> preserve tel quel
 */
export function mergeDb(existingDb, freshItems) {
  const merged = emptyDb();
  const report = { nouveaux: 0, conserves: 0, regressionsEvitees: 0, preserves: 0, placeholders: 0 };

  const freshByCollection = {};
  for (const { collection, item } of freshItems) {
    (freshByCollection[collection] ||= []).push(item);
  }

  for (const collection of COLLECTIONS) {
    const oldList = existingDb[collection] || [];
    const oldById = new Map(oldList.map((i) => [i.id, i]));
    const fresh = freshByCollection[collection] || [];
    const seen = new Set();
    const out = [];

    for (const item of fresh) {
      seen.add(item.id);
      const previous = oldById.get(item.id);

      if (isResolved(item)) {
        out.push(item);
        report.nouveaux++;
      } else if (previous && isResolved(previous)) {
        // Regle 4 : on ne redescend jamais un item resolu vers un placeholder.
        out.push({ ...previous, lastAttempt: item.lastAttempt, lastFailureReason: item.failureReason || null });
        report.regressionsEvitees++;
        report.conserves++;
      } else {
        out.push(item);
        report.placeholders++;
      }
    }

    // Regle 5 : ce que rawItems.json ne connait pas (ajouts Admin) survit.
    for (const old of oldList) {
      if (!seen.has(old.id)) {
        out.push(old);
        report.preserves++;
      }
    }

    merged[collection] = out;
  }

  return { merged, report };
}

/* ------------------------------------------------------------------ */
/* Ecriture protegee                                                   */
/* ------------------------------------------------------------------ */

export function backupDb() {
  if (!fs.existsSync(DB_PATH)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(BACKUP_DIR, `db-${stamp}.json`);
  fs.copyFileSync(DB_PATH, dest);
  return dest;
}

function writeAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, contents, 'utf8');
  fs.renameSync(tmp, filePath); // atomique sur le meme volume
}

/**
 * Ecrit db.json si et seulement si la fusion ne degrade pas la base.
 * @returns {{written: boolean, reason?: string, backup?: string, before:number, after:number}}
 */
export function commitDb(mergedDb, { force = false, collapseRatio = 0.8 } = {}) {
  const before = countResolved(readDb()).total;
  const after = countResolved(mergedDb).total;

  // Regle 6 : garde-fou contre l'effondrement (le scenario de juillet).
  if (!force && before > 0 && after < Math.floor(before * collapseRatio)) {
    return {
      written: false,
      before,
      after,
      reason:
        `Refus d'ecrire : ${after} items resolus contre ${before} avant fusion ` +
        `(seuil : ${Math.floor(before * collapseRatio)}). ` +
        `La base existante est conservee intacte. Utiliser --force pour passer outre.`,
    };
  }

  const backup = backupDb();
  writeAtomic(DB_PATH, JSON.stringify(mergedDb, null, 2) + '\n');
  return { written: true, before, after, backup };
}

/* ------------------------------------------------------------------ */
/* Journal des licences : cumulatif, jamais ecrase                     */
/* ------------------------------------------------------------------ */

/**
 * Regle 7. Format JSONL en ajout seul : la perte decrite en section A.4
 * du diagnostic (metadonnees ecrasees par une execution ratee) devient
 * structurellement impossible.
 */
export function appendLicences(entries) {
  if (!entries.length) return 0;
  fs.mkdirSync(path.dirname(LICENCE_JOURNAL), { recursive: true });
  const stamp = new Date().toISOString();
  const lines = entries.map((e) => JSON.stringify({ recordedAt: stamp, ...e })).join('\n') + '\n';
  fs.appendFileSync(LICENCE_JOURNAL, lines, 'utf8');
  return entries.length;
}

export function readLicenceJournal() {
  if (!fs.existsSync(LICENCE_JOURNAL)) return [];
  return fs
    .readFileSync(LICENCE_JOURNAL, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** Derniere attribution connue pour chaque id (le journal peut contenir plusieurs passages). */
export function licenceIndex() {
  const idx = new Map();
  for (const entry of readLicenceJournal()) {
    if (entry.id && entry.license && entry.license !== 'N/A') idx.set(entry.id, entry);
  }
  return idx;
}

/* ------------------------------------------------------------------ */
/* Reprise sur incident                                                */
/* ------------------------------------------------------------------ */

export function readState() {
  if (!fs.existsSync(STATE_PATH)) return { items: {}, startedAt: null };
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { items: {}, startedAt: null };
  }
}

export function writeState(state) {
  writeAtomic(STATE_PATH, JSON.stringify(state, null, 2));
}

export const PATHS = { DB_PATH, BACKUP_DIR, LICENCE_JOURNAL, STATE_PATH };
