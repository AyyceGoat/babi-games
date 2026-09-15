import React, { useState } from 'react';
import { Shield, Search, ExternalLink, Award } from 'lucide-react';

export default function Credits({ artists, footballers, publicFigures, foods, products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Combine all items into a single credits list
  const allItems = [
    ...artists.map(x => ({ ...x, type: 'Artiste' })),
    ...footballers.map(x => ({ ...x, type: 'Footballeur' })),
    ...publicFigures.map(x => ({ ...x, type: 'Personnalité' })),
    ...foods.map(x => ({ ...x, type: 'Nourriture' })),
    ...products.map(x => ({ ...x, type: 'Produit' }))
  ];

  // Filter items based on search and type
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <Shield size={36} style={{ color: 'var(--color-green)' }} /> Crédits & Droits d'Auteur
        </h1>
        <p style={{ color: 'var(--text-dim)', maxWidth: '600px', margin: '0 auto' }}>
          Attributions légales et licences d'utilisation des ressources visuelles de la plateforme, conformément aux exigences Creative Commons et Wikidata.
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Rechercher une personnalité ou un objet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'white'
              }}
            />
          </div>

          {/* Filter Type */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'Artiste', 'Footballeur', 'Personnalité', 'Nourriture', 'Produit'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`btn ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {type === 'all' ? 'Tous' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1rem' }}>Visuel</th>
              <th style={{ padding: '1rem' }}>Nom</th>
              <th style={{ padding: '1rem' }}>Type</th>
              <th style={{ padding: '1rem' }}>Source</th>
              <th style={{ padding: '1rem' }}>Licence</th>
              <th style={{ padding: '1rem' }}>Auteur / Crédit</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => (
                <tr
                  key={item.id + '_' + idx}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Thumbnail */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/placeholders/artiste.svg';
                        }}
                      />
                    </div>
                  </td>

                  {/* Name */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.name}</td>

                  {/* Type */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: item.type === 'Artiste' ? 'rgba(249,115,22,0.15)' :
                                  item.type === 'Footballeur' ? 'rgba(34,197,94,0.15)' :
                                  item.type === 'Personnalité' ? 'rgba(59,130,246,0.15)' :
                                  item.type === 'Nourriture' ? 'rgba(236,72,153,0.15)' :
                                  'rgba(234,179,8,0.15)',
                      color: item.type === 'Artiste' ? 'var(--color-orange)' :
                             item.type === 'Footballeur' ? 'var(--color-green)' :
                             item.type === 'Personnalité' ? '#3b82f6' :
                             item.type === 'Nourriture' ? '#ec4899' :
                             '#eab308'
                    }}>
                      {item.type}
                    </span>
                  </td>

                  {/* Source */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {item.source === 'wikidata_commons' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#60a5fa', fontSize: '0.9rem' }}>
                        Wikimedia Commons <ExternalLink size={12} />
                      </span>
                    ) : item.source === 'openverse' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#a78bfa', fontSize: '0.9rem' }}>
                        Openverse <ExternalLink size={12} />
                      </span>
                    ) : item.source === 'Upload' || item.source === 'Manuel' || (item.source && item.source !== 'N/A' && item.source !== 'none') ? (
                      <span style={{ color: 'var(--color-green)', fontSize: '0.9rem' }}>
                        {item.source}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Non attribuée
                      </span>
                    )}
                  </td>

                  {/* License */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      padding: '2px 6px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '4px'
                    }}>
                      {item.license || 'N/A'}
                    </span>
                  </td>

                  {/* Author */}
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.author || 'Inconnu'}>
                    {item.author || 'Inconnu'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <Award size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                  <p>Aucun crédit trouvé pour votre recherche.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
