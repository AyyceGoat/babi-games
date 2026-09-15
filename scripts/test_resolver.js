/**
 * Banc d'essai du resolveur sur les cas qui echouaient auparavant.
 * Lance avec : node scripts/test_resolver.js
 *
 * Reference : DIAGNOSTIC.md section B.4.
 */

import { resolveItem } from './lib/resolve.js';
import { pacerReport } from './lib/http.js';

const CAS = [
  { id: 't1', name: 'Garba (Attiéké Thon)', search_query: 'garba', type: 'nourriture', attendu: 'REJET', piege: 'gerbe de ble / danse indienne' },
  { id: 't2', name: 'Alloco', search_query: 'alloco', type: 'nourriture', attendu: 'ACCEPT', piege: 'doit trouver le plat, pas Allocosa l araignee' },
  { id: 't3', name: 'Bangui', search_query: 'bangui', type: 'produit', attendu: 'REJET', piege: 'municipalite des Philippines' },
  { id: 't4', name: 'Molière', type: 'artiste', attendu: 'REJET', piege: 'le dramaturge francais du XVIIe' },
  { id: 't5', name: 'Oprah', type: 'artiste', attendu: 'REJET', piege: 'le talk-show americain' },
  { id: 't6', name: 'Révolution', type: 'artiste', attendu: 'REJET', piege: 'le concept politique' },
  { id: 't7', name: 'VDA (Voix des Anges)', type: 'artiste', attendu: 'REJET', piege: 'compagnie de fret russe' },
  { id: 't8', name: 'Tour de Garde', type: 'artiste', attendu: 'REJET', piege: 'une tour de garde en pierre' },
  { id: 't9', name: 'Eden', type: 'artiste', attendu: 'REJET', piege: 'une mairie' },
  { id: 't10', name: 'Joelle C', type: 'artiste', attendu: 'REJET', piege: 'Joelle Carter, actrice americaine' },
  { id: 't11', name: 'Molare', type: 'public', attendu: 'ACCEPT', piege: 'doit trouver le chanteur, pas la commune italienne' },
  { id: 't12', name: 'Riz Gras', search_query: 'riz gras', type: 'nourriture', attendu: 'TOLERE', piege: 'jollof rice, plat voisin' },
  { id: 't13', name: 'Placali', search_query: 'placali', type: 'nourriture', attendu: 'TOLERE', piege: 'Plakali, etiquete ghaneen' },
  // Temoins positifs : le resolveur doit continuer a trouver les vrais items.
  { id: 't14', name: 'Didi B', type: 'artiste', attendu: 'ACCEPT', piege: '(temoin) rappeur ivoirien' },
  { id: 't15', name: 'Didier Drogba', type: 'footballeur', attendu: 'ACCEPT', piege: '(temoin) footballeur ivoirien' },
  { id: 't16', name: 'Magic System', type: 'artiste', attendu: 'ACCEPT', piege: '(temoin) groupe zouglou' },
  { id: 't17', name: 'Kedjenou de Poulet', search_query: 'kedjenou', type: 'nourriture', attendu: 'ACCEPT', piege: '(temoin) plat ivoirien' },
];

const results = [];

for (const cas of CAS) {
  process.stdout.write(`${cas.id.padEnd(4)} ${cas.name.slice(0, 24).padEnd(26)}`);
  let r;
  try {
    r = await resolveItem(cas);
  } catch (e) {
    console.log(`ERREUR RESEAU : ${e.kind || ''} ${e.message}`);
    results.push({ ...cas, verdict: 'ERREUR', detail: e.message });
    continue;
  }

  if (r.found) {
    console.log(`RETENU   [${r.qid}] ${r.label} :: ${r.description.slice(0, 44)}`);
    console.log(`     ${''.padEnd(26)}         motif : ${r.reason}`);
    results.push({ ...cas, verdict: 'RETENU', qid: r.qid, label: r.label, motif: r.reason });
  } else {
    console.log('ECARTE');
    for (const rej of r.rejected.slice(0, 3)) {
      console.log(`     ${''.padEnd(26)}         x ${rej.qid || '-'} ${(rej.label || '').slice(0, 26).padEnd(28)} ${rej.reason}`);
    }
    results.push({ ...cas, verdict: 'ECARTE', motif: r.reason, rejets: r.rejected.slice(0, 5) });
  }
}

console.log('\n' + '='.repeat(78));
console.log('BILAN');
console.log('='.repeat(78));
let conformes = 0;
for (const r of results) {
  const attendu = r.attendu;
  const obtenu = r.verdict;
  let ok;
  if (attendu === 'REJET') ok = obtenu === 'ECARTE';
  else if (attendu === 'ACCEPT') ok = obtenu === 'RETENU';
  else ok = true; // TOLERE : les deux issues sont acceptables
  if (ok) conformes++;
  console.log(
    `${ok ? 'OK  ' : 'KO  '} ${r.id.padEnd(4)} ${r.name.slice(0, 22).padEnd(24)} attendu=${attendu.padEnd(8)} obtenu=${obtenu.padEnd(8)} ${r.piege}`
  );
}
console.log(`\n${conformes}/${results.length} conformes`);
console.log('Rythme final par domaine :', JSON.stringify(pacerReport()));
