import React, { useMemo, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Upload, ShieldAlert, AlertCircle } from 'lucide-react';
import ItemImage from './ItemImage.jsx';
import { fileToResizedDataUrl, formatBytes, MAX_DIMENSION } from '../lib/imageFile.js';
import { storageFootprint } from '../lib/storage.js';
import { useToast } from './Toast.jsx';

const ONGLETS = [
  { cle: 'artists', label: 'Artistes', type: 'artiste', avecCategorie: true },
  { cle: 'footballers', label: 'Footballeurs', type: 'footballeur', avecCategorie: true },
  { cle: 'publicFigures', label: 'Personnalités', type: 'public', avecCategorie: true },
  { cle: 'foods', label: 'Nourriture', type: 'nourriture', avecCategorie: false },
  { cle: 'products', label: 'Produits', type: 'produit', avecCategorie: true, avecPrix: true },
];

const PLACEHOLDER = {
  artiste: '/images/placeholders/artiste.svg',
  footballeur: '/images/placeholders/footballeur.svg',
  public: '/images/placeholders/artiste.svg',
  nourriture: '/images/placeholders/nourriture.svg',
  produit: '/images/placeholders/produit.svg',
};

const formulaireVide = {
  name: '', category: '', price: '', image: '', source: '', license: '', author: '',
};

export default function Admin({ collections, setCollection, resetToDefault }) {
  const toast = useToast();
  const [ongletActif, setOngletActif] = useState('artists');
  const [filtre, setFiltre] = useState('tous');
  const [form, setForm] = useState(formulaireVide);
  const [editionId, setEditionId] = useState(null);
  const [formEdition, setFormEdition] = useState(formulaireVide);
  const fichierRef = useRef(null);

  const onglet = ONGLETS.find((o) => o.cle === ongletActif);
  const liste = useMemo(() => collections[ongletActif] || [], [collections, ongletActif]);

  const visibles = useMemo(
    () => (filtre === 'attente' ? liste.filter((i) => i.status !== 'ok') : liste),
    [liste, filtre]
  );

  const occupation = storageFootprint();

  /* --- Envoi d'image ---------------------------------------------------
     L'image est redimensionnee par canvas AVANT encodage Base64. L'ancienne
     version encodait le fichier original : une photo de smartphone de
     2,5 Mo saturait a elle seule le quota de 5 Mo (DIAGNOSTIC.md F.3).  */
  const envoyer = async (fichier, cible) => {
    if (!fichier) return;
    try {
      const { dataUrl, width, height, originalBytes, encodedBytes } =
        await fileToResizedDataUrl(fichier);
      const maj = (p) => ({ ...p, image: dataUrl, source: p.source || 'Envoi local' });
      if (cible === 'edition') setFormEdition(maj);
      else setForm(maj);
      toast(
        `Image réduite à ${width}x${height} : ${formatBytes(originalBytes)} → ${formatBytes(encodedBytes)}.`,
        'succes'
      );
    } catch (e) {
      toast(e.message, 'erreur');
    }
  };

  /* --- Validation ------------------------------------------------------ */

  const verifier = (valeurs) => {
    if (!valeurs.name.trim()) return 'Le nom est obligatoire.';
    if (valeurs.image.trim()) {
      const manquants = ['source', 'license', 'author']
        .filter((c) => !valeurs[c].trim())
        .map((c) => ({ source: 'la source', license: 'la licence', author: "l'auteur" })[c]);
      if (manquants.length) {
        return `Si tu ajoutes un visuel, ${manquants.join(', ')} ${manquants.length > 1 ? 'sont obligatoires' : 'est obligatoire'}. Une image sans attribution ne peut pas être publiée.`;
      }
    }
    if (onglet.avecPrix) {
      const prix = Number.parseInt(valeurs.price, 10);
      if (!Number.isFinite(prix) || prix <= 0) return 'Le prix doit être un nombre supérieur à 0.';
    }
    return null;
  };

  const construire = (valeurs, id) => {
    const aUneImage = Boolean(valeurs.image.trim());
    return {
      id,
      name: valeurs.name.trim(),
      image: aUneImage ? valeurs.image.trim() : PLACEHOLDER[onglet.type],
      status: aUneImage ? 'ok' : 'a_verifier_manuellement',
      source: aUneImage ? valeurs.source.trim() : 'N/A',
      license: aUneImage ? valeurs.license.trim() : 'N/A',
      author: aUneImage ? valeurs.author.trim() : 'N/A',
      ...(onglet.avecCategorie ? { category: valeurs.category.trim() || 'Général' } : {}),
      ...(onglet.avecPrix ? { price: Number.parseInt(valeurs.price, 10) } : {}),
    };
  };

  const ajouter = (e) => {
    e.preventDefault();
    const erreur = verifier(form);
    if (erreur) return toast(erreur, 'erreur');
    const item = construire(form, `${onglet.type}_${Date.now()}`);
    setCollection(ongletActif, (prev) => [item, ...prev]);
    setForm(formulaireVide);
    if (fichierRef.current) fichierRef.current.value = '';
    toast(`${onglet.label.replace(/s$/, '')} ajouté.`, 'succes');
  };

  const commencerEdition = (item) => {
    setEditionId(item.id);
    setFormEdition({
      name: item.name || '',
      category: item.category || '',
      price: item.price != null ? String(item.price) : '',
      image: item.image?.startsWith('/images/placeholders/') ? '' : item.image || '',
      source: item.source && item.source !== 'N/A' ? item.source : '',
      license: item.license && item.license !== 'N/A' ? item.license : '',
      author: item.author && item.author !== 'N/A' ? item.author : '',
    });
  };

  const enregistrerEdition = (id) => {
    const erreur = verifier(formEdition);
    if (erreur) return toast(erreur, 'erreur');
    setCollection(ongletActif, (prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...construire(formEdition, id) } : i))
    );
    setEditionId(null);
    toast('Modification enregistrée.', 'succes');
  };

  const supprimer = (item) => {
    if (!window.confirm(`Supprimer « ${item.name} » ?`)) return;
    setCollection(ongletActif, (prev) => prev.filter((i) => i.id !== item.id));
    toast(`« ${item.name} » supprimé.`, 'succes');
  };

  const restaurer = () => {
    if (!window.confirm('Cela supprime tes ajouts et tes statistiques sur cet appareil, puis restaure le contenu livré. Continuer ?')) return;
    resetToDefault();
    toast('Contenu d’origine restauré.', 'succes');
  };

  const champs = (valeurs, setValeurs, cible) => (
    <>
      <div className="champ">
        <label htmlFor={`${cible}-nom`}>Nom</label>
        <input id={`${cible}-nom`} value={valeurs.name}
          onChange={(e) => setValeurs((p) => ({ ...p, name: e.target.value }))} required />
      </div>
      {onglet.avecCategorie && (
        <div className="champ">
          <label htmlFor={`${cible}-cat`}>Catégorie</label>
          <input id={`${cible}-cat`} value={valeurs.category}
            onChange={(e) => setValeurs((p) => ({ ...p, category: e.target.value }))} />
        </div>
      )}
      {onglet.avecPrix && (
        <div className="champ">
          <label htmlFor={`${cible}-prix`}>Prix en CFA</label>
          <input id={`${cible}-prix`} type="number" min="1" value={valeurs.price}
            onChange={(e) => setValeurs((p) => ({ ...p, price: e.target.value }))} />
        </div>
      )}
      <div className="champ">
        <label htmlFor={`${cible}-fichier`}>Visuel</label>
        <input id={`${cible}-fichier`} type="file" accept="image/*"
          ref={cible === 'ajout' ? fichierRef : undefined}
          onChange={(e) => envoyer(e.target.files?.[0], cible)} />
        <p className="aide-champ">
          <Upload size={13} aria-hidden="true" /> Réduit automatiquement à {MAX_DIMENSION} px avant enregistrement.
        </p>
      </div>
      <div className="champ"><label htmlFor={`${cible}-source`}>Source</label>
        <input id={`${cible}-source`} value={valeurs.source}
          onChange={(e) => setValeurs((p) => ({ ...p, source: e.target.value }))} /></div>
      <div className="champ"><label htmlFor={`${cible}-licence`}>Licence</label>
        <input id={`${cible}-licence`} value={valeurs.license}
          onChange={(e) => setValeurs((p) => ({ ...p, license: e.target.value }))} /></div>
      <div className="champ"><label htmlFor={`${cible}-auteur`}>Auteur</label>
        <input id={`${cible}-auteur`} value={valeurs.author}
          onChange={(e) => setValeurs((p) => ({ ...p, author: e.target.value }))} /></div>
    </>
  );

  return (
    <div className="ecran ecran-admin">
      <header className="ecran-entete">
        <p className="sur-titre">Ton contenu</p>
        <h1 className="titre-ecran">Personnaliser</h1>
        <p className="sous-titre">
          Ajoute tes propres artistes, plats ou produits. Tout ce que tu ajoutes
          reste sur cet appareil, dans ton navigateur : personne d'autre ne le voit,
          et cela n'apparaît que dans tes propres parties.
        </p>
      </header>

      <div className="avis">
        <ShieldAlert size={18} aria-hidden="true" />
        <p>
          Rien n'est envoyé sur un serveur.
          {occupation != null && ` Environ ${formatBytes(occupation)} utilisés sur les ~5 Mo disponibles.`}
          {' '}Une image sans source, licence et auteur ne peut pas être enregistrée.
        </p>
      </div>

      <div className="pastilles">
        {ONGLETS.map((o) => (
          <button key={o.cle} type="button"
            className={`pastille${ongletActif === o.cle ? ' is-active' : ''}`}
            onClick={() => { setOngletActif(o.cle); setEditionId(null); }}
            aria-pressed={ongletActif === o.cle}>
            {o.label} <span className="compteur">{(collections[o.cle] || []).length}</span>
          </button>
        ))}
      </div>

      <form className="admin-form" onSubmit={ajouter}>
        <h2 className="titre-section"><Plus size={18} aria-hidden="true" /> Ajouter</h2>
        <div className="grille-champs">{champs(form, setForm, 'ajout')}</div>
        <button type="submit" className="btn btn-primary">Ajouter</button>
      </form>

      <div className="admin-barre">
        <div className="pastilles">
          <button type="button" className={`pastille${filtre === 'tous' ? ' is-active' : ''}`}
            onClick={() => setFiltre('tous')}>Tous ({liste.length})</button>
          <button type="button" className={`pastille${filtre === 'attente' ? ' is-active' : ''}`}
            onClick={() => setFiltre('attente')}>
            Sans visuel ({liste.filter((i) => i.status !== 'ok').length})
          </button>
        </div>
        <button type="button" className="btn btn-danger" onClick={restaurer}>
          <RefreshCw size={16} aria-hidden="true" /> Restaurer la base
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="etat-vide">Aucun élément dans cette vue.</p>
      ) : (
        <ul className="admin-liste">
          {visibles.map((item) => (
            <li key={item.id} className="admin-ligne">
              {editionId === item.id ? (
                <div className="admin-edition">
                  <div className="grille-champs">{champs(formEdition, setFormEdition, 'edition')}</div>
                  <div className="actions">
                    <button type="button" className="btn btn-success" onClick={() => enregistrerEdition(item.id)}>
                      <Save size={16} aria-hidden="true" /> Enregistrer
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditionId(null)}>
                      <X size={16} aria-hidden="true" /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="admin-vignette"><ItemImage item={item} /></div>
                  <div className="admin-infos">
                    <span className="admin-nom">{item.name}</span>
                    <span className="admin-meta">
                      {item.category && <span className="badge">{item.category}</span>}
                      {item.price != null && <span className="badge">{item.price} CFA</span>}
                      {item.status === 'ok' ? (
                        <span className="badge badge-ok">{item.license}</span>
                      ) : (
                        <span className="badge badge-attente">
                          <AlertCircle size={12} aria-hidden="true" /> sans visuel
                        </span>
                      )}
                    </span>
                    {item.status !== 'ok' && item.failureReason && (
                      <span className="admin-raison">{item.failureReason}</span>
                    )}
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => commencerEdition(item)}
                      aria-label={`Modifier ${item.name}`}>
                      <Edit2 size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => supprimer(item)}
                      aria-label={`Supprimer ${item.name}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
