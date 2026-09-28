import { spawn } from 'node:child_process';
import path from 'node:path';

import type {
  Request,
  Response,
} from 'express';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const GIT_PROJECT_ROOT = path.resolve(
  process.cwd(),
  env.GIT_STORAGE_PATH,
);

const CGI_HEADER_SEPARATOR =
  Buffer.from('\r\n\r\n');

type ExecuteGitHttpBackendInput = {
  req: Request;
  res: Response;
  pathInfo: string;
  remoteUser: string | null;
  repositoryOwner: string;
  repositoryName: string;
};

const createGitBackendEnvironment = (
  req: Request,
  pathInfo: string,
  remoteUser: string | null,
): NodeJS.ProcessEnv => {
  /*
   * SECURITY:
   *
   * Never pass `...process.env` to git-http-backend.
   *
   * The parent process contains database credentials,
   * JWT secrets, encryption keys and potentially temporary
   * access tokens.
   *
   * git-http-backend receives only the variables it needs.
   */
  const childEnvironment: NodeJS.ProcessEnv = {
    PATH: '/usr/bin:/bin',
    LANG: 'C.UTF-8',

    /*
     * Prevent the server process/user's Git configuration
     * from influencing repository transport behavior.
     *
     * Repository-local config remains available.
     */
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',

    GIT_PROJECT_ROOT,
    GIT_HTTP_EXPORT_ALL: '1',

    PATH_INFO: pathInfo,
    REQUEST_METHOD: req.method,

    QUERY_STRING:
      req.originalUrl.split('?')[1] ?? '',

    CONTENT_TYPE:
      req.headers['content-type'] ?? '',

    CONTENT_LENGTH:
      req.headers['content-length'] ?? '',
  };

  if (remoteUser !== null) {
    childEnvironment.REMOTE_USER =
      remoteUser;
  }

  return childEnvironment;
};

const sendBackendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
): void => {
  if (res.writableEnded) {
    return;
  }

  if (res.headersSent) {
    res.end();
    return;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

export const executeGitHttpBackend = async ({
  req,
  res,
  pathInfo,
  remoteUser,
  repositoryOwner,
  repositoryName,
}: ExecuteGitHttpBackendInput): Promise<void> => {
  await new Promise<void>((resolve) => {
    const child = spawn(
      env.GIT_HTTP_BACKEND_PATH,
      [],
      {
        env: createGitBackendEnvironment(
          req,
          pathInfo,
          remoteUser,
        ),
      },
    );

    let completed = false;
    let headersSent = false;

    let headerBuffer =
      Buffer.alloc(0);

    const complete = (): void => {
      if (completed) {
        return;
      }

      completed = true;

      resolve();
    };

    const terminateChild = (): void => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    };

    child.stdout.on(
      'data',
      (chunk: Buffer) => {
        if (completed) {
          return;
        }

        if (headersSent) {
          res.write(chunk);
          return;
        }

        const combined =
          Buffer.concat([
            headerBuffer,
            chunk,
          ]);

        const headerEnd =
          combined.indexOf(
            CGI_HEADER_SEPARATOR,
          );

        if (headerEnd === -1) {
          if (
            combined.length >
            env.GIT_HTTP_MAX_HEADER_BYTES
          ) {
            logger.error(
              {
                repository:
                  repositoryName,

                username:
                  repositoryOwner,

                bufferedBytes:
                  combined.length,
              },
              'git-http-backend CGI headers exceeded limit',
            );

            terminateChild();

            sendBackendError(
              res,
              502,
              'GIT_HTTP_BACKEND_INVALID_RESPONSE',
              'Git HTTP backend returned invalid headers',
            );

            complete();

            return;
          }

          headerBuffer = combined;

          return;
        }

        if (
          headerEnd >
          env.GIT_HTTP_MAX_HEADER_BYTES
        ) {
          logger.error(
            {
              repository:
                repositoryName,

              username:
                repositoryOwner,

              headerBytes:
                headerEnd,
            },
            'git-http-backend CGI headers exceeded limit',
          );

          terminateChild();

          sendBackendError(
            res,
            502,
            'GIT_HTTP_BACKEND_INVALID_RESPONSE',
            'Git HTTP backend returned invalid headers',
          );

          complete();

          return;
        }

        const rawHeaders =
          combined
            .subarray(
              0,
              headerEnd,
            )
            .toString('utf8');

        const body =
          combined.subarray(
            headerEnd +
              CGI_HEADER_SEPARATOR.length,
          );

        for (
          const header of
          rawHeaders.split('\r\n')
        ) {
          const separatorIndex =
            header.indexOf(':');

          if (separatorIndex === -1) {
            continue;
          }

          const name =
            header
              .slice(
                0,
                separatorIndex,
              )
              .trim();

          const value =
            header
              .slice(
                separatorIndex + 1,
              )
              .trim();

          if (
            name.toLowerCase() ===
            'status'
          ) {
            const statusCode =
              Number.parseInt(
                value,
                10,
              );

            if (
              !Number.isNaN(
                statusCode,
              )
            ) {
              res.status(
                statusCode,
              );
            }

            continue;
          }

          res.setHeader(
            name,
            value,
          );
        }

        headersSent = true;

        headerBuffer =
          Buffer.alloc(0);

        if (body.length > 0) {
          res.write(body);
        }
      },
    );

    child.stderr.on(
      'data',
      (chunk: Buffer) => {
        logger.error(
          {
            stderr:
              chunk.toString(),

            repository:
              repositoryName,

            username:
              repositoryOwner,
          },
          'git-http-backend stderr output',
        );
      },
    );

    child.stdin.on(
      'error',
      (error) => {
        logger.debug(
          {
            err: error,

            repository:
              repositoryName,

            username:
              repositoryOwner,
          },
          'git-http-backend stdin closed',
        );
      },
    );

    child.on(
      'error',
      (error) => {
        logger.error(
          {
            err: error,

            repository:
              repositoryName,

            username:
              repositoryOwner,
          },
          'git-http-backend process error',
        );

        sendBackendError(
          res,
          500,
          'GIT_HTTP_BACKEND_ERROR',
          'Git HTTP backend error',
        );

        complete();
      },
    );

    child.on(
      'close',
      (code) => {
        if (completed) {
          return;
        }

        if (!headersSent) {
          if (code === 0) {
            sendBackendError(
              res,
              502,
              'GIT_HTTP_BACKEND_INVALID_RESPONSE',
              'Git HTTP backend returned an invalid response',
            );
          } else {
            sendBackendError(
              res,
              500,
              'GIT_HTTP_BACKEND_ERROR',
              'Git HTTP backend failed',
            );
          }

          complete();

          return;
        }

        if (!res.writableEnded) {
          res.end();
        }

        complete();
      },
    );

    req.on(
      'aborted',
      () => {
        logger.warn(
          {
            repository:
              repositoryName,

            username:
              repositoryOwner,
          },
          'Git HTTP client aborted request',
        );

        terminateChild();

        complete();
      },
    );

    req.pipe(child.stdin);
  });
};
