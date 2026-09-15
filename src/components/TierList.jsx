import React, { useState, useEffect } from 'react';
import { ListStart, Save, RotateCcw, Share2, HelpCircle, CheckCircle } from 'lucide-react';

const TIER_ROWS = [
  { id: 'S', name: 'S', color: '#ff7f7f' },
  { id: 'A', name: 'A', color: '#ffbf7f' },
  { id: 'B', name: 'B', color: '#ffdf7f' },
  { id: 'C', name: 'C', color: '#ffff7f' },
  { id: 'D', name: 'D', color: '#bfff7f' },
  { id: 'F', name: 'F', color: '#7fff7f' },
];

export default function TierList({ artists, footballers, publicFigures, foods }) {
  const [category, setCategory] = useState('foods'); // 'foods' | 'artists' | 'footballers' | 'public'
  const [items, setItems] = useState([]); // List of items to rank
  const [ranks, setRanks] = useState({ S: [], A: [], B: [], C: [], D: [], F: [] }); // Ranked items mapping
  const [pool, setPool] = useState([]); // Items left in the pool
  const [selectedItem, setSelectedItem] = useState(null); // Click fallback for mobile
  const [savedLists, setSavedLists] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  // Initialize pool based on category
  useEffect(() => {
    resetTierList();
  }, [category, artists, footballers, publicFigures, foods]);

  const resetTierList = () => {
    let sourceData = [];
    switch (category) {
      case 'foods':
        sourceData = [...foods];
        break;
      case 'artists':
        // Take a random 16 artists to avoid cluttering
        sourceData = [...artists].sort(() => 0.5 - Math.random()).slice(0, 16);
        break;
      case 'footballers':
        // Take a random 16 players
        sourceData = [...footballers].sort(() => 0.5 - Math.random()).slice(0, 16);
        break;
      case 'public':
        // Take a random 16 public figures
        sourceData = [...publicFigures].sort(() => 0.5 - Math.random()).slice(0, 16);
        break;
      default:
        sourceData = [...foods];
    }
    
    setItems(sourceData);
    setPool(sourceData);
    setRanks({ S: [], A: [], B: [], C: [], D: [], F: [] });
    setSelectedItem(null);
    setImageErrors({});
  };

  // Drag and Drop Logic
  const handleDragStart = (e, item, sourceZone) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, sourceZone }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetZone) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { item, sourceZone } = JSON.parse(dataStr);

      moveItem(item, sourceZone, targetZone);
    } catch (err) {
      console.error(err);
    }
  };

  const moveItem = (item, sourceZone, targetZone) => {
    if (sourceZone === targetZone) return;

    // Remove from source
    if (sourceZone === 'pool') {
      setPool(prev => prev.filter(i => i.id !== item.id));
    } else {
      setRanks(prev => ({
        ...prev,
        [sourceZone]: prev[sourceZone].filter(i => i.id !== item.id)
      }));
    }

    // Add to target
    if (targetZone === 'pool') {
      setPool(prev => [...prev, item]);
    } else {
      setRanks(prev => ({
        ...prev,
        [targetZone]: [...prev[targetZone], item]
      }));
    }

    setSelectedItem(null); // Clear selection
  };

  // Touch/Click selection logic (for mobile / pointer devices)
  const handleItemClick = (item, sourceZone) => {
    if (selectedItem && selectedItem.item.id === item.id) {
      // Deselect if clicking the same item
      setSelectedItem(null);
    } else {
      setSelectedItem({ item, sourceZone });
    }
  };

  const handleZoneClick = (targetZone) => {
    if (!selectedItem) return;
    moveItem(selectedItem.item, selectedItem.sourceZone, targetZone);
  };

  const saveTierList = () => {
    const listData = {
      category,
      ranks,
      savedAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('saved_tierlists') || '[]');
    saved.push(listData);
    localStorage.setItem('saved_tierlists', JSON.stringify(saved));

    // Stats counter
    const currentCount = parseInt(localStorage.getItem('stats_tierlists_saved') || '0', 10);
    localStorage.setItem('stats_tierlists_saved', (currentCount + 1).toString());

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Rendering fallback gradient for items without photo
  const getGradientStyle = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color1 = `hsl(${Math.abs(hash % 360)}, 60%, 40%)`;
    const color2 = `hsl(${Math.abs((hash + 80) % 360)}, 65%, 25%)`;
    return `linear-gradient(135deg, ${color1}, ${color2})`;
  };

  const renderTierItem = (item, sourceZone) => {
    const isSelected = selectedItem && selectedItem.item.id === item.id;
    const hasError = imageErrors[item.id];
    const isImageAvailable = item.image && item.image.trim() !== '' && !hasError;

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item, sourceZone)}
        onClick={() => handleItemClick(item, sourceZone)}
        className="tier-item"
        style={{
          border: isSelected ? '3px solid var(--color-orange)' : '1px solid var(--border-light)',
          boxShadow: isSelected ? '0 0 15px rgba(255,140,0,0.5)' : 'none'
        }}
      >
        {isImageAvailable ? (
          <img 
            src={item.image} 
            alt={item.name} 
            loading="lazy"
            onError={() => handleImageError(item.id)}
          />
        ) : (
          <div className="tier-item-fallback" style={{ background: getGradientStyle(item.name) }}>
            {item.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
        )}
        <div className="tier-item-label">{item.name}</div>
      </div>
    );
  };

  return (
    <div className="tierlist-container">
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          La <span className="gradient-text-ci">Tier List</span> 225
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Classe les éléments de la culture ivoirienne du rang S (Le top du top) au rang F (Médiéocre / Pas dedans).
        </p>
      </div>

      {/* Category selector */}
      <div className="glass-panel" style={{
        padding: '0.75rem',
        display: 'flex',
        gap: '0.5rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
        background: 'rgba(0,0,0,0.15)'
      }}>
        {[
          { id: 'foods', label: 'Nourriture 🇨🇮' },
          { id: 'artists', label: 'Artistes' },
          { id: 'footballers', label: 'Footballeurs' },
          { id: 'public', label: 'Figures Publiques' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className="btn btn-ghost"
            style={{
              color: category === cat.id ? 'var(--color-orange)' : 'var(--text-secondary)',
              background: category === cat.id ? 'rgba(255, 140, 0, 0.08)' : 'transparent',
              border: category === cat.id ? '1px solid rgba(255, 140, 0, 0.2)' : '1px solid transparent',
              padding: '0.5rem 1rem'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Mobile user guide */}
      <div style={{
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: 'center'
      }}>
        <HelpCircle size={14} style={{ color: 'var(--color-orange)' }} />
        <span>Sur mobile : tape sur un élément puis tape sur une ligne pour le classer.</span>
      </div>

      {/* Tier Board */}
      <div className="tier-rows-container">
        {TIER_ROWS.map((row) => (
          <div key={row.id} className="tier-row">
            <div
              className="tier-label"
              style={{ backgroundColor: row.color }}
              onClick={() => handleZoneClick(row.id)}
            >
              {row.name}
            </div>
            <div
              className="tier-dropzone"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, row.id)}
              onClick={() => handleZoneClick(row.id)}
            >
              {ranks[row.id].map((item) => renderTierItem(item, row.id))}
            </div>
          </div>
        ))}
      </div>

      {/* Control panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={resetTierList} className="btn btn-secondary">
          <RotateCcw size={16} /> Réinitialiser
        </button>

        {showSuccess && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-green)',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            <CheckCircle size={18} /> Tier List enregistrée en local !
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={saveTierList} className="btn btn-success">
            <Save size={16} /> Enregistrer
          </button>
        </div>
      </div>

      {/* Items Pool */}
      <div className="tier-pool-container">
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ListStart size={18} style={{ color: 'var(--color-orange)' }} /> Éléments à classer ({pool.length})
        </h4>
        <div
          className="tier-pool"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'pool')}
          onClick={() => handleZoneClick('pool')}
        >
          {pool.length === 0 ? (
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.9rem',
              padding: '2rem 0'
            }}>
              Tous les éléments ont été classés ! Félicitations.
            </div>
          ) : (
            pool.map((item) => renderTierItem(item, 'pool'))
          )}
        </div>
      </div>
    </div>
  );
}
