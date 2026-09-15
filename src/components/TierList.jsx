import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ListStart, Save, RotateCcw, HelpCircle, CheckCircle } from 'lucide-react';
import ItemImage from './ItemImage.jsx';
import { shuffle } from '../lib/random.js';
import { safeSet, safeGet, readNumber } from '../lib/storage.js';
import { useToast } from './Toast.jsx';

const RANGS = [
  { id: 'S', teinte: 'rang-s' },
  { id: 'A', teinte: 'rang-a' },
  { id: 'B', teinte: 'rang-b' },
  { id: 'C', teinte: 'rang-c' },
  { id: 'D', teinte: 'rang-d' },
  { id: 'F', teinte: 'rang-f' },
];

const CATEGORIES = [
  { id: 'foods', label: 'Nourriture' },
  { id: 'artists', label: 'Artistes' },
  { id: 'footballers', label: 'Footballeurs' },
  { id: 'public', label: 'Personnalités' },
];

const rangsVides = () => ({ S: [], A: [], B: [], C: [], D: [], F: [] });
const SEUIL_GLISSER = 8; // px au-dela desquels un appui devient un glisser

export default function TierList({ artists, footballers, publicFigures, foods }) {
  const toast = useToast();
  const [categorie, setCategorie] = useState('foods');
  const [rangs, setRangs] = useState(rangsVides);
  const [reserve, setReserve] = useState([]);
  const [selection, setSelection] = useState(null);
  const [enregistre, setEnregistre] = useState(false);

  // Glisser-deposer par evenements pointeur : fonctionne au doigt comme
  // a la souris. L'API HTML5 Drag & Drop precedente ne recevait aucun
  // evenement sur mobile (DIAGNOSTIC.md D.4).
  const [drag, setDrag] = useState(null); // {item, source, x, y, actif}
  const dragRef = useRef(null);
  const [zoneSurvolee, setZoneSurvolee] = useState(null);

  const sourceDonnees = useCallback(() => {
    if (categorie === 'artists') return sample16(artists);
    if (categorie === 'footballers') return sample16(footballers);
    if (categorie === 'public') return sample16(publicFigures);
    return shuffle(foods);
  }, [categorie, artists, footballers, publicFigures, foods]);

  const reinitialiser = useCallback(() => {
    setReserve(sourceDonnees());
    setRangs(rangsVides());
    setSelection(null);
  }, [sourceDonnees]);

  useEffect(() => {
    reinitialiser();
  }, [reinitialiser]);

  /* --- Deplacement d'un item ------------------------------------------ */

  const deplacer = useCallback((item, source, cible) => {
    if (!item || source === cible) return;
    if (source === 'reserve') setReserve((p) => p.filter((i) => i.id !== item.id));
    else setRangs((p) => ({ ...p, [source]: p[source].filter((i) => i.id !== item.id) }));

    if (cible === 'reserve') setReserve((p) => [...p, item]);
    else setRangs((p) => ({ ...p, [cible]: [...p[cible], item] }));

    setSelection(null);
  }, []);

  /* --- Pointeur -------------------------------------------------------- */

  const onPointerDown = (e, item, source) => {
    if (e.button === 1 || e.button === 2) return;
    const info = { item, source, x: e.clientX, y: e.clientY, actif: false };
    dragRef.current = info;
    setDrag(info);
  };

  useEffect(() => {
    if (!drag) return;

    const bouge = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.actif && Math.hypot(dx, dy) < SEUIL_GLISSER) return;

      d.actif = true;
      d.x = e.clientX;
      d.y = e.clientY;
      setDrag({ ...d });

      const sous = document.elementFromPoint(e.clientX, e.clientY);
      setZoneSurvolee(sous?.closest('[data-zone]')?.dataset.zone ?? null);
      e.preventDefault();
    };

    const lache = (e) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setZoneSurvolee(null);
      if (!d) return;

      if (d.actif) {
        const sous = document.elementFromPoint(e.clientX, e.clientY);
        const cible = sous?.closest('[data-zone]')?.dataset.zone;
        if (cible) deplacer(d.item, d.source, cible);
      } else {
        // Simple appui : selection / deselection.
        setSelection((prev) =>
          prev && prev.item.id === d.item.id ? null : { item: d.item, source: d.source }
        );
      }
    };

    window.addEventListener('pointermove', bouge, { passive: false });
    window.addEventListener('pointerup', lache);
    window.addEventListener('pointercancel', lache);
    return () => {
      window.removeEventListener('pointermove', bouge);
      window.removeEventListener('pointerup', lache);
      window.removeEventListener('pointercancel', lache);
    };
  }, [drag, deplacer]);

  /* Clic sur une zone : deplace l'element selectionne.
     `selection` est lu ici, et les appuis sur un item n'atteignent plus
     cette zone (ils sont traites par pointerup, pas par onClick), ce qui
     supprime le conflit de propagation decrit dans DIAGNOSTIC.md D.4. */
  const clicZone = (cible) => {
    if (!selection) return;
    deplacer(selection.item, selection.source, cible);
  };

  /* --- Enregistrement --------------------------------------------------- */

  const enregistrer = () => {
    const classes = Object.values(rangs).reduce((n, l) => n + l.length, 0);
    if (classes === 0) {
      toast("Classe au moins un element avant d'enregistrer.", 'info');
      return;
    }
    let liste = [];
    try {
      liste = JSON.parse(safeGet('saved_tierlists') || '[]');
      if (!Array.isArray(liste)) liste = [];
    } catch {
      liste = [];
    }
    liste.push({ categorie, rangs, enregistreLe: new Date().toISOString() });
    // On ne conserve que les 20 dernieres : l'ancienne version empilait
    // sans limite dans un stockage jamais relu.
    const res = safeSet('saved_tierlists', JSON.stringify(liste.slice(-20)));
    if (!res.ok) return;

    safeSet('stats_tierlists_saved', String(readNumber('stats_tierlists_saved') + 1));
    setEnregistre(true);
    window.setTimeout(() => setEnregistre(false), 2600);
  };

  const total = reserve.length + Object.values(rangs).reduce((n, l) => n + l.length, 0);
  const classes = total - reserve.length;

  return (
    <div className="ecran ecran-tierlist">
      <header className="ecran-entete">
        <p className="sur-titre">Classement</p>
        <h1 className="titre-ecran">La Tier List 225</h1>
        <p className="sous-titre">Du rang S, le top du top, au rang F, pas dedans du tout.</p>
      </header>

      <div className="pastilles pastilles-centrees">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`pastille${categorie === c.id ? ' is-active' : ''}`}
            onClick={() => setCategorie(c.id)}
            aria-pressed={categorie === c.id}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="aide-jeu">
        <HelpCircle size={15} aria-hidden="true" />
        Glisse un élément vers un rang, ou tape dessus puis tape sur le rang voulu.
      </p>

      <div className="tier-plateau">
        {RANGS.map((rang) => (
          <div key={rang.id} className={`tier-ligne ${rang.teinte}`}>
            <div
              className="tier-etiquette"
              data-zone={rang.id}
              onClick={() => clicZone(rang.id)}
            >
              {rang.id}
            </div>
            <div
              className={`tier-zone${zoneSurvolee === rang.id ? ' is-survolee' : ''}`}
              data-zone={rang.id}
              onClick={() => clicZone(rang.id)}
            >
              {rangs[rang.id].map((item) => (
                <Vignette
                  key={item.id}
                  item={item}
                  selectionne={selection?.item.id === item.id}
                  enDeplacement={drag?.actif && drag.item.id === item.id}
                  onPointerDown={(e) => onPointerDown(e, item, rang.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="tier-actions">
        <button type="button" className="btn btn-secondary" onClick={reinitialiser}>
          <RotateCcw size={16} aria-hidden="true" /> Réinitialiser
        </button>
        <span className="tier-compteur">{classes} / {total} classés</span>
        <button type="button" className="btn btn-success" onClick={enregistrer}>
          <Save size={16} aria-hidden="true" /> Enregistrer
        </button>
      </div>

      {enregistre && (
        <p className="message-succes" role="status">
          <CheckCircle size={18} aria-hidden="true" /> Tier list enregistrée sur cet appareil.
        </p>
      )}

      <section className="tier-reserve-bloc">
        <h2 className="titre-section">
          <ListStart size={18} aria-hidden="true" /> À classer ({reserve.length})
        </h2>
        <div
          className={`tier-reserve${zoneSurvolee === 'reserve' ? ' is-survolee' : ''}`}
          data-zone="reserve"
          onClick={() => clicZone('reserve')}
        >
          {reserve.length === 0 ? (
            <p className="etat-vide">Tout est classé. Beau travail.</p>
          ) : (
            reserve.map((item) => (
              <Vignette
                key={item.id}
                item={item}
                selectionne={selection?.item.id === item.id}
                enDeplacement={drag?.actif && drag.item.id === item.id}
                onPointerDown={(e) => onPointerDown(e, item, 'reserve')}
              />
            ))
          )}
        </div>
      </section>

      {/* Fantome qui suit le doigt ou le curseur pendant le glisser */}
      {drag?.actif && (
        <div className="drag-fantome" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <ItemImage item={drag.item} />
        </div>
      )}
    </div>
  );
}

function Vignette({ item, selectionne, enDeplacement, onPointerDown }) {
  return (
    <div
      className={`tier-vignette${selectionne ? ' is-selectionnee' : ''}${enDeplacement ? ' is-deplacee' : ''}`}
      onPointerDown={onPointerDown}
      /* Dernier filet : si un futur contenu deplacable entre dans la
         vignette, son glisser natif est refuse ici. */
      onDragStart={(e) => e.preventDefault()}
      role="button"
      tabIndex={0}
      aria-pressed={selectionne}
      aria-label={item.name}
      title={item.name}
    >
      <ItemImage item={item} />
      <span className="tier-vignette-nom">{item.name}</span>
    </div>
  );
}

const sample16 = (liste) => shuffle(liste).slice(0, 16);
