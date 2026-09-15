/**
 * Resolution d'entites Wikidata, avec validation.
 *
 * Corrige le defaut structurel decrit dans DIAGNOSTIC.md section B.4 :
 * l'ancien script prenait la premiere entite dont le libelle ou un alias
 * correspondait, sans jamais verifier sa nature. D'ou Moliere le dramaturge
 * pour un artiste zouglou, un genre d'araignees-loups pour l'alloco, un
 * avion-cargo pour VDA et une commune italienne pour Molare.
 *
 * Deux changements de fond :
 *  1. le repli "premier resultat" est supprime ;
 *  2. chaque candidat est VALIDE avant d'etre retenu, et on parcourt la
 *     liste jusqu'a en trouver un qui passe. Si aucun ne passe, on ne
 *     renvoie rien : mieux vaut pas d'image qu'une image fausse.
 */

import { fetchJson } from './http.js';

const API = 'https://www.wikidata.org/w/api.php';

/* Entites de reference */
const Q = {
  HUMAN: 'Q5',
  COTE_DIVOIRE: 'Q1008',
  TAXON: 'Q16521',
  DISAMBIGUATION: 'Q4167410',
  FAMILY_NAME: 'Q101352',
  GIVEN_NAME: 'Q202444',
};

/* Proprietes lues sur chaque candidat */
const PROPS = {
  INSTANCE_OF: 'P31',
  CITIZENSHIP: 'P27',
  COUNTRY_ORIGIN: 'P495',
  COUNTRY: 'P17',
  COORDINATES: 'P625',
  IMAGE: 'P18',
  OCCUPATION: 'P106',
  BIRTH: 'P569',
  TAXON_NAME: 'P225',
};

/** Familles de classes reconnues, par mots-cles sur le libelle anglais du P31. */
const CLASS_KEYWORDS = {
  groupe: /\b(musical group|band|musical ensemble|duo|trio|girl group|boy band|musical duo|vocal group)\b/i,
  humain: /\b(human)\b/i,
  plat: /\b(dish|food|foodstuff|meal|stew|soup|bread|cake|dessert|snack|porridge|fritter|cuisine|delicacy|staple|sauce|condiment|beverage|drink|alcoholic|juice|pastry|doughnut|flatbread|paste|puree|semolina|couscous)\b/i,
  produit: /\b(product|brand|beverage|drink|food|dish|commodity|goods|device|smartphone|consumer|packaging|container|bottle|soap|sugar|coffee|chocolate|rice|pasta|fruit|vegetable|ticket|transport|banknote)\b/i,
};

/** Classes rejetees d'office, quel que soit le type d'item. */
const REJECT_KEYWORDS =
  /\b(commune|municipality|town|city|village|settlement|hamlet|province|department|prefecture|district|region|country|state|territory|island|river|mountain|building|church|tower|castle|monument|street|square|station|airport|airline|company|business|enterprise|organization|university|school|taxon|genus|species|family of|order of|arachnid|spider|insect|beetle|plant|animal|film|movie|album|song|single|television series|tv series|talk show|video game|book|novel|painting|sculpture|dance|folk dance|given name|family name|surname|disambiguation|concept|process|event|war|battle|revolution|ideology|religion|language|unit of|number|colou?r)\b/i;

/* ------------------------------------------------------------------ */
/* Appels API                                                          */
/* ------------------------------------------------------------------ */

export async function searchEntities(query, { limit = 15, language = 'fr' } = {}) {
  const url =
    `${API}?action=wbsearchentities&search=${encodeURIComponent(query)}` +
    `&language=${language}&uselang=${language}&type=item&limit=${limit}&format=json`;
  const data = await fetchJson(url);
  return Array.isArray(data.search) ? data.search : [];
}

export async function getEntities(qids) {
  if (!qids.length) return {};
  const url =
    `${API}?action=wbgetentities&ids=${qids.join('|')}` +
    `&props=claims|labels|descriptions&languages=fr|en&format=json`;
  const data = await fetchJson(url);
  return data.entities || {};
}

/** Libelles anglais d'un lot de QID, pour lire la nature reelle d'un P31. */
async function labelsFor(qids) {
  if (!qids.length) return {};
  const out = {};
  for (let i = 0; i < qids.length; i += 40) {
    const batch = qids.slice(i, i + 40);
    const url = `${API}?action=wbgetentities&ids=${batch.join('|')}&props=labels&languages=en|fr&format=json`;
    const data = await fetchJson(url);
    for (const [qid, ent] of Object.entries(data.entities || {})) {
      out[qid] = ent?.labels?.en?.value || ent?.labels?.fr?.value || '';
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Lecture des claims                                                  */
/* ------------------------------------------------------------------ */

const claimIds = (entity, prop) =>
  (entity?.claims?.[prop] || [])
    .map((c) => c?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);

const hasClaim = (entity, prop) => Boolean(entity?.claims?.[prop]?.length);

const claimValue = (entity, prop) => entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value ?? null;

function birthYear(entity) {
  const v = claimValue(entity, PROPS.BIRTH);
  if (!v?.time) return null;
  const m = /^[+-](\d{4})/.exec(v.time);
  return m ? Number(m[1]) : null;
}

const describe = (entity) =>
  entity?.descriptions?.fr?.value || entity?.descriptions?.en?.value || '';

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * @returns {{ok:boolean, reason:string, confidence:'haute'|'moyenne'}}
 */
export function validateEntity(entity, itemType, classLabels) {
  const qid = entity?.id || '?';
  const desc = describe(entity);
  const instances = claimIds(entity, PROPS.INSTANCE_OF);
  const instanceLabels = instances.map((q) => classLabels[q] || '').filter(Boolean);
  const joined = instanceLabels.join(' | ');

  // -- Rejets transverses -------------------------------------------------
  // Ces controles valent avec ou sans P31 : ils reposent sur d'autres claims.

  if (instances.includes(Q.DISAMBIGUATION)) {
    return { ok: false, reason: 'page d\'homonymie' };
  }
  if (instances.includes(Q.FAMILY_NAME) || instances.includes(Q.GIVEN_NAME)) {
    return { ok: false, reason: 'entite "nom de famille" ou "prenom", pas une personne' };
  }
  if (instances.includes(Q.TAXON) || hasClaim(entity, PROPS.TAXON_NAME)) {
    return { ok: false, reason: `taxon biologique (${joined || qid}) - cas "alloco / araignee-loup"` };
  }
  // Un lieu porte des coordonnees. Regle qui elimine d'un coup Molare,
  // Bangui-Philippines, la mairie d'Eden et la tour de garde.
  if (hasClaim(entity, PROPS.COORDINATES)) {
    return { ok: false, reason: `lieu geographique (coordonnees P625 presentes : ${joined || qid})` };
  }
  if (REJECT_KEYWORDS.test(joined)) {
    const hit = joined.match(REJECT_KEYWORDS)?.[0];
    return { ok: false, reason: `classe rejetee : "${hit}" (${joined})` };
  }
  if (!hasClaim(entity, PROPS.IMAGE)) {
    return { ok: false, reason: 'aucune image P18 sur cette entite' };
  }

  // -- Personnes et groupes ----------------------------------------------

  if (itemType === 'artiste' || itemType === 'footballeur' || itemType === 'public') {
    // Pour une personne, l'absence de P31 est disqualifiante : trop risque.
    if (!instances.length) {
      return { ok: false, reason: `nature inconnue (aucun P31 sur ${qid})` };
    }
    const estHumain = instances.includes(Q.HUMAN) || CLASS_KEYWORDS.humain.test(joined);
    const estGroupe = CLASS_KEYWORDS.groupe.test(joined);

    if (!estHumain && !estGroupe) {
      return { ok: false, reason: `ni personne ni groupe musical (${joined})` };
    }

    const pays = estGroupe
      ? [...claimIds(entity, PROPS.COUNTRY_ORIGIN), ...claimIds(entity, PROPS.COUNTRY)]
      : claimIds(entity, PROPS.CITIZENSHIP);

    if (pays.includes(Q.COTE_DIVOIRE)) {
      return { ok: true, reason: 'nationalite ivoirienne confirmee', confidence: 'haute' };
    }
    if (pays.length > 0) {
      // Signal decisif : c'est bien une personne, mais pas la bonne.
      // C'est ce test qui elimine Moliere (France, ne en 1622) et Joelle Carter (USA).
      return { ok: false, reason: `nationalite etrangere (${pays.join(', ')}), item ivoirien attendu` };
    }

    // Pas de nationalite renseignee : on se rabat sur la description.
    if (/ivoir|ivorian|c[oô]te d['e ]?ivoire|abidjan/i.test(desc)) {
      return { ok: true, reason: 'lien ivoirien atteste par la description', confidence: 'haute' };
    }

    const annee = birthYear(entity);
    if (annee !== null && annee < 1930) {
      return { ok: false, reason: `naissance en ${annee}, incompatible avec un artiste contemporain` };
    }

    // Consigne du projet : dans le doute, on ecarte.
    return { ok: false, reason: 'lien avec la Cote d\'Ivoire non confirme (P27/P495 absents)' };
  }

  // -- Plats et produits --------------------------------------------------

  // Beaucoup de plats africains sont mal modelises sur Wikidata et n'ont
  // aucun P31 (cas du kedjenou, Q1795580). Rejeter sur ce seul motif ferait
  // perdre des entites correctes ; on se rabat alors sur la description,
  // qui doit etre explicitement alimentaire.
  const DESC_ALIMENTAIRE =
    /\b(plat|aliment|nourriture|cuisine|boisson|dessert|sauce|beignet|p[aâ]te|ragout|rago[uû]t|soupe|bouillie|galette|friandise|stew|dish|food|snack|porridge|fritter|beverage|drink)\b/i;

  if (itemType === 'nourriture') {
    if (CLASS_KEYWORDS.plat.test(joined)) {
      return { ok: true, reason: `classe alimentaire reconnue (${joined})`, confidence: 'haute' };
    }
    if (DESC_ALIMENTAIRE.test(desc)) {
      return {
        ok: true,
        reason: instances.length
          ? `description alimentaire ("${desc.slice(0, 50)}")`
          : `sans P31, mais description alimentaire explicite ("${desc.slice(0, 50)}")`,
        confidence: 'moyenne',
      };
    }
    return { ok: false, reason: `pas un plat (${joined || 'classe inconnue'}, description : "${desc.slice(0, 40)}")` };
  }

  if (itemType === 'produit') {
    if (CLASS_KEYWORDS.produit.test(joined) || CLASS_KEYWORDS.plat.test(joined)) {
      return { ok: true, reason: `classe produit reconnue (${joined})`, confidence: 'moyenne' };
    }
    if (DESC_ALIMENTAIRE.test(desc)) {
      return { ok: true, reason: `description de produit consommable ("${desc.slice(0, 50)}")`, confidence: 'moyenne' };
    }
    return { ok: false, reason: `pas un produit identifiable (${joined || 'classe inconnue'})` };
  }

  return { ok: false, reason: `type d'item inconnu : ${itemType}` };
}

/* ------------------------------------------------------------------ */
/* Requetes enrichies                                                  */
/* ------------------------------------------------------------------ */

/**
 * Variantes de recherche, du plus precis au plus large.
 * Le contexte ivoirien est ajoute en dernier recours : wbsearchentities
 * cherche dans les libelles et alias, ou "Cote d'Ivoire" ne figure pas,
 * mais certaines entites portent un alias qualifie.
 */
export function queryVariants(item) {
  const base = item.search_query || item.name;
  const out = [];
  const push = (v) => {
    const t = (v || '').trim();
    if (t && !out.includes(t)) out.push(t);
  };

  push(base);

  // "Didier Zokora (Maestro)" -> "Didier Zokora"
  if (base.includes('(')) push(base.replace(/\s*\([^)]*\)/g, ''));

  // "Kerozen DJ" -> "Kerozen" ; "DJ Lewis" garde son DJ (il fait partie du nom)
  push(base.replace(/\s+DJ$/i, ''));

  // "Lamine Camara (CI)" -> "Lamine Camara"
  push(base.replace(/\s*\(CI\)/i, ''));

  // Contexte ivoirien explicite
  if (item.type === 'nourriture' || item.type === 'produit') {
    push(`${base} Côte d'Ivoire`);
    push(`${base} ivoirien`);
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Resolution complete d'un item                                       */
/* ------------------------------------------------------------------ */

/**
 * Parcourt les candidats et retient le PREMIER QUI PASSE LA VALIDATION.
 * Aucun repli sur le premier resultat.
 *
 * @returns {Promise<{found:boolean, qid?, label?, description?, imageFile?, reason, confidence?, rejected:Array}>}
 */
export async function resolveItem(item, { log = () => {} } = {}) {
  const rejected = [];
  const variants = queryVariants(item);

  for (const query of variants) {
    let candidates;
    try {
      candidates = await searchEntities(query);
    } catch (e) {
      log(`    recherche "${query}" en echec : ${e.kind || 'ERREUR'} - ${e.message}`);
      throw e; // remonte au disjoncteur de l'orchestrateur
    }

    if (!candidates.length) {
      rejected.push({ query, qid: null, reason: 'aucun resultat' });
      continue;
    }

    const qids = candidates.map((c) => c.id);
    const entities = await getEntities(qids.slice(0, 10));

    // Libelles des classes P31, pour juger la nature reelle des candidats.
    const classQids = new Set();
    for (const ent of Object.values(entities)) {
      for (const q of claimIds(ent, PROPS.INSTANCE_OF)) classQids.add(q);
    }
    const classLabels = await labelsFor([...classQids]);

    for (const candidate of candidates.slice(0, 10)) {
      const entity = entities[candidate.id];
      if (!entity) continue;

      const verdict = validateEntity(entity, item.type, classLabels);
      if (verdict.ok) {
        return {
          found: true,
          qid: candidate.id,
          label: entity.labels?.fr?.value || entity.labels?.en?.value || candidate.label,
          description: describe(entity),
          imageFile: claimValue(entity, PROPS.IMAGE),
          reason: verdict.reason,
          confidence: verdict.confidence || 'moyenne',
          query,
          rejected,
        };
      }
      rejected.push({
        query,
        qid: candidate.id,
        label: entity.labels?.en?.value || entity.labels?.fr?.value || candidate.label,
        reason: verdict.reason,
      });
    }
  }

  return {
    found: false,
    reason:
      rejected.length > 0
        ? `aucun candidat valide sur ${rejected.length} examines`
        : 'aucun resultat Wikidata',
    rejected,
  };
}

export { Q, PROPS };
