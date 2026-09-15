# DECISIONS.md

Journal des décisions prises en autonomie pendant la remise en état, quand
la consigne ne tranchait pas. Chaque entrée dit ce qui était ambigu, ce que
j'ai choisi, et pourquoi.

Principe directeur appliqué partout : **dans le doute, l'option la plus
prudente**, c'est-à-dire celle qui ne détruit pas de données et qui
n'envoie pas en production une image dont l'attribution n'est pas certaine.

---

## D-01 — Le seeder est découpé en modules au lieu d'être corrigé sur place

**Ambigu :** les LOTS 1, 2 et 3 modifient tous `scripts/seed_images.js` (627 lignes).

**Décision :** extraire quatre modules dans `scripts/lib/` — `http.js` (réseau),
`store.js` (persistance), `resolve.js` (résolution Wikidata), `images.js`
(traitement) — et réduire `seed_images.js` au rôle d'orchestrateur.

**Pourquoi :** les trois lots touchent des responsabilités distinctes du même
fichier. Les empiler dans un seul script rendait chaque lot impossible à
tester isolément. Le banc d'essai du LOT 2 (`scripts/test_resolver.js`) ne
serait pas exécutable sans cette séparation.

---

## D-02 — Un lieu est détecté par ses coordonnées, pas par une liste de classes

**Ambigu :** le LOT 2 demande de rejeter « lieux, communes, concepts, animaux,
espèces, entreprises, œuvres, danses, prénoms ». Énumérer les QID de toutes les
classes de lieux est sans fin.

**Décision :** rejeter toute entité portant la propriété `P625` (coordonnées).

**Pourquoi :** un lieu a des coordonnées, une personne et un plat n'en ont pas.
Une seule règle élimine d'un coup Molare (commune italienne), Bangui
(Philippines), Eden (mairie) et Tour de Garde (tour en pierre) — quatre des
erreurs du diagnostic. C'est plus robuste qu'une liste que l'on complète
indéfiniment.

---

## D-03 — La nationalité est le signal décisif pour les personnes

**Ambigu :** `P31 = Q5` (être humain) ne suffit pas. Molière **est** un humain :
la validation par nature seule le laisse passer.

**Décision :** pour tout item de type personne, exiger `P27` (citoyenneté), ou
`P495`/`P17` pour un groupe, contenant `Q1008` (Côte d'Ivoire). Si une
nationalité est renseignée mais n'est pas ivoirienne → rejet immédiat. Si
aucune nationalité n'est renseignée → repli sur la description, qui doit
mentionner un lien ivoirien. Sinon rejet.

**Pourquoi :** c'est le seul critère qui sépare le bon homonyme du mauvais.
Il élimine Molière (France), Joelle Carter (USA) et Oprah Winfrey (USA) tout
en gardant Didi B, Drogba et Magic System. Conforme à la consigne « dans le
doute, on écarte ».

**Coût assumé :** un artiste ivoirien réel dont la fiche Wikidata ne porte
ni `P27` ni description explicite sera écarté. Il partira dans
`A_SOURCER.md` pour traitement manuel. Je préfère ce faux négatif à un
faux positif publié.

---

## D-04 — Un plat sans `P31` est accepté si sa description est explicite

**Ambigu :** ma première version rejetait toute entité sans `P31`. Le banc
d'essai a montré que le **kedjenou** (Q1795580), entité correcte et
pertinente, n'a aucun `P31` sur Wikidata.

**Décision :** pour `nourriture` et `produit` uniquement, accepter une entité
sans `P31` si sa description correspond sans ambiguïté à un aliment
(« spicy chicken stew from West Africa »). Pour les personnes, l'absence de
`P31` reste disqualifiante.

**Pourquoi :** la cuisine ouest-africaine est mal modélisée sur Wikidata.
Appliquer aux plats la même sévérité qu'aux personnes ferait perdre des
entités justes sans réduire le risque — se tromper de plat n'a pas les
mêmes conséquences que se tromper de personne. Les rejets durs
(coordonnées, taxon, mots-clés interdits) continuent de s'appliquer.

---

## D-05 — Les candidats sont parcourus jusqu'au premier valide

**Ambigu :** le LOT 2 demande de supprimer le repli « premier résultat ».
Fallait-il ne tester que le meilleur candidat, ou toute la liste ?

**Décision :** demander 15 candidats à `wbsearchentities` et les valider un
par un, dans l'ordre, en retenant le premier qui passe.

**Pourquoi :** c'est ce qui a permis de **trouver les bonnes entités** plutôt
que seulement d'éviter les mauvaises. `alloco` renvoie l'araignée `Allocosa`
en premier, mais le vrai plat ivoirien (Q7885395) plus loin dans la liste.
Idem pour `Molare` : la commune italienne d'abord, le chanteur ivoirien
(Q3319439) ensuite. Ne tester que le premier candidat aurait rejeté ces deux
items au lieu de les résoudre correctement.
