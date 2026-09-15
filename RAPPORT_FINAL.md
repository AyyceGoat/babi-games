# RAPPORT FINAL — Remise en état de Babi Games

**Date :** 15 septembre 2026
**Point de départ :** l'état décrit dans `DIAGNOSTIC.md`
**Dépôt :** https://github.com/AyyceGoat/jeux-ci — branche `main`, 6 commits, build vert à chaque commit.

---

## 1. Déploiement — à lire en premier

**Il n'y a pas de lien Netlify à vous donner, et ce n'est pas un oubli de ma part.**

Le code est intégralement poussé sur GitHub et prêt à être déployé. Mais la
chaîne de déploiement automatique décrite dans votre consigne n'existe pas.

Vérifications faites, dans l'ordre :

| Vérification | Résultat |
|---|---|
| `git push origin main` | ✅ fonctionne, testé dès le LOT 0 comme demandé |
| Commit local = commit distant | ✅ identiques (`82a1cbb` puis `328fdcb`) |
| Sites Netlify sur votre compte | 5 trouvés |
| Sites reliés à un dépôt Git | **0 — aucun des 5** |
| Site relié à `AyyceGoat/jeux-ci` | **aucun** |
| Un des 5 sites héberge-t-il Babi Games ? | **non**, vérifié en ouvrant chacun |

Les 5 sites présents sont `incomparable-malabi-f9c677` (Traduction Rapide),
`echiquier-stockfish-analyse`, `taupe-lily-ac2081`, `jolly-boba-e37d19` et
`comfy-quokka-885f3a` (ces trois derniers servent « NEXUS — L'Univers du
Savoir »). Tous ont été créés par dépôt manuel, aucun n'écoute un dépôt Git.

**Donc : pousser sur GitHub ne déclenche aucun déploiement.** Vous m'avez
explicitement demandé de ne pas créer de site et de ne pas bricoler, je m'en
suis tenu là.

**Ce qu'il vous reste à faire — deux minutes :** sur app.netlify.com, *Add new
site → Import an existing project → GitHub → AyyceGoat/jeux-ci*. Tout le reste
est déjà en place : `netlify.toml` fixe la commande (`npm run build`), le
dossier publié (`dist`), Node 22, la réécriture SPA et les en-têtes de cache ;
`public/_redirects` double la réécriture par sécurité. Le premier build partira
tout seul.

---

## 2. Couverture des images

### Avant / après

| | Avant | Après |
|---|---:|---:|
| Items pointant vers une image réelle | **0** / 227 | **107** / 227 |
| Items avec source + licence + auteur complets | **0** | **107** |
| Fichiers publiés sans attribution | 116 | **0** |
| Produits avec visuel (Juste Prix) | **0** / 24 | **5** / 24 |

### Par collection

| Collection | Items | Vérifiés | Duotone | Sans visuel | Couverture |
|---|---:|---:|---:|---:|---:|
| Artistes | 75 | 23 | 3 | 49 | 35 % |
| Footballeurs | 75 | 52 | 0 | 23 | 69 % |
| Personnalités | 33 | 12 | 1 | 20 | 39 % |
| Nourriture | 20 | 9 | 2 | 9 | 55 % |
| Produits | 24 | 3 | 2 | 19 | 21 % |
| **Total** | **227** | **99** | **8** | **120** | **47 %** |

« Vérifiés » : photo ouverte et regardée, sujet juste, nette, lisible en
vignette carrée — affichée en photo pleine.
« Duotone » : sujet correct mais cadrage, luminosité ou fidélité discutable —
affichée en duotone assumé, conformément à la direction retenue.

**Les 107 ont tous une attribution complète.** Aucune exception : le seeder
refuse d'enregistrer une image dont la source, la licence ou l'auteur manque,
et un item dont l'auteur vaut `unknown` est rejeté (1 cas). Répartition des
licences : 51 en CC BY-SA 4.0, 15 en CC0, 12 en CC BY-SA 3.0, 12 en CC BY 4.0,
le reste en CC BY et CC BY-SA diverses. Sources : 107 Wikimedia Commons,
18 Openverse avant revue.

### Écartées, et pourquoi

**18 écartées à la revue visuelle** (fichier supprimé, raison consignée dans
`REVUE_IMAGES.md`) :

| Motif | Nb | Exemples |
|---|---:|---|
| Sujet faux | 5 | « riz » → l'acteur **Riz Ahmed** ; « garba » → la **danse indienne Navratri** ; « Baka » → un acteur polonais ; « Kabato » → une carte du Japon ; « sachet d'eau » → une installation artistique |
| Produit trompeur | 6 | savon de Marseille pour un savon Kabakrou ; tasse de café pour un paquet de 250 g ; poudre de cacao pour une tablette ; écouteurs pour un casque ; sucre blanc pour du sucre roux |
| Dessin au lieu d'une photo | 3 | Monique Séka, Ernesto Djédjé, foutou banane |
| Doublon | 2 | le kedjenou de lapin reprenait la photo du kedjenou de poulet |
| Hors sujet | 2 | table de réveillon de Noël pour une baguette de pain |

**120 sans visuel**, par cause :

| Cause | Items |
|---|---:|
| Aucune entité Wikidata validée | 75 |
| Source sous le seuil de 500 px | 18 |
| Écartée à la revue visuelle | 18 |
| Marque déposée (exclusion volontaire) | 8 |
| Attribution incomplète | 1 |

Le détail nominatif est dans `A_SOURCER.md`.

---

## 3. Ce que j'ai changé par rapport au plan

Douze décisions sont documentées dans `DECISIONS.md`. Les quatre qui changent
vraiment quelque chose :

**D-07 — `sharp.strategy.attention` abandonné pour les personnes.** Le LOT 3
l'imposait. Appliqué tel quel, il **décapitait les portraits** : Didi B et
Drogba ressortaient cadrés sur le logo de leur t-shirt, visage hors champ.
L'algorithme optimise la saillance, et un logo jaune l'emporte sur un visage.
Je l'ai gardé pour les plats et objets, et mis un recadrage carré haut-centre
pour les personnes. Vérifié à l'œil avant et après.

**D-09 — les images trompeuses sont écartées, pas seulement les fausses.** Le
LOT 4 parlait de « faux, dessiné ou illisible ». Une tasse de café nette pour
un paquet de café de 250 g n'entre dans aucune de ces cases, mais dans un jeu
d'estimation de prix l'image est l'énoncé : montrer un autre produit rend la
partie fausse. Conséquence assumée : les produits tombent de 15 à 5 visuels.

**D-06 — les 116 anciennes images ont été sorties de `public/images/`.** Tout
ce qui reste dans `public/` est déployé, référencé ou non. Les laisser
revenait à publier 116 images Creative Commons sans attribution — le risque
juridique du § A.4 du diagnostic. Elles sont dans `backup_images/`, intactes,
hors versionnement.

**D-11 — le LOT 6 n'a pas été poussé seul.** Entre les LOTS 6 et 7, le JSX
avait ses nouvelles classes mais pas encore la feuille de style : le build
passait, mais le site en ligne se serait affiché sans styles. J'ai commité en
local et poussé après le LOT 7. Aucun commit cassé n'a été créé.

---

## 4. Ce qui a été réparé, et ce que ça a donné

**La cause racine de la panne de juillet est identifiée et corrigée.** Ce
n'était pas une panne réseau : c'était le **rate limiting HTTP 429 de Wikidata**,
que l'ancien script comptait comme une panne. Au cinquième 429 consécutif il
coupait Wikidata pour toute l'exécution, puis écrasait `db.json` avec
227 placeholders. J'ai reproduit le blocage deux fois en conditions réelles,
dont une avec un délai 5,5× plus prudent que celui du script.

Désormais un 429 est une instruction de ralentir : `Retry-After` respecté,
rythme adaptatif par domaine, et le compteur du disjoncteur n'est **jamais**
incrémenté par un 429. **Résultat mesuré sur la collecte des 227 items : zéro
blocage.**

**La résolution est validée.** Banc d'essai `scripts/test_resolver.js` :
**17/17**. Molière le dramaturge, Oprah Winfrey, l'avion-cargo VDA, la tour de
garde en pierre, la mairie d'Eden, Joelle Carter et Bangui-Philippines sont
tous écartés. Mieux : le validateur **trouve désormais les bonnes entités** là
où l'ancien échouait — le vrai alloco ivoirien (Q7885395) au lieu de l'araignée
*Allocosa*, le vrai Molare chanteur ivoirien (Q3319439) au lieu de la commune
italienne.

**Le seeder ne peut plus détruire.** Sauvegarde horodatée, écriture atomique,
fusion non régressive, préservation des items ajoutés via l'Admin, refus
d'écrire si le taux de réussite s'effondre, `run().catch()` avec code de sortie
non nul. Le journal des licences est en ajout seul dans `data/licences.jsonl`
(133 lignes) : la perte de métadonnées de juillet est structurellement
impossible à reproduire.

**Le socle CSS est rebranché.** `--text-secondary` était utilisée 33 fois sans
exister — toute la hiérarchie typographique était morte. `.card` était utilisée
27 fois sans le moindre style. Un script vérifie maintenant que **chaque classe
posée dans le JSX existe en CSS** ; il ne reste aucun écart.

**Contrastes.** Les 12 combinaisons de la nouvelle palette passent WCAG AA. Le
bouton principal est passé de **2,33 à 5,27**. J'ai aussi trouvé et corrigé une
coquille dans la palette (`#F79W22`, hex invalide).

**Mobile.** Le glisser-déposer de la tier list ne recevait aucun événement au
toucher ; il est réécrit en événements pointeur, avec fantôme qui suit le doigt.
Le conflit de propagation du tap-à-tap est supprimé. Le bouton hamburger, qui
s'affichait en gris système à cause d'un `className` dupliqué, est réparé. La
carte Versus est bornée pour que les deux tiennent dans un écran de téléphone.

**Persistance.** Toute écriture passe par `safeSet` : une `QuotaExceededError`
devient un message lisible au lieu d'un écran blanc avec perte de saisie. Les
photos envoyées depuis l'Admin sont redimensionnées par canvas **avant**
encodage Base64 — une photo de 2,5 Mo tombe de 3,4 Mo à environ 30 Ko. Le garde
`length > 0` est retiré : vider une collection est enfin persisté.

**Équité des tirages.** Les 5 `sort(() => 0.5 - Math.random())` sont remplacés
par Fisher-Yates. L'ancien comparateur donnait 22,28 % de chances au premier
élément de sortir en tête au lieu de 12,50 %.

**Poids.** `hero_banner.png` (846 Ko, 2,8× le poids du JS) est supprimé au
profit d'un bandeau de vrais visages déjà chargés.

---

## 5. Ce qui reste à faire à la main, par priorité

### Priorité 1 — sans quoi rien n'est en ligne

1. **Relier le dépôt à Netlify** (§ 1). Deux minutes, tout est préconfiguré.

### Priorité 2 — le contenu

2. **Sourcer les 120 éléments sans visuel** (`A_SOURCER.md`). Les 75 « aucune
   entité validée » sont surtout des artistes et personnalités absents de
   Wikidata ou sans nationalité renseignée. Le plus efficace est de passer par
   l'écran Admin, filtre « Sans visuel », avec une photo dont vous maîtrisez
   les droits. L'écran impose source, licence et auteur.
3. **Les 8 marques déposées** (Maggi, Dinor, Kirène, Beaufort, Peak, Pénélope,
   Sotra, Tecno) : aucune image libre n'existe. Il faut photographier le
   produit vous-même ou obtenir une autorisation.
4. **Étoffer les pools.** Le diagnostic l'avait mesuré et rien n'a changé :
   `products` (24) est vu à 90 % après 10 parties, `foods` (20) sert la
   totalité du pool à chaque tier list. Objectif : 60-80 produits, 40-50 plats,
   60 personnalités.

### Priorité 3 — vérifications de votre part

5. **Vérifier l'identité des personnes peu connues.** Je ne l'ai pas fait, et
   je ne pouvais pas : voir § 6.
6. **Valider les 24 prix en CFA.** Ils sont figés dans `rawItems.json` sans
   date ni source. Seule votre connaissance du terrain peut les valider.

---

## 6. Ce dont je ne suis pas sûr — à vérifier en premier

**1. L'identité exacte des personnes peu connues. C'est le point le plus
important de cette liste.**
La validation garantit que l'entité Wikidata retenue est bien une personne ou
un groupe de nationalité ivoirienne portant ce nom. Elle ne garantit pas que
la photo `P18` de cette fiche montre la bonne personne, ni qu'il n'existe pas
deux artistes ivoiriens homonymes. Pour Drogba, Didi B ou Alpha Blondy je peux
le confirmer de visu ; pour Yabongo Lova, Fior de Bior ou Amélie Wabehi, non.
J'ai suivi votre consigne : je n'ai pas deviné. **Parcourez la page Crédits,
c'est le contrôle le plus rentable de tous.**

**2. Je n'ai pas pu tester l'application dans un vrai navigateur.**
Ce que j'ai vérifié : le build passe, le lint est propre, les 7 composants
rendent sans erreur en rendu serveur, et chaque classe CSS posée dans le JSX
existe. Ce que je n'ai **pas** pu vérifier : le rendu réel, le glisser-déposer
au doigt sur un vrai téléphone, et l'apparence de la refonte. **Testez le
glisser-déposer de la tier list sur un téléphone Android en premier** — c'est
le code le plus neuf et le moins éprouvé.

**3. Le duotone repose sur `mix-blend-mode`.** L'effet est correct sur les
navigateurs récents, mais je ne l'ai pas vu tourner. S'il rend mal, le
correctif est local : la règle `.item-visuel.is-duotone` dans `src/index.css`.

**4. Cinq produits seulement ont une photo.** Le Juste Prix tire 5 produits
parmi 24 : une partie peut n'afficher que des blocs colorés. Le jeu reste
jouable et honnête, mais c'est moins bon qu'avec des photos. C'est la
conséquence directe de la décision D-09, que j'assume mais que vous pouvez
renverser.

**5. Deux plats gardent une réserve que je n'ai pas tranchée.** `food_14`
montre un choukouya de **poulet** alors que l'item nomme du **mouton**, et
`prod_21` montre le site de fabrication du koutoukou plutôt que le verre servi.
Les deux sont en duotone. À vous de dire si c'est acceptable.

**6. Le seuil de 500 px a écarté 18 images dont je n'ai jamais vu le contenu.**
Elles étaient peut-être bonnes. Le seuil vient de votre consigne ; si vous le
descendez à 350 px, une partie reviendra — au prix d'une netteté moindre en
vignette 500×500.

**7. Je n'ai pas vérifié le comportement du quota `localStorage` en conditions
réelles.** Le code est protégé et le redimensionnement testé en rendu, mais je
n'ai pas pu envoyer une vraie photo depuis un vrai téléphone. C'est le second
test à faire après le glisser-déposer.

---

## 7. Les 6 commits

| Commit | Contenu |
|---|---|
| `82a1cbb` | LOT 0 — état initial, dépôt créé, sauvegardes hors versionnement |
| `b1cc60d` | LOT 1+2 — seeder indestructible, gestion du 429, résolution validée (17/17) |
| `bbffde0` | LOT 5 — socle CSS, contrastes, accessibilité, code mort supprimé |
| `8c497f8` | LOT 6 — persistance, mobile, Fisher-Yates |
| `c5c27b6` | LOT 3+4 — collecte des 227 items, revue visuelle de 88 images |
| `328fdcb` | LOT 7+8 — refonte « Pagne & Wax », routeur, configuration Netlify |

`npm run build` passe à chaque commit. Lint : 5 avertissements, tous de confort
(« fast refresh »), aucun impact en production.

---

## 8. Bilan franc

Ce qui est réglé : le seeder ne peut plus détruire la base, la cause de la
panne est identifiée et corrigée avec preuve à l'appui, les erreurs de sujet
grossières sont éliminées, le site a une identité visuelle assumée, des URL
partageables, un bouton retour, et 107 images légalement publiables là où il
y en avait zéro.

Ce qui ne l'est pas : **moins de la moitié du catalogue a une image** (47 %),
les produits restent à 21 %, et le volume de contenu est toujours trop court
pour que les jeux ne tournent pas en rond. Ces trois points demandent du
travail éditorial humain, pas du code.

Et surtout : **rien n'est en ligne tant que le dépôt n'est pas relié à
Netlify.** C'est la seule action bloquante, et elle vous revient.
