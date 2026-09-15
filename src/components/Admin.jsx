import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Layers, CheckCircle, Upload, ShieldAlert, AlertCircle } from 'lucide-react';

export default function Admin({
  artists, setArtists,
  footballers, setFootballers,
  publicFigures, setPublicFigures,
  foods, setFoods,
  products, setProducts,
  resetToDefault
}) {
  const [activeTab, setActiveTab] = useState('artists'); // 'artists' | 'footballers' | 'public' | 'foods' | 'products'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending'
  
  // Form states
  const [name, setName] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState('');
  const [source, setSource] = useState('');
  const [license, setLicense] = useState('');
  const [author, setAuthor] = useState('');
  
  // Inline edit states
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategoryInput, setEditCategoryInput] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editAuthor, setEditAuthor] = useState('');

  const [notification, setNotification] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Get active list properties
  const getActiveListProps = () => {
    switch (activeTab) {
      case 'artists': return { list: artists, setter: setArtists, label: 'Artiste', type: 'artiste' };
      case 'footballers': return { list: footballers, setter: setFootballers, label: 'Footballeur', type: 'footballeur' };
      case 'public': return { list: publicFigures, setter: setPublicFigures, label: 'Figure Publique', type: 'public' };
      case 'foods': return { list: foods, setter: setFoods, label: 'Aliment', type: 'nourriture' };
      case 'products': return { list: products, setter: setProducts, label: 'Produit du Juste Prix', type: 'produit' };
      default: return { list: artists, setter: setArtists, label: 'Artiste', type: 'artiste' };
    }
  };

  // Convert uploaded file to Base64
  const handleFileUpload = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditImage(reader.result);
          setEditSource('Upload');
        } else {
          setImage(reader.result);
          setSource('Upload');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validation: If an image is provided, credits are strictly mandatory
    const hasImage = image.trim() !== '';
    if (hasImage) {
      if (!source.trim() || !license.trim() || !author.trim()) {
        showError("⚠️ Champs obligatoires manquants : Si tu indiques un visuel, tu dois spécifier sa Source, sa Licence et son Auteur !");
        return;
      }
    }

    const { type, setter, label } = getActiveListProps();
    const newId = `${type}_${Date.now()}`;
    
    // Status is 'ok' if custom image provided, otherwise pending human verification
    const status = hasImage ? 'ok' : 'a_verifier_manuellement';
    const placeholder = `/images/placeholders/${type === 'public' ? 'artiste' : type}.svg`;

    const newItem = {
      id: newId,
      name: name.trim(),
      image: hasImage ? image.trim() : placeholder,
      status: status,
      source: hasImage ? source.trim() : 'N/A',
      license: hasImage ? license.trim() : 'N/A',
      author: hasImage ? author.trim() : 'N/A',
      ...(activeTab === 'products' ? { price: parseInt(price, 10) || 0, category: categoryInput.trim() || 'Général' } : {}),
      ...(activeTab !== 'products' && activeTab !== 'foods' ? { category: categoryInput.trim() || 'Général' } : {})
    };

    setter(prev => [newItem, ...prev]);
    
    // Reset Form
    setName('');
    setCategoryInput('');
    setImage('');
    setPrice('');
    setSource('');
    setLicense('');
    setAuthor('');
    
    showNotification(`${label} ajouté avec succès !`);
  };

  const handleStartEdit = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    // Do not pre-fill image if it's the placeholder SVG to make it easy to upload a new one
    setEditImage(item.image && item.image.startsWith('/images/placeholders/') ? '' : item.image || '');
    setEditSource(item.source && item.source !== 'N/A' ? item.source : '');
    setEditLicense(item.license && item.license !== 'N/A' ? item.license : '');
    setEditAuthor(item.author && item.author !== 'N/A' ? item.author : '');
    
    if (activeTab === 'products') {
      setEditPrice(item.price.toString());
      setEditCategoryInput(item.category || '');
    } else if (activeTab !== 'foods') {
      setEditCategoryInput(item.category || '');
    }
  };

  const handleSaveEdit = (id) => {
    const hasImage = editImage.trim() !== '';
    if (hasImage) {
      if (!editSource.trim() || !editLicense.trim() || !editAuthor.trim()) {
        showError("⚠️ Champs obligatoires manquants : Si tu indiques un visuel, tu devez renseigner sa Source, sa Licence et son Auteur !");
        return;
      }
    }

    const { list, setter, label, type } = getActiveListProps();
    const placeholder = `/images/placeholders/${type === 'public' ? 'artiste' : type}.svg`;
    
    const updated = list.map(item => {
      if (item.id === id) {
        const status = hasImage ? 'ok' : 'a_verifier_manuellement';
        return {
          ...item,
          name: editName.trim(),
          image: hasImage ? editImage.trim() : placeholder,
          status: status,
          source: hasImage ? editSource.trim() : 'N/A',
          license: hasImage ? editLicense.trim() : 'N/A',
          author: hasImage ? editAuthor.trim() : 'N/A',
          ...(activeTab === 'products' ? { price: parseInt(editPrice, 10) || 0, category: editCategoryInput.trim() || 'Général' } : {}),
          ...(activeTab !== 'products' && activeTab !== 'foods' ? { category: editCategoryInput.trim() || 'Général' } : {})
        };
      }
      return item;
    });

    setter(updated);
    setEditId(null);
    showNotification(`${label} mis à jour !`);
  };

  const handleDelete = (id) => {
    const { setter, label } = getActiveListProps();
    if (window.confirm(`Es-tu sûr de vouloir supprimer cet élément ?`)) {
      setter(prev => prev.filter(item => item.id !== id));
      showNotification(`${label} supprimé.`);
    }
  };

  const handleResetData = () => {
    if (window.confirm("Attention : cela va supprimer toutes tes modifications personnalisées et restaurer la base de données d'origine. Continuer ?")) {
      resetToDefault();
      showNotification("Base de données restaurée avec succès !");
    }
  };

  const { list, label, type } = getActiveListProps();

  // Apply "À vérifier" filter
  const filteredList = list.filter(item => {
    if (filterStatus === 'pending') {
      return item.status === 'a_verifier_manuellement' || (item.image && item.image.startsWith('/images/placeholders/'));
    }
    return true;
  });

  return (
    <div>
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Tableau d'Administration</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gère le cache de données et valide les droits d'auteur des visuels.
          </p>
        </div>
        <button onClick={handleResetData} className="btn btn-danger" style={{ display: 'inline-flex', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Réinitialiser la Base
        </button>
      </div>

      {/* Notifications / Errors */}
      {notification && (
        <div className="glass-panel glow-green" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-green)', fontWeight: 600 }}>
          <CheckCircle size={18} /> {notification}
        </div>
      )}
      {errorMsg && (
        <div className="glass-panel glow-red" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Erreur d'attribution</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Technical debt notification alert */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.04)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <ShieldAlert size={20} style={{ color: 'var(--color-orange)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--color-orange)' }}>Note technique (Dette V1) :</strong> Le stockage des uploads locaux s'effectue temporairement en Base64 dans votre navigateur (localStorage). Pour un usage multi-utilisateurs réel, il faudra lier cela à un stockage Cloud (S3/Cloudinary) et un serveur de base de données.
        </div>
      </div>

      <div className="admin-grid">
        {/* Sidebar Nav */}
        <div className="admin-sidebar glass-panel" style={{ padding: '1rem' }}>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.5px', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>
            Tables de données
          </h4>
          {[
            { id: 'artists', label: 'Artistes' },
            { id: 'footballers', label: 'Footballeurs' },
            { id: 'public', label: 'Figures Publiques' },
            { id: 'foods', label: 'Nourriture (Tier List)' },
            { id: 'products', label: 'Produits (Juste Prix)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditId(null);
              }}
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Layers size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Add form */}
          {editId === null && (
            <form onSubmit={handleAdd} className="glass-panel admin-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', padding: '1.5rem' }}>
              <h3 style={{ gridColumn: '1/-1', fontSize: '1.10rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                Ajouter un nouveau {label}
              </h3>
              
              <div className="form-group">
                <label>Nom Complet</label>
                <input type="text" placeholder="Ex: Didi B, Alloco..." value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              {activeTab === 'products' && (
                <div className="form-group">
                  <label>Prix estimé (CFA)</label>
                  <input type="number" placeholder="Ex: 500" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" />
                </div>
              )}

              {activeTab !== 'foods' && (
                <div className="form-group">
                  <label>Catégorie / Position</label>
                  <input
                    type="text"
                    placeholder={activeTab === 'products' ? "Ex: Nourriture..." : activeTab === 'footballers' ? "Ex: Attaquant..." : "Ex: Rap, Zouglou..."}
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                  />
                </div>
              )}

              {/* Flexible image field */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Image de l'élément (Téléverser un fichier local OU saisir une URL)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  
                  {/* File Upload */}
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, padding: '10px 15px' }}>
                    <Upload size={16} /> Parcourir...
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e)} style={{ display: 'none' }} />
                  </label>

                  <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>ou</span>

                  {/* URL input */}
                  <input
                    type="url"
                    placeholder="Saisir une URL d'image (ex: https://images.unsplash.com/...)"
                    value={image.startsWith('data:') ? '' : image}
                    onChange={(e) => setImage(e.target.value)}
                    style={{ flex: 1, minWidth: '200px', margin: 0 }}
                  />
                </div>
                {image && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={image} alt="Prévisualisation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-green)' }}>✓ Image chargée ({image.startsWith('data:') ? 'Fichier Local Base64' : 'Lien Web'})</span>
                    <button type="button" onClick={() => { setImage(''); setSource(''); }} className="btn btn-ghost" style={{ padding: '2px', marginLeft: 'auto', color: '#ef4444' }}><X size={14} /></button>
                  </div>
                )}
              </div>

              {/* Mandatory License attribution block if image is loaded */}
              {image.trim() !== '' && (
                <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1rem', background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                  <h4 style={{ gridColumn: '1/-1', margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Attribution obligatoire de licence d'image
                  </h4>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', color: 'white' }}>Source / Site d'origine *</label>
                    <input type="text" placeholder="Ex: Wikimedia Commons, Upload, etc." value={source} onChange={(e) => setSource(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', color: 'white' }}>Licence de l'image *</label>
                    <input type="text" placeholder="Ex: CC BY-SA 4.0, Domaine Public..." value={license} onChange={(e) => setLicense(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', color: 'white' }}>Auteur / Photographe *</label>
                    <input type="text" placeholder="Ex: John Doe, Nom d'artiste..." value={author} onChange={(e) => setAuthor(e.target.value)} required />
                  </div>
                </div>
              )}

              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Ajouter à la liste
                </button>
              </div>
            </form>
          )}

          {/* List Table */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Éléments enregistrés ({filteredList.length})
              </h3>
              
              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto' }}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`btn ${filterStatus === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  À vérifier
                  <span style={{ fontSize: '0.7rem', padding: '1px 5px', background: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '10px', fontWeight: 700 }}>
                    {list.filter(x => x.status === 'a_verifier_manuellement' || (x.image && x.image.startsWith('/images/placeholders/'))).length}
                  </span>
                </button>
              </div>
            </div>
            
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    {activeTab !== 'foods' && <th>Catégorie</th>}
                    {activeTab === 'products' && <th>Prix</th>}
                    <th>Attribution Image</th>
                    <th style={{ width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const isEditing = editId === item.id;
                    const needsVerify = item.status === 'a_verifier_manuellement' || (item.image && item.image.startsWith('/images/placeholders/'));

                    return (
                      <tr key={item.id} style={{ background: needsVerify ? 'rgba(249,115,22,0.02)' : 'transparent' }}>
                        
                        {/* Name */}
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-orange)', color: 'white', padding: '4px 8px', borderRadius: '4px', width: '100%' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600 }}>{item.name}</span>
                              {needsVerify && (
                                <span style={{ padding: '2px 6px', background: 'rgba(249,115,22,0.15)', color: 'var(--color-orange)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                                  À vérifier
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        {activeTab !== 'foods' && (
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editCategoryInput}
                                onChange={(e) => setEditCategoryInput(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-orange)', color: 'white', padding: '4px 8px', borderRadius: '4px', width: '100%' }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>{item.category || 'Général'}</span>
                            )}
                          </td>
                        )}

                        {/* Price */}
                        {activeTab === 'products' && (
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-orange)', color: 'white', padding: '4px 8px', borderRadius: '4px', width: '80px' }}
                              />
                            ) : (
                              <span style={{ fontWeight: 700, color: 'var(--color-orange)' }}>{item.price} CFA</span>
                            )}
                          </td>
                        )}

                        {/* Image & Attribution Preview */}
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              
                              {/* Inline upload / URL */}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <label className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
                                  Upload
                                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, true)} style={{ display: 'none' }} />
                                </label>
                                <input
                                  type="text"
                                  value={editImage.startsWith('data:') ? '' : editImage}
                                  onChange={(e) => setEditImage(e.target.value)}
                                  placeholder="URL Image"
                                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-orange)', color: 'white', padding: '4px 8px', borderRadius: '4px', flex: 1, fontSize: '0.8rem', margin: 0 }}
                                />
                              </div>

                              {/* Attribution input if image set */}
                              {editImage.trim() !== '' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                  <input type="text" placeholder="Source" value={editSource} onChange={(e) => setEditSource(e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px', margin: 0 }} required />
                                  <input type="text" placeholder="Licence" value={editLicense} onChange={(e) => setEditLicense(e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px', margin: 0 }} required />
                                  <input type="text" placeholder="Auteur" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px', margin: 0 }} required />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  loading="lazy"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `/images/placeholders/${type === 'public' ? 'artiste' : type}.svg`;
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: item.image && !item.image.startsWith('/images/placeholders/') ? 'var(--color-green)' : 'var(--text-dim)' }}>
                                  {item.image && !item.image.startsWith('/images/placeholders/') ? (item.source === 'wikidata_commons' ? 'Wikimedia' : item.source === 'openverse' ? 'Openverse' : 'Manuel') : 'Placeholder'}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.author}>
                                  {item.image && !item.image.startsWith('/images/placeholders/') ? `${item.license} • ${item.author}` : 'Attribution requise'}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => handleSaveEdit(item.id)} className="btn btn-ghost" style={{ padding: '4px', color: 'var(--color-green)' }}>
                                <Save size={16} />
                              </button>
                              <button onClick={() => setEditId(null)} className="btn btn-ghost" style={{ padding: '4px', color: 'var(--color-danger)' }}>
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => handleStartEdit(item)} className="btn btn-ghost" style={{ padding: '4px' }}>
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="btn btn-ghost" style={{ padding: '4px', color: 'var(--color-danger)' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
