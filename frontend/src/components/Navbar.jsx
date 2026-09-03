import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/config.js';
import './Navbar.css';

const LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

export function Navbar({ portal, onPortalSwitch }) {
  const location = useLocation();
  const { t, lang, setLang } = useTranslation();

  const COLLECTOR_NAV = [
    { to: '/collector', label: t('nav.dashboard'), icon: '' },
    { to: '/collector/create-lot', label: t('nav.createLot'), icon: '+' },
    { to: '/collector/prices', label: t('nav.prices'), icon: '₹' },
    { to: '/collector/earnings', label: t('nav.earnings'), icon: '💰' },
    { to: '/safety', label: t('nav.safety'), icon: '🦺' },
  ];

  const RECYCLER_NAV = [
    { to: '/recycler', label: t('nav.dashboard'), icon: '⊞' },
    { to: '/recycler/lots', label: t('nav.lots'), icon: '📦' },
    { to: '/recycler/profile', label: t('nav.profile'), icon: '👤' },
    { to: '/safety', label: t('nav.safety'), icon: '🦺' },
  ];

  const navItems = portal === 'collector' ? COLLECTOR_NAV : RECYCLER_NAV;

  return (
    <header className="navbar" role="banner">
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to={`/${portal}`} className="navbar__logo" aria-label={t('nav.homeLabel')}>
          <span className="navbar__logo-icon" aria-hidden="true">♻</span>
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
              className={`navbar__nav-item ${location.pathname === item.to ? 'navbar__nav-item--active' : ''}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side: language switcher + portal switcher */}
        <div className="navbar__right">
          {/* Language Switcher */}
          <div className="lang-switcher" role="group" aria-label="Language / भाषा">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                className={`lang-btn ${lang === opt.code ? 'lang-btn--active' : ''}`}
                onClick={() => setLang(opt.code)}
                aria-pressed={lang === opt.code}
                aria-label={`Switch to ${opt.label}`}
                lang={opt.code}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Portal Switcher */}
          <div className="navbar__switcher" role="group" aria-label={t('nav.switchPortal')}>
            <button
              className={`navbar__switch-btn ${portal === 'collector' ? 'navbar__switch-btn--active' : ''}`}
              onClick={() => onPortalSwitch('collector')}
              aria-pressed={portal === 'collector'}
            >
              <span aria-hidden="true">🧑</span>
              {t('nav.collector')}
            </button>
            <button
              className={`navbar__switch-btn ${portal === 'recycler' ? 'navbar__switch-btn--active' : ''}`}
              onClick={() => onPortalSwitch('recycler')}
              aria-pressed={portal === 'recycler'}
            >
              <span aria-hidden="true">🏭</span>
              {t('nav.recycler')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="navbar__mobile-nav show-mobile-only" aria-label={t('nav.mobileNav')}>
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
        {/* Mobile language switcher — compact row above bottom nav */}
      </nav>

      {/* Mobile lang row — shown below logo area on small screens */}
      <div className="mobile-lang-row show-mobile-only" role="group" aria-label="Language / भाषा">
        {LANG_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            className={`mobile-lang-btn ${lang === opt.code ? 'mobile-lang-btn--active' : ''}`}
            onClick={() => setLang(opt.code)}
            aria-pressed={lang === opt.code}
            lang={opt.code}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </header>
  );
}
