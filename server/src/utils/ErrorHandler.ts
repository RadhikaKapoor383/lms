class ErrorHandler extends Error {
  statusCode: number;
  // Optional short code the website can act on (e.g. "SESSION_IDLE").
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorHandler;
