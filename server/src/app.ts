import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import type { CorsOptions } from 'cors';

import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import { gitHttpController } from './modules/git/git.http.controller.js';
import { getHealth, getLiveness, getReadiness } from './modules/health/health.controller.js';
import repositoryRoutes from './modules/repositories/repository.routes.js';

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (origin === undefined || origin === env.CORS_ORIGIN) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
};
const app = express();

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(requestIdMiddleware);
app.use(helmet());

app.use(cors(corsOptions));

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
