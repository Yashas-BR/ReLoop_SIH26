import { query } from '../db.js';

/**
 * Store a CV classification result + optional human correction.
 * Called immediately after the frontend runs the classifier (outcome = 'pending'),
 * then updated when the collector confirms or corrects (outcome = accepted/corrected/dismissed).
 */
export const recordAiFeedback = async ({
  lot_id,
  collector_id,
  ai_predicted_category,
  ai_confidence,
  ai_verdict,
  ai_candidates,
  ai_features,
  human_category,
  outcome,
}) => {
  const result = await query(
    `INSERT INTO ai_feedback
       (lot_id, collector_id, ai_predicted_category, ai_confidence, ai_verdict,
        ai_candidates, ai_features, human_category, outcome)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      lot_id ?? null,
      collector_id ?? null,
      ai_predicted_category,
      ai_confidence,
      ai_verdict,
      ai_candidates ? JSON.stringify(ai_candidates) : null,
      ai_features   ? JSON.stringify(ai_features)   : null,
      human_category ?? null,
      outcome ?? 'pending',
    ]
  );
  return result.rows[0];
};

/**
 * Update an existing feedback row when the collector makes their final choice.
 */
export const updateAiFeedback = async (id, { human_category, outcome }) => {
  const result = await query(
    `UPDATE ai_feedback
     SET human_category = $1, outcome = $2
     WHERE id = $3
     RETURNING id, outcome`,
    [human_category ?? null, outcome, id]
  );
  return result.rows[0];
};

/**
 * Summary stats for the admin / SIH dataset governance section.
 * Returns per-category accuracy (accepted / total) and total sample count.
 */
export const getAiFeedbackStats = async () => {
  const result = await query(
    `SELECT
       ai_predicted_category AS category,
       COUNT(*) FILTER (WHERE outcome != 'pending') AS total,
       COUNT(*) FILTER (WHERE outcome = 'accepted') AS accepted,
       COUNT(*) FILTER (WHERE outcome = 'corrected') AS corrected,
       COUNT(*) FILTER (WHERE outcome = 'dismissed') AS dismissed,
       ROUND(
         COUNT(*) FILTER (WHERE outcome = 'accepted')::numeric /
         NULLIF(COUNT(*) FILTER (WHERE outcome IN ('accepted','corrected')), 0) * 100,
         1
       ) AS accuracy_pct
     FROM ai_feedback
     GROUP BY ai_predicted_category
     ORDER BY total DESC`
  );
  return result.rows;
};
