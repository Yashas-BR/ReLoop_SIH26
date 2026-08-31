import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLLECTOR_PROFILES, getLocalizedMaterial } from '../i18n';
import SyncIndicator from './SyncIndicator';

export default function Navbar({ activeTab, setActiveTab, activeCollector, setActiveCollector, collectors = [] }) {
  const { t, i18n } = useTranslation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('reloop_lang', lang);
  };

  const currentLang = i18n.language || 'en';

  const getCollectorName = (col) => {
    if (!col) return '';
    if (currentLang === 'hi') return col.name_hi || col.name;
    if (currentLang === 'mr') return col.name_mr || col.name;
    return col.name_en || col.name;
  };

  const currentCollector = COLLECTOR_PROFILES.find(c => c.id === activeCollector?.id) || COLLECTOR_PROFILES[0];
  const collectorName = getCollectorName(currentCollector);
  const localizedCity = getLocalizedMaterial(activeCollector?.operating_location || 'Bengaluru', currentLang);

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-surface-950/90 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('create-lot')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-xl font-bold">
                ♻️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white font-['Outfit']">
                    {t('app.title')}<span className="text-brand-400">{t('app.subtitle')}</span>
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">
                    {t('app.badge')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden md:block">
                  {t('app.tagline')}
                </p>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('create-lot')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'create-lot'
                    ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📦</span>
                <span>{t('nav.createLot')}</span>
              </button>

              <button
                onClick={() => setActiveTab('my-lots')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'my-lots'
                    ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📋</span>
                <span>{t('nav.myLots')}</span>
              </button>

              <button
                onClick={() => setActiveTab('rates')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'rates'
                    ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📊</span>
                <span>{t('nav.marketRates')}</span>
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>💰</span>
                <span>{t('nav.ledger')}</span>
              </button>

              <button
                onClick={() => setActiveTab('recycler-portal')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'recycler-portal'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>♻️</span>
                <span>{t('nav.recyclerPortal')}</span>
              </button>
            </nav>

            {/* Right Section: Sync Indicator + Language Switcher + Collector Persona Button */}
            <div className="flex items-center gap-2.5">
              {/* Real-time Connectivity & Sync Status Indicator */}
              <SyncIndicator />

              {/* Language Switcher */}
              <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-inner">
                <span className="text-xs px-1.5 text-slate-400 font-bold hidden xl:inline">🌐</span>
                {[
                  { code: 'en', label: 'EN', full: 'English' },
                  { code: 'hi', label: 'हिन्दी', full: 'Hindi' },
                  { code: 'mr', label: 'मराठी', full: 'Marathi' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    title={`Switch to ${lang.full}`}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      currentLang.startsWith(lang.code)
                        ? 'bg-brand-500 text-surface-950 shadow-sm font-black'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Collector Profile Button (Clickable to open profile modal) */}
              <div
                onClick={() => setShowProfileModal(true)}
                title="View & Switch Collector Profile"
                className="flex items-center gap-2 border-l border-slate-800 pl-3 cursor-pointer group hover:opacity-90 transition-opacity"
              >
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold text-slate-200 group-hover:text-brand-300 transition-colors">
                    {collectorName}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                    {localizedCity}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-brand-500/20 border border-slate-700 group-hover:border-brand-500/50 flex items-center justify-center text-sm font-bold text-brand-400 shadow-inner transition-all">
                  👤
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Collector Profile & Persona Switcher Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Top Close Button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Profile Avatar & Title */}
            <div className="flex items-center gap-4 border-b border-slate-800/80 pb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-3xl shadow-lg shadow-brand-500/20">
                👤
              </div>
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${
                  currentCollector.verified
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  <span>{currentCollector.verified ? '✓' : '⏳'}</span>
                  <span>{currentCollector.verified ? t('profile.badgeVerified') : t('profile.badgeUnverified')}</span>
                </span>
                <h3 className="text-xl font-black text-white font-['Outfit']">{collectorName}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: COL-00{currentCollector.id}</p>
              </div>
            </div>

            {/* Profile Details List */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">{t('profile.phone')}</p>
                <p className="font-mono font-bold text-white mt-1">+91 {currentCollector.phone}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">{t('profile.hub')}</p>
                <p className="font-bold text-brand-300 mt-1">{localizedCity}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">{t('profile.experience')}</p>
                <p className="font-bold text-white mt-1">{currentCollector.experience_years} {t('profile.years')}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-slate-400 font-semibold">{t('profile.lotsLogged')}</p>
                <p className="font-bold text-emerald-400 mt-1">{currentCollector.total_lots_logged} Lots</p>
              </div>
            </div>

            {/* Switch Persona Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                🔄 {t('profile.switchPersona')}:
              </label>
              <div className="space-y-2">
                {COLLECTOR_PROFILES.map((p) => {
                  const pName = getCollectorName(p);
                  const isSelected = p.id === currentCollector.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveCollector(p);
                        setShowProfileModal(false);
                      }}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-500/15 border-brand-500 text-brand-300 ring-1 ring-brand-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">👤</span>
                        <div className="text-left">
                          <p className="font-bold text-white">{pName}</p>
                          <p className="text-[10px] text-slate-400">{p.operating_location} • {p.phone}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-brand-400">✓ Active</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer / Close */}
            <div className="pt-2">
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {t('profile.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
