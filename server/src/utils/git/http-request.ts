import { AppError } from '../../errors/app.error.js';

export type GitHttpAccessType =
  | 'READ'
  | 'WRITE';

export type GitHttpService =
  | 'git-upload-pack'
  | 'git-receive-pack';

export type GitHttpRequestInfo = {
  accessType: GitHttpAccessType;
  service: GitHttpService;
};

const invalidMethod = (): never => {
  throw new AppError(
    'Invalid Git HTTP method',
    405,
    'INVALID_GIT_HTTP_METHOD',
  );
};

const invalidService = (): never => {
  throw new AppError(
    'Invalid Git HTTP service',
    400,
    'INVALID_GIT_HTTP_SERVICE',
  );
};

const invalidPath = (): never => {
  throw new AppError(
    'Invalid Git HTTP path',
    400,
    'INVALID_GIT_HTTP_PATH',
  );
};

export const classifyGitHttpRequest = (
  method: string,
  requestPath: string,
  serviceQuery: unknown,
): GitHttpRequestInfo => {
  const normalizedMethod =
    method.toUpperCase();

  if (requestPath === '/info/refs') {
    if (normalizedMethod !== 'GET') {
      return invalidMethod();
    }

    if (
      serviceQuery !== 'git-upload-pack' &&
      serviceQuery !== 'git-receive-pack'
    ) {
      return invalidService();
    }

    return {
      service: serviceQuery,
      accessType:
        serviceQuery === 'git-receive-pack'
          ? 'WRITE'
          : 'READ',
    };
  }

  if (requestPath === '/git-upload-pack') {
    if (normalizedMethod !== 'POST') {
      return invalidMethod();
    }

    if (serviceQuery !== undefined) {
      return invalidService();
    }

    return {
      service: 'git-upload-pack',
      accessType: 'READ',
    };
  }

  if (requestPath === '/git-receive-pack') {
    if (normalizedMethod !== 'POST') {
      return invalidMethod();
    }

    if (serviceQuery !== undefined) {
      return invalidService();
    }

    return {
      service: 'git-receive-pack',
      accessType: 'WRITE',
    };
  }

  return invalidPath();
};
