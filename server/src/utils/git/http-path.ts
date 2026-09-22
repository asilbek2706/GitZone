import { AppError } from '../../errors/app.error.js';
import { resolveGitRepositoryPath } from './repository-path.js';

const ALLOWED_GIT_HTTP_PATHS = new Set([
  '/info/refs',
  '/git-upload-pack',
  '/git-receive-pack',
]);

export const buildGitHttpPathInfo = (
  username: string,
  repositoryName: string,
  requestPath: string,
): string => {
  // Reuse the filesystem boundary validator so Git HTTP and repository
  // lifecycle operations share the same trusted repository identity rules.
  resolveGitRepositoryPath(username, repositoryName);

  if (!ALLOWED_GIT_HTTP_PATHS.has(requestPath)) {
    throw new AppError(
      'Invalid Git HTTP path',
      400,
      'INVALID_GIT_HTTP_PATH',
    );
  }

  return `/${username}/${repositoryName}.git${requestPath}`;
};
