import express from 'express';
import * as collectorsController from '../../controllers/collectors.controller.js';
import { validate } from '../../middlewares/validate.js';
import { loginCollectorSchema } from '../../validations/collectors.validation.js';

const router = express.Router();

// List collector accounts (login screen lists demo accounts)
router.get('/', collectorsController.getCollectors);

// Collector login — phone-number based for the demo
router.post('/login', validate(loginCollectorSchema), collectorsController.login);

export default router;