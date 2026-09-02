import express from 'express';
import * as syncController from '../../controllers/sync.controller.js';
import { validate } from '../../middlewares/validate.js';
import { syncBatchSchema } from '../../validations/sync.validation.js';

const router = express.Router();

router.post(
  '/batch',
  validate(syncBatchSchema),
  syncController.syncBatch
);

export default router;
