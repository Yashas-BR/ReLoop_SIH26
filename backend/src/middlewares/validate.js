import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || error.errors || [];
      const errorMessage = issues.map((details) => details.message).join(', ');
      return next(new ApiError(400, errorMessage));
    }
    next(error);
  }
};
