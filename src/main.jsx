import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/Toast.jsx';

/* Le routeur arrive au LOT 8 ; en attendant, la navigation reste locale. */
function Racine() {
  const [page, setPage] = useState('dashboard');
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);
  return <App activePage={page} onNavigate={setPage} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <Racine />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
