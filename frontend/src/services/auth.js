// Minimal session auth for the SIH demo.
// Stores the logged-in persona (collector or recycler) in localStorage so the
// whole app can use it after a login. A real JWT/OTP flow is a later phase —
// the backend returns a mock token which we keep for forward compatibility.

const SESSION_KEY = 'kabadiwala.session';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(role) {
  const s = getSession();
  return !!s && !!s.userId && (!role || s.role === role);
}

// Effective ids used by pages — falls back to the app-wide demo persona
// when no user has logged in (the portal remains usable for evaluation).
export function currentCollectorId() {
  const s = getSession();
  return s?.role === 'collector' && s.userId ? s.userId : null;
}

export function currentRecyclerId() {
  const s = getSession();
  return s?.role === 'recycler' && s.userId ? s.userId : null;
}