import express from 'express';
import * as adminController from '../../controllers/admin.controller.js';
import * as recyclerCrudController from '../../controllers/recyclerCrud.controller.js';
import { validate } from '../../middlewares/validate.js';
import { adminLoginSchema, verifyRecyclerSchema } from '../../validations/admin.validation.js';
import { listRecyclersSchema, getRecyclerSchema } from '../../validations/recyclerCrud.validation.js';

const router = express.Router();

// Admin login (mock passphrase for the demo)
router.post('/login', validate(adminLoginSchema), adminController.adminLogin);

// Dashboard summary counts + alerts
router.get('/summary', adminController.getSummary);

// Recycler verification queue
router.get('/recyclers', validate(listRecyclersSchema), recyclerCrudController.listRecyclers);

// Single recycler (for the verification detail popup)
router.get('/recyclers/:id', validate(getRecyclerSchema), recyclerCrudController.getRecycler);

// Approve / reject an authorization application
router.post(
  '/recyclers/:id/verify',
  validate(verifyRecyclerSchema),
  adminController.verifyRecycler
);

// Price-source registry (data provenance)
router.get('/price-sources', adminController.getPriceSources);

// Read-only operations register and immutable event audit trail.
router.get('/lots', adminController.getLotRegister);
router.get('/audit-events', adminController.getAuditEvents);

export default router;
