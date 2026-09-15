import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { NAV_ITEMS } from './components/Navbar.jsx';

/**
 * Une route par ecran (LOT 8).
 *
 * DIAGNOSTIC.md F.5 : sans routeur, toute l'application vivait sur une
 * seule URL. On ne pouvait partager aucun lien, et le bouton retour
 * quittait le site au lieu de revenir a l'ecran precedent - en plein
 * tournoi, tout etait perdu d'un seul geste.
 */

const PAR_CHEMIN = Object.fromEntries(NAV_ITEMS.map((i) => [i.path, i.id]));
const PAR_ID = Object.fromEntries(NAV_ITEMS.map((i) => [i.id, i.path]));

const TITRES = {
  dashboard: 'Babi Games | Mini-jeux 100 % ivoiriens',
  versus: 'Versus | Babi Games',
  tierlist: 'Tier List 225 | Babi Games',
  justeprix: 'Le Juste Prix | Babi Games',
  admin: 'Administration | Babi Games',
  credits: 'Crédits et licences | Babi Games',
};

function Ecran() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = PAR_CHEMIN[location.pathname] || 'dashboard';

  useEffect(() => {
    document.title = TITRES[activePage] || TITRES.dashboard;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  return <App activePage={activePage} onNavigate={(id) => navigate(PAR_ID[id] || '/')} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {NAV_ITEMS.map(({ id, path }) => (
              <Route key={id} path={path} element={<Ecran />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
