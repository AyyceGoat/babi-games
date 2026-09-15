import React, { useEffect, useState } from 'react';
import { Sword, ListStart, HelpCircle, Trophy, Flame } from 'lucide-react';
import heroBanner from '../assets/hero_banner.png';

export default function Dashboard({ setActivePage }) {
  const [stats, setStats] = useState({
    versusCount: 0,
    tierListCount: 0,
    justePrixBestScore: 0,
    justePrixGames: 0
  });

  useEffect(() => {
    // Load stats from localStorage
    const savedVersus = localStorage.getItem('stats_versus_played') || '0';
    const savedTiers = localStorage.getItem('stats_tierlists_saved') || '0';
    const savedJusteScore = localStorage.getItem('stats_justeprix_best') || '0';
    const savedJusteCount = localStorage.getItem('stats_justeprix_played') || '0';

    setStats({
      versusCount: parseInt(savedVersus, 10),
      tierListCount: parseInt(savedTiers, 10),
      justePrixBestScore: parseInt(savedJusteScore, 10),
      justePrixGames: parseInt(savedJusteCount, 10)
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Section */}
      <div className="glass-panel" style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        background: `linear-gradient(180deg, rgba(6, 7, 9, 0.75) 0%, rgba(6, 7, 9, 0.95) 100%), url(${heroBanner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid var(--border-light)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative circle glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          left: '-50px',
          width: '200px',
          height: '200px',
          background: 'var(--color-orange)',
          filter: 'blur(100px)',
          opacity: 0.2,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'var(--color-green)',
          filter: 'blur(100px)',
          opacity: 0.2,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{
            fontSize: '0.85rem',
            background: 'rgba(255, 140, 0, 0.12)',
            color: 'var(--color-orange)',
            padding: '6px 16px',
            borderRadius: '50px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: '1rem',
            border: '1px solid rgba(255, 140, 0, 0.2)'
          }}>
            Plateforme de Jeux 100% 1ère Classe (225)
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem', lineHeight: '1.2' }}>
            Tu connais ton <span className="gradient-text-ci">Pays</span> ?
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            maxWidth: '650px',
            margin: '0 auto 2rem',
            lineHeight: '1.6'
          }}>
            Amuse-toi avec les meilleurs mini-jeux inspirés de la culture ivoirienne. Vote pour tes artistes, classe tes plats favoris et estime le vrai prix des articles à Abidjan !
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setActivePage('versus')} className="btn btn-primary">
              <Flame size={18} /> Lancer un Versus
            </button>
            <button onClick={() => setActivePage('justeprix')} className="btn btn-secondary">
              Jouer au Juste Prix
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Jeux */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Sélectionne ton défi :</h2>
        <div className="game-grid">
          {/* Versus Card */}
          <div className="game-card glass-panel" onClick={() => setActivePage('versus')}>
            <div className="game-card-icon">
              <Sword size={24} />
            </div>
            {/* Visual gradient placeholder as background */}
            <div className="game-card-bg" style={{
              background: 'linear-gradient(225deg, #FF8C00 0%, #111 60%)'
            }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <h3 className="game-card-title">Versus</h3>
              <p className="game-card-desc">
                Deux célébrités s'affrontent. Fais ton choix à chaque tour jusqu'à couronner le grand vainqueur. Arbre de tournoi 100% aléatoire.
              </p>
            </div>
          </div>

          {/* Tier List Card */}
          <div className="game-card glass-panel" onClick={() => setActivePage('tierlist')}>
            <div className="game-card-icon">
              <ListStart size={24} />
            </div>
            <div className="game-card-bg" style={{
              background: 'linear-gradient(225deg, #00A86B 0%, #111 60%)'
            }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <h3 className="game-card-title">Tier List</h3>
              <p className="game-card-desc">
                Classe par glisser-déposer les aliments, artistes et humoristes ivoiriens dans les rangs S, A, B, C, D ou F. Sauvegarde et partage ton œuvre !
              </p>
            </div>
          </div>

          {/* Juste Prix Card */}
          <div className="game-card glass-panel" onClick={() => setActivePage('justeprix')}>
            <div className="game-card-icon">
              <HelpCircle size={24} />
            </div>
            <div className="game-card-bg" style={{
              background: 'linear-gradient(225deg, #FFD700 0%, #111 60%)'
            }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <h3 className="game-card-title">Le Juste Prix</h3>
              <p className="game-card-desc">
                Estime le coût exact en Francs CFA (XOF) des produits locaux (Garba, Gaz, bus, tech). Calcule ton écart et décroche le score parfait !
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={20} style={{ color: 'var(--color-gold)' }} /> Tes Statistiques locales
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tournois Versus terminés</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-orange)' }}>{stats.versusCount}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tier Lists sauvegardées</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-green)' }}>{stats.tierListCount}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Parties du Juste Prix</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-gold)' }}>{stats.justePrixGames}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Meilleur score Juste Prix</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>{stats.justePrixBestScore} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
