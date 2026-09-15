/**
 * Recuperation des fichiers, controle qualite et traitement.
 *
 * Corrige les defauts decrits dans DIAGNOSTIC.md section B.2 :
 *  - `fit: 'inside'` produisait 58 formats differents pour 116 fichiers,
 *    et le recadrage finissait par se faire dans le CSS (`object-fit: cover`),
 *    ecrasant par exemple une image 147x400 dans une vignette de 80x80 ;
 *  - l'absence de `.rotate()` laissait deux images couchees a 90 degres.
 *
 * Ici : vignette carree 500x500, recadrage pilote par `attention` (sharp
 * choisit la region la plus saillante, typiquement le visage), orientation
 * EXIF honoree, et rejet des sources dont le petit cote est sous 500 px.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fetchResilient, fetchJson } from './http.js';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const OPENVERSE_API = 'https://api.openverse.org/v1/images/';

export const MIN_SIDE = 500; // petit cote minimal accepte a la source
export const OUTPUT_SIZE = 500; // vignette carree produite
export const JPEG_QUALITY = 82;
const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024;

const stripHtml = (s) =>
  String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Une attribution n'est exploitable que si les trois champs sont reellement remplis. */
export function attributionComplete(meta) {
  const ok = (v) =>
    typeof v === 'string' &&
    v.trim() !== '' &&
    !/^(n\/a|unknown|inconnu|anonymous|sans titre)$/i.test(v.trim());
  return Boolean(meta) && ok(meta.source) && ok(meta.license) && ok(meta.author);
}

/* ------------------------------------------------------------------ */
/* Wikimedia Commons                                                   */
/* ------------------------------------------------------------------ */

/**
 * Metadonnees completes d'un fichier Commons : URL, dimensions, licence,
 * auteur et page de description (necessaire a l'attribution CC).
 */
export async function commonsImageInfo(filename) {
  const url =
    `${COMMONS_API}?action=query&titles=File:${encodeURIComponent(filename)}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&format=json`;
  const data = await fetchJson(url);
  const pages = data?.query?.pages || {};
  const pageId = Object.keys(pages)[0];
  if (!pageId || pageId === '-1') return null;

  const info = pages[pageId]?.imageinfo?.[0];
  if (!info) return null;

  const ext = info.extmetadata || {};
  const license =
    stripHtml(ext.LicenseShortName?.value) || stripHtml(ext.UsageTerms?.value) || '';
  const author = stripHtml(ext.Artist?.value) || stripHtml(ext.Credit?.value) || '';

  // "Toujours la meilleure resolution" : l'original, sauf s'il est enorme,
  // auquel cas la version 1600 px reste tres au-dessus de notre cible 500.
  const useThumb = info.size > MAX_ORIGINAL_BYTES && info.thumburl;

  return {
    url: useThumb ? info.thumburl : info.url,
    originalUrl: info.url,
    width: info.width,
    height: info.height,
    bytes: info.size,
    license,
    author,
    source: 'wikidata_commons',
    descriptionUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
    filename,
  };
}

/* ------------------------------------------------------------------ */
/* Openverse (repli pour plats et produits uniquement)                 */
/* ------------------------------------------------------------------ */

/**
 * Openverse reste cantonne aux plats et produits, comme dans le script
 * d'origine. DIAGNOSTIC.md section C.3 deconseille de l'etendre aux
 * personnes : la recherche y est purement textuelle, donc invalidable,
 * et une licence CC ne couvre pas le droit a l'image des personnes.
 */
export async function openverseSearch(query) {
  const url =
    `${OPENVERSE_API}?q=${encodeURIComponent(query)}` +
    `&license_type=commercial,modification&page_size=20`;
  const data = await fetchJson(url);
  const results = Array.isArray(data?.results) ? data.results : [];

  const eligible = results.filter(
    (r) => Math.min(r.width || 0, r.height || 0) >= MIN_SIDE && r.url
  );
  if (!eligible.length) return null;

  // On privilegie Wikimedia et Flickr, mieux documentes en attribution.
  const preferred =
    eligible.find((r) => /wikimedia|flickr/i.test(`${r.source} ${r.provider}`)) || eligible[0];

  return {
    url: preferred.url,
    width: preferred.width,
    height: preferred.height,
    license: preferred.license ? `CC ${String(preferred.license).toUpperCase()}` : '',
    author: preferred.creator || '',
    source: 'openverse',
    descriptionUrl: preferred.foreign_landing_url || preferred.url,
    filename: preferred.title || query,
  };
}

/* ------------------------------------------------------------------ */
/* Telechargement et traitement                                        */
/* ------------------------------------------------------------------ */

export class ImageError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'ImageError';
  }
}

/**
 * Recadrage carre oriente portrait.
 *
 * `sharp.strategy.attention` s'est revele inutilisable pour les personnes :
 * il optimise la saillance (contrastes, saturation) et se verrouille sur un
 * logo de t-shirt plutot que sur un visage. Sur les premiers essais, Didi B
 * et Drogba ressortaient decapites, cadres sur le torse.
 *
 * Sur une photo verticale de personne, le visage se trouve presque toujours
 * dans le haut du cadre : on extrait donc un carre pris en haut, legerement
 * descendu (12 %) pour eviter l'exces de ciel au-dessus de la tete.
 */
function portraitCrop(width, height) {
  const side = Math.min(width, height);
  const left = Math.round((width - side) / 2);
  const top = height > width ? Math.round((height - side) * 0.12) : Math.round((height - side) / 2);
  return { left, top, width: side, height: side };
}

/**
 * Telecharge, controle la taille reelle, puis produit une vignette carree.
 *
 * @param {'personne'|'objet'} cadrage  strategie de recadrage
 * @returns {Promise<{width, height, bytes, sourceWidth, sourceHeight}>}
 */
export async function downloadAndProcess(imageUrl, targetPath, cadrage = 'objet') {
  const res = await fetchResilient(imageUrl, { timeoutMs: 45000, attempts: 3 });
  if (!res.ok) throw new ImageError(`telechargement refuse (HTTP ${res.status})`);
  const buffer = res.buffer;
  if (!buffer?.length) throw new ImageError('fichier vide');

  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch (e) {
    throw new ImageError(`fichier illisible par sharp : ${e.message}`);
  }

  // Controle sur les dimensions reelles, pas sur celles annoncees par l'API.
  const small = Math.min(meta.width || 0, meta.height || 0);
  if (small < MIN_SIDE) {
    throw new ImageError(`source trop petite : ${meta.width}x${meta.height}, petit cote ${small} < ${MIN_SIDE}`);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  // L'orientation EXIF doit etre appliquee AVANT de calculer le recadrage,
  // sinon largeur et hauteur sont inversees sur les photos pivotees.
  const upright = await sharp(buffer).rotate().toBuffer({ resolveWithObject: true });
  const uw = upright.info.width;
  const uh = upright.info.height;

  let pipeline = sharp(upright.data);
  if (cadrage === 'personne') {
    pipeline = pipeline.extract(portraitCrop(uw, uh)).resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'fill' });
  } else {
    // Pour un plat ou un objet, le sujet remplit le cadre : `attention`
    // donne de bons resultats sans risque de decapiter quoi que ce soit.
    pipeline = pipeline.resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: 'cover',
      position: sharp.strategy.attention,
      withoutEnlargement: false,
    });
  }

  const out = await pipeline
    .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
    .toFile(targetPath);

  return {
    width: out.width,
    height: out.height,
    bytes: out.size,
    sourceWidth: meta.width,
    sourceHeight: meta.height,
  };
}

/** Variance du Laplacien : mesure de nettete, reprise du protocole du diagnostic. */
export async function sharpnessScore(filePath) {
  const { data, info } = await sharp(filePath).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = -4 * data[i] + data[i - 1] + data[i + 1] + data[i - w] + data[i + w];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return Math.round(sumSq / n - mean * mean);
}
