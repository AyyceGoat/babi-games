/**
 * Produit INVENTAIRE.md : la liste exhaustive des elements de db.json,
 * avec l'etat de leur visuel.
 *
 * A relancer apres chaque import d'images (npm run inventaire), pour que
 * le document reste le reflet exact de la base.
 */

import fs from 'fs';
import { readDb, COLLECTIONS } from './lib/store.js';

const LIBELLES = {
  artists: 'Artistes',
  footballers: 'Footballeurs',
  publicFigures: 'Personnalités publiques',
  foods: 'Nourriture',
  products: 'Produits',
};

const DOSSIERS = {
  artists: 'artistes',
  footballers: 'footballeurs',
  publicFigures: 'publicfigures',
  foods: 'nourriture',
  products: 'produits',
};

/** photo verifiee | duotone | absent */
function etatVisuel(item) {
  const sansImage = !item.image || item.image.includes('/placeholders/');
  if (sansImage) return 'absent';
  return item.status === 'ok' ? 'photo' : 'duotone';
}

const MARQUES = {
  photo: 'Photo vérifiée',
  duotone: 'Duotone',
  absent: 'Aucun visuel',
};

/** Tri naturel : art_2 avant art_10, et non l'inverse. */
function triNaturel(a, b) {
  const [pa, na] = [a.id.replace(/_\d+$/, ''), Number((a.id.match(/_(\d+)$/) || [])[1] ?? 0)];
  const [pb, nb] = [b.id.replace(/_\d+$/, ''), Number((b.id.match(/_(\d+)$/) || [])[1] ?? 0)];
  return pa === pb ? na - nb : pa.localeCompare(pb, 'fr');
}

const echappe = (s) => String(s ?? '').replace(/\|/g, '\\|');

const db = readDb();
const aujourdhui = new Date().toISOString().slice(0, 10);

/* ---------------- Totaux ---------------- */

const stats = {};
let T = { total: 0, photo: 0, duotone: 0, absent: 0 };
for (const c of COLLECTIONS) {
  const liste = db[c] || [];
  const s = { total: liste.length, photo: 0, duotone: 0, absent: 0 };
  for (const item of liste) s[etatVisuel(item)]++;
  stats[c] = s;
  T.total += s.total;
  T.photo += s.photo;
  T.duotone += s.duotone;
  T.absent += s.absent;
}

/* ---------------- Redaction ---------------- */

let md = `# INVENTAIRE.md

Liste exhaustive des ${T.total} éléments de la base, avec l'état de leur visuel.
Généré le ${aujourdhui} à partir de \`src/data/db.json\`.

Ce document sert à réunir les images manquantes. Pour fournir une image,
nommez le fichier d'après l'**identifiant** de la ligne (colonne « Fichier à
déposer »), placez-le dans le dossier \`photos/\` à la racine du projet, puis
lancez \`npm run importer-photos\`. Voir le README pour le détail.

## Totaux

| Collection | Éléments | Photo vérifiée | Duotone | **Sans visuel** |
|---|---:|---:|---:|---:|
`;

for (const c of COLLECTIONS) {
  const s = stats[c];
  md += `| ${LIBELLES[c]} | ${s.total} | ${s.photo} | ${s.duotone} | **${s.absent}** |\n`;
}
md += `| **Total général** | **${T.total}** | **${T.photo}** | **${T.duotone}** | **${T.absent}** |\n`;

md += `
${T.photo + T.duotone} éléments sur ${T.total} disposent d'un visuel avec attribution complète.
**${T.absent} éléments sont sans visuel** et attendent une image.

### Légende des états

- **Photo vérifiée** — image contrôlée à l'œil, sujet juste, affichée en photo pleine.
- **Duotone** — sujet correct mais cadrage, luminosité ou fidélité discutable ; affichée
  en duotone assumé. Une meilleure image la remplacera si vous en déposez une.
- **Aucun visuel** — bloc de couleur avec les initiales. C'est ce qu'il reste à réunir.

---
`;

for (const c of COLLECTIONS) {
  const liste = [...(db[c] || [])].sort(triNaturel);
  const s = stats[c];
  md += `
## ${LIBELLES[c]}

${s.total} éléments — ${s.photo} photo vérifiée, ${s.duotone} duotone, **${s.absent} sans visuel**.
Dossier des images : \`public/images/${DOSSIERS[c]}/\`

| Identifiant | Nom | État du visuel | Fichier à déposer |
|---|---|---|---|
`;
  for (const item of liste) {
    const etat = etatVisuel(item);
    const aFournir = etat === 'absent' ? `\`${item.id}.jpg\`` : '—';
    md += `| \`${item.id}\` | ${echappe(item.name)} | ${MARQUES[etat]} | ${aFournir} |\n`;
  }
}

md += `
---

## Éléments sans visuel, regroupés par cause

Récapitulatif des ${T.absent} éléments en attente, avec la raison pour laquelle
la collecte automatique n'a rien trouvé.

`;

const causes = {};
for (const c of COLLECTIONS) {
  for (const item of db[c] || []) {
    if (etatVisuel(item) !== 'absent') continue;
    const brut = item.failureReason || 'raison non renseignée';
    let cle = 'Autre';
    if (/marque deposee/i.test(brut)) cle = 'Marque déposée, exclue volontairement';
    else if (/^ecarte a la revue/i.test(brut)) cle = 'Écartée à la revue visuelle';
    else if (/trop petite/i.test(brut)) cle = 'Source sous le seuil de 500 px';
    else if (/attribution incomplete/i.test(brut)) cle = 'Attribution incomplète';
    else if (/aucune entite valide|aucun candidat/i.test(brut)) cle = 'Aucune entité Wikidata validée';
    else if (/fiche image inaccessible/i.test(brut)) cle = 'Entité validée, image inaccessible';
    (causes[cle] ||= []).push({ ...item, collection: LIBELLES[c] });
  }
}

for (const [cle, items] of Object.entries(causes).sort((a, b) => b[1].length - a[1].length)) {
  md += `### ${cle} — ${items.length} éléments\n\n`;
  for (const i of items.sort(triNaturel)) {
    md += `- \`${i.id}\` · ${i.name} *(${i.collection})*\n`;
  }
  md += '\n';
}

md += `---

*Document généré par \`scripts/generer_inventaire.js\`. Relancez
\`npm run inventaire\` après chaque import pour le mettre à jour.*
`;

fs.writeFileSync('INVENTAIRE.md', md, 'utf8');

console.log(`INVENTAIRE.md écrit — ${T.total} éléments`);
for (const c of COLLECTIONS) {
  const s = stats[c];
  console.log(`  ${LIBELLES[c].padEnd(24)} ${String(s.total).padStart(3)} | photo ${String(s.photo).padStart(3)} | duotone ${String(s.duotone).padStart(2)} | sans visuel ${String(s.absent).padStart(3)}`);
}
console.log(`  ${'TOTAL'.padEnd(24)} ${String(T.total).padStart(3)} | photo ${String(T.photo).padStart(3)} | duotone ${String(T.duotone).padStart(2)} | sans visuel ${String(T.absent).padStart(3)}`);
