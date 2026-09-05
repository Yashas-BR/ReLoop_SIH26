import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import RecyclerPortal from './recycler/Portal';
import LotDetail from './recycler/LotDetail';

// Shared pages
import SafetyGuidance from './pages/Safety';
import Login from './pages/Login';

function AppInner() {
  const location = useLocation();

  // Initialize sync manager once at app startup.
  // It attaches online/offline listeners and processes leftover queue items.
  useEffect(() => {
    initSyncManager();
  }, []);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-content" id="main-content">
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/collector" replace />} />

          {/* Auth */}
          <Route path="/login" element={<Login location={location} />} />

          {/* Collector routes */}
          <Route path="/collector" element={<CollectorDashboard />} />
          <Route path="/collector/create-lot" element={<CreateLot />} />
          <Route path="/collector/matched-recyclers" element={<MatchedRecyclers />} />
          <Route path="/collector/prices" element={<PriceDiscovery />} />
          <Route path="/collector/earnings" element={<EarningsLedger />} />
          {/* Phase 3: collector lot detail and traceability */}
          <Route path="/collector/lots/:lotId" element={<CollectorLotDetail />} />
          <Route path="/collector/lots/:lotId/trace" element={<CollectorTraceability />} />

          {/* Recycler — one portal (overview + lots + profile together) */}
          <Route path="/recycler" element={<RecyclerPortal />} />
          <Route path="/recycler/lots" element={<Navigate to="/recycler" replace />} />
          <Route path="/recycler/profile" element={<Navigate to="/recycler" replace />} />
          <Route path="/recycler/lots/:lotId" element={<LotDetail />} />

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
