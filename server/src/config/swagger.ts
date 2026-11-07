import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

import { openApiRegistry } from './openapi.registry.js';
import '../docs/health/health.docs.js';
import '../docs/auth/auth.docs.js';
import '../docs/users/profile.docs.js';

export { openApiRegistry };

export const getOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV31(openApiRegistry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',

    info: {
      title: 'GitZone API',
      version: '1.0.0',
      description: `
GitZone Backend API.

Repository hosting and collaboration platform.

Features:
- Authentication and authorization
- User profiles
- Repository management and Git operations
- Organizations and teams
- Issues and pull requests
- Notifications
- Two-factor authentication
      `,
    },

    servers: [
      {
        url: '/',
        description: 'Current server',
      },
    ],

    tags: [
      { name: 'Health', description: 'Health checks' },
      { name: 'Authentication', description: 'Authentication' },
      { name: 'Sessions', description: 'Session management' },
      { name: 'Tokens', description: 'Personal access tokens' },
      { name: 'Two-Factor Authentication', description: '2FA' },
      { name: 'Users', description: 'User profiles' },
      { name: 'Repositories', description: 'Repository management' },
      { name: 'Git', description: 'Git operations and transport' },
      { name: 'Issues', description: 'Issue management' },
      { name: 'Pull Requests', description: 'Pull request management' },
      { name: 'Labels', description: 'Label management' },
      { name: 'Milestones', description: 'Milestone management' },
      { name: 'Organizations', description: 'Organizations and teams' },
      { name: 'Notifications', description: 'Notifications' },
    ],
  });
};
