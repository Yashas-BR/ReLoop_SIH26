import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';

// Collector pages
import CollectorDashboard from './collector/Dashboard';
import CreateLot from './collector/CreateLot';
import MatchedRecyclers from './collector/MatchedRecyclers';
import PriceDiscovery from './collector/PriceDiscovery';
import CollectorLotDetail from './collector/LotDetail';
import CollectorTraceability from './collector/Traceability';

// Recycler pages
import RecyclerDashboard from './recycler/Dashboard';
import IncomingLots from './recycler/IncomingLots';
import LotDetail from './recycler/LotDetail';
import RecyclerProfile from './recycler/Profile';

function AppInner() {
  const [portal, setPortal] = useState('collector');
  const navigate = useNavigate();

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
          {/* Phase 3: collector lot detail and traceability */}
          <Route path="/collector/lots/:lotId" element={<CollectorLotDetail />} />
          <Route path="/collector/lots/:lotId/trace" element={<CollectorTraceability />} />

          {/* Recycler routes */}
          <Route path="/recycler" element={<RecyclerDashboard />} />
          <Route path="/recycler/lots" element={<IncomingLots />} />
          <Route path="/recycler/lots/:lotId" element={<LotDetail />} />
          <Route path="/recycler/profile" element={<RecyclerProfile />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/collector" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
