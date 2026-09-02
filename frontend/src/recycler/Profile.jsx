import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecycler, updateRecycler, DEMO_RECYCLER_ID, MATERIAL_CATEGORIES } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import './Profile.css';

export default function RecyclerProfile() {
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
      .catch(() => setError('Could not load profile. Is the backend running?'))
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
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
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
        <Link to="/recycler" className="back-link">← Back to Dashboard</Link>
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden="true">🏭</div>
          <div>
            <h1 className="section-title">{recycler?.name || 'My Profile'}</h1>
            <p className="section-subtitle">
              {recycler?.facility_location} · <StatusBadge status={recycler?.authorization_status} />
            </p>
          </div>
          {!editing && (
            <button className="btn btn-outline" onClick={() => setEditing(true)}>
              <span aria-hidden="true">✎</span> Edit Profile
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
          <h2 id="profile-info-heading" className="detail-section-title">Basic Information</h2>
          <div className="profile-form">
            <div className="form-group">
              <label className="form-label" htmlFor="p-name">Facility Name</label>
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
              <label className="form-label" htmlFor="p-location">Facility Location</label>
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
              <label className="form-label" htmlFor="p-service">Service Area</label>
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
              <label className="form-label" htmlFor="p-contact">Contact</label>
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
              <label className="form-label" htmlFor="p-rate">Offered Rate (₹/kg)</label>
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
              <label className="form-label">Pickup Available</label>
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
                  <span>{form?.pickup_available ? 'Yes, I offer pickup' : 'No pickup'}</span>
                </div>
              ) : (
                <p className="profile-value">
                  {recycler?.pickup_available ? '✓ Yes, pickup available' : '✗ No pickup'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Materials Accepted */}
        <section className="card animate-scale-in" aria-labelledby="profile-mats-heading">
          <h2 id="profile-mats-heading" className="detail-section-title">Materials Accepted</h2>

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
                <p className="text-muted">No materials listed.</p>
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
              <p className="detail-item__label">Authorization Status</p>
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
            Cancel
          </button>
          <button className="btn btn-accent btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : null}
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
