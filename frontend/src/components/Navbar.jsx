import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const COLLECTOR_NAV = [
  { to: '/collector',               label: 'Dashboard', icon: '⊞' },
  { to: '/collector/create-lot',    label: 'Create Lot', icon: '+' },
  { to: '/collector/prices',        label: 'Prices',    icon: '₹' },
];

const RECYCLER_NAV = [
  { to: '/recycler',               label: 'Dashboard', icon: '⊞' },
  { to: '/recycler/lots',          label: 'Lots',      icon: '📦' },
  { to: '/recycler/profile',       label: 'Profile',   icon: '👤' },
];

export function Navbar({ portal, onPortalSwitch }) {
  const location = useLocation();
  const navItems = portal === 'collector' ? COLLECTOR_NAV : RECYCLER_NAV;

  return (
    <header className="navbar" role="banner">
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to={`/${portal}`} className="navbar__logo" aria-label="Kabadiwala Connect Home">
          <span className="navbar__logo-icon" aria-hidden="true">♻</span>
          <div className="navbar__logo-text">
            <span className="navbar__logo-name">Kabadiwala</span>
            <span className="navbar__logo-sub">Connect</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar__nav hide-mobile" aria-label="Main navigation">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`navbar__nav-item ${location.pathname === item.to ? 'navbar__nav-item--active' : ''}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Portal Switcher */}
        <div className="navbar__switcher" role="group" aria-label="Switch portal">
          <button
            className={`navbar__switch-btn ${portal === 'collector' ? 'navbar__switch-btn--active' : ''}`}
            onClick={() => onPortalSwitch('collector')}
            aria-pressed={portal === 'collector'}
          >
            <span aria-hidden="true">🧑</span>
            Collector
          </button>
          <button
            className={`navbar__switch-btn ${portal === 'recycler' ? 'navbar__switch-btn--active' : ''}`}
            onClick={() => onPortalSwitch('recycler')}
            aria-pressed={portal === 'recycler'}
          >
            <span aria-hidden="true">🏭</span>
            Recycler
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="navbar__mobile-nav show-mobile-only" aria-label="Mobile navigation">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`navbar__mobile-item ${location.pathname === item.to ? 'navbar__mobile-item--active' : ''}`}
          >
            <span className="navbar__mobile-icon" aria-hidden="true">{item.icon}</span>
            <span className="navbar__mobile-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
