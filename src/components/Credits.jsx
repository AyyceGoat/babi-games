import React, { useMemo, useState } from 'react';
import { Shield, Search, ExternalLink } from 'lucide-react';

const LIBELLES = {
  artists: 'Artiste',
  footballers: 'Footballeur',
  publicFigures: 'Personnalité',
  foods: 'Nourriture',
  products: 'Produit',
};

/**
 * Page d'attribution.
 *
 * DIAGNOSTIC.md D.3 : cette page affichait 227 lignes portant toutes
 * "N/A", faute de metadonnees. Elle n'affiche desormais que les items
 * reellement attribues, et indique franchement combien restent a sourcer.
 */
export default function Credits({ collections }) {
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');

  const { attribues, enAttente } = useMemo(() => {
    const tous = Object.entries(collections || {}).flatMap(([cle, liste]) =>
      (liste || []).map((item) => ({ ...item, categorie: LIBELLES[cle] || cle }))
    );
    return {
      attribues: tous.filter((i) => i.status === 'ok' && i.license && i.license !== 'N/A'),
      enAttente: tous.filter((i) => !(i.status === 'ok' && i.license && i.license !== 'N/A')),
    };
  }, [collections]);

  // useMemo : l'ancienne version reparcourait les 227 items a chaque frappe.
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return attribues.filter(
      (i) =>
        (filtre === 'tous' || i.categorie === filtre) &&
        (!q || i.name.toLowerCase().includes(q) || (i.author || '').toLowerCase().includes(q))
    );
  }, [attribues, recherche, filtre]);

  return (
    <div className="ecran ecran-credits">
      <header className="ecran-entete">
        <p className="sur-titre">Conformité</p>
        <h1 className="titre-ecran">
          <Shield size={28} aria-hidden="true" /> Crédits et droits d’auteur
        </h1>
        <p className="sous-titre">
          Chaque visuel publié ici provient de Wikimedia Commons ou d’Openverse,
          sous licence Creative Commons, et porte son auteur et sa licence.
        </p>
      </header>

      <div className="credits-resume">
        <p>
          <strong>{attribues.length}</strong> visuels avec attribution complète.
          {enAttente.length > 0 && (
            <> <strong>{enAttente.length}</strong> éléments sont encore sans image :
            aucune source libre vérifiable n’a été trouvée, ils restent volontairement vides.</>
          )}
        </p>
      </div>

      <div className="credits-controles">
        <div className="champ-recherche">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom ou un auteur"
            aria-label="Rechercher dans les crédits"
          />
        </div>
        <div className="pastilles">
          {['tous', ...new Set(attribues.map((i) => i.categorie))].map((c) => (
            <button
              key={c}
              type="button"
              className={`pastille${filtre === c ? ' is-active' : ''}`}
              onClick={() => setFiltre(c)}
              aria-pressed={filtre === c}
            >
              {c === 'tous' ? 'Tous' : c}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="etat-vide">Aucun crédit ne correspond à cette recherche.</p>
      ) : (
        <ul className="credits-liste">
          {visibles.map((item) => (
            <li key={item.id} className="credit-ligne">
              <div className="credit-nom">
                <span>{item.name}</span>
                <span className="badge">{item.categorie}</span>
              </div>
              <div className="credit-meta">
                <span><abbr title="Auteur de la photographie">Auteur</abbr> : {item.author}</span>
                <span>Licence : {item.license}</span>
                {item.attribution?.page && (
                  <a href={item.attribution.page} target="_blank" rel="noopener noreferrer">
                    Fichier source <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
