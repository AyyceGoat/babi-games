import React, { useState } from 'react';

/**
 * Affichage unifie du visuel d'un item.
 *
 * Direction visuelle retenue ("Pagne & Wax" + emprunt a la serigraphie) :
 *  - status 'ok'                     -> la photo est nette et attribuee,
 *                                       on la montre pleine ;
 *  - status 'a_verifier_manuellement' -> traitement duotone dans son bloc
 *                                       colore : la faiblesse de l'image
 *                                       devient un parti pris graphique ;
 *  - aucune image                    -> bloc de couleur et initiales.
 *
 * Le bloc de couleur est derive du nom, donc stable d'une session a l'autre.
 */

const TEINTES = ['orange', 'vert', 'indigo', 'ocre'];

/** Les identifiants portent la nature de l'element : art_, foot_ et pub_
 *  designent des personnes, food_ et prod_ des plats ou des objets.
 *  Cette distinction pilote l'ancrage du recadrage. */
export function estUnePersonne(id = '') {
  return /^(art|foot|pub)_/.test(id);
}

export function teinteDe(nom = '') {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = (nom.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return TEINTES[Math.abs(hash) % TEINTES.length];
}

export function initiales(nom = '') {
  return nom
    .replace(/\([^)]*\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => m[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ItemImage({ item, className = '', sizes, eager = false }) {
  const [erreur, setErreur] = useState(false);

  const teinte = teinteDe(item?.name || '');
  const aUneImage =
    Boolean(item?.image) && !item.image.includes('/placeholders/') && !erreur;
  const aVerifier = item?.status !== 'ok';

  const classes = [
    'item-visuel',
    `teinte-${teinte}`,
    estUnePersonne(item?.id) ? 'est-personne' : 'est-objet',
    aUneImage ? (aVerifier ? 'is-duotone' : 'is-photo') : 'is-vide',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-teinte={teinte}>
      {aUneImage ? (
        /* draggable={false} est indispensable, pas cosmetique.
           Une balise <img> est nativement deplacable. Sur navigateur de
           bureau, un appui suivi d'un mouvement declenchait le glisser
           HTML5 du navigateur, qui emettait aussitot un pointercancel :
           la sequence de pointeur de la tier list etait interrompue et
           le curseur passait en "depot interdit". Sequence observee :
             pointerdown(img) > pointermove > dragstart(img)
             > pointercancel > drag... > dragend
           Le tactile n'etait pas touche, les navigateurs ne demarrant pas
           de glisser natif depuis un doigt - d'ou le defaut visible sur PC
           seulement, et uniquement sur les vignettes portant une image. */
        <img
          src={item.image}
          alt={item.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          sizes={sizes}
          onError={() => setErreur(true)}
        />
      ) : (
        <span className="item-initiales" aria-hidden="true">
          {initiales(item?.name)}
        </span>
      )}
    </div>
  );
}
