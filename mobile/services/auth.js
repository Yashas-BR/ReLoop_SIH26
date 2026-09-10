import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'kabadiwala.session';

// Get stored session
export async function getSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Save session after login
export async function saveSession(session) {
  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify(session)
  );
}

// Clear session on logout
export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// Check whether user is logged in
export async function isLoggedIn(role) {
  const s = await getSession();

  return !!s && !!s.userId && (!role || s.role === role);
}

// Current collector id
export async function currentCollectorId() {
  const s = await getSession();

  return s?.role === 'collector' && s.userId
    ? s.userId
    : null;
}

// Current recycler id
export async function currentRecyclerId() {
  const s = await getSession();

  return s?.role === 'recycler' && s.userId
    ? s.userId
    : null;
}

const DEMO_RECYCLER_FALLBACK = 1;

export async function resolveRecyclerId() {
  return (await currentRecyclerId()) ?? DEMO_RECYCLER_FALLBACK;
}