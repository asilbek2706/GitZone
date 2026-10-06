export type GitWriteErrorCode =
  | 'GIT_WRITE_COMMAND_FAILED'
  | 'GIT_WRITE_TIMEOUT'
  | 'GIT_WRITE_OUTPUT_LIMIT_EXCEEDED'
  | 'GIT_EXECUTABLE_NOT_FOUND';

type GitWriteErrorOptions = {
  exitCode?: number | null;
  stderr?: string;
  cause?: unknown;
};

export class GitWriteError extends Error {
  public readonly code: GitWriteErrorCode;
  public readonly exitCode: number | null;
  public readonly stderr: string;

  constructor(message: string, code: GitWriteErrorCode, options: GitWriteErrorOptions = {}) {
    super(message, {
      cause: options.cause,
    });

    this.name = 'GitWriteError';
    this.code = code;
    this.exitCode = options.exitCode ?? null;
    this.stderr = options.stderr ?? '';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
