import React, { useState, useEffect } from 'react';
import { CircleDollarSign, Check, ArrowRight, RotateCcw, Award } from 'lucide-react';

export default function JustePrix({ products }) {
  // Game states: 'intro' | 'playing' | 'round_result' | 'game_over'
  const [gameState, setGameState] = useState('intro');
  const [sessionProducts, setSessionProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null); // { score, actual, guess, difference, percentage, text }
  const [totalScore, setTotalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const savedBest = localStorage.getItem('stats_justeprix_best') || '0';
    setBestScore(parseInt(savedBest, 10));
  }, []);

  const startGame = () => {
    if (products.length < 5) {
      alert("Pas assez de produits pour lancer le jeu. Veuillez en ajouter dans le dashboard d'administration.");
      return;
    }
    // Pick 5 random products
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    setSessionProducts(shuffled.slice(0, 5));
    setCurrentIndex(0);
    setTotalScore(0);
    setGuess('');
    setFeedback(null);
    setImageError(false);
    setGameState('playing');
  };

  const handleValidate = (e) => {
    e.preventDefault();
    const userGuess = parseInt(guess, 10);
    if (isNaN(userGuess) || userGuess <= 0) {
      alert("S'il te plaît, entre un montant valide supérieur à 0 CFA.");
      return;
    }

    const currentProduct = sessionProducts[currentIndex];
    const actualPrice = currentProduct.price;
    const diff = Math.abs(userGuess - actualPrice);
    const errPercent = (diff / actualPrice) * 100;

    let points = 0;
    let comment = '';

    if (errPercent === 0) {
      points = 1000;
      comment = "BINGO ! Prix exact. Tu es un vrai crack d'Adjamé ! 🎯";
    } else if (errPercent <= 10) {
      points = 800;
      comment = `Très proche ! C'est presque ça. (+${points} pts)`;
    } else if (errPercent <= 25) {
      points = 500;
      comment = `Pas mal, mais tu t'es fait un peu gratter. (+${points} pts)`;
    } else if (errPercent <= 50) {
      points = 200;
      comment = `Un peu cher mon frère ! Tu as surpayé. (+${points} pts)`;
    } else {
      points = 0;
      comment = "Aïe ! Tu vis au pays ou tu es venu en vacances ? Prix trop décalé ! (0 pt)";
    }

    setFeedback({
      score: points,
      actual: actualPrice,
      guess: userGuess,
      difference: diff,
      percentage: Math.round(errPercent),
      text: comment
    });

    setTotalScore(prev => prev + points);
    setGameState('round_result');
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < sessionProducts.length) {
      setCurrentIndex(nextIndex);
      setGuess('');
      setFeedback(null);
      setImageError(false);
      setGameState('playing');
    } else {
      // Game Over
      setGameState('game_over');

      // Update statistics
      const currentPlayed = parseInt(localStorage.getItem('stats_justeprix_played') || '0', 10);
      localStorage.setItem('stats_justeprix_played', (currentPlayed + 1).toString());

      const finalScore = totalScore;
      if (finalScore > bestScore) {
        localStorage.setItem('stats_justeprix_best', finalScore.toString());
        setBestScore(finalScore);
      }
    }
  };

  const getRankBadge = (score) => {
    if (score >= 4500) return { title: "Djo d'Adjamé (Expert Suprême)", desc: "Tu connais les prix de chaque grain de riz au pays !", color: 'var(--color-gold)' };
    if (score >= 3000) return { title: "Commerçant de Treichville", desc: "Tu négocies très bien, les marchands ne peuvent pas te bluffer.", color: 'var(--color-orange)' };
    if (score >= 1500) return { title: "Résident de Cocody", desc: "Tu as les moyens mais tu te fais un peu avoir sur les marchés.", color: 'var(--color-green)' };
    return { title: "Gaou de 1ère Classe", desc: "Mon ami, on t'a grugé grave ! Rentre te ressourcer au pays.", color: 'var(--color-danger)' };
  };

  // Helper for generating dynamic product illustrations
  const getProductGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color1 = `hsl(${Math.abs(hash % 360)}, 55%, 35%)`;
    const color2 = `hsl(${Math.abs((hash + 60) % 360)}, 60%, 20%)`;
    return `linear-gradient(135deg, ${color1}, ${color2})`;
  };

  const activeProduct = sessionProducts[currentIndex];

  return (
    <div className="prix-container">
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Le <span className="gradient-text-ci">Juste Prix</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Devine le coût des articles du quotidien ivoirien en Francs CFA (XOF) !
        </p>
      </div>

      {/* INTRO STAGE */}
      {gameState === 'intro' && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CircleDollarSign size={56} style={{ color: 'var(--color-orange)', filter: 'drop-shadow(0 0 10px rgba(255, 140, 0, 0.3))' }} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Règles du jeu :</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '450px', margin: '0 auto' }}>
            Tu vas voir défiler 5 produits typiques du pays (nourriture, transports, tech). Écris le prix en Francs CFA. Moins tu as d'écart, plus tu gagnes de points !
          </p>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            Record actuel : <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{bestScore} points</span>
          </div>
          <button onClick={startGame} className="btn btn-primary" style={{ alignSelf: 'center', width: '200px', marginTop: '1rem' }}>
            C'est parti !
          </button>
        </div>
      )}

      {/* PLAYING STAGE */}
      {gameState === 'playing' && activeProduct && (
        <div className="glass-panel prix-card">
          {/* Progress bar */}
          <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div style={{
              width: `${((currentIndex) / 5) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--color-orange), var(--color-gold))',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Product Header */}
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Produit {currentIndex + 1} sur 5
            </span>
            <span style={{ fontSize: '0.8rem', background: 'rgba(255, 140, 0, 0.1)', color: 'var(--color-orange)', padding: '4px 10px', borderRadius: '30px', fontWeight: 600 }}>
              {activeProduct.category}
            </span>
          </div>

          {/* Product image/visual */}
          <div className="prix-image-box">
            {activeProduct.image && activeProduct.image.trim() !== '' && !imageError ? (
              <img 
                src={activeProduct.image} 
                alt={activeProduct.name} 
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="avatar-fallback" style={{ background: getProductGradient(activeProduct.name) }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, opacity: 0.8, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                  {activeProduct.name}
                </span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleValidate} className="prix-input-group">
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, textAlign: 'center' }}>
              Quel est le prix de cet article ?
            </h3>
            
            <div className="cfa-input-container">
              <input
                type="number"
                placeholder="Ex: 500"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                autoFocus
                required
                min="5"
              />
              <span>FCFA</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}>
              Valider mon estimation <Check size={18} />
            </button>
          </form>
        </div>
      )}

      {/* ROUND RESULT STAGE */}
      {gameState === 'round_result' && activeProduct && feedback && (
        <div className="glass-panel prix-card">
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Résultat du Tour {currentIndex + 1}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: feedback.score > 0 ? 'var(--color-green)' : 'var(--color-danger)' }}>
              +{feedback.score} pts
            </span>
          </div>

          <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>
              {activeProduct.name}
            </h3>

            {/* Price comparisons */}
            <div style={{ display: 'flex', gap: '2rem', width: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ton estimation</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-orange)' }}>{feedback.guess} <span style={{ fontSize: '1rem' }}>CFA</span></div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-light)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vrai prix</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-green)' }}>{feedback.actual} <span style={{ fontSize: '1rem' }}>CFA</span></div>
              </div>
            </div>

            {/* Error indicator & text feedback */}
            <div className={`feedback-box ${feedback.score > 0 ? 'feedback-success' : 'feedback-warning'}`} style={{ width: '100%' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{feedback.text}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Écart : <span style={{ fontWeight: 800 }}>{feedback.difference} CFA</span> ({feedback.percentage}% d'écart)
              </div>
            </div>

            <button onClick={handleNext} className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', marginTop: '1rem' }}>
              {currentIndex === 4 ? "Voir le score final" : "Produit suivant"} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER STAGE */}
      {gameState === 'game_over' && (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <Award size={64} style={{ color: getRankBadge(totalScore).color, margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }} />
            <h3 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Partie Terminée !</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Tu as complété les 5 produits.</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem 1.5rem', background: 'rgba(0,0,0,0.2)', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score cumulé</div>
            <div style={{ fontSize: '3rem', fontWeight: 900, margin: '0.5rem 0', color: 'white' }}>{totalScore} <span style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ 5000</span></div>
            
            <div style={{ borderTop: '1px solid var(--border-light)', margin: '1rem 0', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rang obtenu :</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getRankBadge(totalScore).color, marginTop: '4px' }}>
                {getRankBadge(totalScore).title}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', lineHeight: '1.4' }}>
                {getRankBadge(totalScore).desc}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={startGame} className="btn btn-primary">
              <RotateCcw size={16} /> Rejouer
            </button>
            <button onClick={() => setGameState('intro')} className="btn btn-secondary">
              Retour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
