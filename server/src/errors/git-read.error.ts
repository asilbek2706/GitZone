export type GitReadErrorCode =
  | 'GIT_READ_COMMAND_FAILED'
  | 'GIT_READ_TIMEOUT'
  | 'GIT_READ_OUTPUT_LIMIT_EXCEEDED'
  | 'GIT_EXECUTABLE_NOT_FOUND';

type GitReadErrorOptions = {
  exitCode?: number | null;
  stderr?: string;
  cause?: unknown;
};

export class GitReadError extends Error {
  public readonly code: GitReadErrorCode;
  public readonly exitCode: number | null;
  public readonly stderr: string;

  constructor(
    message: string,
    code: GitReadErrorCode,
    options: GitReadErrorOptions = {},
  ) {
    super(message, {
      cause: options.cause,
    });

    this.name = 'GitReadError';
    this.code = code;
    this.exitCode =
      options.exitCode ?? null;
    this.stderr =
      options.stderr ?? '';

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}
