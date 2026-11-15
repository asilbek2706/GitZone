export type GitSshCommand =
  | {
      service: 'UPLOAD_PACK';
      namespace: string;
      repositoryName: string;
    }
  | {
      service: 'RECEIVE_PACK';
      namespace: string;
      repositoryName: string;
    };

const MAX_SSH_COMMAND_BYTES = 4096;

const GIT_SSH_COMMAND_PATTERN =
  /^(git-upload-pack|git-receive-pack) '\/?([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)'$/;

const isSafePathSegment = (value: string): boolean =>
  value.length > 0 && value !== '.' && value !== '..' && /^[a-zA-Z0-9._-]+$/.test(value);

export const parseGitSshCommand = (command: string): GitSshCommand | null => {
  if (
    typeof command !== 'string' ||
    command.length === 0 ||
    Buffer.byteLength(command, 'utf8') > MAX_SSH_COMMAND_BYTES ||
    command.includes('\0') ||
    command.includes('\r') ||
    command.includes('\n')
  ) {
    return null;
  }

  const match = GIT_SSH_COMMAND_PATTERN.exec(command);

  if (!match) {
    return null;
  }

  const [, executable, namespace, repositoryWithGitSuffix] = match;

  if (
    !executable ||
    !namespace ||
    !repositoryWithGitSuffix ||
    !repositoryWithGitSuffix.endsWith('.git')
  ) {
    return null;
  }

  const repositoryName = repositoryWithGitSuffix.slice(0, -4);

  if (!isSafePathSegment(namespace) || !isSafePathSegment(repositoryName)) {
    return null;
  }

  if (executable === 'git-upload-pack') {
    return {
      service: 'UPLOAD_PACK',
      namespace,
      repositoryName,
    };
  }

  if (executable === 'git-receive-pack') {
    return {
      service: 'RECEIVE_PACK',
      namespace,
      repositoryName,
    };
  }

  return null;
};
