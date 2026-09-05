import { query } from '../db.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * List all collector accounts (used by the login screen's "choose a demo account").
 * @returns {Promise<Object[]>}
 */
export const getCollectors = async () => {
  const result = await query(
    `SELECT id, name, phone, preferred_language, operating_location, created_at
     FROM collectors
     ORDER BY id`
  );
  return result.rows;
};

/**
 * Authenticate a collector by phone number.
 * A lightweight "login" for the SIH demo — identifies the account,
 * returns a mock token the frontend stores for the current session.
 * @param {string} phone
 * @returns {Promise<{collector: Object, token: string}>}
 */
export const loginCollector = async (phone) => {
  const result = await query(
    `SELECT id, name, phone, preferred_language, operating_location, created_at
     FROM collectors
     WHERE phone = $1`,
    [phone]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'No collector account found for this phone number');
  }

  const collector = result.rows[0];

  return {
    collector,
    // Mock token — real auth (JWT/OTP) is a later phase; this is enough to
    // drive a demo login session end-to-end.
    token: `mock-login-${collector.id}-${Date.now()}`,
  };
};