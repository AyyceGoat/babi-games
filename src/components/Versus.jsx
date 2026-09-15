import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight, RefreshCw, Flame, User, Users } from 'lucide-react';

// Simple function to get initials for avatar fallback
function getInitials(name) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('');
}

// Simple color helper based on string hashing to have consistent but varied gradients
function getGradientStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color1 = `hsl(${Math.abs(hash % 360)}, 65%, 45%)`;
  const color2 = `hsl(${Math.abs((hash + 120) % 360)}, 70%, 30%)`;
  return `linear-gradient(135deg, ${color1}, ${color2})`;
}

export default function Versus({ artists, footballers, publicFigures }) {
  // Game states: 'selection' | 'playing' | 'winner'
  const [gameState, setGameState] = useState('selection');
  const [category, setCategory] = useState('artists'); // 'artists' | 'footballers' | 'public'
  const [tournamentSize, setTournamentSize] = useState(16); // 4 | 8 | 16 | 32

  // Tournament tree states
  const [initialParticipants, setInitialParticipants] = useState([]);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [nextRoundItems, setNextRoundItems] = useState([]);
  const [duelIndex, setDuelIndex] = useState(0); // index of current duel in currentRoundItems (index, index+1)
  const [bracketHistory, setBracketHistory] = useState([]); // Array of rounds arrays for showing the history
  const [champion, setChampion] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  // Initialize data
  const getCategoryData = () => {
    switch (category) {
      case 'artists': return artists;
      case 'footballers': return footballers;
      case 'public': return publicFigures;
      default: return artists;
    }
  };

  const startTournament = () => {
    const rawData = [...getCategoryData()];
    if (rawData.length < tournamentSize) {
      alert(`Pas assez de données pour cette taille de tournoi. Maximum disponible : ${rawData.length}`);
      return;
    }

    // Shuffle raw data
    const shuffled = rawData.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, tournamentSize);

    setInitialParticipants(selected);
    setCurrentRoundItems(selected);
    setNextRoundItems([]);
    setDuelIndex(0);
    setBracketHistory([selected]); // Start history with round 1 list
    setChampion(null);
    setImageErrors({});
    setGameState('playing');
  };

  const selectWinner = (winner) => {
    const updatedNextRound = [...nextRoundItems, winner];
    setNextRoundItems(updatedNextRound);

    const nextDuelIndex = duelIndex + 2;
    
    // Check if the current round has more duels
    if (nextDuelIndex < currentRoundItems.length) {
      setDuelIndex(nextDuelIndex);
    } else {
      // Current round is finished
      // Check if this round was the final
      if (updatedNextRound.length === 1) {
        // We have a winner!
        setChampion(winner);
        setGameState('winner');

        // Save stat in localStorage
        const currentCount = parseInt(localStorage.getItem('stats_versus_played') || '0', 10);
        localStorage.setItem('stats_versus_played', (currentCount + 1).toString());
      } else {
        // Move to the next round
        setBracketHistory(prev => [...prev, updatedNextRound]);
        setCurrentRoundItems(updatedNextRound);
        setNextRoundItems([]);
        setDuelIndex(0);
      }
    }
  };

  // Rendering individual card with gradient fallback
  const renderCard = (item) => {
    const hasError = imageErrors[item.id];
    const isImageAvailable = item.image && item.image.trim() !== '' && !hasError;
    return (
      <div className="versus-card" onClick={() => selectWinner(item)}>
        {isImageAvailable ? (
          <img 
            src={item.image} 
            alt={item.name} 
            loading="lazy"
            onError={() => handleImageError(item.id)}
          />
        ) : (
          <div className="avatar-fallback" style={{ background: getGradientStyle(item.name) }}>
            <span style={{ fontSize: '4.5rem', fontWeight: 900, textShadow: '0 4px 10px rgba(0,0,0,0.4)' }}>
              {getInitials(item.name)}
            </span>
          </div>
        )}
        <div className="versus-card-info">
          <span className="versus-card-cat">{item.category}</span>
          <h4 className="versus-card-name">{item.name}</h4>
        </div>
      </div>
    );
  };

  return (
    <div className="versus-container">
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Le <span className="gradient-text-ci">Versus</span> Suprême
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Fais s'affronter les têtes d'affiche du pays et décide du grand vainqueur !
        </p>
      </div>

      {/* STAGE 1: Selection Config */}
      {gameState === 'selection' && (
        <div className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              1. Choisis ta catégorie
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <button 
                onClick={() => setCategory('artists')} 
                className="btn"
                style={{
                  padding: '1.5rem 1rem',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: category === 'artists' ? 'rgba(255, 140, 0, 0.12)' : 'var(--bg-surface)',
                  borderColor: category === 'artists' ? 'var(--color-orange)' : 'var(--border-light)',
                  color: category === 'artists' ? 'var(--color-white)' : 'var(--text-secondary)'
                }}
              >
                <Users size={28} style={{ color: category === 'artists' ? 'var(--color-orange)' : 'var(--text-dim)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>Artistes Ivoiriens</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Zouglou, Coupé-Décalé, Rap...</div>
                </div>
              </button>

              <button 
                onClick={() => setCategory('footballers')} 
                className="btn"
                style={{
                  padding: '1.5rem 1rem',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: category === 'footballers' ? 'rgba(255, 140, 0, 0.12)' : 'var(--bg-surface)',
                  borderColor: category === 'footballers' ? 'var(--color-orange)' : 'var(--border-light)',
                  color: category === 'footballers' ? 'var(--color-white)' : 'var(--text-secondary)'
                }}
              >
                <Trophy size={28} style={{ color: category === 'footballers' ? 'var(--color-orange)' : 'var(--text-dim)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>Footballeurs</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Toutes les générations de pros</div>
                </div>
              </button>

              <button 
                onClick={() => setCategory('public')} 
                className="btn"
                style={{
                  padding: '1.5rem 1rem',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: category === 'public' ? 'rgba(255, 140, 0, 0.12)' : 'var(--bg-surface)',
                  borderColor: category === 'public' ? 'var(--color-orange)' : 'var(--border-light)',
                  color: category === 'public' ? 'var(--color-white)' : 'var(--text-secondary)'
                }}
              >
                <User size={28} style={{ color: category === 'public' ? 'var(--color-orange)' : 'var(--text-dim)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>Figures Publiques</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Humoristes, Influenceurs...</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              2. Nombre de participants ({tournamentSize})
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[4, 8, 16, 32].map((size) => (
                <button
                  key={size}
                  onClick={() => setTournamentSize(size)}
                  className="btn"
                  style={{
                    flex: '1 1 80px',
                    background: tournamentSize === size ? 'var(--color-orange)' : 'rgba(255,255,255,0.03)',
                    color: tournamentSize === size ? '#000' : 'var(--text-main)',
                    border: '1px solid',
                    borderColor: tournamentSize === size ? 'var(--color-orange)' : 'var(--border-light)'
                  }}
                >
                  {size} Djos
                </button>
              ))}
            </div>
          </div>

          <button onClick={startTournament} className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
            Lancer le Versus <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* STAGE 2: Game Board */}
      {gameState === 'playing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Tournament progress stats */}
          <div className="glass-panel" style={{
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div>
              Catégorie : <span style={{ color: 'var(--color-orange)', fontWeight: 600 }}>{category === 'artists' ? 'Artistes' : category === 'footballers' ? 'Footballeurs' : 'Figures Publiques'}</span>
            </div>
            <div>
              Étape : <span style={{ color: 'var(--color-orange)', fontWeight: 600 }}>1/{currentRoundItems.length / 2} de finale</span>
            </div>
            <div>
              Duel : <span style={{ color: 'var(--color-orange)', fontWeight: 600 }}>{(duelIndex / 2) + 1} sur {currentRoundItems.length / 2}</span>
            </div>
          </div>

          {/* Versus Board */}
          <div className="versus-stage">
            {renderCard(currentRoundItems[duelIndex])}
            <div className="versus-vs">VS</div>
            {renderCard(currentRoundItems[duelIndex + 1])}
          </div>

          {/* Visual bracket list */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={16} style={{ color: 'var(--color-orange)' }} /> Progression du tournoi
            </h4>
            <div className="bracket-container">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {bracketHistory.map((roundList, roundIdx) => (
                  <div key={roundIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
                      {roundList.length === tournamentSize ? 'Premier Tour' : roundList.length === 2 ? 'Finale' : `1/${roundList.length} de Finale`}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {roundList.map((item, idx) => {
                        // Check if item is already eliminated in this round
                        const isWinnerOfRound = bracketHistory[roundIdx + 1]?.some(w => w.id === item.id) 
                          || (roundIdx === bracketHistory.length - 1 && currentRoundItems.some(c => c.id === item.id));

                        return (
                          <span 
                            key={idx} 
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: isWinnerOfRound ? 'rgba(0, 168, 107, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                              color: isWinnerOfRound ? 'var(--color-green)' : 'var(--text-dim)',
                              border: '1px solid',
                              borderColor: isWinnerOfRound ? 'rgba(0, 168, 107, 0.25)' : 'var(--border-light)',
                              fontWeight: isWinnerOfRound ? '700' : '400'
                            }}
                          >
                            {item.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Victory screen */}
      {gameState === 'winner' && champion && (
        <div className="glass-panel" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.12) 0%, rgba(6,7,9,1) 100%)',
          border: '1px solid var(--color-gold)'
        }}>
          {/* Confetti simulation overlay style */}
          <div className="celebration-overlay">
            {/* Simple CSS animation sparks */}
            <div style={{
              position: 'absolute', top: '10%', left: '20%', width: '12px', height: '12px',
              backgroundColor: 'var(--color-orange)', borderRadius: '50%',
              animation: 'float 3s infinite ease-in-out'
            }} />
            <div style={{
              position: 'absolute', top: '25%', right: '15%', width: '8px', height: '8px',
              backgroundColor: 'var(--color-gold)', borderRadius: '50%',
              animation: 'float 4s infinite ease-in-out'
            }} />
            <div style={{
              position: 'absolute', top: '40%', left: '8%', width: '10px', height: '10px',
              backgroundColor: 'var(--color-green)', borderRadius: '50%',
              animation: 'float 2.5s infinite ease-in-out'
            }} />
          </div>

          <Trophy size={64} style={{ color: 'var(--color-gold)', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.5))' }} />
          <h3 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Le Champion Final !</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
            Après des duels acharnés, ta préférence s'est arrêtée sur :
          </p>

          <div style={{ maxWidth: '350px', margin: '0 auto 3rem' }}>
            <div className="versus-card" style={{ cursor: 'default', pointerEvents: 'none', borderColor: 'var(--color-gold)', boxShadow: '0 0 30px rgba(255, 215, 0, 0.25)' }}>
              {champion.image && champion.image.trim() !== '' && !imageErrors[champion.id] ? (
                <img 
                  src={champion.image} 
                  alt={champion.name} 
                  loading="lazy"
                  onError={() => handleImageError(champion.id)}
                />
              ) : (
                <div className="avatar-fallback" style={{ background: getGradientStyle(champion.name) }}>
                  <span style={{ fontSize: '4.5rem', fontWeight: 900 }}>
                    {getInitials(champion.name)}
                  </span>
                </div>
              )}
              <div className="versus-card-info" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(6, 7, 9, 0.95) 100%)' }}>
                <span className="versus-card-cat" style={{ color: 'var(--color-gold)' }}>{champion.category}</span>
                <h4 className="versus-card-name" style={{ fontSize: '1.9rem' }}>{champion.name}</h4>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setGameState('selection')} className="btn btn-primary">
              <RefreshCw size={18} /> Nouvelle Partie
            </button>
          </div>
        </div>
      )}

      {/* Inline styles for simple animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
          50% { transform: translateY(-40px) rotate(180deg); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
