import { query } from '../db.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Create a new recycler profile.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const createRecycler = async (data) => {
  const {
    name, facility_location, latitude, longitude,
    materials_accepted, authorization_status, authorization_details,
    authorization_number, verification_source,
    contact_details, pickup_availability, service_area,
  } = data;

  const result = await query(
    `INSERT INTO recyclers 
       (name, facility_location, latitude, longitude, materials_accepted,
        authorization_status, authorization_details, authorization_number, verification_source,
        contact_details, pickup_availability, service_area)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      name, facility_location ?? null, latitude ?? null, longitude ?? null,
      JSON.stringify(materials_accepted), authorization_status,
      authorization_details ?? null, authorization_number ?? null, verification_source ?? null,
      contact_details ?? null, pickup_availability ?? null, service_area ?? null,
    ]
  );

  return result.rows[0];
};

/**
 * Recycler self-onboarding — records an application in 'pending' state that
 * an admin must verify before the recycler appears as authorized.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const onboardRecycler = async (data) => {
  return createRecycler({
    ...data,
    authorization_status: 'pending',
  });
};

/**
 * Sign in a recycler by ID (demo auth).
 * Only authorized recyclers may use the portal; pending/unauthorized are blocked.
 * @param {number} id
 * @returns {Promise<{recycler: Object, token: string}>}
 */
export const loginRecycler = async (id) => {
  const recycler = await getRecyclerById(id);

  if (recycler.authorization_status === 'pending') {
    throw new ApiError(403, 'Recycler profile is pending admin verification');
  }
  if (recycler.authorization_status !== 'authorized') {
    throw new ApiError(403, 'Recycler is not authorized to use the portal');
  }

  return {
    recycler: {
      id: recycler.id,
      name: recycler.name,
      facility_location: recycler.facility_location,
      materials_accepted: recycler.materials_accepted,
      pickup_availability: recycler.pickup_availability,
      authorization_status: recycler.authorization_status,
    },
    token: `mock-recycler-login-${recycler.id}-${Date.now()}`,
  };
};

/**
 * Get a recycler by ID.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export const getRecyclerById = async (id) => {
  const result = await query(
    'SELECT * FROM recyclers WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Recycler not found');
  }

  return result.rows[0];
};

/**
 * List recyclers with optional filters and pagination.
 * @param {Object} filters
 * @returns {Promise<Object>}
 */
export const listRecyclers = async ({ authorization_status, material, page = 1, limit = 20 }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (authorization_status) {
    conditions.push(`authorization_status = $${paramIndex++}`);
    params.push(authorization_status);
  }

  if (material) {
    conditions.push(`materials_accepted ? $${paramIndex++}`);
    params.push(material);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) FROM recyclers ${whereClause}`,
    params
  );

  const dataResult = await query(
    `SELECT * FROM recyclers ${whereClause}
     ORDER BY id ASC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    recyclers: dataResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count, 10),
      pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

/**
 * Update a recycler profile.
 * @param {number} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export const updateRecycler = async (id, updates) => {
  const existing = await getRecyclerById(id);

  const fields = [];
  const values = [];
  let paramIndex = 1;

  const columnMap = {
    name: 'name',
    facility_location: 'facility_location',
    latitude: 'latitude',
    longitude: 'longitude',
    materials_accepted: 'materials_accepted',
    authorization_status: 'authorization_status',
    authorization_details: 'authorization_details',
    contact_details: 'contact_details',
    pickup_availability: 'pickup_availability',
    service_area: 'service_area',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && columnMap[key]) {
      fields.push(`${columnMap[key]} = $${paramIndex++}`);
      if (key === 'materials_accepted') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (fields.length === 0) {
    return existing;
  }

  values.push(id);
  const result = await query(
    `UPDATE recyclers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
};

/**
 * Delete a recycler by ID.
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteRecycler = async (id) => {
  const result = await query(
    'DELETE FROM recyclers WHERE id = $1',
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, 'Recycler not found');
  }
};
