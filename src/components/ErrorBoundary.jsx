import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Filet de securite contre l'ecran blanc.
 *
 * DIAGNOSTIC.md F.3 : une QuotaExceededError levee dans un useEffect
 * demontait tout l'arbre React et l'utilisateur se retrouvait devant une
 * page vide, sans message, avec sa saisie perdue. Le stockage est
 * desormais protege en amont (src/lib/storage.js), mais toute autre
 * exception de rendu doit rester rattrapee et expliquee.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur non rattrapee :', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <AlertTriangle size={40} aria-hidden="true" />
          <h1>Le jeu a rencontre un probleme</h1>
          <p>
            Une erreur inattendue s'est produite. Tes donnees enregistrees sur cet
            appareil ne sont pas perdues.
          </p>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <div className="error-boundary-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              <RotateCcw size={16} aria-hidden="true" /> Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
