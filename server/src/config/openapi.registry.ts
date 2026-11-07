import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

export const openApiRegistry = new OpenAPIRegistry();

openApiRegistry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your JWT access token.',
});

openApiRegistry.registerComponent('securitySchemes', 'GitBasicAuth', {
  type: 'http',
  scheme: 'basic',
  description: 'Git HTTP authentication. Use your GitZone username and Personal Access Token as the password. Never use your account password.',
});
openApiRegistry.registerComponent('securitySchemes', 'RefreshCookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'refreshToken',
  description: 'HTTP-only refresh token cookie. Set automatically by authentication endpoints.',
});

