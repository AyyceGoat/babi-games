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

---

## D-06 — Les 116 anciennes images sont sorties de `public/images/`

**Ambigu :** la consigne dit que `public/images/` est une sauvegarde et que la
nouvelle collecte fait autorité, sans préciser ce que deviennent les fichiers.

**Décision :** copier l'intégralité dans `backup_images/` (non versionné),
puis vider `public/images/` avant la collecte.

**Pourquoi :** tout ce qui reste dans `public/` **est déployé sur Netlify**,
qu'il soit référencé ou non par `db.json`. Laisser 116 images Creative
Commons sans attribution dans le dossier public revenait à les publier sans
licence — exactement le risque juridique décrit en § A.4 du diagnostic. Les
laisser aurait aussi mélangé anciens et nouveaux fichiers sous les mêmes noms.

---

## D-07 — `sharp.strategy.attention` abandonné pour les personnes

**Ambigu :** le LOT 3 impose `fit: 'cover'` + `sharp.strategy.attention`.

**Décision :** conservé pour les plats et les objets, remplacé par un
recadrage carré haut-centre (décalé de 12 %) pour les personnes.

**Pourquoi :** appliqué tel quel, `attention` a produit des portraits
**décapités**. Sur les premiers essais, Didi B et Drogba ressortaient cadrés
sur le logo de leur t-shirt, le visage hors champ : l'algorithme optimise la
saillance (contraste, saturation), et un logo jaune l'emporte sur un visage.
J'ai vérifié visuellement avant et après. Suivre la consigne à la lettre
aurait dégradé l'essentiel du corpus.

---

## D-08 — Le repli Openverse est conservé mais ses résultats sont revus un par un

**Ambigu :** Openverse fournit source, licence et auteur, donc satisfait la
règle d'attribution, mais sa recherche est purement textuelle et
invalidable par `P31`.

**Décision :** conservé pour les plats et produits uniquement, et **tous**
ses résultats passés en revue visuelle.

**Pourquoi :** sans lui, les produits seraient restés à 0 image. Avec lui, on
obtient 18 visuels — mais la revue a montré qu'il reproduit exactement l'erreur
d'origine : « riz » a ramené l'acteur **Riz Ahmed**, « garba » la **danse
indienne**, « Baka » un acteur polonais. La validation automatique ne peut pas
l'attraper ; seul le regard humain le peut. C'est pourquoi la revue visuelle
du LOT 4 n'est pas une formalité mais la seule barrière sur ce chemin.

---

## D-09 — Les images « trompeuses » sont écartées, pas seulement les fausses

**Ambigu :** le LOT 4 dit d'écarter ce qui est « manifestement faux, dessiné
ou illisible ». Un savon de Marseille pour un savon Kabakrou n'entre dans
aucune de ces trois cases : c'est bien du savon, c'est une photo, elle est nette.

**Décision :** écarter aussi les images qui montrent **un autre produit que
celui dont on devine le prix** : tasse de café pour un paquet de 250 g,
poudre de cacao pour une tablette, écouteurs pour un casque, sucre blanc
pour du sucre roux.

**Pourquoi :** dans un jeu d'estimation de prix, l'image est l'énoncé. Montrer
un produit différent de celui qui est coté ne rend pas la partie moins jolie,
il la rend fausse. Conséquence assumée : les produits tombent de 15 à 5 visuels.
Le jeu reste jouable — les items sans photo s'affichent en bloc coloré.

---

## D-10 — `hero_banner.png` supprimé au lieu d'être optimisé

**Ambigu :** le LOT 7 demande d'optimiser cette image de 846 Ko.

**Décision :** la supprimer, et la remplacer par un bandeau composé de vrais
portraits déjà présents dans la collection.

**Pourquoi :** même optimisée, c'était un décor générique pour 100 à 200 Ko.
Le bandeau de visages ivoiriens réels réutilise des vignettes de 500×500 déjà
chargées, coûte zéro octet supplémentaire, et montre le contenu du site dès la
première seconde. Gain mesuré : 846 Ko de moins au premier chargement.

---

## D-11 — Le commit du LOT 6 n'a pas été poussé seul

**Ambigu :** la consigne demande un commit et un build vert par lot ; Netlify
déploie à chaque push.

**Décision :** commiter le LOT 6 en local, puis pousser seulement après le
LOT 7.

**Pourquoi :** entre les deux lots, le JSX avait déjà ses nouvelles classes
mais la feuille de style ne les avait pas encore. Le build passait, mais le
site en ligne se serait affiché sans styles. Aucun commit cassé n'a été créé ;
seule la mise en ligne d'un état intermédiaire a été évitée.

---

## D-12 — Le crédit suit l'attribution, pas le statut

**Ambigu :** les visuels passés en duotone ont le statut
`a_verifier_manuellement`, qui servait aussi de filtre à la page Crédits.

**Décision :** la page Crédits liste tout ce qui porte une licence et un
auteur, quel que soit le statut.

**Pourquoi :** ces 8 images sont bel et bien publiées. Une licence Creative
Commons exige l'attribution dès la publication, indépendamment de la façon
dont on choisit de les afficher. Les omettre aurait recréé une infraction.
