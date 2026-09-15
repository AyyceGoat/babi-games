/**
 * Redimensionnement des images envoyees depuis l'ecran Admin.
 *
 * Corrige le point le plus dangereux de DIAGNOSTIC.md F.3 : l'ancien code
 * appelait `readAsDataURL` sur le fichier ORIGINAL. Une photo de smartphone
 * de 2,5 Mo devenait 3,4 Mo en Base64 et saturait a elle seule le quota de
 * 5 Mo du localStorage. Une seule photo envoyee depuis un telephone
 * suffisait a provoquer l'ecran blanc.
 *
 * Ici l'image passe par un canvas avant encodage : 400 px de cote maximal,
 * qualite 0,8, sortie JPEG. Une photo de 2,5 Mo tombe a ~30 Ko.
 */

export const MAX_DIMENSION = 400;
export const JPEG_QUALITY = 0.8;

const ACCEPTED = /^image\/(jpeg|png|webp|gif|bmp)$/i;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Fichier image illisible."));
    };
    img.src = url;
  });
}

/**
 * @returns {Promise<{dataUrl: string, width: number, height: number,
 *                    originalBytes: number, encodedBytes: number}>}
 */
export async function fileToResizedDataUrl(file, {
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY,
} = {}) {
  if (!file) throw new Error('Aucun fichier fourni.');
  if (!ACCEPTED.test(file.type)) {
    throw new Error(`Format non pris en charge (${file.type || 'inconnu'}). Utilise JPEG, PNG ou WebP.`);
  }

  const img = await loadImage(file);
  const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Le navigateur n'autorise pas le redimensionnement (canvas indisponible).");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Fond blanc : evite le noir sur les PNG transparents convertis en JPEG.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  return {
    dataUrl,
    width,
    height,
    originalBytes: file.size,
    // Une chaine Base64 pese ~3/4 de sa longueur en octets utiles.
    encodedBytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
  };
}

export const formatBytes = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`;
