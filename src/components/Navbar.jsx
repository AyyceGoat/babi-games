import React, { useState } from 'react';
import { Menu, X, Gamepad2, Settings, Landmark, ListPlus, CircleDollarSign, Shield } from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Accueil', icon: Landmark },
    { id: 'versus', label: 'Versus', icon: Gamepad2 },
    { id: 'tierlist', label: 'Tier List', icon: ListPlus },
    { id: 'justeprix', label: 'Le Juste Prix', icon: CircleDollarSign },
    { id: 'admin', label: 'Admin', icon: Settings },
    { id: 'credits', label: 'Crédits', icon: Shield },
  ];

  return (
    <nav className="glass-panel" style={{
      margin: '1rem',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-light)',
      padding: '0.75rem 1.5rem',
      position: 'sticky',
      top: '1rem',
      zIndex: 100,
      background: 'rgba(15, 17, 21, 0.85)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <div 
          onClick={() => setActivePage('dashboard')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '1.4rem'
          }}
        >
          <span style={{
            background: 'linear-gradient(90deg, var(--color-orange), var(--color-gold), var(--color-green))',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            color: '#000',
            fontWeight: 900,
            fontSize: '1rem',
            boxShadow: '0 0 10px rgba(255, 140, 0, 0.2)'
          }}>CIV</span>
          <span className="gradient-text-ci">Babi Games</span>
        </div>

        {/* Desktop Navigation */}
        <div style={{ display: 'none', gap: '0.5rem', alignItems: 'center' }} className="desktop-menu-wrapper">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsOpen(false);
                }}
                className={`btn btn-ghost`}
                style={{
                  color: isActive ? 'var(--color-orange)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(255, 140, 0, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(255, 140, 0, 0.2)' : '1px solid transparent',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Hamburger Button */}
        {/* Un seul attribut className : le doublon precedent ecrasait
            "btn btn-ghost" et le bouton s'affichait en gris systeme. */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-ghost mobile-menu-btn"
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-light)'
        }} className="mobile-menu-drawer">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsOpen(false);
                }}
                className={`btn btn-ghost`}
                style={{
                  justifyContent: 'flex-start',
                  width: '100%',
                  color: isActive ? 'var(--color-orange)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(255, 140, 0, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(255, 140, 0, 0.2)' : '1px solid transparent',
                  padding: '0.75rem 1rem',
                }}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick responsive overrides */}
      <style>{`
        @media (min-width: 769px) {
          .desktop-menu-wrapper {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
          .mobile-menu-drawer {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
