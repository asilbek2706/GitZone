import { handleStartupFailure, startServer } from './server.startup.js';

void startServer().catch(handleStartupFailure);
