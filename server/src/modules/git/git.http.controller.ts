import type { Request, Response } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import { verifyPersonalAccessToken } from '../auth/pat.service.js';
import {
  authorizeRepositoryAccess,
  type RepositoryAccessType,
} from '../repositories/repository.authorization.service.js';

import { env } from '../../config/env.js';

const GIT_PROJECT_ROOT = path.resolve(process.cwd(), env.GIT_STORAGE_PATH);

const parseBasicAuth = (
  req: Request,
): {
  username: string;
  password: string;
} | null => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return null;
  }

  if (!authorization.startsWith('Basic ')) {
    return null;
  }

  const encodedCredentials = authorization.slice('Basic '.length);

  try {
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf8');

    const separatorIndex = decodedCredentials.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    const username = decodedCredentials.slice(0, separatorIndex);

    const password = decodedCredentials.slice(separatorIndex + 1);

    if (!username || !password) {
      return null;
    }

    return {
      username,
      password,
    };
  } catch {
    return null;
  }
};

const getGitRepository = async (username: string, repositoryName: string) => {
  const repository = await prisma.repository.findFirst({
    where: {
      name: repositoryName,
      owner: {
        username,
      },
    },
    select: {
      id: true,
      name: true,
      isPrivate: true,
      defaultBranch: true,
      owner: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  return repository;
};

const isGitWriteRequest = (req: Request): boolean => {
  const service = req.query.service;

  if (service === 'git-receive-pack') {
    return true;
  }

  if (req.path === '/git-receive-pack') {
    return true;
  }

  return false;
};

const authenticateGitRequest = async (
  req: Request,
): Promise<{
  userId: string;
  username: string;
}> => {
  const credentials = parseBasicAuth(req);

  if (!credentials) {
    throw new AppError(
      'Git username and personal access token are required',
      401,
      'GIT_AUTH_REQUIRED',
    );
  }

  return verifyPersonalAccessToken(credentials.username, credentials.password);
};

export const gitHttpController = async (req: Request, res: Response): Promise<void> => {
  const { username, repository } = req.params;

  if (typeof username !== 'string' || typeof repository !== 'string') {
    throw new AppError('Invalid Git repository path', 400, 'INVALID_GIT_REPOSITORY_PATH');
  }

  const gitRepository = await getGitRepository(username, repository);

  const repositoryOwner = gitRepository.owner.username;

  const repositoryName = gitRepository.name;

  const pathInfo = `/${repositoryOwner}/${repositoryName}.git${req.path}`;

  const writeRequest = isGitWriteRequest(req);

  const accessType: RepositoryAccessType = writeRequest ? 'WRITE' : 'READ';

  const authenticationRequired = gitRepository.isPrivate || writeRequest;

  console.log('[Git HTTP]', {
    method: req.method,
    path: req.path,
    username: repositoryOwner,
    repository: repositoryName,
    pathInfo,
    isPrivate: gitRepository.isPrivate,
    writeRequest,
    authenticationRequired,
  });

  try {
    if (authenticationRequired) {
      const authenticatedUser = await authenticateGitRequest(req);

      const access = await authorizeRepositoryAccess(
        gitRepository.id,
        accessType,
        authenticatedUser.userId,
      );

      console.log('[Git HTTP] Authenticated:', authenticatedUser.username);

      console.log('[Git HTTP] Access:', access.permission);
    } else {
      const access = await authorizeRepositoryAccess(gitRepository.id, accessType);

      console.log('[Git HTTP] Access:', access.permission);
    }
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 401) {
        res.setHeader('WWW-Authenticate', 'Basic realm="GitZone"');
      }

      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });

      return;
    }

    throw error;
  }

  const child = spawn('/usr/lib/git-core/git-http-backend', [], {
    env: {
      ...process.env,
      GIT_PROJECT_ROOT,
      GIT_HTTP_EXPORT_ALL: '1',
      PATH_INFO: pathInfo,
      REQUEST_METHOD: req.method,
      QUERY_STRING: req.originalUrl.split('?')[1] ?? '',
      CONTENT_TYPE: req.headers['content-type'] ?? '',
      CONTENT_LENGTH: req.headers['content-length'] ?? '',
      REMOTE_USER: repositoryOwner,
    },
  });

  let headersSent = false;
  let headerBuffer = Buffer.alloc(0);

  child.stdout.on('data', (chunk: Buffer) => {
    if (headersSent) {
      res.write(chunk);
      return;
    }

    headerBuffer = Buffer.concat([headerBuffer, chunk]);

    const headerEnd = headerBuffer.indexOf(Buffer.from('\r\n\r\n'));

    if (headerEnd === -1) {
      return;
    }

    const rawHeaders = headerBuffer.subarray(0, headerEnd).toString('utf8');

    const body = headerBuffer.subarray(headerEnd + 4);

    const headers = rawHeaders.split('\r\n');

    for (const header of headers) {
      const separatorIndex = header.indexOf(':');

      if (separatorIndex === -1) {
        continue;
      }

      const name = header.slice(0, separatorIndex).trim();

      const value = header.slice(separatorIndex + 1).trim();

      if (name.toLowerCase() === 'status') {
        const statusCode = Number.parseInt(value, 10);

        if (!Number.isNaN(statusCode)) {
          res.status(statusCode);
        }
      } else {
        res.setHeader(name, value);
      }
    }

    headersSent = true;

    if (body.length > 0) {
      res.write(body);
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    console.error('[git-http-backend]', chunk.toString());
  });

  child.on('error', (error) => {
    console.error('[git-http-backend] process error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Git HTTP backend error',
      });
    }
  });

  child.on('close', (code) => {
    if (!res.writableEnded) {
      if (code !== 0 && !res.headersSent) {
        res.status(500);
      }

      res.end();
    }
  });

  req.pipe(child.stdin);
};
