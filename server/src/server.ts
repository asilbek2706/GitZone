import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { registerProcessHandlers } from './server.lifecycle.js';

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
    },
    'Server started',
  );
});

registerProcessHandlers(server);
