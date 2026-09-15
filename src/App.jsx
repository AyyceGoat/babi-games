import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Versus from './components/Versus';
import TierList from './components/TierList';
import JustePrix from './components/JustePrix';
import Admin from './components/Admin';
import Credits from './components/Credits';

// Load our local, automated-seeded database JSON
import dbData from './data/db.json';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  // Core database states loaded from dbData or localStorage cache
  const [artists, setArtists] = useState([]);
  const [footballers, setFootballers] = useState([]);
  const [publicFigures, setPublicFigures] = useState([]);
  const [foods, setFoods] = useState([]);
  const [products, setProducts] = useState([]);

  // Load data on initialization
  useEffect(() => {
    const localArtists = localStorage.getItem('civ_data_artists');
    const localFootballers = localStorage.getItem('civ_data_footballers');
    const localPublic = localStorage.getItem('civ_data_publicfigures');
    const localFoods = localStorage.getItem('civ_data_foods');
    const localProducts = localStorage.getItem('civ_data_products');
    const dataVersion = localStorage.getItem('civ_data_version');

    // Bump cache version to v4 to trigger update to new Wikidata-seeded db.json
    const shouldForceReset = dataVersion !== 'v4';

    // Helper to safely parse local JSON and check if it is populated
    const getCachedList = (rawJSON) => {
      if (!rawJSON) return null;
      try {
        const parsed = JSON.parse(rawJSON);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
      } catch (e) {
        return null;
      }
    };

    const cachedArtists = getCachedList(localArtists);
    if (cachedArtists && !shouldForceReset) {
      setArtists(cachedArtists);
    } else {
      setArtists(dbData.artists || []);
      localStorage.setItem('civ_data_artists', JSON.stringify(dbData.artists || []));
    }

    const cachedFootballers = getCachedList(localFootballers);
    if (cachedFootballers && !shouldForceReset) {
      setFootballers(cachedFootballers);
    } else {
      setFootballers(dbData.footballers || []);
      localStorage.setItem('civ_data_footballers', JSON.stringify(dbData.footballers || []));
    }

    const cachedPublic = getCachedList(localPublic);
    if (cachedPublic && !shouldForceReset) {
      setPublicFigures(cachedPublic);
    } else {
      setPublicFigures(dbData.publicFigures || []);
      localStorage.setItem('civ_data_publicfigures', JSON.stringify(dbData.publicFigures || []));
    }

    const cachedFoods = getCachedList(localFoods);
    if (cachedFoods && !shouldForceReset) {
      setFoods(cachedFoods);
    } else {
      setFoods(dbData.foods || []);
      localStorage.setItem('civ_data_foods', JSON.stringify(dbData.foods || []));
    }

    const cachedProducts = getCachedList(localProducts);
    if (cachedProducts && !shouldForceReset) {
      setProducts(cachedProducts);
    } else {
      setProducts(dbData.products || []);
      localStorage.setItem('civ_data_products', JSON.stringify(dbData.products || []));
    }

    if (shouldForceReset) {
      localStorage.setItem('civ_data_version', 'v4');
    }
  }, []);

  // Sync state modifications to localStorage
  useEffect(() => {
    if (artists.length > 0) localStorage.setItem('civ_data_artists', JSON.stringify(artists));
  }, [artists]);

  useEffect(() => {
    if (footballers.length > 0) localStorage.setItem('civ_data_footballers', JSON.stringify(footballers));
  }, [footballers]);

  useEffect(() => {
    if (publicFigures.length > 0) localStorage.setItem('civ_data_publicfigures', JSON.stringify(publicFigures));
  }, [publicFigures]);

  useEffect(() => {
    if (foods.length > 0) localStorage.setItem('civ_data_foods', JSON.stringify(foods));
  }, [foods]);

  useEffect(() => {
    if (products.length > 0) localStorage.setItem('civ_data_products', JSON.stringify(products));
  }, [products]);

  // Reset helper passed to admin
  const resetToDefault = () => {
    setArtists(dbData.artists || []);
    setFootballers(dbData.footballers || []);
    setPublicFigures(dbData.publicFigures || []);
    setFoods(dbData.foods || []);
    setProducts(dbData.products || []);

    localStorage.setItem('civ_data_artists', JSON.stringify(dbData.artists || []));
    localStorage.setItem('civ_data_footballers', JSON.stringify(dbData.footballers || []));
    localStorage.setItem('civ_data_publicfigures', JSON.stringify(dbData.publicFigures || []));
    localStorage.setItem('civ_data_foods', JSON.stringify(dbData.foods || []));
    localStorage.setItem('civ_data_products', JSON.stringify(dbData.products || []));
  };

  // Switch views
  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'versus':
        return (
          <Versus
            artists={artists}
            footballers={footballers}
            publicFigures={publicFigures}
          />
        );
      case 'tierlist':
        return (
          <TierList
            artists={artists}
            footballers={footballers}
            publicFigures={publicFigures}
            foods={foods}
          />
        );
      case 'justeprix':
        return <JustePrix products={products} />;
      case 'admin':
        return (
          <Admin
            artists={artists}
            setArtists={setArtists}
            footballers={footballers}
            setFootballers={setFootballers}
            publicFigures={publicFigures}
            setPublicFigures={setPublicFigures}
            foods={foods}
            setFoods={setFoods}
            products={products}
            setProducts={setProducts}
            resetToDefault={resetToDefault}
          />
        );
      case 'credits':
        return (
          <Credits
            artists={artists}
            footballers={footballers}
            publicFigures={publicFigures}
            foods={foods}
            products={products}
          />
        );
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="app-container">
      {/* Top sticky Navbar */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Main gaming stage container */}
      <main className="main-content">
        {renderActivePage()}
      </main>

      {/* Modern footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-light)',
        fontSize: '0.85rem',
        color: 'var(--text-dim)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        <div>
          Fait avec 🧡 🤍 💚 pour la Côte d'Ivoire & la culture Babi
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          &copy; {new Date().getFullYear()} Babi Games Platform. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
