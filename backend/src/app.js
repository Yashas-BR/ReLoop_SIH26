import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import 'express-async-errors'; // catches async errors and passes them to next()
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import routes from './routes/v1/index.js';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// HTTP request logging
app.use(pinoHttp({ logger }));

// API Version 1 routes
app.use('/v1', routes);

// Handle unknown API routes
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// Global Error Handler
app.use(errorHandler);

export default app;
