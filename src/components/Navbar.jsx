import React, { useEffect, useState } from 'react';
import { Menu, X, Gamepad2, Settings, Landmark, ListPlus, CircleDollarSign, Shield } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Accueil', icon: Landmark, path: '/' },
  { id: 'versus', label: 'Versus', icon: Gamepad2, path: '/versus' },
  { id: 'tierlist', label: 'Tier List', icon: ListPlus, path: '/tier-list' },
  { id: 'justeprix', label: 'Juste Prix', icon: CircleDollarSign, path: '/juste-prix' },
  { id: 'admin', label: 'Admin', icon: Settings, path: '/admin' },
  { id: 'credits', label: 'Crédits', icon: Shield, path: '/credits' },
];

export default function Navbar({ activePage, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);

  // Le menu mobile se referme quand on change d'ecran.
  useEffect(() => {
    setIsOpen(false);
  }, [activePage]);

  const go = (id) => {
    onNavigate(id);
    setIsOpen(false);
  };

  return (
    <header className="navbar">
      <nav className="navbar-inner" aria-label="Navigation principale">
        <button type="button" className="brand" onClick={() => go('dashboard')}>
          <span className="brand-mark" aria-hidden="true">CIV</span>
          <span className="brand-name">Babi Games</span>
        </button>

        <ul className="nav-desktop">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                className={`nav-link${activePage === id ? ' is-active' : ''}`}
                onClick={() => go(id)}
                aria-current={activePage === id ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Un seul className : le doublon precedent ecrasait "btn btn-ghost"
            et ce bouton s'affichait en gris systeme sur tout mobile. */}
        <button
          type="button"
          className="nav-burger"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isOpen}
          aria-controls="menu-mobile"
        >
          {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </nav>

      <div id="menu-mobile" className={`nav-mobile${isOpen ? ' is-open' : ''}`} hidden={!isOpen}>
        <ul>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                className={`nav-link${activePage === id ? ' is-active' : ''}`}
                onClick={() => go(id)}
                aria-current={activePage === id ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
