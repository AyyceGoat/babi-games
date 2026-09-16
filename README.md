# Babi Games

Plateforme web de mini-jeux 100 % ivoiriens. React + Vite, entièrement côté
client, sans backend. Les données et les scores vivent dans le navigateur.

## Jeux

- **Versus** — tournoi à élimination directe sur les artistes, footballeurs
  et personnalités ivoiriennes.
- **Tier List 225** — classement du rang S au rang F, au glisser-déposer ou
  au toucher.
- **Le Juste Prix** — estimation du prix réel de produits du quotidien, en CFA.

## Commandes

```bash
npm install
npm run dev              # serveur de développement
npm run build            # build de production dans dist/
npm run preview          # sert le build
npm run lint             # oxlint
npm run inventaire       # régénère INVENTAIRE.md depuis db.json
npm run importer-photos  # importe le dossier photos/ (voir plus bas)
npm run seed:images      # collecte automatique des visuels (voir plus bas)
```

## Collecte des visuels

`npm run seed:images` interroge Wikidata puis Wikimedia Commons, valide
l'entité trouvée, télécharge l'image et produit une vignette carrée 500×500.

Le script est conçu pour ne rien détruire :

- sauvegarde horodatée de `db.json` avant toute écriture, dans `backup_db/` ;
- écriture atomique, et **fusion** au lieu de remplacement ;
- un item déjà résolu ne retombe jamais en placeholder ;
- refus d'écrire si le taux de réussite s'effondre ;
- journal des licences en ajout seul dans `data/licences.jsonl`, qu'aucune
  exécution ne peut écraser.

Options utiles : `--only=art_1,food_2`, `--type=nourriture`, `--limit=20`,
`--fresh` (ignore la reprise), `--force` (passe outre le garde-fou).

`node scripts/test_resolver.js` rejoue le banc d'essai de la résolution.

## Ajouter vos propres photos

C'est la façon la plus simple de compléter le catalogue. Le principe :
**un fichier par élément, nommé d'après son identifiant.**

### 1. Trouver l'identifiant

Ouvrez [INVENTAIRE.md](INVENTAIRE.md), à la racine. Il liste les 227
éléments avec leur identifiant exact et l'état de leur visuel. La colonne
« Fichier à déposer » donne directement le nom attendu.

Exemple, ligne extraite de l'inventaire :

| Identifiant | Nom | État du visuel | Fichier à déposer |
|---|---|---|---|
| `art_2` | Ariel Sheney | Aucun visuel | `art_2.jpg` |

### 2. Déposer les fichiers

Créez un dossier `photos/` **à la racine du projet**, à côté de `src/` et
`public/`, et déposez-y vos images :

```
photos/
  art_2.jpg          → Ariel Sheney
  foot_33.png        → le footballeur portant l'identifiant foot_33
  food_5.webp        → Placali Sauce Kpala
```

Le dossier `photos/` n'est pas versionné : vos fichiers d'origine restent
sur votre machine, seules les vignettes produites entrent dans le dépôt.

**Formats acceptés :** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`,
`.tif`, `.tiff`, `.heic`, `.heif`.
**Taille minimale :** 200 px sur le petit côté. En dessous, le fichier est
refusé et signalé.
L'extension du fichier déposé n'a pas d'importance : la sortie est
toujours un JPEG de 500 × 500.

### 3. Renseigner l'origine

Pour que la page Crédits reste exacte, créez `photos/origines.json` :

```json
{
  "_defaut": {
    "source": "Photo fournie par l'éditeur du site",
    "license": "Usage autorisé sur babi-games.netlify.app",
    "author": "Votre nom"
  },
  "art_2": {
    "source": "Compte officiel de l'artiste",
    "license": "Autorisation écrite de l'artiste",
    "author": "Ariel Sheney",
    "page": "https://exemple.ci/ariel-sheney"
  }
}
```

`_defaut` s'applique à toutes les images du lot ; une entrée nommée d'après
un identifiant a la priorité pour cette image. Le champ `page` est
facultatif et devient le lien « Fichier source » sur la page Crédits.

Une image importée **sans licence ni auteur** est acceptée mais reste
marquée « à vérifier » : elle s'affiche en duotone et n'est pas annoncée
comme attribuée. Complétez `origines.json` et relancez l'import sur les
mêmes fichiers pour la faire passer en photo pleine.

### 4. Lancer l'import

```bash
npm run importer-photos              # importe tout le dossier
npm run importer-photos -- --essai   # montre ce qui serait fait, sans écrire
npm run importer-photos -- --only=art_2,food_5
npm run inventaire                   # met l'inventaire à jour
```

Puis `git add -A && git commit && git push` : Netlify redéploie tout seul.

### Ce que le script garantit

- **Rien n'est écrasé par accident.** Un élément déjà pourvu n'est remplacé
  que si un fichier portant son identifiant se trouve dans `photos/`.
  Sans fichier, son image actuelle est conservée telle quelle.
- **Relançable sans risque**, autant de fois que voulu, par lots.
- **Sauvegarde horodatée** de `db.json` avant chaque écriture, dans
  `backup_db/`, et écriture atomique.
- **Recadrage adapté** : carré 500 × 500, ancré vers le haut pour les
  personnes (`art_`, `foot_`, `pub_`) afin de ne pas couper les visages,
  centré sur le sujet pour les plats et produits (`food_`, `prod_`).
  L'orientation EXIF est corrigée.
- **Aucun fichier ignoré en silence** : un nom qui ne correspond à aucun
  identifiant est signalé, avec une suggestion.

```
!! 1 fichier(s) sans identifiant correspondant, NON importes :

   art_999.png
      "art_999" ne figure dans aucune collection.
      Vouliez-vous dire "art_9" ? Renommez le fichier en art_9.png
```

## Règle sur les images

Aucune image sans **source, licence et auteur** complets ne part en
production. Les visuels vérifiés s'affichent en photo pleine ; ceux dont le
cadrage ou la fidélité est discutable passent en duotone assumé. Les
attributions sont publiées sur la page Crédits.

## Documents

- `INVENTAIRE.md` — les 227 éléments et l'état de leur visuel.
- `DIAGNOSTIC.md` — état des lieux détaillé qui a déclenché la remise en état.
- `DECISIONS.md` — décisions prises en cours de route et leurs raisons.
- `REVUE_IMAGES.md` — verdict image par image.
- `A_SOURCER.md` — ce qui reste à traiter à la main.
- `RAPPORT_FINAL.md` — bilan de la remise en état.
