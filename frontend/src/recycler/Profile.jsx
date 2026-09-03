import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecycler, updateRecycler, DEMO_RECYCLER_ID, MATERIAL_CATEGORIES } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './Profile.css';

export default function RecyclerProfile() {
  const { t } = useTranslation();
  const [recycler, setRecycler] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getRecycler(DEMO_RECYCLER_ID)
      .then(r => { setRecycler(r.data); setForm(r.data); })
      .catch(() => setError(t('recyclerDash.profileError')))
      .finally(() => setLoading(false));
  }, []);

  function handleField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleMaterial(matId) {
    const current = form.materials_accepted || [];
    const next = current.includes(matId)
      ? current.filter(m => m !== matId)
      : [...current, matId];
    handleField('materials_accepted', next);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name,
        facility_location: form.facility_location,
        materials_accepted: form.materials_accepted,
        service_area: form.service_area,
        contact: form.contact,
        offered_rate: form.offered_rate ? Number(form.offered_rate) : undefined,
        pickup_available: form.pickup_available,
      };
      const r = await updateRecycler(DEMO_RECYCLER_ID, payload);
      setRecycler(r.data);
      setForm(r.data);
      setSuccess(t('recyclerDash.profileUpdated'));
      setEditing(false);
    } catch (err) {
      setError(err.message || t('recyclerDash.profileUpdateFail'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(recycler);
    setEditing(false);
    setError('');
  }

  if (loading) return <div className="container"><PageLoader /></div>;

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler" className="back-link">{t('common.back')}</Link>
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden="true">🏭</div>
          <div>
            <h1 className="section-title">{recycler?.name || t('recyclerDash.myProfile')}</h1>
            <p className="section-subtitle">
              {recycler?.facility_location} · <StatusBadge status={recycler?.authorization_status} />
            </p>
          </div>
          {!editing && (
            <button className="btn btn-outline" onClick={() => setEditing(true)}>
              <span aria-hidden="true">✎</span> {t('recyclerDash.editProfile')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}
      {success && (
        <div className="alert-banner alert-banner--success animate-fade-in">
          <span aria-hidden="true">✓</span> {success}
        </div>
      )}

      {/* Profile Form / View */}
      <div className="profile-layout">
        {/* Basic Info */}
        <section className="card animate-scale-in" aria-labelledby="profile-info-heading">
          <h2 id="profile-info-heading" className="detail-section-title">{t('recyclerDash.basicInfo')}</h2>
          <div className="profile-form">
            <div className="form-group">
              <label className="form-label" htmlFor="p-name">{t('recyclerDash.facilityName')}</label>
              {editing ? (
                <input
                  id="p-name"
                  className="form-input"
                  value={form?.name || ''}
                  onChange={e => handleField('name', e.target.value)}
                />
              ) : (
                <p className="profile-value">{recycler?.name || '—'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-location">{t('recyclerDash.facilityLocation')}</label>
              {editing ? (
                <input
                  id="p-location"
                  className="form-input"
                  value={form?.facility_location || ''}
                  onChange={e => handleField('facility_location', e.target.value)}
                />
              ) : (
                <p className="profile-value">{recycler?.facility_location || '—'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-service">{t('recyclerDash.serviceArea')}</label>
              {editing ? (
                <input
                  id="p-service"
                  className="form-input"
                  value={form?.service_area || ''}
                  onChange={e => handleField('service_area', e.target.value)}
                />
              ) : (
                <p className="profile-value">{recycler?.service_area || '—'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-contact">{t('recyclerDash.contact')}</label>
              {editing ? (
                <input
                  id="p-contact"
                  className="form-input"
                  value={form?.contact || ''}
                  onChange={e => handleField('contact', e.target.value)}
                  placeholder="Phone / email"
                />
              ) : (
                <p className="profile-value">{recycler?.contact || '—'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-rate">{t('recyclerDash.offeredRate')}</label>
              {editing ? (
                <input
                  id="p-rate"
                  type="number"
                  className="form-input"
                  value={form?.offered_rate || ''}
                  onChange={e => handleField('offered_rate', e.target.value)}
                  min="0"
                  step="1"
                />
              ) : (
                <p className="profile-value">
                  {recycler?.offered_rate ? `₹${recycler.offered_rate}/kg` : '—'}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('recyclerDash.pickupAvailable')}</label>
              {editing ? (
                <div className="toggle-wrap">
                  <button
                    className={`toggle-btn ${form?.pickup_available ? 'toggle-btn--on' : ''}`}
                    onClick={() => handleField('pickup_available', !form?.pickup_available)}
                    aria-pressed={!!form?.pickup_available}
                    type="button"
                  >
                    <span className="toggle-thumb" />
                  </button>
                  <span>{form?.pickup_available ? t('recyclerDash.pickupYes') : t('recyclerDash.pickupNo')}</span>
                </div>
              ) : (
                <p className="profile-value">
                  {recycler?.pickup_available ? `✓ ${t('recyclerDash.pickupYes')}` : `✗ ${t('recyclerDash.pickupNo')}`}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Materials Accepted */}
        <section className="card animate-scale-in" aria-labelledby="profile-mats-heading">
          <h2 id="profile-mats-heading" className="detail-section-title">{t('createLot.category.heading')}</h2>

          {editing ? (
            <div className="materials-grid" role="group" aria-label="Select accepted materials">
              {MATERIAL_CATEGORIES.map(cat => {
                const selected = (form?.materials_accepted || []).includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    className={`material-toggle ${selected ? 'material-toggle--on' : ''}`}
                    onClick={() => toggleMaterial(cat.id)}
                    aria-pressed={selected}
                    type="button"
                  >
                    <span aria-hidden="true">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="materials-pills">
              {(recycler?.materials_accepted || []).length === 0 ? (
                <p className="text-muted">{t('common.noData')}</p>
              ) : (
                (recycler?.materials_accepted || []).map(m => {
                  const cat = MATERIAL_CATEGORIES.find(c => c.id === m);
                  return (
                    <span key={m} className="material-pill">
                      <span aria-hidden="true">{cat?.icon || '♻'}</span>
                      {cat?.label || m}
                    </span>
                  );
                })
              )}
            </div>
          )}

          {/* Authorization info (read-only) */}
          <div className="divider" style={{ margin: 'var(--space-5) 0' }} />
          <div className="auth-info">
            <div>
              <p className="detail-item__label">{t('status.confirmed').replace('Confirmed', 'Authorization Status')}</p>
              <StatusBadge status={recycler?.authorization_status} size="md" />
            </div>
            {recycler?.authorization_details && (
              <div>
                <p className="detail-item__label">Authorization Details</p>
                <p className="profile-value">{recycler.authorization_details}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Save / Cancel */}
      {editing && (
        <div className="profile-actions animate-fade-in">
          <button className="btn btn-outline" onClick={handleCancel} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-accent btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : null}
            {saving ? `${t('recyclerDash.profileUpdated').replace('!', '...').replace('updated successfully', 'Saving')}` : `💾 ${t('common.save') || 'Save Changes'}`}
          </button>
        </div>
      )}
    </div>
  );
}
