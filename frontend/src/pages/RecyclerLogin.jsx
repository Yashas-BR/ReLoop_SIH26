/** Recycler Login / Onboarding — /login/recycler
 *
 * Two modes:
 *  1. Sign in  — existing authorized recycler enters their ID
 *  2. Apply    — new recycler submits an application (status = pending)
 *                Admin must approve before they can log in
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginRecycler, getAllRecyclers, onboardRecycler, MATERIAL_CATEGORIES } from '../api/client';
import { saveSession } from '../services/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './Login.css';

export default function RecyclerLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'apply'

  // ── Login state ──────────────────────────────────────────────────────────
  const [recyclers, setRecyclers] = useState([]);
  const [recyclerId, setRecyclerId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // ── Apply state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    facility_location: '',
    contact_details: '',
    materials_accepted: [],
    pickup_availability: 'on_request',
    service_area: '',
    authorization_details: '',
  });
  const [applyError, setApplyError] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [appliedId, setAppliedId] = useState(null);

  useEffect(() => {
    getAllRecyclers()
      .then((r) => setRecyclers((Array.isArray(r.data) ? r.data : []).filter((x) => x.authorization_status === 'authorized')))
      .catch(() => {});
  }, []);

  async function handleLogin() {
    const id = Number(recyclerId);
    if (!id) { setLoginError(t('login.recyclerIdRequired')); return; }
    setLoginError('');
    setLoginBusy(true);
    try {
      const res = await loginRecycler(id);
      const { recycler, token } = res.data;
      saveSession({
        role: 'recycler',
        userId: recycler.id,
        name: recycler.name,
        facility_location: recycler.facility_location,
        materials_accepted: recycler.materials_accepted,
        token,
      });
      navigate('/recycler', { replace: true });
    } catch (err) {
      setLoginError(err.message || t('login.loginFailed'));
    } finally {
      setLoginBusy(false);
    }
  }

  function toggleMaterial(id) {
    setForm(f => ({
      ...f,
      materials_accepted: f.materials_accepted.includes(id)
        ? f.materials_accepted.filter(m => m !== id)
        : [...f.materials_accepted, id],
    }));
  }

  async function handleApply() {
    if (!form.name.trim()) { setApplyError('Please enter your facility name.'); return; }
    if (!form.facility_location.trim()) { setApplyError('Please enter your facility location.'); return; }
    if (form.materials_accepted.length === 0) { setApplyError('Select at least one material category.'); return; }
    setApplyError('');
    setApplyBusy(true);
    try {
      const res = await onboardRecycler(form);
      setAppliedId(res.data?.id);
      setApplied(true);
    } catch (err) {
      setApplyError(err.message || 'Could not submit application. Please try again.');
    } finally {
      setApplyBusy(false);
    }
  }

  // ── Applied success screen ───────────────────────────────────────────────
  if (applied) {
    return (
      <div className="container login-page">
        <div className="login-card card animate-scale-in">
          <div className="login-card__head">
            <div style={{ fontSize: 48, textAlign: 'center' }}>✅</div>
            <h1 className="section-title" style={{ textAlign: 'center' }}>Application Submitted</h1>
            <p className="section-subtitle" style={{ textAlign: 'center' }}>
              Your recycler application has been received and is pending admin verification.
            </p>
          </div>
          <div className="card" style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', margin: 'var(--space-4) 0' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              <strong>Your Recycler ID:</strong>{' '}
              <span className="font-mono" style={{ fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                {appliedId ?? '—'}
              </span>
            </p>
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Save this ID. Once the admin approves your application, use it to sign in.
            </p>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            The admin will review your SPCB authorization details and approve or reject your application.
            You will be able to log in once approved.
          </p>
          <button className="btn btn-outline btn-full" onClick={() => { setApplied(false); setMode('login'); }}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container login-page">
      <div className="login-card card animate-scale-in">
        <div className="login-card__head login-card__head--recycler">
          <div className="login-card__logo login-card__logo--recycler" aria-hidden="true">♻️</div>
          <h1 className="section-title">
            {mode === 'login' ? (t('recyclerLogin.title') || 'Recycler Portal') : 'Apply as Recycler'}
          </h1>
          <p className="section-subtitle">
            {mode === 'login'
              ? (t('recyclerLogin.subtitle') || 'Sign in to manage incoming lots')
              : 'Submit your facility details for admin verification'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="filter-tabs" role="tablist" style={{ marginBottom: 'var(--space-4)' }}>
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={`filter-tab ${mode === 'login' ? 'filter-tab--active' : ''}`}
            onClick={() => { setMode('login'); setLoginError(''); }}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === 'apply'}
            className={`filter-tab ${mode === 'apply' ? 'filter-tab--active' : ''}`}
            onClick={() => { setMode('apply'); setApplyError(''); }}
          >
            Apply / Register
          </button>
        </div>

        {/* ── SIGN IN ──────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <section className="login-panel" aria-labelledby="rec-heading">
            {loginError && (
              <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
                {loginError}
              </div>
            )}

            <label className="form-label" htmlFor="login-recycler-id">
              {t('login.recyclerIdLabel') || 'Recycler ID'}
            </label>
            <input
              id="login-recycler-id"
              className="form-input"
              type="number"
              min="1"
              inputMode="numeric"
              placeholder={t('login.recyclerIdPlaceholder') || 'Enter your recycler ID'}
              value={recyclerId}
              onChange={(e) => setRecyclerId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            />
            <button
              className="btn btn-primary btn-full"
              onClick={handleLogin}
              disabled={loginBusy}
              aria-busy={loginBusy}
            >
              {loginBusy ? <><LoadingSpinner size="sm" /> Signing in…</> : (t('login.recyclerSignIn') || 'Sign in to Recycler Portal')}
            </button>

            {recyclers.length > 0 && (
              <div className="login-demo" role="group" aria-label={t('login.demoRecyclers') || 'Demo recyclers'}>
                <p className="login-demo__label">{t('login.demoRecyclers') || 'Demo verified recyclers:'}</p>
                {recyclers.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    className="demo-chip"
                    onClick={() => { setRecyclerId(String(r.id)); }}
                    disabled={loginBusy}
                  >
                    <span className="demo-chip__name">#{r.id} · {r.name}</span>
                    <span className="demo-chip__phone font-mono">{r.facility_location}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="login-hint">{t('login.recyclerHint2') || 'Only admin-verified recyclers can sign in.'}</p>
          </section>
        )}

        {/* ── APPLY / REGISTER ─────────────────────────────────────────── */}
        {mode === 'apply' && (
          <section className="login-panel" aria-labelledby="apply-heading">
            {applyError && (
              <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
                {applyError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="apply-name">Facility / Business Name *</label>
              <input
                id="apply-name"
                className="form-input"
                placeholder="e.g. GreenCycle Recyclers Pvt. Ltd."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apply-location">Facility Location *</label>
              <input
                id="apply-location"
                className="form-input"
                placeholder="e.g. Peenya Industrial Area, Bengaluru"
                value={form.facility_location}
                onChange={e => setForm(f => ({ ...f, facility_location: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apply-contact">Contact Number / Email</label>
              <input
                id="apply-contact"
                className="form-input"
                placeholder="+91 XXXXX XXXXX"
                value={form.contact_details}
                onChange={e => setForm(f => ({ ...f, contact_details: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Materials Accepted *</label>
              <div className="p2-subcat-pills" role="group" aria-label="Material categories">
                {MATERIAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`p2-subcat-pill ${form.materials_accepted.includes(cat.id) ? 'p2-subcat-pill--active' : ''}`}
                    onClick={() => toggleMaterial(cat.id)}
                    aria-pressed={form.materials_accepted.includes(cat.id)}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apply-pickup">Pickup Availability</label>
              <select
                id="apply-pickup"
                className="form-input form-select"
                value={form.pickup_availability}
                onChange={e => setForm(f => ({ ...f, pickup_availability: e.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="on_request">On Request</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apply-area">Service Area</label>
              <input
                id="apply-area"
                className="form-input"
                placeholder="e.g. Bengaluru North, 20 km radius"
                value={form.service_area}
                onChange={e => setForm(f => ({ ...f, service_area: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apply-auth">SPCB Authorization Details</label>
              <textarea
                id="apply-auth"
                className="form-input"
                rows={2}
                placeholder="Authorization number, issuing authority, validity date…"
                value={form.authorization_details}
                onChange={e => setForm(f => ({ ...f, authorization_details: e.target.value }))}
              />
              <p className="form-hint">Admin will verify this before approving your account.</p>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleApply}
              disabled={applyBusy}
              aria-busy={applyBusy}
            >
              {applyBusy ? <><LoadingSpinner size="sm" /> Submitting…</> : 'Submit Application'}
            </button>
          </section>
        )}

        <div className="login-role-switch">
          <span>Not a recycler?</span>
          <Link to="/login/collector">Login as Collector</Link>
        </div>
        <p className="login-foot">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
