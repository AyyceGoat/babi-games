/**
 * Genere les icones d'installation a partir d'une source vectorielle.
 *
 * L'ancien favicon.svg etait un logo violet generique herite du gabarit,
 * sans rapport avec l'identite du site. On dessine ici la marque "CIV"
 * dans la charte Pagne & Wax : ivoire, orange, contour noir, chevrons.
 *
 * Sorties :
 *   icon-192, icon-512            manifeste et Android
 *   icon-maskable-192/512         zone de securite pour les masques Android
 *   apple-touch-icon-180          iOS, sans transparence, coins non arrondis
 *   favicon-32 / favicon-16       onglet du navigateur
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IVOIRE = '#F6EFE2';
const ENCRE = '#17120C';
const ORANGE = '#E2610E';
const VERT = '#0B7A4B';

/**
 * @param {number} taille
 * @param {number} marge  proportion de vide autour du motif (masques Android)
 */
function svg(taille, marge = 0) {
  const m = taille * marge;
  const interieur = taille - 2 * m;
  const trait = Math.max(2, Math.round(interieur * 0.035));
  const rayon = Math.round(interieur * 0.06);

  // Bloc orange centre, legerement plus haut que large
  const bw = interieur * 0.78;
  const bh = interieur * 0.46;
  const bx = m + (interieur - bw) / 2;
  const by = m + (interieur - bh) / 2;

  // Bande verte sous le bloc, rappel du drapeau
  const sw = bw * 0.62;
  const sx = m + (interieur - sw) / 2;
  const sy = by + bh + interieur * 0.07;
  const sh = interieur * 0.075;

  const police = Math.round(bh * 0.62);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <defs>
    <pattern id="pagne" width="${taille / 6}" height="${taille / 6}" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="${ENCRE}" stroke-opacity="0.14" stroke-width="${Math.max(1, taille / 110)}">
        <path d="M0 ${taille / 12} L${taille / 24} 0 L${taille / 12} ${taille / 12} L${taille / 8} 0 L${taille / 6} ${taille / 12}"/>
        <path d="M0 ${taille / 5} L${taille / 24} ${taille / 8} L${taille / 12} ${taille / 5} L${taille / 8} ${taille / 8} L${taille / 6} ${taille / 5}"/>
      </g>
    </pattern>
  </defs>
  <rect width="${taille}" height="${taille}" fill="${IVOIRE}"/>
  <rect width="${taille}" height="${taille}" fill="url(#pagne)"/>
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${rayon}"
        fill="${ORANGE}" stroke="${ENCRE}" stroke-width="${trait}"/>
  <text x="${taille / 2}" y="${by + bh / 2}" fill="${ENCRE}"
        font-family="Arial Black, Arial Bold, Arial, Helvetica, sans-serif"
        font-weight="900" font-size="${police}" letter-spacing="${police * 0.04}"
        text-anchor="middle" dominant-baseline="central">CIV</text>
  <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${sh / 2}"
        fill="${VERT}" stroke="${ENCRE}" stroke-width="${Math.max(1, trait * 0.6)}"/>
</svg>`;
}

const SORTIES = [
  { nom: 'icon-192.png', taille: 192, marge: 0 },
  { nom: 'icon-512.png', taille: 512, marge: 0 },
  // Masques Android : le systeme peut rogner jusqu'a 20 % sur chaque bord.
  { nom: 'icon-maskable-192.png', taille: 192, marge: 0.14 },
  { nom: 'icon-maskable-512.png', taille: 512, marge: 0.14 },
  // iOS n'arrondit pas lui-meme et n'accepte pas la transparence.
  { nom: 'apple-touch-icon.png', taille: 180, marge: 0 },
  { nom: 'apple-touch-icon-167.png', taille: 167, marge: 0 },
  { nom: 'apple-touch-icon-152.png', taille: 152, marge: 0 },
  { nom: 'favicon-32.png', taille: 32, marge: 0 },
  { nom: 'favicon-16.png', taille: 16, marge: 0 },
];

const dossier = path.join('public', 'icones');
fs.mkdirSync(dossier, { recursive: true });

for (const { nom, taille, marge } of SORTIES) {
  const buffer = Buffer.from(svg(taille, marge));
  await sharp(buffer, { density: 384 })
    .resize(taille, taille)
    .flatten({ background: IVOIRE }) // aucune transparence : exigence iOS
    .png({ compressionLevel: 9 })
    .toFile(path.join(dossier, nom));
  const { size } = fs.statSync(path.join(dossier, nom));
  console.log(`  ${nom.padEnd(26)} ${taille}x${taille}  ${(size / 1024).toFixed(1)} Ko`);
}

// Version vectorielle pour l'onglet
fs.writeFileSync(path.join('public', 'favicon.svg'), svg(64, 0), 'utf8');
console.log('  favicon.svg               vectoriel');
console.log(`\n${SORTIES.length + 1} fichiers ecrits dans ${dossier}/`);
