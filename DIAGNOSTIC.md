# DIAGNOSTIC — Babi Games

**Date :** 15 septembre 2026
**Périmètre :** état réel du dépôt `JEUX CI`, sans aucune modification de code.
**Méthode :** croisement `db.json` / disque, mesures `sharp` sur les 116 fichiers, inspection visuelle de 35 images, requêtes réelles à l'API Wikidata, lecture intégrale du CSS et des 7 composants, `npm install` / `build` / `lint`.

> Aucun fichier de code n'a été modifié. Les scripts de mesure temporaires ont été supprimés après exécution.

---

## A. COUVERTURE DES IMAGES

### A.1 — Le chiffre qui résume tout

**0 des 227 items de `src/data/db.json` ne pointe vers une image réelle.** Les 227 pointent vers un SVG de `public/images/placeholders/`.

Pendant ce temps, **116 fichiers JPEG existent sur le disque** dans `public/images/`. Ils sont invisibles pour l'application : aucun ne peut être atteint, puisque `db.json` est la seule source d'images ([src/App.jsx:11](src/App.jsx#L11)).

Ce ne sont donc pas un problème mais **deux problèmes distincts** :
1. la base de données a été écrasée et ne référence plus rien ;
2. le stock d'images sur disque est incomplet et de qualité inégale.

### A.2 — Croisement par collection

| Collection | Dossier | Items db.json | Pointe vers image réelle | Pointe vers placeholder | Fichier `<id>.jpg` présent | Fichier absent |
|---|---|---:|---:|---:|---:|---:|
| `artists` | `artistes/` | 75 | **0** | 75 | 35 (47 %) | 40 |
| `footballers` | `footballeurs/` | 75 | **0** | 75 | 61 (81 %) | 14 |
| `publicFigures` | `publicfigures/` | 33 | **0** | 33 | 10 (30 %) | 23 |
| `foods` | `nourriture/` | 20 | **0** | 20 | 10 (50 %) | 10 |
| `products` | `produits/` | 24 | **0** | 24 | **0 (0 %)** | 24 |
| **Total** | | **227** | **0** | **227** | **116 (51 %)** | **111** |

### A.3 — Sections entièrement ou majoritairement vides

- **`products` : 0 fichier sur 24. Vide à 100 %.** Le dossier `public/images/produits/` est créé mais ne contient rien. **Le Juste Prix est donc un jeu où l'on devine le prix d'un produit qu'on ne voit pas** — seulement un dégradé de couleur généré par hachage du nom ([src/components/JustePrix.jsx:114-122](src/components/JustePrix.jsx#L114-L122)). C'est le jeu le plus abîmé de la plateforme.
- **`publicFigures` : 10 sur 33 (30 %).** Deux tiers manquants.
- **`artists` : 35 sur 75 (47 %).** Moins d'un sur deux.
- **`foods` : 10 sur 20 (50 %).**
- `footballers` est la seule collection correctement pourvue (81 %).

### A.4 — `public/rapport.json` : réponse claire, et elle est mauvaise

**Le fichier existe, mais il ne contient AUCUNE métadonnée exploitable. Les `source` / `license` / `author` de l'exécution réussie sont définitivement perdus.**

Vérifications faites :

| Fichier | État | `valides` | Valeurs `source`/`license`/`author` |
|---|---|---:|---|
| `public/rapport.json` (57 Ko) | présent | **0** | `"N/A"` sur les 227 entrées |
| `dist/rapport.json` (57 Ko) | présent | **0** | `"N/A"` sur les 227 entrées |
| `dist/assets/index-8p3EtCXe.js` | build du 6 juil. 11:14 | — | **0 occurrence** de `/images/<dossier>/<id>.jpg` |

Les compteurs des deux rapports sont identiques et catégoriques :
`75/75`, `75/75`, `33/33`, `20/20`, `24/24 à compléter manuellement`.

J'ai cherché une copie de secours dans le bundle compilé : le build de `dist/` a été produit **après** l'exécution ratée (`rapport.json` 11:13, bundle 11:14) et embarque donc déjà la `db.json` dégradée. Aucun chemin d'image réel n'y figure.

**Conséquence directe, et c'est le point le plus grave de cette section :** les 116 photos sur le disque proviennent en majorité de Wikimedia Commons et d'Openverse, donc de licences Creative Commons qui **exigent l'attribution**. On ne dispose plus de l'auteur ni de la licence d'aucune d'entre elles. La page Crédits ([src/components/Credits.jsx](src/components/Credits.jsx)), dont c'est la raison d'être, ne peut plus rien afficher de vrai. **Publier ces images en l'état est un risque juridique, pas seulement un défaut esthétique.** Soit on relance une résolution complète qui régénère les métadonnées, soit on repart de sources dont on maîtrise les droits.

### A.5 — Classement des absences par cause

| Cause | Items | Niveau de preuve |
|---|---:|---|
| **Marque exclue volontairement** (`BRANDS_TO_SKIP`, [scripts/seed_images.js:389](scripts/seed_images.js#L389)) | **8** | **Certain** — aucun appel API n'est émis |
| **Rate limiting Wikidata (HTTP 429) non géré** | majorité des 103 restants | **Très fort** (voir ci-dessous) |
| **Aucune entité Wikidata trouvée** | au moins 2 confirmés (`food_3` « attieke poisson », `food_10` « claclo ») | Certain sur ces 2 |
| **Aucun repli pour les personnes** : Openverse est réservé à `nourriture`/`produit` ([scripts/seed_images.js:528](scripts/seed_images.js#L528)) | 183 items (artistes, footballeurs, figures publiques) | **Certain** — structurel |
| Échec de téléchargement ou de traitement `sharp` | inconnu | **Ambigu** — non traçable |

Les 8 produits exclus par marque : `prod_4` Maggi, `prod_5` Dinor, `prod_9` Kirène, `prod_10` Beaufort, `prod_12` Peak, `prod_13` Pénélope, `prod_18` Sotra, `prod_24` Tecno.

**Sur le rate limiting — preuve directe.** J'ai rejoué la logique exacte du seeder contre l'API réelle, deux fois :

| Test | Délai entre appels | Requêtes avant blocage | Résultat |
|---|---|---:|---|
| 1 | 150 ms (proche des 200 ms du seeder) | ~10 | `HTTP 429` sur toutes les suivantes |
| 2 | 1 100 ms (5,5× plus prudent) | ~12 | `HTTP 429` sur les 26 suivantes |

Le seeder utilise `DELAY_MS = 200` ([scripts/seed_images.js:14](scripts/seed_images.js#L14)) et **ne contient aucune gestion du 429** : `grep -c "429|retry|backoff|Retry-After"` renvoie **0**. Un 429 échoue le test `response.ok`, lève une exception, incrémente `consecutiveWikidataFailures`, et **au 5ᵉ échec consécutif `wikidataEnabled` passe à `false` pour tout le reste de l'exécution** ([scripts/seed_images.js:232-234](scripts/seed_images.js#L232-L234)). Le message affiché parle de *timeouts*, ce qui a masqué la vraie cause.

**C'est le scénario exact que décrit l'état du dépôt :** blocage au bout d'une dizaine d'items, Wikidata coupé, 227 placeholders, `db.json` écrasé. Ce n'est pas une panne réseau, c'est une limite d'API que le script ne sait pas voir.

**Ce que je ne peux pas déterminer (ambigu) :** la répartition précise des 103 absences entre « 429 », « pas d'entité », « pas de claim P18 » et « échec de téléchargement ». Les logs de l'exécution sont perdus et `rapport.json` n'enregistre que `"N/A"` sans distinguer les causes. Cette information n'est pas récupérable a posteriori.

---

## B. QUALITÉ DES IMAGES EXISTANTES

### B.1 — Mesures automatiques sur les 116 fichiers

Netteté = variance du Laplacien calculée sur les pixels bruts en niveaux de gris (seuils usuels : < 100 flou, 100–300 limite, > 300 net).

| Collection | n | Netteté médiane | Floues (< 100) | < 300 px | Poids médian |
|---|---:|---:|---:|---:|---:|
| `artistes` | 35 | 624 | 0 | 1 | 18,6 Ko |
| `footballeurs` | 61 | 495 | 1 | 1 | 20,1 Ko |
| `publicfigures` | 10 | 1 213 | 0 | 0 | 21,5 Ko |
| `nourriture` | 10 | 842 | 0 | 0 | 27,1 Ko |
| `produits` | 0 | — | — | — | — |
| **Global** | **116** | **620** | **1** | **2** | **19,8 Ko** |

Distribution globale de netteté : min 98 · p25 377 · médiane 620 · p75 1 213 · max 9 271.

**Classification :** trop petites 2 · floues 1 · limites 21 · nettes 92.

**Conclusion contre-intuitive : le flou n'est pas le problème.** Une seule image est réellement floue (`foot_48`, netteté 97,6). 92 des 116 sont techniquement nettes. Le poids médian de 19,8 Ko est sain.

### B.2 — Le recadrage : sharp ne coupe rien, le CSS oui

`sharp(...).resize(400, 400, { fit: 'inside', withoutEnlargement: true })` ([scripts/seed_images.js:377](scripts/seed_images.js#L377)) : `fit: 'inside'` **préserve les proportions et ne recadre jamais**. Aucun visage n'est coupé à l'encodage. Sur ce point précis, l'hypothèse est infirmée.

Mais la conséquence est pire : **58 formats différents pour 116 fichiers**. 112 ont un côté à 400 px et l'autre libre (267×400, 266×400, 400×300, 147×400…). Seules 4 sont carrées.

Le recadrage se produit donc **à l'affichage**, via `object-fit: cover` utilisé à 3 endroits ([src/index.css:270](src/index.css#L270), [449](src/index.css#L449), [524](src/index.css#L524)), dans des conteneurs à dimensions fixes :

| Conteneur | Dimensions | Effet sur une image 147×400 (`foot_42`, Aruna Dindane) |
|---|---|---|
| `.versus-card img` | hauteur 380 px, largeur fluide | recadrage latéral massif |
| `.tier-item img` | **80 × 80 px** | il ne reste qu'un carré central : le visage, situé en haut, disparaît |
| `.prix-image-box img` | hauteur 280 px | idem |

**C'est donc bien un problème de cadrage, mais il est dans le CSS, pas dans le seeder.** Le seeder aurait dû produire des vignettes carrées centrées sur le sujet (`fit: 'cover'` + détection de visage, ou `sharp.strategy.attention`). Il ne le fait pas.

**Bug distinct confirmé : l'orientation EXIF est ignorée.** `grep -c "rotate"` sur le seeder renvoie **0**. Sans `.rotate()`, sharp ne réoriente pas selon l'EXIF. Deux images du corpus sont affichées **couchées à 90°** : `art_50` (Eden) et `pub_24` (Akissi Delta). Constaté visuellement.

### B.3 — Inspection visuelle : 35 fichiers ouverts

35 images ouvertes sur les 116 (30 %), couvrant les 4 collections pourvues, `nourriture` en intégralité.

**`nourriture` — 10/10 inspectées**

| Fichier | Item | Verdict |
|---|---|---|
| `food_2` | Kedjenou de Poulet | ✅ correct, poulet en sauce + attiéké |
| `food_9` | Alloco | ✅ correct, bananes plantain frites |
| `food_10` | Claclo | ✅ correct, mais photo amateur au flash |
| `food_1` | Garba | 🟡 plat plausible, mais la viande ne ressemble pas à du thon |
| `food_3` | Attiéké Poisson Grillé | 🟡 sujet correct, photo sombre sur table de cantine |
| `food_14` | Choukouya de Mouton | 🟡 sujet correct, mais cadrage catastrophique : le plat occupe un tiers du cadre, avec chaises, verres vides et un bras |
| `food_17` | Pain Chien | 🟡 brochettes sur un gril de rue, sale, peu appétissant |
| `food_6` | Foutou Banane | ❌ **trois hommes torse nu assis par terre** — ce n'est pas une photo de plat |
| `food_13` | Sauce Gouagouassou | ❌ **illustration dessinée**, et représentant du crabe (le gouagouassou est une sauce aubergine) |
| `food_16` | Gbofloto | ❌ **illustration dessinée** sur fond blanc |

Deux des dix sont des **dessins**, pas des photos. Dans une tier list alignant huit photos et deux illustrations, la grille paraît cassée.

**`artistes` — 15/35 inspectées** (dont 5 choisies volontairement pour leur nom ambigu)

| Fichier | Item | Ce que montre l'image |
|---|---|---|
| `art_32` | Molière (zouglou) | ❌ **portrait à l'huile de Molière, dramaturge français du XVIIᵉ** |
| `art_63` | Oprah (artiste ivoirienne) | ❌ **panneau « HARPO STUDIOS — THE OPRAH WINFREY SHOW »** — un bâtiment |
| `art_58` | Révolution (groupe zouglou) | ❌ **gravure du XVIᵉ d'une bataille romaine** |
| `art_36` | Tour de Garde (afro-pop) | ❌ **une tour de garde en pierre** |
| `art_50` | Eden (gospel) | ❌ **une mairie**, et l'image est couchée à 90° |
| `art_59` | VDA (Voix des Anges) | ❌ **un avion-cargo Volga-Dnepr** (VDA = code de la compagnie) |
| `art_44` | Joelle C | ❌ **une actrice américaine blonde** sur un tapis rouge Yahoo/Paley |
| `art_8` | Magic System | 🟡 conférence de presse FEMUA à 4 personnes en costume — pas un portrait |
| `art_61` | Yabongo Lova | 🟡 sujet correct mais minuscule dans le cadre, visage illisible |
| `art_54` | Francky Dicaprio | 🟡 correct mais 199×232 px, visiblement pixelisé |
| `art_20` | Morijah | ✅ portrait studio professionnel — la meilleure image du corpus |
| `art_1` | Didi B | ✅ bon portrait |
| `art_9` | DJ Arafat | ✅ correct, légèrement doux |
| `art_17` | Yodé & Siro | ✅ correct, le duo sur scène |
| `art_74` | Didier Bilé | ✅ correct, photo N&B d'époque |

**`footballeurs` — 5/61 inspectées**

| Fichier | Item | Verdict |
|---|---|---|
| `foot_1` | Didier Drogba | ✅ excellent portrait |
| `foot_50` | Laurent Pokou | ✅ bon portrait |
| `foot_54` | Gadji Celi | 🟡 sur scène en costume (il est aussi chanteur) — plausible mais sombre |
| `foot_42` | Aruna Dindane | 🟡 bon sujet, mais 147×400 : une lamelle verticale inutilisable en vignette |
| `foot_48` | Bonaventure Kalou | 🟡 sujet plausible, mais visage flou et 210×304 |

**Aucune erreur de sujet sur les footballeurs.** Leurs noms sont non ambigus et bien documentés sur Wikidata.

**`publicfigures` — 5/10 inspectées**

| Fichier | Item | Verdict |
|---|---|---|
| `pub_11` | Emma Lohoues | ✅ correct |
| `pub_29` | Adrienne Koutouan | ✅ correct |
| `pub_4` | Willy Dumbo | 🟡 correct, scène sombre |
| `pub_24` | Akissi Delta | 🟡 sujet correct mais **couchée à 90°** |
| `pub_14` | Molare | ❌ **une place de village italienne** (Molare est une commune du Piémont) |

### B.4 — L'hypothèse sur `wbsearchentities` : CONFIRMÉE

L'hypothèse est exacte, et le mécanisme est même plus large que prévu.

Le code fait ceci ([scripts/seed_images.js:210-226](scripts/seed_images.js#L210-L226)) :
1. il cherche une entité dont le **libellé ou un alias** correspond exactement à la chaîne recherchée ;
2. à défaut, **il prend le premier résultat**, quel qu'il soit.

**À aucun moment il ne vérifie que l'entité est un être humain, un groupe ou un plat.** Aucune requête sur `P31` (*nature de l'élément*), aucun filtre sur la description.

Requêtes réelles contre l'API, avec la logique exacte du seeder :

| Recherche | Entité retenue | Description Wikidata | Voie |
|---|---|---|---|
| `garba` | Q942040 | *sheaf — bundle of grain* (une gerbe de blé) | libellé/alias |
| `alloco` | Q2098030 | *Allocosa — genre d'**araignées-loups*** | **repli 1ᵉʳ résultat** |
| `bangui` | Q39326 | *municipalité des **Philippines*** | repli |
| `Révolution` | Q10931 | *changement fondamental du pouvoir* | libellé/alias |
| `VDA` | Q765297 | ***compagnie de fret russe*** | libellé/alias |
| `Oprah` | Q694106 | *talk-show américain 1986-2011* | libellé/alias |
| `Molare` | Q17384 | ***commune d'Italie*** | libellé/alias |
| `riz gras` | Q816663 | *jollof rice* (plat voisin, pas identique) | libellé/alias |
| `placali` | Q3391081 | *Plakali — plat **ghanéen*** | libellé/alias |

Sur « garba », la gerbe de blé arrive en premier et la danse folklorique indienne (Q882985) en deuxième — dans les deux cas le résultat est faux. Pour « alloco », c'est le repli au premier résultat qui livre l'araignée.

**Détail aggravant : la correspondance par alias rend le bug plus fréquent, pas moins.** Un mot courant comme « Révolution » ou « Oprah » trouve *toujours* un libellé exact — celui du concept générique. Le garde-fou censé fiabiliser la recherche est précisément ce qui sélectionne la mauvaise entité.

**Estimation du nombre d'items touchés.** Sur 19 entités résolues avant blocage par l'API, 4 sont classées suspectes par description (21 %). En croisant avec l'inspection visuelle, **8 erreurs de sujet sont prouvées** : `art_32`, `art_36`, `art_44`, `art_50`, `art_58`, `art_59`, `art_63`, `pub_14` — soit **18 % des 45 fichiers artistes + figures publiques**. En y ajoutant les 3 erreurs sur 10 aliments, on obtient **11 erreurs certaines sur 35 fichiers inspectés (31 %)**.

Extrapolation, en signalant honnêtement le biais : l'échantillon artistes a été choisi à dessein sur des noms ambigus. **En écartant ces 5 choix adverses, le taux tombe à 6 erreurs sur 30 (20 %).** Appliqué aux 116 fichiers, cela situe **entre 20 et 25 images au mauvais sujet**, concentrées sur les artistes et les figures publiques. Les footballeurs sont largement épargnés.

### B.5 — Combien d'images sont réellement exploitables ?

Sur les 35 inspectées :

| Catégorie | Nombre | Part |
|---|---:|---:|
| Exploitables telles quelles | 14 | 40 % |
| Bon sujet, techniquement inutilisables (cadrage, taille, rotation, scène sombre) | 10 | 29 % |
| Mauvais sujet | 11 | 31 % |

**Extrapolation prudente sur les 116 fichiers : environ 50 à 55 images exploitables, soit 45 à 48 %.**

Rapporté aux 227 items du catalogue, **on couvre correctement à peu près 23 % de la plateforme**. Et ces 50 images utilisables restent, à ce stade, **sans attribution légale** (§ A.4).

Ce chiffre est une estimation à partir d'un échantillon de 30 %, pas un recensement. Seule une revue visuelle des 116 donnerait le chiffre exact.

---

## C. ROBUSTESSE DU PIPELINE

### C.1 — Le comportement destructif : confirmé

```js
// scripts/seed_images.js:617
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
```

`db` est reconstruit **intégralement** à partir de `rawItems.json` à chaque exécution. L'écriture est inconditionnelle : elle a lieu même si **zéro** item a été résolu. Il n'existe ni sauvegarde, ni écriture atomique, ni comparaison avec l'état précédent, ni `run().catch()` ([scripts/seed_images.js:627](scripts/seed_images.js#L627)).

Une exécution partiellement ratée ne dégrade donc pas la base : **elle la remplace par le résultat de l'échec.** C'est très exactement ce qui s'est produit.

Second effet, moins visible : **les items créés à la main via l'écran Admin sont détruits**. Leur identifiant est `${type}_${Date.now()}` ([src/components/Admin.jsx:89](src/components/Admin.jsx#L89)), ils n'existent pas dans `rawItems.json`, et ne sont donc jamais réécrits dans la nouvelle `db.json`.

### C.2 — Ce qui manque pour qu'une exécution ratée ne détruise plus rien

**Protection des données**
1. Sauvegarde horodatée de `db.json` avant toute écriture.
2. Écriture atomique : fichier temporaire puis `rename`.
3. Fusion au lieu de remplacement : conserver l'entrée existante lorsque la nouvelle résolution échoue (« ne jamais régresser vers un placeholder »).
4. Seuil de sécurité : refuser d'écrire si le taux de réussite s'effondre par rapport au fichier existant.
5. Préserver les items absents de `rawItems.json` (ajouts Admin).
6. `run().catch()` avec code de sortie non nul, pour qu'un échec soit visible en CI.

**Robustesse réseau — c'est ici que se joue la panne réelle**
7. **Gérer explicitement le HTTP 429**, avec respect de l'en-tête `Retry-After`.
8. Backoff exponentiel avec jitter, au lieu d'un `DELAY_MS` fixe de 200 ms.
9. Distinguer les causes d'échec : un 429 n'est pas un timeout, et ne doit pas compter dans le compteur qui désactive Wikidata.
10. Reprise sur incident : ne pas retraiter les items déjà résolus (le script repart de zéro à chaque fois).
11. Corriger le message trompeur qui annonce des *timeouts* quel que soit le type d'erreur.

**Qualité de la résolution**
12. **Valider `P31`** : n'accepter que `Q5` (être humain), un groupe musical, ou un plat, selon le type d'item. C'est le correctif qui élimine Molière, l'araignée et l'avion-cargo.
13. Rejeter une entité dont la description ne comporte aucun marqueur attendu.
14. Ne pas se rabattre sur le premier résultat sans validation — préférer aucune image à une image fausse.
15. Enrichir la requête avec un qualificatif de contexte (« Côte d'Ivoire », « chanteur », « plat »).
16. Détecter les `search_query` dupliqués : `garba`, `attieke`, `kedjenou`, `placali` sont chacun partagés par 2 items, qui recevraient la même image.
17. Ajouter `.rotate()` avant `.resize()` pour honorer l'EXIF.
18. Produire des vignettes carrées avec recadrage intelligent (`fit: 'cover'` + `sharp.strategy.attention`) plutôt que 58 formats différents.
19. **Consigner `source` / `license` / `author` dans un fichier distinct et cumulatif**, qu'une exécution ratée ne peut pas écraser. C'est ce qui aurait évité la perte décrite en § A.4.

### C.3 — Openverse pourrait-il couvrir les autres collections ?

Aujourd'hui Openverse n'est interrogé que pour `nourriture` et `produit` ([scripts/seed_images.js:528](scripts/seed_images.js#L528)). Les 183 personnes n'ont **aucun repli** : si Wikidata échoue, c'est un placeholder.

**Techniquement : oui, et le gain serait important.** Openverse indexe Flickr et Wikimedia Commons, riches en photos de concerts, de matchs et d'événements. Les 183 items sans repli sont précisément là où les trous sont les plus grands (`publicFigures` à 30 % de couverture). Le filtre `license_type=commercial,modification` et le seuil de 300×300 déjà en place ([scripts/seed_images.js:311-333](scripts/seed_images.js#L311-L333)) sont directement réutilisables.

**Mais trois réserves sérieuses :**

1. **Précision.** La recherche Openverse est textuelle et non entité : « Eden » ou « Révolution » y ramèneront autant de bruit que Wikidata, sans même une description à contrôler. Sur des noms ambigus, ce serait un second générateur d'erreurs, non un correctif.
2. **Droit à l'image.** Une licence CC couvre le droit d'auteur du photographe, **pas** le droit à l'image de la personne représentée. Pour des personnalités ivoiriennes vivantes sur une plateforme publique, c'est un risque distinct. C'est probablement la raison — non documentée dans le code — de la restriction actuelle aux plats et produits. **Ambigu :** rien dans le dépôt ne l'explicite.
3. **Le code marque déjà tout résultat Openverse comme `a_verifier_manuellement`** ([scripts/seed_images.js:540](scripts/seed_images.js#L540)). L'étendre aux personnes multiplierait la file de validation manuelle sans garantir la qualité.

**Recommandation :** l'étendre aux footballeurs et artistes **uniquement** après la validation `P31`, et uniquement en second recours, en conservant le marquage « à vérifier ». Ne pas l'utiliser comme source principale pour des personnes.

---

## D. AUDIT VISUEL ET UX

### D.1 — Le design system ne tient pas. Mesures à l'appui.

**`--text-secondary` est utilisée 33 fois et n'est définie nulle part.**

```
Définies dans :root ........ 26 variables
Utilisées ................... 8 variables fantômes
  --text-secondary .......... 33 usages  <-- jamais définie
```

Répartition des 33 usages : `index.css` (5), `JustePrix` (10), `Dashboard` (5), `Versus` (5), `TierList` (3), `Admin` (3), `Navbar` (2). Six composants sur sept.

En CSS, `color: var(--text-secondary)` sans valeur de repli est invalide à l'exécution : la déclaration est ignorée et **la couleur héritée s'applique**, c'est-à-dire `--text-main` (#F3F4F6). Autrement dit, **tous les textes conçus comme secondaires s'affichent avec la même intensité que le texte principal, à 33 endroits**. La hiérarchie typographique n'existe pas — pas parce qu'elle est mal réglée, mais parce qu'elle n'est jamais appliquée. C'est la cause première de l'impression de « mur de texte uniforme ».

**Sept classes utilisées en JSX sans aucune définition CSS :**

| Classe | Usages | Conséquence |
|---|---:|---|
| `.card` | **27** | La classe la plus utilisée de l'application **n'a aucun style**. Chaque « carte » est un `<div>` nu. |
| `.container` | 10 | Ni largeur maximale ni marges internes. |
| `.gradient-text` | 6 | Seule `.gradient-text-ci` existe. Ces 6 titres s'affichent en couleur plate. |
| `.glow-red` | 1 | Sans effet. |
| `.mobile-menu-btn` / `.mobile-menu-drawer` / `.desktop-menu-wrapper` | 3 | Définies uniquement dans une balise `<style>` injectée dans [Navbar.jsx:130-142](src/components/Navbar.jsx#L130-L142), et seulement pour `min-width: 769px`. |

**Seize classes définies et jamais utilisées :** `tier-s` à `tier-f` (les couleurs de rang, réimplémentées en style inline dans [TierList.jsx:247](src/components/TierList.jsx#L247)), `feedback-box`, `feedback-success`, `feedback-warning`, `bracket-round`, `bracket-matchup`, `bracket-node`, `admin-nav-item`, `animate-shake`, `glow-orange`, `form-group-full`.

Le constat est net : **le CSS et le JSX décrivent deux interfaces différentes.** Une partie de la feuille de style habille des composants qui n'existent plus, et une partie des composants s'appuie sur des classes qui n'ont jamais existé. Ce qui tient debout tient par les styles inline.

**Ampleur des styles inline :** ~300 attributs `style={{...}}` dans les composants. `Dashboard`, `Credits` et `Admin` sont presque intégralement stylés en ligne. Aucune échelle d'espacement n'est partagée : on trouve `0.25/0.5/0.75/1/1.25/1.5/2/2.5/3/4 rem` employés au jugé. Les tailles de titre sont écrites en dur (`2.8rem`, `2.5rem`, `2.2rem`, `2rem`, `1.75rem`…) sans échelle typographique.

**Deux balises `<style>` injectées dans le rendu** ([Navbar.jsx:130](src/components/Navbar.jsx#L130), [Versus.jsx:378](src/components/Versus.jsx#L378)) — réinjectées à chaque rendu, avec des `!important` pour reprendre la main sur des styles inline.

### D.2 — Accessibilité : contrastes mesurés

Ratios WCAG calculés sur la palette réelle :

| Combinaison | Ratio | Verdict |
|---|---:|---|
| `--text-main` #F3F4F6 sur fond #060709 | 18,31 | ✅ AA |
| `--text-muted` #9CA3AF sur fond | 7,94 | ✅ AA |
| `--color-gold` #FFD700 sur fond | 14,37 | ✅ AA |
| `--color-orange` #FF8C00 sur fond | 8,64 | ✅ AA |
| `--color-green` #00A86B sur fond | 6,54 | ✅ AA |
| `--text-dim` #6B7280 sur fond | 4,17 | 🟡 grand texte seulement — utilisé pour le pied de page et les états vides |
| Blanc sur `btn-danger` #EF4444 | 3,76 | 🟡 échoue en texte normal |
| Blanc sur `btn-success` #00A86B | 3,08 | 🟡 échoue en texte normal |
| **Blanc sur `btn-primary` #FF8C00** | **2,33** | ❌ **échec net — c'est le bouton principal de toute l'application** |

Le bouton d'action principal, celui qui lance chaque jeu, est le pire contraste de la plateforme. Du blanc sur orange vif ne passe pas ; il faut du texte très foncé sur l'orange, ou un orange nettement assombri.

**Tailles de police problématiques**
- `.tier-item-label` : **0,55 rem ≈ 8,8 px** ([index.css:473](src/index.css#L473)). Illisible. C'est l'étiquette qui porte le nom de chaque élément de la tier list — donc l'information la plus utile de l'écran.
- `.bracket-node` : 0,75 rem ≈ 12 px.
- Pied de page : 0,75 rem, en `--text-dim` (4,17).

**Zones tactiles** — recommandation usuelle : 44 × 44 px.
- Boutons de navigation : `padding: 0.5rem 1rem` + police 0,9 rem → **≈ 33 px de haut**. Sous le seuil.
- Sélecteurs de catégorie (TierList, Versus) : même gabarit, **≈ 33 px**.
- `.btn` standard : `0.75rem 1.5rem` → ≈ 40 px. Juste en dessous.
- `.tier-item` : 80 × 80 px. ✅ correct.

**Aucun `:focus-visible` nulle part.** Navigation au clavier impossible à suivre. Plusieurs contrôles sont des `<div onClick>` sans rôle ni gestion clavier : `.tier-label`, `.tier-dropzone`, `.game-card`, `.versus-card`, le logo de la navbar.

### D.3 — Revue écran par écran

**Dashboard** — [src/components/Dashboard.jsx](src/components/Dashboard.jsx)
La bannière héroïque charge un PNG de **846 Ko** (`src/assets/hero_banner.png`) — à lui seul plus du double du JS de l'application. Non optimisé, pas de WebP/AVIF, pas de variante mobile.
Les trois cartes de jeu n'ont **aucune image** : juste un dégradé CSS orange/vert/or vers #111 ([Dashboard.jsx:113-115](src/components/Dashboard.jsx#L113-L115)). Trois rectangles sombres quasi identiques. Aucune promesse visuelle du contenu.
Le bloc statistiques affiche quatre zéros à un nouveau visiteur, sans état vide ni incitation. Le premier écran de la plateforme annonce donc : *rien à voir, rien fait*.
`hero.png` (13 Ko) est présent dans `src/assets/` mais n'est importé nulle part.

**Versus** — [src/components/Versus.jsx](src/components/Versus.jsx)
C'est l'écran le mieux traité : cartes plein cadre 380 px, dégradé bas, survol avec élévation et zoom d'image. La structure est bonne.
Mais **le duel n'a aucune mise en scène** : pas de transition entre deux duels, pas d'annonce de tour (« Quart de finale »), pas de retour au clic. On clique, le contenu est remplacé sèchement.
L'écran de victoire est le moment clé de la boucle de jeu. Il consiste en **trois pastilles colorées de 8 à 12 px qui flottent** ([Versus.jsx:321-336](src/components/Versus.jsx#L321-L336)). Ce n'est pas une célébration, c'est un décor de remplissage. Ni confettis, ni montée en tension, ni son, ni partage du champion.
L'arbre de tournoi est construit dans `bracketHistory`, mais les classes `.bracket-*` sont mortes — **l'historique n'est jamais mis en forme**.
`initialParticipants` est calculé et jamais lu (signalé par le linter).

**TierList** — [src/components/TierList.jsx](src/components/TierList.jsx)
Les rangs S→F reprennent la palette rouge-jaune-vert standard des tier lists — cohérente pour le genre, mais totalement étrangère à l'identité ivoirienne du reste.
`.tier-item` fait 80 × 80 px avec une étiquette à 8,8 px : sur des photos de 58 formats recadrées en carré, on obtient une grille de vignettes illisibles.
Aucun retour lors du dépôt réussi. `.tier-dropzone.dragover` existe en CSS, mais **aucun `onDragEnter`/`onDragLeave` ne pose jamais la classe `dragover`** — le survol de zone n'est donc jamais signalé.
Pas d'export image, alors que le bouton « Partager » est importé (`Share2`) puis jamais utilisé — partager sa tier list est pourtant l'unique raison pour laquelle ce format est viral.

**JustePrix** — [src/components/JustePrix.jsx](src/components/JustePrix.jsx)
**Le jeu est amputé : 0 image produit sur 24.** Chaque manche montre un dégradé généré par hachage du nom. Un jeu d'estimation de prix sans visuel du produit perd sa mécanique.
Les paliers de score sont abrupts : 10 % d'écart → 800 pts, 10,1 % → 500 pts. Une marche de 300 points pour 0,1 % d'écart. Un barème continu serait plus juste et plus lisible.
`.feedback-box` / `popIn` / `animate-shake` sont définis en CSS et **jamais utilisés** : le retour après chaque réponse est construit en inline, sans animation.
La barre de progression utilise `((currentIndex) / 5) * 100` : elle affiche 0 % à la première question et n'atteint jamais 100 %.
Les erreurs passent par `alert()` natif ([JustePrix.jsx:22](src/components/JustePrix.jsx#L22), [40](src/components/JustePrix.jsx#L40)) — boîte système grise, hors charte.

**Admin** — [src/components/Admin.jsx](src/components/Admin.jsx)
Fonctionnellement le plus complet, visuellement le plus pauvre : tableau dense, lignes à `padding: 1rem`, aucune hiérarchie. `.admin-nav-item` est définie et jamais utilisée — la barre latérale est stylée en ligne.
La validation source/licence/auteur est bien pensée ([Admin.jsx:81-87](src/components/Admin.jsx#L81-L87)) mais s'affiche via un bandeau d'erreur temporaire, sans marquer les champs fautifs.
Le composant fait 555 lignes et gère 18 états locaux — dont 7 champs de formulaire dupliqués entre création et édition.

**Credits** — [src/components/Credits.jsx](src/components/Credits.jsx)
Recombine les 227 items pour afficher leurs attributions. **Comme les 227 portent `source: "N/A"`, la page est une liste de 227 lignes vides.** L'écran conçu pour prouver la conformité légale démontre exactement l'inverse.
Recherche et filtre re-parcourent les 227 items à chaque frappe, sans `useMemo` ni anti-rebond.

**Navbar** — [src/components/Navbar.jsx](src/components/Navbar.jsx)
**Bug visible confirmé** (relevé par le linter, `jsx-no-duplicate-props`) : le bouton hamburger déclare **deux fois `className`** ([Navbar.jsx:80-84](src/components/Navbar.jsx#L80-L84)) :

```jsx
className="btn btn-ghost"
style={{ display: 'block', padding: '0.5rem', border: '1px solid var(--border-light)' }}
className="mobile-menu-btn"
```

En JSX, le second écrase le premier. Le bouton **perd `btn btn-ghost`** et s'affiche avec le style natif du navigateur : un bouton gris système posé sur une barre en verre sombre. **C'est le premier élément que voit tout visiteur mobile.**
Le menu mobile se déplie dans le flux et repousse le contenu, au lieu de se superposer.
Aucun indicateur d'écran actif hors couleur — l'orange seul porte l'information (problème pour les daltoniens).

### D.4 — Responsive réel, et le glisser-déposer mobile

**Le glisser-déposer de la tier list ne fonctionne pas sur mobile. Confirmé par lecture du code.**

[TierList.jsx:60-80](src/components/TierList.jsx#L60-L80) n'utilise que l'API HTML5 Drag & Drop : `draggable`, `onDragStart`, `dataTransfer`, `onDrop`. **Aucun `onTouchStart` / `onTouchMove` / `onPointerDown` dans tout le fichier.** Or Safari iOS et Chrome Android ne déclenchent pas d'événements `drag` au toucher. Sur téléphone, un appui long sélectionne le texte ou ouvre le menu contextuel de l'image.

Le repli tap-à-tap existe bien ([TierList.jsx:110-122](src/components/TierList.jsx#L110-L122)) et une consigne l'explique à l'écran. Mais il comporte **un conflit de propagation** : `.tier-item` porte `onClick={handleItemClick}` et son parent `.tier-dropzone` porte `onClick={handleZoneClick}`. Aucun `stopPropagation`. Toucher un élément déjà classé déclenche donc les deux gestionnaires dans le même événement ; `handleZoneClick` lit alors la valeur **précédente** de `selectedItem` (l'état React n'est pas encore rafraîchi) et peut déplacer le mauvais élément. Comportement imprévisible dès qu'une sélection est active.

**Autres points responsive**
- Grilles et empilements sont correctement gérés (`versus-stage`, `admin-grid`, `admin-form`, `game-grid`).
- **Trois ruptures différentes** : 768 px (`index.css`), 900 px (`admin-grid`), 600 px (`admin-form`), plus 769 px dans la navbar. Aucune échelle commune.
- `.versus-card` conserve **380 px de haut** sur mobile : deux cartes empilées = 760 px, soit plus d'un écran de téléphone. Le duel — le cœur du jeu — n'est jamais visible d'un seul coup d'œil.
- `.tier-label` occupe 90 px fixes sur une largeur de 360 px, soit **25 % de l'écran** perdus pour une seule lettre.
- `.admin-table` défile horizontalement : utilisable, mais pénible.
- La navbar est `sticky` avec `margin: 1rem` : elle consomme en permanence ~70 px de hauteur utile.

### D.5 — Trois directions visuelles

Constat qui oriente le choix : **le stock photographique est et restera hétérogène** — 58 formats, mélange de portraits studio, de captations de scène sombres, d'archives N&B et de dessins. Une direction qui mise tout sur la grande photo plein cadre amplifiera ce défaut. Deux des trois propositions ci-dessous traitent l'image pour l'absorber.

---

**Direction 1 — « Maquis Nocturne »**
*Évolution maîtrisée de l'existant.*

Ambiance : la nuit d'Abidjan, les enseignes de maquis, la lumière chaude sur fond sombre. On garde le parti pris sombre actuel, mais on le réchauffe : le #060709 présent est un noir froid, presque bleuté, qui rend tout clinique.

Palette : fond charbon chaud (#12100E) au lieu du noir bleuté ; orange braise et vert feuille conservés mais désaturés d'un cran pour supporter du texte foncé ; un or cuivré en accent rare, réservé aux moments de victoire. Trois niveaux de gris chauds réellement définis, pour enfin faire exister la hiérarchie.

Typographie : Outfit conservé pour l'interface, mais un caractère d'affichage à fort caractère pour les titres — une grotesque condensée lourde, en capitales serrées, qui évoque l'affichage de rue.

Cartes et photos : format portrait 3:4 imposé, recadrage centré sur le visage, dégradé bas profond, filet cuivré à 1 px. Les photos faibles sont reléguées en vignette, jamais en plein cadre.

Animations : élévation et lueur au survol, transition en fondu-glissé entre les duels, et une vraie célébration — gerbe de confettis aux trois couleurs, compteur de score qui s'incrémente, carte du champion qui se retourne.

*Avantage : c'est le chemin le plus court, le code existant est réutilisable. Inconvénient : cela reste une interface sombre de plus, et ne règle pas l'hétérogénéité des photos.*

---

**Direction 2 — « Pagne & Wax »**
*Rupture graphique, identité ivoirienne assumée et immédiate.*

Ambiance : l'énergie du wax et des marchés de Treichville. On abandonne le sombre. Fond ivoire chaud, aplats de couleur francs, contours noirs épais, motifs géométriques inspirés du pagne en séparateurs de sections et en dos de cartes.

Palette : ivoire (#F7F1E3) en fond ; blocs pleins en orange, vert, indigo et ocre ; noir profond pour le texte et les contours. Aucun dégradé, aucun verre dépoli — que des aplats et des bordures nettes.

Typographie : une grotesque très grasse en titres, cadrée à l'intérieur de blocs de couleur ; un texte courant en graisse normale, avec une échelle typographique stricte de six niveaux.

Cartes et photos : **c'est ici que la direction résout un vrai problème.** Les photos sont détourées ou passées en aplat duotone, puis posées sur des blocs colorés à motif. L'image devient un élément graphique parmi d'autres, plus le sujet principal. **Une photo médiocre, mal cadrée ou dessinée cesse de se voir** — et les 58 formats n'ont plus d'importance, puisque le cadre coloré impose la géométrie.

Animations : francs et rapides — glissements de blocs, bascules, rotations nettes. Pas de fondu. La célébration fait exploser des motifs de pagne à l'écran.

*Avantage : une identité immédiatement reconnaissable, impossible à confondre avec un thème générique, et une tolérance forte aux images faibles. Inconvénient : refonte complète du CSS, et le clair sur écran exige une rigueur de contraste que le sombre pardonne.*

---

**Direction 3 — « Affiche Abidjan »**
*Sérigraphie et enseignes peintes à la main.*

Ambiance : les affiches de concert, les devantures de coiffeurs peintes, l'imprimé fatigué. Papier texturé, encre qui bave légèrement, trame visible, superpositions décalées.

Palette : deux couleurs d'encre plus un fond. Fond papier kraft ou crème avec grain ; encre orange brûlée et encre vert profond ; noir de trame. La couleur d'encre change selon la section — le Versus en orange, la Tier List en vert, le Juste Prix en ocre — ce qui donne à chaque jeu une identité propre sans multiplier les composants.

Typographie : une condensée de type affiche en très grands corps, mise en page en couches légèrement décalées façon défaut d'impression. Un caractère à chasse fixe pour les scores et les prix en CFA — qui va très bien aux montants.

Cartes et photos : **toutes les photos sont converties en duotone à trame** dans la couleur d'encre de la section. C'est un traitement radical et c'est exactement pour cela qu'il fonctionne ici : le duotone tramé **efface les écarts de qualité, de colorimétrie et d'époque**. Un portrait N&B de 1980, une captation de scène sombre et une illustration passent tous en cohérence. La netteté compte moins, la silhouette compte plus.

Animations : sobres et mécaniques — apparitions par translation d'un cran, trame qui se recale, tampon encreur pour valider un choix. La célébration est un tampon « CHAMPION » qui s'abat sur la carte.

*Avantage : c'est la direction qui neutralise le mieux le problème des images, elle est très singulière, et les futures photos n'auront pas besoin d'être parfaites. Inconvénient : parti pris fort, il faut l'assumer entièrement ; et le traitement duotone doit être appliqué au chargement (filtres CSS ou SVG) — coût technique à prévoir.*

---

**Mon avis, puisque vous demandez d'être franc :** la direction 3 est celle qui règle le plus de problèmes à la fois, parce qu'elle transforme la faiblesse principale du projet — un stock photographique inégal et incomplet — en parti pris esthétique. La direction 2 est le meilleur compromis entre impact et risque. La direction 1 est la plus sûre mais n'apportera pas l'effet recherché : elle produira une version propre de ce qui existe, pas un « waouh ».

---

## E. CONTENU ET JEUX

### E.1 — État réel des jeux

| Jeu | État | Détail |
|---|---|---|
| **Versus** | 🟡 **Fonctionnel, dégradé** | Logique de tournoi 4/8/16/32 correcte et complète. Mais 100 % des cartes affichent un dégradé d'initiales, faute d'images référencées. L'arbre de tournoi est calculé et jamais affiché (classes `.bracket-*` mortes). |
| **Tier List** | 🟡 **Fonctionnel sur ordinateur, cassé sur mobile** | Glisser-déposer inopérant au toucher ; repli tap-à-tap présent mais avec conflit de propagation (§ D.4). Sauvegarde locale sans aucun écran de relecture : `savedLists` est déclaré, jamais lu. Pas d'export image. |
| **Le Juste Prix** | 🔴 **Amputé** | Mécanique de score correcte, mais **0 image sur 24 produits**. Le jeu consiste à estimer le prix d'un objet invisible. |
| **Admin** | ✅ **Fonctionnel** | CRUD complet sur les 5 collections, validation des crédits. Limité par le stockage Base64 (§ F.3). |
| **Crédits** | 🔴 **Vide de sens** | 227 lignes affichant toutes `N/A`. |

Aucun jeu n'est mort ; aucun n'est pleinement présentable.

### E.2 — Volume de contenu : les jeux tournent-ils en boucle ?

| Jeu | Pool | Tirés / partie | Renouvellement |
|---|---:|---:|---|
| Versus — artistes | 75 | 32 | 43 % du pool par partie |
| Versus — footballeurs | 75 | 32 | 43 % |
| Versus — figures publiques | 33 | 32 | **97 % — quasiment les mêmes 32 à chaque fois** |
| Tier List — artistes | 75 | 16 | 21 % |
| Tier List — footballeurs | 75 | 16 | 21 % |
| Tier List — figures publiques | 33 | 16 | 48 % |
| Tier List — **nourriture** | 20 | **20** | **100 % — toujours les 20 mêmes, zéro variété** |
| Juste Prix | 24 | 5 | 21 % |

Épuisement du Juste Prix, calculé :

| Parties jouées | Produits déjà vus |
|---:|---|
| 1 | 5 / 24 (21 %) |
| 3 | 12 / 24 (50 %) |
| 5 | 17 / 24 (69 %) |
| 10 | 22 / 24 (**90 %**) |

**Réponse : non, 227 items ne suffisent pas là où ça compte.**
- **`products` (24) est le goulot d'étranglement.** Après 10 parties, 90 % du contenu est vu. Il en faudrait **60 à 80** pour tenir une vingtaine de parties.
- **`foods` (20) ne tourne pas du tout** en tier list : la totalité du pool est servie à chaque partie, donc la grille de départ est rigoureusement identique à chaque fois. Il en faudrait **40 à 50** pour que l'échantillonnage produise de la variété.
- **`publicFigures` (33) est trop juste pour le Versus 32** : 97 % du pool à chaque tournoi. Objectif : **60+**.
- Les artistes et footballeurs (75 chacun) sont corrects.

**Biais de tirage aggravant — mesuré.** Les cinq mélanges du projet utilisent `sort(() => 0.5 - Math.random())` ([Versus.jsx:57](src/components/Versus.jsx#L57), [JustePrix.jsx:26](src/components/JustePrix.jsx#L26), [TierList.jsx:40,44,48](src/components/TierList.jsx#L40)). Ce n'est pas un mélange uniforme. Sur 200 000 tirages de 8 éléments :

```
probabilité d'arriver en 1ʳᵉ position (uniforme attendu : 12,50 %)
  élément 0 -> 22,28 %     <-- 1,8× trop fréquent
  élément 1 ->  8,29 %
  ...
  écart maximal à l'uniforme : 13,99 points
```

Les premiers éléments de chaque liste sortent nettement plus souvent. Concrètement, `art_1` (Didi B), `foot_1` (Drogba) et `prod_1` (Garba) apparaissent bien plus que les autres — ce qui **accentue encore** la sensation de répétition sur des pools déjà trop petits. Un mélange de Fisher-Yates corrigerait cela en cinq lignes.

### E.3 — Jeux manquants : ce que chacun coûterait

Architecture actuelle : pas de serveur, pas de routeur, tout en `localStorage`, état global dans `App.jsx`.

**1. Quiz « devine l'artiste »** — *effort : faible*
Montrer une photo, proposer 4 noms. S'appuie sur les collections existantes et le même modèle d'état que JustePrix. Aucun obstacle architectural.
**Bloquant réel : les images.** Un quiz visuel exige que la photo soit nette, bien cadrée **et représente la bonne personne**. Avec ~50 images exploitables et 20 % d'erreurs de sujet, le jeu est injouable aujourd'hui. **Ce jeu ne peut pas précéder la remise en état des images.**

**2. « Devine c'est quoi »** — *effort : faible à moyen*
Image floutée ou zoomée que l'on dévoile progressivement. Techniquement simple (filtres CSS animés).
Ironiquement, c'est **le seul jeu qui tolère des images moyennes**, puisqu'elles sont volontairement dégradées. Mais il exige toujours le bon sujet. Convient bien aux plats — à condition de porter `foods` à 40+.

**3. Classements / leaderboards** — *effort : faible en local, bloquant en ligne*
En local (meilleurs scores de l'appareil) : quelques heures, cohérent avec l'existant.
**En ligne, c'est le premier vrai blocage architectural.** Un classement partagé suppose un serveur, une identité et une protection anti-triche. Tout le score étant calculé côté client, il est trivialement falsifiable depuis la console. Impossible sans backend — Supabase ou Firebase seraient le chemin le plus court.

**4. Multijoueur / mode équipe** — *effort : élevé, partiellement bloquant*
- *Même appareil, à tour de rôle* (deux joueurs se passent le téléphone, scores comparés) : **faisable sans backend**, effort moyen. C'est la voie recommandée pour commencer — et culturellement pertinente, on joue à plusieurs autour d'un seul téléphone.
- *Temps réel à distance* : **impossible en l'état.** Exige serveur, WebSocket, salons, synchronisation. C'est un projet à part entière.
- *Asynchrone par partage de lien* (« bats mon score », tier list partagée par URL) : **faisable sans backend** en encodant l'état dans l'URL — mais **bloqué par l'absence de routeur** (§ F.4).

**Synthèse des blocages, par ordre de gêne :**
1. **Les images** — bloquent les deux quiz, qui sont pourtant les plus faciles à coder.
2. **L'absence de routeur** — bloque tout partage de lien, donc toute viralité.
3. **L'absence de backend** — bloque les classements en ligne et le temps réel, mais **pas** le multijoueur sur un même appareil.
4. **Le volume de contenu** — `products` et `foods` sont déjà trop courts pour les jeux actuels ; ajouter des jeux sur le même fonds aggravera la répétition.

---

## F. TECHNIQUE ET DETTE

### F.1 — `npm install` et `npm run build` : sortie brute

```
$ npm install
changed 1 package in 21s
11 packages are looking for funding
```
Aucune vulnérabilité signalée, aucune erreur.

```
$ npm run build
> jeux-ci@0.0.0 build
> vite build

vite v8.1.3 building client environment for production...
✓ 1565 modules transformed.
dist/index.html                         1.06 kB │ gzip:  0.58 kB
dist/assets/hero_banner-CZes1-sp.png  846.70 kB
dist/assets/index-BzPvoS0V.css         12.35 kB │ gzip:  3.21 kB
dist/assets/index-8p3EtCXe.js         301.51 kB │ gzip: 81.75 kB

[PLUGIN_TIMINGS] Your build spent significant time in plugins:
  - vite:css (38%)
  - vite:asset (37%)
✓ built in 8.82s
```

**Le build passe.** Observations :
- `hero_banner.png` pèse **846,70 Ko**, soit **2,8× le poids du JavaScript**. C'est de loin le premier poste de chargement.
- `db.json` (61 Ko) est intégralement embarqué dans le bundle JS — les 227 items sont téléchargés au premier affichage, même si l'on ne joue qu'à un seul jeu.
- Aucune césure de code : les 6 écrans sont dans un unique fichier de 301 Ko.

### F.2 — `npm run lint` : sortie brute

**12 avertissements, 0 erreur, code de sortie 0.**

| Fichier | Ligne | Règle | Message |
|---|---:|---|---|
| `Navbar.jsx` | 83 | `jsx-no-duplicate-props` | **`className` dupliqué** — bug visuel réel (§ D.3) |
| `TierList.jsx` | 29 | `exhaustive-deps` | dépendance `resetTierList` manquante |
| `TierList.jsx` | 15, 19 | `no-unused-vars` | `items`, `savedLists`, `setSavedLists` |
| `TierList.jsx` | 2 | `no-unused-vars` | `Share2` importé, jamais utilisé |
| `Versus.jsx` | 27 | `no-unused-vars` | `initialParticipants` |
| `Versus.jsx` | 1 | `no-unused-vars` | `useEffect` |
| `JustePrix.jsx` | 2 | `no-unused-vars` | `HelpCircle` |
| `Dashboard.jsx` | 2 | `no-unused-vars` | `UserCheck` |
| `App.jsx` | 41 | `no-unused-vars` | `catch (e)` silencieux |
| `defaultData.js` | 369 | `no-unused-vars` | `idx` — fichier mort |

Le linter ne relève rien de grave hors `Navbar.jsx:83`, mais il **ne peut pas voir** les problèmes majeurs de ce rapport : variables CSS fantômes, classes non définies, glisser-déposer mobile, écrasement de `db.json`.

### F.3 — Stockage Base64 : à partir de combien ça casse, et comment

**Occupation actuelle**, mesurée sur `db.json` :

| Clé | Poids |
|---|---:|
| `civ_data_artists` | 13,6 Ko |
| `civ_data_footballers` | 14,6 Ko |
| `civ_data_publicfigures` | 6,4 Ko |
| `civ_data_foods` | 3,5 Ko |
| `civ_data_products` | 5,1 Ko |
| **Total** | **43,2 Ko — 0,84 % d'un quota de 5 Mo** |

**Le facteur aggravant : aucun redimensionnement à l'envoi.** [Admin.jsx:59-74](src/components/Admin.jsx#L59-L74) appelle `reader.readAsDataURL(file)` sur le fichier **original**, sans passer par un canvas. Une photo prise au téléphone part donc en Base64 à sa taille native, avec une surcharge d'encodage de +33 %.

| Type d'image envoyée | Poids Base64 | Saturation après |
|---|---:|---|
| Vignette 400 px déjà optimisée (~20 Ko) | 27 Ko | 190 images |
| Photo compressée pour le web (~200 Ko) | 267 Ko | **19 images** |
| Photo de smartphone standard (~2,5 Mo) | 3 413 Ko | **1 image** |
| Photo de smartphone haute définition (~5 Mo) | 6 827 Ko | **échec immédiat, dès la première** |

**Le cas réaliste est le pire :** un utilisateur qui remplit les 111 fiches manquantes depuis son téléphone **plante au premier ou au deuxième envoi**.

**Ce qui se passe exactement au moment de la casse.** `localStorage.setItem` lève une `QuotaExceededError`. Or **aucun des 16 appels à `setItem` de [src/App.jsx](src/App.jsx) n'est protégé** — le seul `try` du fichier entoure le `JSON.parse` de lecture ([App.jsx:36-42](src/App.jsx#L36-L42)). L'exception est donc levée **à l'intérieur d'un `useEffect`** ([App.jsx:92-112](src/App.jsx#L92-L112)) :

1. L'utilisateur ajoute une fiche avec photo dans Admin.
2. L'état est mis à jour, l'effet de synchronisation se déclenche.
3. `setItem` lève `QuotaExceededError`.
4. Rien ne l'attrape. React démonte l'arbre entier.
5. **Écran blanc.** Sans limite d'erreur (`ErrorBoundary`), il n'y a aucun message.
6. Au rechargement, `localStorage` est intact mais incomplet, et **le travail de saisie est perdu sans avertissement**.

C'est le scénario de perte de données le plus probable pour un utilisateur réel de l'écran Admin.

### F.4 — Bug de persistance confirmé, et les autres

**1. Suppression non persistée — confirmé.** [App.jsx:92-112](src/App.jsx#L92-L112) : les cinq effets sont gardés par `if (xxx.length > 0)`. Vider entièrement une collection depuis Admin met bien l'état à `[]` à l'écran, **mais n'écrit jamais dans `localStorage`**. Au rechargement, l'ancienne liste complète réapparaît. La suppression semble avoir fonctionné, puis s'annule silencieusement.

**2. Suppression partielle mal restaurée.** Le garde protège aussi le cas légitime d'une collection volontairement vidée — il n'y a aucun moyen de persister une collection vide.

**3. `resetToDefault` ne purge pas les statistiques.** [App.jsx:115-129](src/App.jsx#L115-L129) réécrit les 5 clés de données mais laisse `stats_versus_played`, `stats_tierlists_saved`, `stats_justeprix_best`, `stats_justeprix_played` et `saved_tierlists`. Une « restauration complète » laisse donc les compteurs et les tier lists enregistrées.

**4. `civ_data_version` doit être incrémentée à la main.** [App.jsx:34](src/App.jsx#L34) : `shouldForceReset` compare à `'v4'` en dur. Toute modification de `db.json` sans incrément laisse les visiteurs existants sur leur cache périmé — silencieusement.

**5. Aucune validation de forme au chargement.** `getCachedList` vérifie que c'est un tableau non vide, jamais que les items ont les bons champs. Un cache d'une version antérieure du schéma passe le contrôle et casse les composants plus loin.

**6. `saved_tierlists` s'écrit sans jamais se lire.** [TierList.jsx:132-134](src/components/TierList.jsx#L132-L134) empile les tier lists sauvegardées ; `savedLists` est déclaré mais jamais affiché (relevé par le linter). Les données s'accumulent indéfiniment dans `localStorage`, invisibles et sans purge.

### F.5 — Absence de routeur : trois conséquences

**Partage de lien : impossible.** Toute l'application vit sur une seule URL, l'écran étant une variable d'état ([App.jsx:15](src/App.jsx#L15)). On ne peut pas envoyer un lien vers le Juste Prix, ni vers une tier list terminée, ni vers un champion de Versus. **Pour une plateforme de jeux sociaux, c'est la perte du principal moteur de diffusion** — et cela annule directement l'intention affichée sur le Dashboard (« Sauvegarde et partage ton œuvre ! », [Dashboard.jsx:134](src/components/Dashboard.jsx#L134)), alors que le bouton de partage n'existe pas.

**Bouton retour : destructeur.** Aucun écran ne crée d'entrée dans l'historique. Le retour arrière **quitte le site** au lieu de revenir à l'écran précédent. Sur Android, où le retour est un geste système permanent, un joueur au milieu d'un tournoi de 32 duels perd tout d'un seul geste. Aucun avertissement, aucune reprise — l'état du tournoi n'est pas sauvegardé.

**Déploiement Netlify : c'est le seul point favorable.** Sans routeur, aucune réécriture n'est nécessaire — pas besoin de `_redirects` ni de `netlify.toml`, et il n'y a d'ailleurs aucun des deux dans le dépôt. `npm run build` puis publication de `dist/` suffit. **Attention cependant :** le jour où un routeur sera ajouté, il faudra créer `public/_redirects` avec `/* /index.html 200`, sinon tout accès direct à une sous-URL renverra un 404. À prévoir dans le même lot.

### F.6 — Dette restante, classée

**🔴 Bloquant — empêche une mise en ligne présentable**

| # | Point | Où |
|---|---|---|
| 1 | `db.json` ne référence aucune image : 227 placeholders | [src/data/db.json](src/data/db.json) |
| 2 | Métadonnées de licence perdues : risque juridique sur 116 images CC | § A.4 |
| 3 | `products` sans aucune image : le Juste Prix est amputé | `public/images/produits/` |
| 4 | Le seeder écrase `db.json` sans sauvegarde | [seed_images.js:617](scripts/seed_images.js#L617) |
| 5 | Rate limiting Wikidata non géré → cause probable de la panne | [seed_images.js:14](scripts/seed_images.js#L14) |
| 6 | Aucune validation `P31` → ~20 % de sujets faux | [seed_images.js:210-226](scripts/seed_images.js#L210-L226) |
| 7 | `--text-secondary` : 33 usages, jamais définie | [src/index.css](src/index.css) |
| 8 | `.card` : 27 usages, aucun style | [src/index.css](src/index.css) |
| 9 | Glisser-déposer inopérant sur mobile | [TierList.jsx:60-80](src/components/TierList.jsx#L60-L80) |
| 10 | `QuotaExceededError` non attrapée → écran blanc | [App.jsx:92-112](src/App.jsx#L92-L112) |
| 11 | `className` dupliqué sur le bouton hamburger | [Navbar.jsx:83](src/components/Navbar.jsx#L83) |

**🟠 Important — dégrade nettement l'expérience**

| # | Point |
|---|---|
| 12 | Contraste du bouton principal à 2,33 (échec WCAG) |
| 13 | Suppressions non persistées (`length > 0`) |
| 14 | Pas de routeur : ni partage, ni bouton retour |
| 15 | Envois Admin non redimensionnés avant Base64 |
| 16 | Orientation EXIF ignorée : 2 images couchées |
| 17 | Mélange biaisé (+14 points d'écart à l'uniforme) |
| 18 | `hero_banner.png` à 846 Ko |
| 19 | Pools trop courts : `products` 24, `foods` 20, `publicFigures` 33 |
| 20 | Célébration de victoire réduite à 3 pastilles |
| 21 | Conflit de propagation sur le tap-à-tap de la tier list |
| 22 | Aucun `:focus-visible`, `<div onClick>` non accessibles |
| 23 | Zones tactiles à ~33 px (seuil : 44 px) |
| 24 | `.tier-item-label` à 8,8 px |
| 25 | Page Crédits : 227 lignes vides |
| 26 | `resetToDefault` ne purge pas les statistiques |
| 27 | Openverse indisponible pour 183 items |

**🟢 Cosmétique — à traiter en fin de parcours**

| # | Point |
|---|---|
| 28 | `src/App.css` mort (jamais importé, 7 variables fantômes) |
| 29 | `src/data/defaultData.js` mort (430 lignes, ancien jeu de données Deezer) |
| 30 | `scripts/test_sharp.js` : script de test jetable |
| 31 | `src/assets/hero.png`, `react.svg`, `vite.svg` inutilisés |
| 32 | 16 classes CSS définies et jamais utilisées |
| 33 | Deux `<style>` injectés dans le rendu (Navbar, Versus) |
| 34 | 3 `alert()` natifs |
| 35 | Quatre ruptures responsive différentes (600/768/769/900) |
| 36 | 10 avertissements de linter pour imports et variables inutilisés |
| 37 | `README.md` est encore le gabarit Vite par défaut |
| 38 | Barre de progression du Juste Prix : n'atteint jamais 100 % |
| 39 | `Admin.jsx` : 555 lignes, 18 états, champs dupliqués |
| 40 | Recherche des Crédits sans `useMemo` ni anti-rebond |

---

## G. SYNTHÈSE ET PLAN

### G.1 — Les cinq problèmes les plus graves, par impact réel

**1. La plateforme n'affiche aucune photo — et les images existantes sont juridiquement inutilisables.**
227 items sur 227 pointent vers un placeholder, alors que 116 fichiers dorment sur le disque. Ces 116 sont dépourvus d'attribution CC, donc non publiables en l'état. Le projet repose entièrement sur la reconnaissance de visages et de plats ; sans images, les trois jeux perdent leur substance et la page Crédits démontre la non-conformité qu'elle devait prouver. **C'est le problème dont tous les autres dépendent.**

**2. Le seeder détruit la base à chaque échec, et il échouera encore.**
L'écriture est inconditionnelle et sans sauvegarde, et la cause de la panne — le rate limiting Wikidata — n'est toujours pas gérée (`grep` de `429|retry|backoff` : 0 résultat). J'ai reproduit le blocage deux fois en conditions réelles, y compris avec un délai 5,5× plus prudent que celui du script. **Relancer `npm run seed:images` aujourd'hui reproduirait très probablement le même désastre.** Rien ne doit être relancé avant correction.

**3. Une image sur cinq représente le mauvais sujet, et le bug est structurel.**
Molière le dramaturge, une araignée-loup pour l'alloco, un avion-cargo pour VDA, une commune italienne pour Molare, une gerbe de blé pour le garba. La cause est nette : `wbsearchentities` est utilisé sans aucune vérification de la nature de l'entité, et la correspondance par alias sélectionne activement les concepts génériques. Une seule image fausse et visible détruit la crédibilité de toute la plateforme — bien plus qu'une image manquante.

**4. Le design system est déconnecté du balisage, ce qui produit le rendu « projet d'école ».**
Ce n'est pas un problème de goût mais de câblage : 33 usages d'une variable de couleur inexistante — donc aucune hiérarchie typographique — et 27 usages d'une classe `.card` sans le moindre style. Le CSS et le JSX décrivent deux interfaces différentes, et ce qui tient debout tient par ~300 styles inline sans échelle commune. Aucune refonte visuelle ne donnera de résultat tant que ce câblage n'est pas rétabli.

**5. L'expérience mobile est cassée là où elle compte.**
Le glisser-déposer de la tier list ne fonctionne pas au toucher (aucun gestionnaire d'événement tactile), le repli tap-à-tap souffre d'un conflit de propagation, le bouton hamburger s'affiche en gris système à cause d'un `className` dupliqué, le bouton retour quitte le site en plein tournoi, et un seul envoi de photo depuis un téléphone suffit à provoquer un écran blanc. Pour un public abidjanais majoritairement mobile, c'est rédhibitoire.

### G.2 — Plan de travail, dans l'ordre où je le ferais

**Étape 0 — Sauvegarder l'existant** · *15 min*
Copier `public/images/` et `db.json` hors du dépôt, et initialiser un dépôt Git (il n'y en a pas : `Is a git repository: false`). Aujourd'hui, la moindre commande peut détruire les 116 images sans aucun recours.
*Débloque :* la possibilité de travailler sans risque. **Non négociable avant tout le reste.**

**Étape 1 — Sécuriser le seeder avant de le relancer** · *0,5 à 1 jour*
Sauvegarde + écriture atomique + fusion non régressive ; gestion du 429 avec `Retry-After` et backoff ; distinction des causes d'échec ; reprise sur incident ; `run().catch()`.
*Débloque :* la possibilité de réexécuter sans rien casser. **Tout le reste du travail sur les images en dépend.**

**Étape 2 — Reconnecter les 116 images existantes** · *0,5 jour*
Script de réconciliation : pour chaque item dont `<id>.jpg` existe, remettre le chemin réel dans `db.json`, puis incrémenter `civ_data_version` en `v5`.
*Débloque :* **la plateforme cesse d'être vide immédiatement**, avant même toute nouvelle collecte. Meilleur rapport effort/résultat du plan.
*Réserve :* les métadonnées de licence restent absentes — l'étape 3 les régénère.

**Étape 3 — Corriger la résolution, puis relancer la collecte** · *1 à 2 jours*
Validation `P31`, contrôle de la description, suppression du repli au premier résultat, requêtes enrichies du contexte ivoirien, déduplication des `search_query`, `.rotate()` pour l'EXIF, vignettes carrées à recadrage intelligent. Puis exécution complète avec journal cumulatif des licences, dans un fichier séparé.
*Débloque :* la couverture passe de 51 % vers 75-85 %, les erreurs de sujet tombent sous les 5 %, et **les attributions légales sont régénérées**.

**Étape 4 — Revue visuelle des 227 fiches dans l'écran Admin** · *4 à 8 h, manuelles*
Le filtre « à vérifier » existe déjà ([Admin.jsx:193-198](src/components/Admin.jsx#L193-L198)). Passer chaque image, écarter les mauvais sujets, remplacer les cadrages inutilisables.
*Débloque :* la seule garantie réelle de qualité. **Aucune automatisation ne remplace ce passage** (voir § G.3).
*Prérequis :* l'étape 6 doit être faite avant, sinon l'envoi d'une photo depuis un téléphone plante l'écran.

**Étape 5 — Réparer le socle CSS** · *0,5 jour*
Définir `--text-secondary` et les variables manquantes ; écrire `.card`, `.container`, `.gradient-text` ; corriger le `className` dupliqué de la navbar ; assombrir l'orange du bouton principal pour atteindre 4,5:1 ; porter `.tier-item-label` à 11 px minimum ; agrandir les zones tactiles à 44 px.
*Débloque :* la hiérarchie visuelle réapparaît partout d'un coup. Petit effort, effet très visible — et **indispensable avant toute refonte esthétique**.

**Étape 6 — Réparer la persistance et le mobile** · *1 jour*
Envelopper les `setItem` dans un `try/catch` avec message explicite ; redimensionner les photos par canvas avant Base64 (400 px, qualité 0,8) ; retirer le garde `length > 0` ; corriger le conflit de propagation du tap-à-tap ; ajouter les gestionnaires tactiles (`pointerdown`/`pointermove`) pour un vrai glisser-déposer mobile.
*Débloque :* la saisie Admin depuis un téléphone devient sûre, et la tier list redevient jouable sur mobile.

**Étape 7 — Étoffer le contenu** · *0,5 jour de saisie*
Porter `products` de 24 à 60-80, `foods` de 20 à 40-50, `publicFigures` de 33 à 60. Remplacer les cinq mélanges biaisés par Fisher-Yates.
*Débloque :* les jeux cessent de tourner en boucle. **Prérequis à tout nouveau jeu** — en ajouter sur le fonds actuel ne ferait qu'aggraver la répétition.

**Étape 8 — Choisir une direction visuelle et refondre** · *3 à 5 jours*
Appliquer la direction retenue (§ D.5) : jetons de couleur, échelle typographique, échelle d'espacement, traitement uniforme des images, transitions entre écrans, et une vraie célébration de victoire.
*Débloque :* l'effet recherché. **À ne surtout pas faire avant l'étape 5** — refondre par-dessus un design system débranché revient à repeindre sur du plâtre humide.

**Étape 9 — Ajouter un routeur** · *0,5 jour*
`react-router` avec une route par écran, plus `public/_redirects` contenant `/* /index.html 200` pour Netlify.
*Débloque :* partage de liens, bouton retour fonctionnel, et la voie vers le multijoueur asynchrone par URL.

**Étape 10 — Nouveaux jeux** · *1 à 2 jours chacun*
Dans cet ordre : « devine c'est quoi » (le plus tolérant aux images moyennes), puis le quiz « devine l'artiste », puis le mode deux joueurs sur le même appareil. Les classements en ligne et le temps réel supposent un backend et forment un projet distinct.

**Effort total jusqu'à une plateforme présentable (étapes 0 à 9) : environ 9 à 13 jours de travail**, dont une demi-journée à une journée de validation manuelle de votre part.

### G.3 — Ce que je ne peux pas régler automatiquement

**1. Valider que chaque image montre la bonne personne.**
Je peux éliminer les cas grossiers — Molière, l'araignée, l'avion-cargo — en vérifiant `P31`. Je **ne peux pas** vérifier automatiquement qu'un portrait d'homme ivoirien est bien *Yabongo Lova* et non un autre artiste. Aucune base de référence ne le permet ici. **Environ 227 vérifications visuelles vous reviennent.** C'est le poste manuel le plus lourd, et le seul qui garantisse la qualité.

**2. Décider du sort des 116 images sans licence.**
Trois options, et le choix vous appartient : *(a)* relancer la collecte pour régénérer les métadonnées, en acceptant de perdre les fichiers non retrouvés ; *(b)* les conserver et rechercher l'attribution à la main, image par image ; *(c)* les supprimer et repartir de sources dont vous maîtrisez les droits. **Je recommande (a), avec (c) en complément pour les produits et les plats.** C'est une décision de risque juridique, pas une décision technique.

**3. Le droit à l'image des personnalités ivoiriennes vivantes.**
Une licence CC couvre le photographe, pas la personne photographiée. Publier des portraits de personnalités identifiables sur une plateforme publique relève d'une appréciation juridique — et éventuellement d'un conseil — qui dépasse ce que je peux trancher.

**4. Le choix de la direction visuelle.**
Les trois pistes du § D.5 mènent à trois produits différents. C'est un choix d'auteur. **Je ne coderai rien tant que vous n'aurez pas tranché.**

**5. Les prix en CFA du Juste Prix.**
Les 24 prix de `rawItems.json` sont figés dans le code, sans date ni source. Leur justesse dépend du marché ivoirien réel — seule votre connaissance du terrain peut les valider, et il faudra prévoir leur mise à jour.

**6. La sélection du contenu à ajouter.**
Quels artistes, quels plats, quels produits ajouter pour atteindre les volumes de l'étape 7 relève d'un choix éditorial et culturel. Je peux structurer les fiches ; je ne peux pas décider qui mérite d'y figurer.

**7. Backend et hébergement.**
Classements en ligne et multijoueur temps réel exigent un serveur, donc un choix de prestataire, un budget et un modèle de données utilisateurs. Décision à prendre en amont.

**8. La cause exacte des 103 absences non expliquées.**
Les journaux de l'exécution ratée sont perdus et `rapport.json` n'enregistre que `"N/A"` sans distinguer les causes. **Cette information n'est pas récupérable.** Seule une réexécution corrigée, avec journalisation détaillée, donnera la répartition réelle.
