/**
 * Acces protege au localStorage.
 *
 * Corrige le scenario de perte de donnees decrit dans DIAGNOSTIC.md F.3 :
 * aucun des 16 appels a setItem n'etait protege. Une QuotaExceededError
 * levee dans un useEffect remontait sans etre attrapee, React demontait
 * l'arbre entier, et l'utilisateur perdait sa saisie devant un ecran blanc.
 *
 * Ici toute ecriture est encapsulee et renvoie un resultat explicite que
 * l'appelant peut afficher.
 */

const listeners = new Set();

/** Permet a l'interface de reagir a une erreur de stockage (bandeau, toast). */
export function onStorageError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(payload) {
  for (const fn of listeners) {
    try {
      fn(payload);
    } catch {
      /* un abonne defaillant ne doit pas casser l'ecriture */
    }
  }
}

const isQuotaError = (e) =>
  e instanceof DOMException &&
  (e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014);

/** Poids approximatif de ce que l'application stocke, en octets. */
export function storageFootprint() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      total += (k?.length || 0) + (localStorage.getItem(k)?.length || 0);
    }
  } catch {
    return null;
  }
  return total * 2; // UTF-16
}

/**
 * @returns {{ok: boolean, reason?: 'quota'|'indisponible'|'erreur', message?: string}}
 */
export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    if (isQuotaError(e)) {
      const used = storageFootprint();
      const message =
        "L'espace de stockage du navigateur est plein. " +
        (used ? `Environ ${(used / 1024 / 1024).toFixed(1)} Mo occupes sur ~5 Mo. ` : '') +
        'Les images envoyees depuis l\'ecran Admin sont les plus volumineuses : ' +
        'supprime quelques fiches recentes, ou restaure la base par defaut.';
      notify({ reason: 'quota', key, message });
      return { ok: false, reason: 'quota', message };
    }
    const message = `Ecriture impossible dans le stockage local : ${e.message}`;
    notify({ reason: 'erreur', key, message });
    return { ok: false, reason: 'erreur', message };
  }
}

export function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Lecture d'une liste JSON, avec controle de forme minimal. */
export function readList(key, validate = null) {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (validate && !parsed.every(validate)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readNumber(key, fallback = 0) {
  const n = parseInt(safeGet(key) ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}
