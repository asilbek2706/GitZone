import pino from 'pino';

import { env } from './env.js';

const getLogLevel = (): string => {
  if (env.NODE_ENV === 'test') {
    return 'silent';
  }

  if (env.NODE_ENV === 'production') {
    return 'info';
  }

  return 'debug';
};

export const logger = pino({
  level: getLogLevel(),

  base: {
    service: 'gitzone-server',
    environment: env.NODE_ENV,
  },

  timestamp: pino.stdTimeFunctions.isoTime,
});
