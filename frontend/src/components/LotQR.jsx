import { QRCodeSVG } from 'qrcode.react';
import './LotQR.css';

/**
 * Lot QR — the code carries ONLY the LOT-ID (QR = identifier).
 * The backend is the single source of truth; scanning the code resolves the
 * full lot record via GET /v1/handover/lot/:lotId.
 */
export default function LotQR({ value, size = 128 }) {
  if (!value) return null;
  return (
    <div className="lot-qr">
      <div className="lot-qr__code">
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      <p className="lot-qr__id font-mono">{value}</p>
    </div>
  );
}