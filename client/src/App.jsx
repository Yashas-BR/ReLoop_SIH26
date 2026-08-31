import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import CreateLotForm from './components/CreateLotForm';
import LotConfirmation from './components/LotConfirmation';
import MyLotsList from './components/MyLotsList';
import PriceDiscoveryBoard from './components/PriceDiscoveryBoard';
import RecyclerPortal from './components/RecyclerPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState('create-lot'); // 'create-lot' | 'confirmation' | 'my-lots' | 'rates'
  const [confirmedLotId, setConfirmedLotId] = useState(null);
  const [collectors, setCollectors] = useState([]);
  const [activeCollector, setActiveCollector] = useState(null);

  // Fetch demo collectors on mount
  useEffect(() => {
    async function loadCollectors() {
      try {
        const res = await axios.get('/api/health');
        // We can create a default demo collector persona
        setActiveCollector({
          id: 1,
          name: 'Raju Kabadiwal',
          phone: '9876543210',
          operating_location: 'Bengaluru',
          latitude: 12.9716,
          longitude: 77.5946,
        });
      } catch (err) {
        console.error('Error in init:', err);
      }
    }
    loadCollectors();
  }, []);

  const handleLotCreated = (lotId) => {
    setConfirmedLotId(lotId);
    setActiveTab('confirmation');
  };

  const handleSelectLotFromList = (lotId) => {
    setConfirmedLotId(lotId);
    setActiveTab('confirmation');
  };

  const handleLogAnother = () => {
    setConfirmedLotId(null);
    setActiveTab('create-lot');
  };

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col font-['Inter'] selection:bg-brand-500 selection:text-surface-950">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap"
        rel="stylesheet"
      />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCollector={activeCollector}
        setActiveCollector={setActiveCollector}
        collectors={collectors}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'create-lot' && (
          <CreateLotForm
            onLotCreated={handleLotCreated}
            activeCollector={activeCollector}
          />
        )}

        {activeTab === 'confirmation' && (
          <LotConfirmation
            lotId={confirmedLotId}
            onLogAnother={handleLogAnother}
            onViewAllLots={() => setActiveTab('my-lots')}
          />
        )}

        {activeTab === 'my-lots' && (
          <MyLotsList
            onSelectLot={handleSelectLotFromList}
            onLogNew={() => setActiveTab('create-lot')}
          />
        )}

        {activeTab === 'rates' && (
          <PriceDiscoveryBoard
            onSelectMaterialForLot={(mat) => {
              setActiveTab('create-lot');
            }}
          />
        )}

        {activeTab === 'recycler-portal' && (
          <RecyclerPortal />
        )}
      </main>

      {/* Footer / Smart India Hackathon Status */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <p>© 2026 Kabadiwala Connect — Smart India Hackathon Submission</p>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-brand-400">● SQLite Persistent</span>
            <span>● CPCB/KSPCB E-Waste Rules 2022 Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
