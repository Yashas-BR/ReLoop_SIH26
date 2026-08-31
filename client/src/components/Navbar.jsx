import React from 'react';

export default function Navbar({ activeTab, setActiveTab, activeCollector, setActiveCollector, collectors = [] }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-surface-950/80 border-b border-slate-800">
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
                  Kabadiwala<span className="text-brand-400">Connect</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">
                  SIH 2026 Prototype
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Informal E-Waste & Scrap Traceability Network
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('create-lot')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'create-lot'
                  ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📦</span>
              <span>Create Lot</span>
            </button>

            <button
              onClick={() => setActiveTab('my-lots')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'my-lots'
                  ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📋</span>
              <span>Logged Lots</span>
            </button>

            <button
              onClick={() => setActiveTab('rates')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'rates'
                  ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📊</span>
              <span className="hidden sm:inline">Market</span> Rates
            </button>

            <button
              onClick={() => setActiveTab('recycler-portal')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'recycler-portal'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>♻️</span>
              <span className="hidden sm:inline">Recycler</span> Portal
            </button>
          </nav>

          {/* Demo Collector Persona Switcher */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3 sm:pl-4">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-slate-200">{activeCollector?.name || 'Raju Kabadiwal'}</p>
              <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                {activeCollector?.operating_location || 'Bengaluru'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-brand-400 shadow-inner">
              👤
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
