import React, { useEffect, useState } from 'react';
import { CircleDollarSign, Check, ArrowRight, RotateCcw, Award } from 'lucide-react';
import ItemImage from './ItemImage.jsx';
import { shuffle } from '../lib/random.js';
import { safeSet, readNumber } from '../lib/storage.js';
import { useToast } from './Toast.jsx';

const MANCHES = 5;

/** Bareme continu : l'ancien bareme par paliers faisait chuter le score de
 *  800 a 500 points pour 0,1 % d'ecart supplementaire (DIAGNOSTIC.md D.3). */
function pointsPour(ecartPourcent) {
  if (ecartPourcent >= 100) return 0;
  const score = Math.round(1000 * Math.pow(1 - ecartPourcent / 100, 2));
  return Math.max(0, Math.min(1000, score));
}

function commentaire(ecart) {
  if (ecart === 0) return 'Prix exact. Tu es un vrai crack du marché.';
  if (ecart <= 5) return 'À un cheveu près. Tu connais tes prix.';
  if (ecart <= 15) return 'Très proche, bien joué.';
  if (ecart <= 30) return 'Pas mal, mais tu t’es fait gratter un peu.';
  if (ecart <= 60) return 'Trop loin, mon ami. Retourne au marché.';
  return 'Aïe. Tu vis au pays ou tu es en vacances ?';
}

function rang(score) {
  const max = MANCHES * 1000;
  const part = score / max;
  if (part >= 0.9) return { titre: 'Djo d’Adjamé', desc: 'Tu connais le prix de chaque grain de riz.' };
  if (part >= 0.7) return { titre: 'Commerçant de Treichville', desc: 'On ne te bluffe pas facilement.' };
  if (part >= 0.45) return { titre: 'Résident de Cocody', desc: 'Tu as les moyens, mais pas les prix.' };
  return { titre: 'Gaou de 1ère classe', desc: 'On t’a grugé grave. Reviens t’entraîner.' };
}

export default function JustePrix({ products }) {
  const toast = useToast();
  const [etat, setEtat] = useState('intro'); // intro | manche | resultat | fin
  const [manches, setManches] = useState([]);
  const [index, setIndex] = useState(0);
  const [saisie, setSaisie] = useState('');
  const [retour, setRetour] = useState(null);
  const [score, setScore] = useState(0);
  const [record, setRecord] = useState(0);

  useEffect(() => {
    setRecord(readNumber('stats_justeprix_best'));
  }, []);

  const jouables = products.filter((p) => typeof p.price === 'number' && p.price > 0);

  const demarrer = () => {
    if (jouables.length < MANCHES) {
      toast(
        `Il faut au moins ${MANCHES} produits avec un prix. Disponibles : ${jouables.length}.`,
        'erreur'
      );
      return;
    }
    setManches(shuffle(jouables).slice(0, MANCHES));
    setIndex(0);
    setScore(0);
    setSaisie('');
    setRetour(null);
    setEtat('manche');
  };

  const valider = (e) => {
    e.preventDefault();
    const proposition = Number.parseInt(saisie, 10);
    if (!Number.isFinite(proposition) || proposition <= 0) {
      toast('Entre un montant valide, supérieur à 0 CFA.', 'erreur');
      return;
    }
    const produit = manches[index];
    const ecartAbsolu = Math.abs(proposition - produit.price);
    const ecartPourcent = (ecartAbsolu / produit.price) * 100;
    const points = pointsPour(ecartPourcent);

    setRetour({
      points,
      reel: produit.price,
      propose: proposition,
      ecart: ecartAbsolu,
      pourcent: Math.round(ecartPourcent),
      texte: commentaire(Math.round(ecartPourcent)),
      bon: ecartPourcent <= 15,
    });
    setScore((s) => s + points);
    setEtat('resultat');
  };

  const suivant = () => {
    const prochain = index + 1;
    if (prochain < manches.length) {
      setIndex(prochain);
      setSaisie('');
      setRetour(null);
      setEtat('manche');
      return;
    }
    setEtat('fin');
    safeSet('stats_justeprix_played', String(readNumber('stats_justeprix_played') + 1));
    if (score > record) {
      safeSet('stats_justeprix_best', String(score));
      setRecord(score);
    }
  };

  const produit = manches[index];
  // La barre atteint desormais 100 % a la derniere manche.
  const avancement = etat === 'fin' ? 100 : ((index + (retour ? 1 : 0)) / MANCHES) * 100;

  return (
    <div className="ecran ecran-prix">
      <header className="ecran-entete">
        <p className="sur-titre">Estimation</p>
        <h1 className="titre-ecran">Le Juste Prix</h1>
        <p className="sous-titre">Combien ça coûte vraiment, en francs CFA ?</p>
      </header>

      {etat === 'intro' && (
        <section className="bloc-choix bloc-intro">
          <CircleDollarSign size={48} aria-hidden="true" className="icone-intro" />
          <p>
            {MANCHES} produits du quotidien ivoirien défilent. Donne ton prix.
            Plus tu es proche, plus tu marques.
          </p>
          <p className="note">Record sur cet appareil : <strong>{record} points</strong></p>
          <button type="button" className="btn btn-primary btn-large" onClick={demarrer}>
            C'est parti
          </button>
        </section>
      )}

      {(etat === 'manche' || etat === 'resultat') && produit && (
        <section className="prix-carte">
          <div className="barre-progression" role="progressbar" aria-valuenow={Math.round(avancement)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${avancement}%` }} />
          </div>

          <div className="prix-entete">
            <span className="prix-compte">Produit {index + 1} / {MANCHES}</span>
            {produit.category && <span className="badge">{produit.category}</span>}
          </div>

          <div className="prix-visuel">
            <ItemImage item={produit} eager />
          </div>

          <h2 className="prix-nom">{produit.name}</h2>

          {etat === 'manche' ? (
            <form className="prix-form" onSubmit={valider}>
              <label htmlFor="saisie-prix">Ton estimation</label>
              <div className="champ-cfa">
                <input
                  id="saisie-prix"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
                <span aria-hidden="true">CFA</span>
              </div>
              <button type="submit" className="btn btn-primary btn-large">
                <Check size={18} aria-hidden="true" /> Valider
              </button>
            </form>
          ) : (
            <div className="prix-retour">
              <p className={`verdict ${retour.bon ? 'is-bon' : 'is-loin'}`}>{retour.texte}</p>
              <dl className="prix-detail">
                <div><dt>Prix réel</dt><dd>{retour.reel.toLocaleString('fr-FR')} CFA</dd></div>
                <div><dt>Ton prix</dt><dd>{retour.propose.toLocaleString('fr-FR')} CFA</dd></div>
                <div><dt>Écart</dt><dd>{retour.pourcent} %</dd></div>
                <div><dt>Points</dt><dd className="points">+{retour.points}</dd></div>
              </dl>
              <button type="button" className="btn btn-primary btn-large" onClick={suivant}>
                {index + 1 < MANCHES ? 'Produit suivant' : 'Voir mon score'}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}

      {etat === 'fin' && (
        <section className="celebration">
          <div className="confettis" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className={`confetti c${(i % 4) + 1}`} style={{ '--i': i }} />
            ))}
          </div>
          <div className="celebration-contenu">
            <Award size={48} aria-hidden="true" className="trophee" />
            <p className="sur-titre">{rang(score).titre}</p>
            <p className="score-final">{score}<small> / {MANCHES * 1000} points</small></p>
            <p className="sous-titre">{rang(score).desc}</p>
            {score >= record && score > 0 && <p className="badge-record">Nouveau record</p>}
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={demarrer}>
                <RotateCcw size={18} aria-hidden="true" /> Rejouer
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
