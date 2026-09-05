import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { getHandoversByLot, getLotsByRecycler } from '../api/client';
import { resolveRecyclerId } from '../services/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './Scan.css';

const READER_ID = 'qr-reader';

/**
 * Physical→digital verification bridge: the recycler scans the QR printed on
 * the collector's lot, the code is only the LOT-ID, and the backend supplies
 * the full record (material / weight / photo / collector / location / status).
 */
export default function RecyclerScan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { ok, text }

  const recyclerId = resolveRecyclerId();

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Camera may already be stopped — ignore
    }
  }, []);

  const handleCode = useCallback(async (code) => {
    const lotId = String(code || '').trim();
    if (!lotId) return;
    setChecking(true);
    setResult({ ok: false, text: t('recyclerScan.lookingUp') });
    try {
      const [handRes, lotsRes] = await Promise.all([
        getHandoversByLot(lotId),
        getLotsByRecycler(recyclerId),
      ]);
      const hasHandover = Array.isArray(handRes.data) && handRes.data.length > 0;
      const assigned = Array.isArray(lotsRes.data)
        ? lotsRes.data.some((l) => l.lot_id === lotId)
        : false;

      if (!hasHandover && !assigned) {
        setResult({ ok: false, text: t('recyclerScan.notFound', { code: lotId }) });
        setScanning(false);
        stopScanner();
        return;
      }
      setResult({ ok: true, text: t('recyclerScan.lotFound', { code: lotId }) });
      stopScanner();
      setTimeout(() => navigate(`/recycler/lots/${encodeURIComponent(lotId)}`), 900);
    } catch {
      setResult({ ok: false, text: t('recyclerScan.lookupFail') });
      setScanning(false);
      stopScanner();
    } finally {
      setChecking(false);
    }
  }, [navigate, recyclerId, t, stopScanner]);

  const startScanner = useCallback(async () => {
    setCameraError('');
    setResult(null);
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          stopScanner();
          handleCode(decodedText);
        },
        () => {},
      );
    } catch {
      setScanning(false);
      setCameraError(t('recyclerScan.cameraUnavailable'));
    }
  }, [handleCode, stopScanner, t]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler" className="back-link">{t('common.back')}</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>
          {t('recyclerScan.title')}
        </h1>
        <p className="section-subtitle">{t('recyclerScan.subtitle')}</p>
      </div>

      <div className="scan-layout">
        {/* Camera scanner */}
        <section className="card scan-panel animate-fade-in" aria-labelledby="scan-camera-heading">
          <h2 id="scan-camera-heading" className="detail-section-title">{t('recyclerScan.cameraMode')}</h2>
          <p className="scan-panel__hint">{t('recyclerScan.cameraHint')}</p>

          <div id={READER_ID} className="scan-viewport" aria-hidden="true" />

          {!scanning ? (
            <button
              className="btn btn-accent btn-full"
              onClick={startScanner}
              disabled={checking}
            >
               {t('recyclerScan.startCamera')}
            </button>
          ) : (
            <button
              className="btn btn-outline btn-full"
              onClick={() => { setScanning(false); stopScanner(); }}
            >
              {t('recyclerScan.stopCamera')}
            </button>
          )}

          {cameraError && (
            <p className="alert-banner alert-banner--warn" role="alert" style={{ marginTop: 'var(--space-3)' }}>
              {cameraError}
            </p>
          )}
        </section>

        {/* Manual entry fallback */}
        <section className="card scan-panel animate-fade-in" aria-labelledby="scan-manual-heading">
          <h2 id="scan-manual-heading" className="detail-section-title">{t('recyclerScan.manualMode')}</h2>
          <p className="scan-panel__hint">{t('recyclerScan.manualHint')}</p>

          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="scan-code">{t('recyclerScan.codeLabel')}</label>
            <div className="scan-code-row">
              <input
                id="scan-code"
                type="text"
                className="form-input"
                placeholder={t('recyclerScan.codePlaceholder')}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCode(manualCode); }}
              />
              <button
                className="btn btn-accent"
                onClick={() => handleCode(manualCode)}
                disabled={checking || !manualCode.trim()}
              >
                {checking ? <LoadingSpinner size="sm" /> : t('recyclerScan.findLot')}
              </button>
            </div>
          </div>
        </section>
      </div>

      {result && (
        <div
          className={`alert-banner scan-result animate-fade-in ${result.ok ? 'alert-banner--success' : 'alert-banner--warn'}`}
          role={result.ok ? 'status' : 'alert'}
        >
           {result.text}
        </div>
      )}
    </div>
  );
}