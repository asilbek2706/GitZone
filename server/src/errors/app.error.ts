export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = 'APPLICATION_ERROR',
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
