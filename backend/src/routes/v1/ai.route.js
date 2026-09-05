import express from 'express';
import { recordAiFeedback, updateAiFeedback, getAiFeedbackStats } from '../../services/ai.service.js';

const router = express.Router();

// POST /v1/ai/feedback — record a new CV prediction (called right after classification)
router.post('/feedback', async (req, res, next) => {
  try {
    const row = await recordAiFeedback(req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/ai/feedback/:id — update with human outcome (accepted / corrected / dismissed)
router.patch('/feedback/:id', async (req, res, next) => {
  try {
    const row = await updateAiFeedback(Number(req.params.id), req.body);
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

// GET /v1/ai/stats — per-category accuracy summary (for admin / SIH dataset governance)
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getAiFeedbackStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

export default router;
