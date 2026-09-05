import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/config.js';
import { getSession, clearSession } from '../services/auth';
import './Navbar.css';

const LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

// One portal for everyone — a single nav that serves both the Kabadiwala
// (collector) side and the recycler side ("all in one portal just for now").
const NAV = (t) => [
  { to: '/collector', label: t('nav.dashboard'), icon: '' },
  { to: '/collector/create-lot', label: t('nav.createLot'), icon: '+' },
  { to: '/collector/prices', label: t('nav.prices'), icon: '₹' },
  { to: '/collector/earnings', label: t('nav.earnings'), icon: '' },
  { to: '/recycler', label: t('nav.recyclerPortal'), icon: '⊞' },
  { to: '/safety', label: t('nav.safety'), icon: '' },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();

  const navItems = NAV(t);
  const user = getSession();

  function handleLogout() {
    clearSession();
    navigate('/collector', { replace: true });
  }

  return (
    <header className="navbar" role="banner">
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to="/collector" className="navbar__logo" aria-label={t('nav.homeLabel')}>
          
          <div className="navbar__logo-text">
            <span className="navbar__logo-name">Kabadiwala</span>
            <span className="navbar__logo-sub">Connect</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar__nav hide-mobile" aria-label={t('nav.mainNav')}>
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`navbar__nav-item ${location.pathname.startsWith(item.to) ? 'navbar__nav-item--active' : ''}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side: language switcher + account */}
        <div className="navbar__right">
          {/* Language Switcher */}
          <div className="lang-switcher" role="group" aria-label="Language / भाषा">
            <select
              className="lang-dropdown"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Select Language"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Account chip */}
          {user ? (
            <div className="navbar__account">
              <Link to={user.role === 'recycler' ? '/recycler' : '/collector'} className="navbar__user" title={`${t('login.loggedInAs')} ${user.name}`}>
                <span className="navbar__avatar" aria-hidden="true">
                  {(user.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="navbar__username hide-mobile">{user.name}</span>
              </Link>
              <button className="navbar__logout" onClick={handleLogout} aria-label={t('login.logout')}>
                {t('login.logout')}
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              {t('login.signIn')}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="navbar__mobile-nav show-mobile-only" aria-label={t('nav.mobileNav')}>
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`navbar__mobile-item ${location.pathname.startsWith(item.to) ? 'navbar__mobile-item--active' : ''}`}
          >
            <span className="navbar__mobile-icon" aria-hidden="true">{item.icon}</span>
            <span className="navbar__mobile-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile lang row — shown below logo area on small screens */}
      <div className="mobile-lang-row show-mobile-only" role="group" aria-label="Language / भाषा">
        <select
          className="mobile-lang-dropdown"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Select Language"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}