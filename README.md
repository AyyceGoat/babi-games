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
npm run dev            # serveur de développement
npm run build          # build de production dans dist/
npm run preview        # sert le build
npm run lint           # oxlint
npm run seed:images    # collecte des visuels (voir plus bas)
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

## Règle sur les images

Aucune image sans **source, licence et auteur** complets ne part en
production. Les visuels vérifiés s'affichent en photo pleine ; ceux dont le
cadrage ou la fidélité est discutable passent en duotone assumé. Les
attributions sont publiées sur la page Crédits.

## Documents

- `DIAGNOSTIC.md` — état des lieux détaillé qui a déclenché la remise en état.
- `DECISIONS.md` — décisions prises en cours de route et leurs raisons.
- `REVUE_IMAGES.md` — verdict image par image.
- `A_SOURCER.md` — ce qui reste à traiter à la main.
- `RAPPORT_FINAL.md` — bilan de la remise en état.
