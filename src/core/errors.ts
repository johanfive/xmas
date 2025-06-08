/**
 * Base class for all errors thrown by the xMatters API client.
 * Contains information about the failed request and response.
 */
export class XmApiError extends Error {
  /**
   * @param message Human-readable error message
   * @param response Optional response details if the error occurred after receiving a response
   * @param cause Optional underlying error that caused this error
   */
  constructor(
    message: string,
    public readonly response?: {
      /** The response body in its original format */
      body: unknown;
      /** The HTTP status code that triggered this error */
      status: number;
      /** Response headers that may contain additional error context */
      headers: Record<string, string>;
    },
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'XmApiError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, XmApiError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
