import { spawn } from 'node:child_process';

import type { ServerChannel } from 'ssh2';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../errors/app.error.js';

import { authorizeOrganizationRepositoryAccess } from '../repositories/organization-repository-authorization.service.js';
import { authorizeRepositoryAccess } from '../repositories/repository-authorization.service.js';
import { assertRepositoryTransferAllowsGitWrite } from '../repositories/repository-transfer-write-guard.service.js';

import { assertGitRepositoryIdentity } from './git-repository-identity.service.js';
import { lookupGitRepository } from './git-repository-lookup.service.js';
import { withGitDistributedLock } from './git-distributed-lock.service.js';
import { withGitNamespaceReadLock } from './git-user-lock.service.js';

import { resolveOwnedGitRepositoryPath } from '../../utils/git/repository-path.js';
import { parseGitSshCommand } from '../../utils/git/ssh-command.js';

import type { AuthenticatedGitSshUser } from './git-ssh-authentication-handler.service.js';
import type { GitDistributedLockOwner } from './git-distributed-lock.service.js';

const GIT_CONFIG_GLOBAL_PATH = process.platform === 'win32' ? 'NUL' : '/dev/null';

type ExecuteGitSshCommandInput = {
  command: string;
  authenticatedUser: AuthenticatedGitSshUser;
  channel: ServerChannel;
};

type RepositoryAccess =
  | Awaited<ReturnType<typeof authorizeRepositoryAccess>>
  | Awaited<ReturnType<typeof authorizeOrganizationRepositoryAccess>>;

const repositoryNotFound = (): AppError =>
  new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');

const createGitSshEnvironment = (readOnly: boolean): NodeJS.ProcessEnv => ({
  PATH: env.GIT_CHILD_PATH,
  LANG: 'C',
  LC_ALL: 'C',

  /*
   * Git transport processes must not inherit application secrets,
   * database credentials, JWT secrets or host environment values.
   */
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: GIT_CONFIG_GLOBAL_PATH,
  GIT_TERMINAL_PROMPT: '0',

  ...(readOnly ? { GIT_OPTIONAL_LOCKS: '0' } : {}),
});

const getRepositoryLockOwner = (
  repository: Awaited<ReturnType<typeof lookupGitRepository>>,
): GitDistributedLockOwner => ({
  type: repository.owner.type,
  id: repository.owner.id,
});

const authorizeGitSshRepository = async (
  repository: Awaited<ReturnType<typeof lookupGitRepository>>,
  userId: string,
  accessType: 'READ' | 'WRITE',
): Promise<RepositoryAccess> => {
  const access =
    repository.owner.type === 'ORGANIZATION'
      ? await authorizeOrganizationRepositoryAccess(repository.id, accessType, userId)
      : await authorizeRepositoryAccess(repository.id, accessType, userId);

  if (access.repositoryId !== repository.id) {
    throw repositoryNotFound();
  }

  if (repository.owner.type === 'ORGANIZATION') {
    if (
      !('organizationId' in access) ||
      access.organizationId !== repository.owner.id ||
      access.organizationSlug !== repository.owner.name
    ) {
      throw repositoryNotFound();
    }
  } else if (
    !('repositoryOwnerId' in access) ||
    access.repositoryOwnerId !== repository.owner.id ||
    access.repositoryOwnerUsername !== repository.owner.name
  ) {
    throw repositoryNotFound();
  }

  return access;
};

const writeChannelFailure = (channel: ServerChannel, message: string): void => {
  if (channel.destroyed) {
    return;
  }

  channel.stderr.write(`fatal: ${message}\n`);
  channel.exit(1);
  channel.end();
};

const executeGitPackProcess = async ({
  service,
  repositoryPath,
  channel,
  signal,
}: {
  service: 'UPLOAD_PACK' | 'RECEIVE_PACK';
  repositoryPath: string;
  channel: ServerChannel;
  signal: AbortSignal;
}): Promise<void> => {
  await new Promise<void>((resolve) => {
    let clientDisconnected = channel.destroyed;
    let lockLost = signal.aborted;
    let processError: Error | null = null;

    const subcommand = service === 'UPLOAD_PACK' ? 'upload-pack' : 'receive-pack';

    const child = spawn(env.GIT_EXECUTABLE_PATH, [subcommand, repositoryPath], {
      env: createGitSshEnvironment(service === 'UPLOAD_PACK'),
      shell: false,
      windowsHide: true,
      stdio: 'pipe',
    });

    const terminateChild = (): void => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    };

    const handleClientDisconnect = (): void => {
      clientDisconnected = true;
      terminateChild();
    };

    const handleLockLoss = (): void => {
      lockLost = true;
      terminateChild();
    };

    const handleChannelError = (error: Error): void => {
      logger.warn(
        {
          err: error,
        },
        'Git SSH channel error',
      );

      handleClientDisconnect();
    };

    channel.once('close', handleClientDisconnect);
    channel.once('error', handleChannelError);

    if (signal.aborted) {
      handleLockLoss();
    } else {
      signal.addEventListener('abort', handleLockLoss, { once: true });
    }

    if (!child.stdin || !child.stdout || !child.stderr) {
      processError = new Error('Git child process streams could not be created');
      terminateChild();
    } else {
      /*
       * SSH client -> Git process stdin.
       * Git process stdout -> SSH client.
       * Git process stderr -> SSH extended-data stderr.
       *
       * No shell is involved. The executable and subcommand
       * are selected from a fixed allowlist.
       */
      channel.pipe(child.stdin);

      child.stdout.pipe(channel, { end: false });
      child.stderr.pipe(channel.stderr, { end: false });
    }

    child.once('error', (error) => {
      processError = error;

      logger.error(
        {
          err: error,
          service,
          repositoryPath,
        },
        'Git SSH child process failed to start',
      );
    });

    child.once('close', (code) => {
      channel.removeListener('close', handleClientDisconnect);
      channel.removeListener('error', handleChannelError);
      signal.removeEventListener('abort', handleLockLoss);

      if (!clientDisconnected && !channel.destroyed) {
        if (lockLost) {
          writeChannelFailure(channel, 'Git repository lock was lost; operation was interrupted');
        } else if (processError) {
          writeChannelFailure(channel, 'Git transport process failed');
        } else {
          channel.exit(code ?? 1);
          channel.end();
        }
      }

      resolve();
    });

    if (clientDisconnected) {
      terminateChild();
    }
  });
};

const getSafeFailureMessage = (error: unknown): string => {
  if (error instanceof AppError && error.code === 'GIT_REPOSITORY_TRANSFER_WRITE_BLOCKED') {
    return 'Git writes are temporarily blocked because repository transfer is in progress';
  }

  return 'Repository not found or you do not have permission to access it';
};

export const executeGitSshCommand = async ({
  command,
  authenticatedUser,
  channel,
}: ExecuteGitSshCommandInput): Promise<void> => {
  const parsedCommand = parseGitSshCommand(command);

  if (!parsedCommand) {
    writeChannelFailure(channel, 'Unsupported Git SSH command');
    return;
  }

  if (channel.destroyed) {
    return;
  }

  const accessType = parsedCommand.service === 'UPLOAD_PACK' ? 'READ' : 'WRITE';

  try {
    const initialRepository = await lookupGitRepository(
      parsedCommand.namespace,
      parsedCommand.repositoryName,
    );

    const lockOwner = getRepositoryLockOwner(initialRepository);

    await withGitNamespaceReadLock(lockOwner, async () => {
      await withGitDistributedLock(
        lockOwner,
        accessType === 'WRITE' ? 'write' : 'read',
        async ({ signal }) => {
          if (channel.destroyed) {
            return;
          }

          const repository = await lookupGitRepository(
            parsedCommand.namespace,
            parsedCommand.repositoryName,
          );

          assertGitRepositoryIdentity(initialRepository, repository);

          await authorizeGitSshRepository(repository, authenticatedUser.userId, accessType);

          if (accessType === 'WRITE') {
            await assertRepositoryTransferAllowsGitWrite(repository.id);
          }

          const repositoryPath = resolveOwnedGitRepositoryPath(
            repository.owner.type === 'USER'
              ? {
                  type: 'USER',
                  username: repository.owner.name,
                }
              : {
                  type: 'ORGANIZATION',
                  slug: repository.owner.name,
                },
            repository.name,
          );

          logger.info(
            {
              userId: authenticatedUser.userId,
              username: authenticatedUser.username,
              sshKeyId: authenticatedUser.sshKeyId,
              namespace: parsedCommand.namespace,
              repository: repository.name,
              service: parsedCommand.service,
              accessType,
              ownerType: repository.owner.type,
            },
            'Git SSH repository access authorized',
          );

          await executeGitPackProcess({
            service: parsedCommand.service,
            repositoryPath,
            channel,
            signal,
          });
        },
      );
    });
  } catch (error) {
    logger.warn(
      {
        err: error,
        userId: authenticatedUser.userId,
        namespace: parsedCommand.namespace,
        repository: parsedCommand.repositoryName,
        service: parsedCommand.service,
      },
      'Git SSH command rejected',
    );

    writeChannelFailure(channel, getSafeFailureMessage(error));
  }
};
