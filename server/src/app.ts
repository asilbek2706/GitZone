import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import { gitHttpController } from './modules/git/git.http.controller.js';
import { getHealth, getLiveness, getReadiness } from './modules/health/health.controller.js';
import repositoryRoutes from './modules/repositories/repository.routes.js';

const app = express();

app.use(requestIdMiddleware);
app.use(helmet());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.use('/:username/:repository.git', gitHttpController);

app.use(express.json({ limit: env.BODY_LIMIT }));

app.use(
  express.urlencoded({
    extended: true,
    limit: env.BODY_LIMIT,
  }),
);

app.use(cookieParser());

app.get('/api/health', getHealth);
app.get('/api/health/live', getLiveness);
app.get('/api/health/ready', getReadiness);

app.use('/api/auth', authRoutes);
app.use('/api/repositories', repositoryRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
