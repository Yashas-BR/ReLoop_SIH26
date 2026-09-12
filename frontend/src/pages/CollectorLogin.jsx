import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { loginCollector } from '../api/client';
import { saveSession } from '../services/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './Login.css';

export default function CollectorLogin() {
  const { t, setLang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location?.state?.from || '/collector';

  async function handleLogin() {
    const phoneStr = String(phone).trim();
    if (!phoneStr) { setError(t('login.phoneRequired') || 'Phone is required'); return; }
    setError(''); setBusy(true);
    try {
      const res = await loginCollector(phoneStr);
      const { collector, token } = res.data;
      saveSession({
        role: 'collector',
        userId: collector.id,
        name: collector.name,
        phone: collector.phone,
        preferred_language: collector.preferred_language,
        operating_location: collector.operating_location,
        token,
      });
      setLang(collector.preferred_language);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || t('login.loginFailed') || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container login-page">
      <div className="login-card card animate-scale-in">
        <div className="login-card__head">
          <div className="login-card__logo" aria-hidden="true"></div>
          <h1 className="section-title">{t('login.kabadiwala') || 'Collector Login'}</h1>
          <p className="section-subtitle">{t('login.subtitle') || 'Sign in to continue'}</p>
        </div>

        {error && (
          <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
            {error}
          </div>
        )}

        <section className="login-panel" aria-labelledby="coll-heading">
          <label className="form-label" htmlFor="login-phone">{t('login.phoneLabel') || 'Phone Number'}</label>
          <input
            id="login-phone"
            className="form-input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder={t('login.phonePlaceholder') || 'Enter 10-digit phone number'}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
          />

          <button
            className="btn btn-primary btn-full"
            onClick={handleLogin}
            disabled={busy}
            aria-busy={busy}
            style={{ marginTop: '1rem' }}
          >
            {busy ? <><LoadingSpinner size="sm" /> {t('login.signingIn') || 'Signing in'}…</> : <> {t('login.signIn') || 'Sign In'}</>}
          </button>

          <p className="login-hint">{t('login.phoneHint') || 'Enter the phone number registered with your account.'}</p>
          <p className="login-hint login-register-link">
            {t('login.noAccount') || 'Don\'t have an account?'}{' '}
            <Link to="/collector/register">{t('login.createAccount') || 'Create Account'}</Link>
          </p>
        </section>

        <div className="login-role-switch" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Not a collector? </span>
          <Link to="/login/recycler" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 600 }}>Login as Recycler</Link>
        </div>

        <p className="login-foot">
          <Link to="/">{t('landing.getStarted') || '← Back to Home'}</Link>
        </p>
      </div>
    </div>
  );
}