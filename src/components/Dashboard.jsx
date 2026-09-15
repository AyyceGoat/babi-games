import React, { useEffect, useMemo, useState } from 'react';
import { Sword, ListStart, CircleDollarSign, Trophy, Flame, ArrowRight } from 'lucide-react';
import { readNumber } from '../lib/storage.js';
import ItemImage from './ItemImage.jsx';

const JEUX = [
  {
    id: 'versus',
    titre: 'Versus',
    teinte: 'orange',
    icone: Sword,
    texte: 'Deux visages, un choix. Tu élimines jusqu’au dernier debout.',
  },
  {
    id: 'tierlist',
    titre: 'Tier List',
    teinte: 'vert',
    icone: ListStart,
    texte: 'Range la culture ivoirienne du rang S au rang F. Assume tes choix.',
  },
  {
    id: 'justeprix',
    titre: 'Juste Prix',
    teinte: 'ocre',
    icone: CircleDollarSign,
    texte: 'Devine le prix réel des produits du quotidien, en francs CFA.',
  },
];

export default function Dashboard({ onNavigate, collections }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats({
      versus: readNumber('stats_versus_played'),
      tierlists: readNumber('stats_tierlists_saved'),
      parties: readNumber('stats_justeprix_played'),
      record: readNumber('stats_justeprix_best'),
    });
  }, []);

  const debutant = stats && stats.versus + stats.tierlists + stats.parties === 0;

  // Quelques visages reels en bandeau : plus parlant qu'un aplat vide.
  const vedettes = useMemo(() => {
    const tous = [
      ...(collections?.artists || []),
      ...(collections?.footballers || []),
      ...(collections?.publicFigures || []),
    ].filter((i) => i.status === 'ok');
    return tous.slice(0, 8);
  }, [collections]);

  return (
    <div className="ecran ecran-accueil">
      <section className="hero">
        <div className="hero-texte">
          <p className="sur-titre">Plateforme de mini-jeux 100 % ivoiriens</p>
          <h1 className="hero-titre">
            Tu connais <span className="accent-trace">ton pays</span> ?
          </h1>
          <p className="hero-sous-titre">
            Vote pour tes artistes, classe tes plats, estime les prix d’Abidjan.
            Trois jeux, une seule question : est-ce que tu connais vraiment le 225 ?
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-large" onClick={() => onNavigate('versus')}>
              <Flame size={18} aria-hidden="true" /> Lancer un Versus
            </button>
            <button type="button" className="btn btn-secondary btn-large" onClick={() => onNavigate('justeprix')}>
              Jouer au Juste Prix
            </button>
          </div>
        </div>

        {vedettes.length > 0 && (
          <div className="hero-bandeau" aria-hidden="true">
            {vedettes.map((item) => (
              <div key={item.id} className="hero-vignette">
                <ItemImage item={item} eager />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="titre-section">Choisis ton défi</h2>
        <div className="grille-jeux">
          {JEUX.map(({ id, titre, teinte, icone: Icone, texte }) => (
            <button
              key={id}
              type="button"
              className={`carte-jeu teinte-${teinte}`}
              onClick={() => onNavigate(id)}
            >
              <span className="carte-jeu-icone"><Icone size={26} aria-hidden="true" /></span>
              <span className="carte-jeu-titre">{titre}</span>
              <span className="carte-jeu-texte">{texte}</span>
              <span className="carte-jeu-cta">Jouer <ArrowRight size={16} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="bloc-stats">
        <h2 className="titre-section">
          <Trophy size={20} aria-hidden="true" /> Tes statistiques
        </h2>

        {debutant ? (
          // Etat vide accueillant : l'ancienne version affichait quatre
          // zeros a tout nouveau visiteur (DIAGNOSTIC.md D.3).
          <div className="stats-vide">
            <p className="stats-vide-titre">Rien encore. C’est le moment de commencer.</p>
            <p className="stats-vide-texte">
              Tes scores restent sur cet appareil, rien n’est envoyé nulle part.
              Lance un premier tournoi, ça prend deux minutes.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('versus')}>
              <Flame size={18} aria-hidden="true" /> Commencer
            </button>
          </div>
        ) : (
          <dl className="grille-stats">
            <Stat label="Tournois terminés" valeur={stats?.versus ?? 0} teinte="orange" />
            <Stat label="Tier lists enregistrées" valeur={stats?.tierlists ?? 0} teinte="vert" />
            <Stat label="Parties du Juste Prix" valeur={stats?.parties ?? 0} teinte="indigo" />
            <Stat label="Meilleur score" valeur={stats?.record ?? 0} teinte="ocre" suffixe=" pts" />
          </dl>
        )}
      </section>
    </div>
  );
}

function Stat({ label, valeur, teinte, suffixe = '' }) {
  return (
    <div className={`stat teinte-${teinte}`}>
      <dt>{label}</dt>
      <dd>{valeur}{suffixe}</dd>
    </div>
  );
}
