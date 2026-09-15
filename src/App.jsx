import React, { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Versus from './components/Versus';
import TierList from './components/TierList';
import JustePrix from './components/JustePrix';
import Admin from './components/Admin';
import Credits from './components/Credits';
import { safeSet, safeRemove, readList } from './lib/storage.js';

import dbData from './data/db.json';

/** Incrementer a CHAQUE modification de db.json, sinon les visiteurs
 *  existants restent sur leur cache perime (DIAGNOSTIC.md F.4, point 4). */
const DATA_VERSION = 'v5';

const STORAGE_KEYS = {
  artists: 'civ_data_artists',
  footballers: 'civ_data_footballers',
  publicFigures: 'civ_data_publicfigures',
  foods: 'civ_data_foods',
  products: 'civ_data_products',
};

const STAT_KEYS = [
  'stats_versus_played',
  'stats_tierlists_saved',
  'stats_justeprix_best',
  'stats_justeprix_played',
  'saved_tierlists',
];

/** Controle de forme : un cache d'un ancien schema ne doit pas passer. */
const looksLikeItem = (i) =>
  i && typeof i === 'object' && typeof i.id === 'string' && typeof i.name === 'string';

export default function App({ activePage = 'dashboard', onNavigate = () => {} }) {
  const [collections, setCollections] = useState(() => ({
    artists: [],
    footballers: [],
    publicFigures: [],
    foods: [],
    products: [],
  }));
  const [hydrated, setHydrated] = useState(false);

  /* Chargement initial ------------------------------------------------- */
  useEffect(() => {
    const cachedVersion = readVersion();
    const forceReset = cachedVersion !== DATA_VERSION;
    const next = {};

    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      const cached = forceReset ? null : readList(storageKey, looksLikeItem);
      next[key] = cached ?? (dbData[key] || []);
    }

    setCollections(next);
    if (forceReset) {
      for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        safeSet(storageKey, JSON.stringify(next[key]));
      }
      safeSet('civ_data_version', DATA_VERSION);
    }
    setHydrated(true);
  }, []);

  /* Synchronisation ----------------------------------------------------
     Le garde `if (list.length > 0)` a ete retire : il empechait de
     persister une collection videe, si bien qu'une suppression totale
     depuis l'ecran Admin semblait fonctionner puis se reannulait au
     rechargement (DIAGNOSTIC.md F.4, point 1).
     Toutes les ecritures passent par safeSet : plus d'ecran blanc en cas
     de quota depasse, un message explicite s'affiche a la place.        */
  useEffect(() => {
    if (!hydrated) return;
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      safeSet(storageKey, JSON.stringify(collections[key]));
    }
  }, [collections, hydrated]);

  const setCollection = useCallback((name, updater) => {
    setCollections((prev) => ({
      ...prev,
      [name]: typeof updater === 'function' ? updater(prev[name]) : updater,
    }));
  }, []);

  /** Restauration complete : purge aussi les statistiques, que l'ancienne
   *  version laissait en place malgre le libelle "restauration complete". */
  const resetToDefault = useCallback(() => {
    const fresh = {};
    for (const key of Object.keys(STORAGE_KEYS)) fresh[key] = dbData[key] || [];
    setCollections(fresh);
    for (const statKey of STAT_KEYS) safeRemove(statKey);
    safeSet('civ_data_version', DATA_VERSION);
  }, []);

  const pages = {
    dashboard: () => <Dashboard onNavigate={onNavigate} collections={collections} />,
    versus: () => (
      <Versus
        artists={collections.artists}
        footballers={collections.footballers}
        publicFigures={collections.publicFigures}
      />
    ),
    tierlist: () => (
      <TierList
        artists={collections.artists}
        footballers={collections.footballers}
        publicFigures={collections.publicFigures}
        foods={collections.foods}
      />
    ),
    justeprix: () => <JustePrix products={collections.products} />,
    admin: () => (
      <Admin
        collections={collections}
        setCollection={setCollection}
        resetToDefault={resetToDefault}
      />
    ),
    credits: () => <Credits collections={collections} />,
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} onNavigate={onNavigate} />
      <main className="main-content" id="contenu">
        {(pages[activePage] || pages.dashboard)()}
      </main>
      <SiteFooter />
    </div>
  );
}

function readVersion() {
  try {
    return localStorage.getItem('civ_data_version');
  } catch {
    return null;
  }
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-line">Fait avec cœur pour la Côte d'Ivoire et la culture Babi</p>
      <p className="site-footer-legal">
        &copy; {new Date().getFullYear()} Babi Games. Visuels sous licence Creative Commons,
        attributions détaillées sur la page Crédits.
      </p>
    </footer>
  );
}
