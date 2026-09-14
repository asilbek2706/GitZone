import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import repositoryRoutes from './modules/repositories/repository.routes.js';

import { gitHttpController } from './modules/git/git.http.controller.js';

import { env } from './config/env.js';

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

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'GitHub Clone API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/repositories', repositoryRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
