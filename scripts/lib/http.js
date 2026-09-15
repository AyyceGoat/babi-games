/**
 * Couche reseau du seeder.
 *
 * Corrige la cause racine identifiee dans DIAGNOSTIC.md section A.5 :
 * l'ancien script traitait un HTTP 429 comme une panne, et cinq 429
 * consecutifs desactivaient Wikidata pour toute l'execution.
 *
 * Ici un 429 est une instruction de ralentir, jamais une panne :
 *  - on respecte l'en-tete Retry-After quand il est present ;
 *  - on ralentit le rythme du domaine concerne (rythme adaptatif) ;
 *  - on retente ;
 *  - et surtout on ne touche JAMAIS au compteur du disjoncteur.
 */

import https from 'https';
import dns from 'dns';

// Force la resolution IPv4 : evite les timeouts IPv6 observes sous Windows
dns.setDefaultResultOrder('ipv4first');

export const USER_AGENT =
  'BabiGamesImageSeeder/5.0 (https://github.com/AyyceGoat/jeux-ci; contact@babigames.ci)';

/** Categories d'echec. Seules les categories "dures" arment le disjoncteur. */
export const ERR = {
  RATE_LIMIT: 'RATE_LIMIT', // 429 / 503 avec Retry-After : ralentir, pas une panne
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER', // 5xx
  CLIENT: 'CLIENT', // 4xx hors 429 : requete invalide, ne pas retenter
  PARSE: 'PARSE',
  TOO_MANY_REDIRECTS: 'TOO_MANY_REDIRECTS',
};

/** Un echec categorise, pour que les messages disent la vraie cause. */
export class FetchError extends Error {
  constructor(kind, message, meta = {}) {
    super(message);
    this.name = 'FetchError';
    this.kind = kind;
    this.status = meta.status ?? null;
    this.retryAfterMs = meta.retryAfterMs ?? null;
    this.url = meta.url ?? null;
  }
  /** Un 429 n'est pas une panne : il ne doit jamais desactiver une source. */
  get isHardFailure() {
    return this.kind !== ERR.RATE_LIMIT && this.kind !== ERR.CLIENT;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Agents persistants par hote : evite de refaire le handshake TLS a chaque appel. */
const agents = new Map();
function agentFor(hostname) {
  const key = hostname.toLowerCase();
  if (!agents.has(key)) {
    agents.set(key, new https.Agent({ keepAlive: true, maxSockets: 4 }));
  }
  return agents.get(key);
}

/* ------------------------------------------------------------------ */
/* Rythme adaptatif par domaine                                        */
/* ------------------------------------------------------------------ */

/**
 * Remplace le DELAY_MS fixe de 200 ms de l'ancien script.
 *
 * Le delai monte franchement des qu'on recoit un 429 (on est deja en
 * infraction, il faut reculer vite) et redescend lentement apres une
 * serie de succes (pour ne pas re-declencher le blocage aussitot).
 */
class Pacer {
  constructor({ min = 250, max = 60000, start = 350 } = {}) {
    this.min = min;
    this.max = max;
    this.delay = start;
    this.okStreak = 0;
    this.rateLimitHits = 0;
    this.lastCallAt = 0;
  }

  async wait() {
    const since = Date.now() - this.lastCallAt;
    const remaining = this.delay - since;
    if (remaining > 0) await sleep(remaining);
    this.lastCallAt = Date.now();
  }

  /** 429 recu : on double le rythme d'attente, plancher a 2 s. */
  slowDown(hintMs = null) {
    this.rateLimitHits++;
    this.okStreak = 0;
    const doubled = Math.max(this.delay * 2, 2000);
    this.delay = Math.min(this.max, hintMs ? Math.max(doubled, hintMs) : doubled);
    return this.delay;
  }

  /** Apres 25 succes d'affilee, on retire 10 % du delai. */
  speedUp() {
    this.okStreak++;
    if (this.okStreak >= 25 && this.delay > this.min) {
      this.delay = Math.max(this.min, Math.floor(this.delay * 0.9));
      this.okStreak = 0;
    }
  }

  get state() {
    return { delayMs: this.delay, rateLimitHits: this.rateLimitHits };
  }
}

const pacers = new Map();
export function pacerFor(hostname) {
  const key = hostname.toLowerCase().split('.').slice(-2).join('.');
  if (!pacers.has(key)) pacers.set(key, new Pacer());
  return pacers.get(key);
}
export function pacerReport() {
  const out = {};
  for (const [host, p] of pacers) out[host] = p.state;
  return out;
}

/* ------------------------------------------------------------------ */
/* Requete brute                                                       */
/* ------------------------------------------------------------------ */

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value); // Retry-After peut etre une date HTTP
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function rawRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 15000, redirectDepth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new FetchError(ERR.CLIENT, `URL invalide : ${url}`, { url }));
    }

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        agent: agentFor(parsed.hostname),
        headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'identity', ...headers },
      },
      (res) => {
        const status = res.statusCode;

        // Redirections
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          res.resume();
          if (redirectDepth >= 5) {
            return reject(new FetchError(ERR.TOO_MANY_REDIRECTS, 'Plus de 5 redirections', { url }));
          }
          const next = new URL(res.headers.location, url).toString();
          return resolve(
            rawRequest(next, { method, headers, body, timeoutMs, redirectDepth: redirectDepth + 1 })
          );
        }

        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('error', (e) =>
          reject(new FetchError(ERR.NETWORK, `Flux interrompu : ${e.message}`, { url, status }))
        );
        res.on('end', () =>
          resolve({
            status,
            ok: status >= 200 && status < 300,
            headers: res.headers,
            buffer: Buffer.concat(chunks),
          })
        );
      }
    );

    req.on('error', (e) => reject(new FetchError(ERR.NETWORK, e.message, { url })));
    req.setTimeout(timeoutMs, () => req.destroy(new FetchError(ERR.TIMEOUT, `Timeout apres ${timeoutMs} ms`, { url })));
    if (body) req.write(body);
    req.end();
  });
}

/* ------------------------------------------------------------------ */
/* Requete avec rythme, retentatives et backoff                        */
/* ------------------------------------------------------------------ */

/**
 * @returns {Promise<{status, ok, headers, buffer, json()}>}
 * @throws  {FetchError} categorise ; `isHardFailure` dit si le disjoncteur doit compter.
 */
export async function fetchResilient(url, opts = {}) {
  const { attempts = 5, timeoutMs = 15000, onRetry = null } = opts;
  const host = new URL(url).hostname;
  const pacer = pacerFor(host);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    await pacer.wait();

    try {
      const res = await rawRequest(url, { ...opts, timeoutMs });

      // 429 / 503 : on ralentit et on retente. Ce n'est PAS une panne.
      if (res.status === 429 || res.status === 503) {
        const hint = parseRetryAfter(res.headers['retry-after']);
        const newDelay = pacer.slowDown(hint);
        const waitMs = hint ?? Math.min(60000, newDelay * attempt);
        lastError = new FetchError(
          ERR.RATE_LIMIT,
          `HTTP ${res.status} (quota atteint) sur ${host}. ` +
            `${hint ? `Retry-After = ${Math.round(hint / 1000)} s` : 'sans Retry-After'}. ` +
            `Rythme du domaine porte a ${newDelay} ms.`,
          { status: res.status, retryAfterMs: waitMs, url }
        );
        if (onRetry) onRetry(lastError, attempt);
        if (attempt < attempts) {
          await sleep(waitMs + Math.floor(Math.random() * 500)); // jitter
          continue;
        }
        throw lastError;
      }

      if (res.status >= 500) {
        lastError = new FetchError(ERR.SERVER, `HTTP ${res.status} (erreur serveur)`, { status: res.status, url });
        if (onRetry) onRetry(lastError, attempt);
        if (attempt < attempts) {
          await sleep(backoff(attempt));
          continue;
        }
        throw lastError;
      }

      if (res.status >= 400) {
        // 4xx hors 429 : la requete est fautive, retenter ne sert a rien.
        throw new FetchError(ERR.CLIENT, `HTTP ${res.status} (requete refusee)`, { status: res.status, url });
      }

      pacer.speedUp();
      return {
        ...res,
        json() {
          try {
            return JSON.parse(this.buffer.toString('utf8'));
          } catch (e) {
            throw new FetchError(ERR.PARSE, `Reponse non-JSON : ${e.message}`, { url });
          }
        },
      };
    } catch (e) {
      const err = e instanceof FetchError ? e : new FetchError(ERR.NETWORK, e.message, { url });
      if (err.kind === ERR.CLIENT) throw err; // inutile de retenter
      lastError = err;
      if (onRetry) onRetry(err, attempt);
      if (attempt < attempts) {
        await sleep(backoff(attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/** Backoff exponentiel avec jitter complet (evite les retentatives synchronisees). */
function backoff(attempt) {
  const base = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
  return Math.floor(Math.random() * base);
}

export async function fetchJson(url, opts = {}) {
  const res = await fetchResilient(url, opts);
  return res.json();
}

export { sleep };
