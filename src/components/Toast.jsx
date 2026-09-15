import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { onStorageError } from '../lib/storage.js';

/**
 * Remplace les alert() natifs (DIAGNOSTIC.md D.3) : boites systeme grises,
 * bloquantes, hors charte. Ecoute aussi les erreurs de stockage emises par
 * src/lib/storage.js pour les afficher au lieu de les perdre.
 */

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = { succes: CheckCircle, erreur: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, ton = 'info', duree = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, ton }]);
      if (duree > 0) setTimeout(() => dismiss(id), duree);
      return id;
    },
    [dismiss]
  );

  // Les echecs d'ecriture du localStorage remontent ici automatiquement.
  useEffect(() => onStorageError(({ message }) => push(message, 'erreur', 12000)), [push]);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(({ id, message, ton }) => {
          const Icon = ICONS[ton] || Info;
          return (
            <div key={id} className={`toast toast-${ton}`}>
              <Icon size={18} aria-hidden="true" />
              <span>{message}</span>
              <button type="button" onClick={() => dismiss(id)} aria-label="Fermer la notification">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
