import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { initSyncManager } from './services/offline/syncManager';

// Collector pages
import CollectorDashboard from './collector/Dashboard';
import CreateLot from './collector/CreateLot';
import MatchedRecyclers from './collector/MatchedRecyclers';
import PriceDiscovery from './collector/PriceDiscovery';
import CollectorLotDetail from './collector/LotDetail';
import CollectorTraceability from './collector/Traceability';
import EarningsLedger from './collector/Earnings';

// Recycler pages
import RecyclerDashboard from './recycler/Dashboard';
import IncomingLots from './recycler/IncomingLots';
import LotDetail from './recycler/LotDetail';
import RecyclerProfile from './recycler/Profile';

// Shared pages
import SafetyGuidance from './pages/Safety';

function AppInner() {
  const [portal, setPortal] = useState('collector');
  const navigate = useNavigate();

  // Initialize sync manager once at app startup.
  // It attaches online/offline listeners and processes leftover queue items.
  useEffect(() => {
    initSyncManager();
  }, []);

  function handlePortalSwitch(next) {
    setPortal(next);
    navigate(`/${next}`);
  }

  return (
    <div className="page-shell">
      <Navbar portal={portal} onPortalSwitch={handlePortalSwitch} />
      <main className="page-content" id="main-content">
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/collector" replace />} />

          {/* Collector routes */}
          <Route path="/collector" element={<CollectorDashboard />} />
          <Route path="/collector/create-lot" element={<CreateLot />} />
          <Route path="/collector/matched-recyclers" element={<MatchedRecyclers />} />
          <Route path="/collector/prices" element={<PriceDiscovery />} />
          <Route path="/collector/earnings" element={<EarningsLedger />} />
          {/* Phase 3: collector lot detail and traceability */}
          <Route path="/collector/lots/:lotId" element={<CollectorLotDetail />} />
          <Route path="/collector/lots/:lotId/trace" element={<CollectorTraceability />} />

          {/* Recycler routes */}
          <Route path="/recycler" element={<RecyclerDashboard />} />
          <Route path="/recycler/lots" element={<IncomingLots />} />
          <Route path="/recycler/lots/:lotId" element={<LotDetail />} />
          <Route path="/recycler/profile" element={<RecyclerProfile />} />

          {/* Shared routes — accessible from both portals */}
          <Route path="/safety" element={<SafetyGuidance />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/collector" replace />} />
        </Routes>
      </main>

      {/* Global offline/sync status chip — mounted outside Routes so it persists across navigation */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </I18nProvider>
  );
}
