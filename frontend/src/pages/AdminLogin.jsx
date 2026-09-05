/** Admin Login screen — /admin/login
 * Simple login for admin users with demo credentials
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../i18n/config.js';
import { saveSession } from '../services/auth';
import './Login.css';

const DEMO_ADMIN = {
  id: 1,
  name: 'Kabadiwala Admin',
  email: 'admin@kabadiwala.in',
  admin_code: 'KBC-ADMIN-2026',
};

export default function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdminLogin() {
    const code = String(adminCode ?? '').trim().toUpperCase();
    if (!code) {
      setError(t('login.adminCodeRequired') || 'Please enter admin code');
      return;
    }
    setError('');
    setBusy(true);

    // Simulate admin authentication
    setTimeout(() => {
      if (code === DEMO_ADMIN.admin_code) {
        saveSession({
          role: 'admin',
          userId: DEMO_ADMIN.id,
          name: DEMO_ADMIN.name,
          email: DEMO_ADMIN.email,
        });
        navigate('/admin', { replace: true });
      } else {
        setError(t('login.invalidAdminCode') || 'Invalid admin code. Try: KBC-ADMIN-2026');
      }
      setBusy(false);
    }, 500);
  }

  return (
    <div className="container login-page">
      <div className="login-card card animate-scale-in">
        <div className="login-card__head login-card__head--admin">
          <div className="login-card__logo login-card__logo--admin" aria-hidden="true">⚙️</div>
          <h1 className="section-title">{t('login.adminTitle') || 'Admin Login'}</h1>
          <p className="section-subtitle">{t('login.adminSubtitle') || 'Manage platform operations'}</p>
        </div>

        {error && (
          <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
            {error}
          </div>
        )}

        <section className="login-panel" aria-labelledby="admin-heading">
          <h2 id="admin-heading" className="login-panel__title">
            {t('login.admin') || 'Administrator'}
          </h2>

          <label className="form-label" htmlFor="admin-code">
            {t('login.adminCodeLabel') || 'Admin Code'}
          </label>
          <input
            id="admin-code"
            className="form-input"
            type="text"
            placeholder={t('login.adminCodePlaceholder') || 'Enter admin code'}
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
          />

          <button
            className="btn btn-primary btn-full"
            onClick={handleAdminLogin}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? t('common.loading') + '…' : t('login.signIn')}
          </button>

          <div className="login-demo" role="group">
            <p className="login-demo__label">{t('login.demoAdmin') || 'Demo Code:'}</p>
            <button
              className="demo-chip"
              onClick={() => setAdminCode(DEMO_ADMIN.admin_code)}
            >
              <span className="demo-chip__name">{DEMO_ADMIN.admin_code}</span>
            </button>
          </div>
        </section>

        <p className="login-foot">
          <Link to="/">{t('login.backToLogin') || 'Back to Home'}</Link>
        </p>
      </div>
    </div>
  );
}