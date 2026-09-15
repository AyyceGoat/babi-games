import React, { useMemo, useState } from 'react';
import { Trophy, RefreshCw, Flame, Users, ChevronRight } from 'lucide-react';
import ItemImage from './ItemImage.jsx';
import { shuffle } from '../lib/random.js';
import { safeSet, readNumber } from '../lib/storage.js';
import { useToast } from './Toast.jsx';

const CATEGORIES = [
  { id: 'artists', label: 'Artistes' },
  { id: 'footballers', label: 'Footballeurs' },
  { id: 'public', label: 'Personnalités' },
];

const TAILLES = [4, 8, 16, 32];

/** Nom du tour en cours, d'apres le nombre de participants restants. */
function nomDuTour(restants) {
  if (restants <= 2) return 'Finale';
  if (restants <= 4) return 'Demi-finales';
  if (restants <= 8) return 'Quarts de finale';
  if (restants <= 16) return 'Huitièmes de finale';
  return 'Seizièmes de finale';
}

export default function Versus({ artists, footballers, publicFigures }) {
  const toast = useToast();
  const [etat, setEtat] = useState('selection'); // selection | duel | champion
  const [categorie, setCategorie] = useState('artists');
  const [taille, setTaille] = useState(16);

  const [tourActuel, setTourActuel] = useState([]);
  const [tourSuivant, setTourSuivant] = useState([]);
  const [indexDuel, setIndexDuel] = useState(0);
  const [champion, setChampion] = useState(null);
  const [sortant, setSortant] = useState(null); // id du perdant, pour l'animation

  const donnees = useMemo(() => {
    if (categorie === 'footballers') return footballers;
    if (categorie === 'public') return publicFigures;
    return artists;
  }, [categorie, artists, footballers, publicFigures]);

  const taillesPossibles = TAILLES.filter((t) => t <= donnees.length);

  const lancer = () => {
    if (donnees.length < taille) {
      toast(
        `Pas assez de contenu pour un tournoi à ${taille}. Disponible : ${donnees.length}.`,
        'erreur'
      );
      return;
    }
    const selection = shuffle(donnees).slice(0, taille);
    setTourActuel(selection);
    setTourSuivant([]);
    setIndexDuel(0);
    setChampion(null);
    setSortant(null);
    setEtat('duel');
  };

  const choisir = (gagnant, perdant) => {
    if (sortant) return; // un duel est deja en cours de resolution
    setSortant(perdant.id);

    window.setTimeout(() => {
      const qualifies = [...tourSuivant, gagnant];
      const prochainIndex = indexDuel + 2;

      if (prochainIndex < tourActuel.length) {
        setTourSuivant(qualifies);
        setIndexDuel(prochainIndex);
      } else if (qualifies.length === 1) {
        setChampion(gagnant);
        setEtat('champion');
        safeSet('stats_versus_played', String(readNumber('stats_versus_played') + 1));
      } else {
        setTourActuel(qualifies);
        setTourSuivant([]);
        setIndexDuel(0);
      }
      setSortant(null);
    }, 420);
  };

  const gauche = tourActuel[indexDuel];
  const droite = tourActuel[indexDuel + 1];
  const restants = tourActuel.length;
  const duelNumero = Math.floor(indexDuel / 2) + 1;
  const duelsDuTour = Math.floor(tourActuel.length / 2);
  const progression = duelsDuTour ? (duelNumero - 1) / duelsDuTour : 0;

  return (
    <div className="ecran ecran-versus">
      <header className="ecran-entete">
        <p className="sur-titre">Un contre un</p>
        <h1 className="titre-ecran">Le Versus</h1>
        <p className="sous-titre">
          Deux visages s'affrontent, tu tranches. Jusqu'au dernier debout.
        </p>
      </header>

      {etat === 'selection' && (
        <section className="bloc-choix">
          <fieldset className="groupe-choix">
            <legend>Catégorie</legend>
            <div className="pastilles">
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
          </fieldset>

          <fieldset className="groupe-choix">
            <legend>Taille du tournoi</legend>
            <div className="pastilles">
              {taillesPossibles.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`pastille${taille === t ? ' is-active' : ''}`}
                  onClick={() => setTaille(t)}
                  aria-pressed={taille === t}
                >
                  {t} participants
                </button>
              ))}
            </div>
            <p className="note">
              <Users size={14} aria-hidden="true" /> {donnees.length} disponibles dans cette catégorie
            </p>
          </fieldset>

          <button type="button" className="btn btn-primary btn-large" onClick={lancer}>
            <Flame size={18} aria-hidden="true" /> Lancer le tournoi
          </button>
        </section>
      )}

      {etat === 'duel' && gauche && droite && (
        <section className="duel">
          <div className="duel-entete">
            <span className="badge-tour">{nomDuTour(restants)}</span>
            <span className="duel-compte">
              Duel {duelNumero} sur {duelsDuTour}
            </span>
          </div>
          <div className="barre-progression" role="progressbar" aria-valuenow={Math.round(progression * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progression * 100}%` }} />
          </div>

          <div className="duel-scene">
            <CarteDuel item={gauche} sortant={sortant} onChoose={() => choisir(gauche, droite)} />
            <div className="duel-vs" aria-hidden="true"><span>VS</span></div>
            <CarteDuel item={droite} sortant={sortant} onChoose={() => choisir(droite, gauche)} />
          </div>
        </section>
      )}

      {etat === 'champion' && champion && (
        <section className="celebration">
          <div className="confettis" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} className={`confetti c${(i % 4) + 1}`} style={{ '--i': i }} />
            ))}
          </div>

          <div className="celebration-contenu">
            <Trophy size={52} aria-hidden="true" className="trophee" />
            <p className="sur-titre">Champion du tournoi</p>
            <h2 className="champion-nom">{champion.name}</h2>
            {champion.category && <p className="champion-cat">{champion.category}</p>}

            <div className="champion-portrait">
              <ItemImage item={champion} eager />
            </div>

            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={lancer}>
                <RefreshCw size={18} aria-hidden="true" /> Rejouer
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEtat('selection')}>
                Changer de catégorie <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function CarteDuel({ item, sortant, onChoose }) {
  const perd = sortant === item.id;
  const gagne = sortant && sortant !== item.id;
  return (
    <button
      type="button"
      className={`carte-duel${perd ? ' is-sortant' : ''}${gagne ? ' is-gagnant' : ''}`}
      onClick={onChoose}
      disabled={Boolean(sortant)}
    >
      <ItemImage item={item} eager />
      <span className="carte-duel-info">
        {item.category && <span className="carte-duel-cat">{item.category}</span>}
        <span className="carte-duel-nom">{item.name}</span>
      </span>
    </button>
  );
}
