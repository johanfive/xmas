/**
 * Base class for all errors thrown by the xMatters API client.
 * Contains information about the failed request and response.
 */
export class XmApiError extends Error {
  /**
   * Creates an XmApiError instance.
   *
   * @param message Human-readable error message. If a response is provided,
   *                this will be overridden with a message extracted from the response body.
   * @param response Optional HTTP response details when the error occurred after receiving a response.
   *                 When provided, a more specific error message will be extracted from the response body.
   * @param cause Optional underlying error that caused this XmApiError.
   *              Use this when wrapping lower-level errors (network errors, JSON parsing errors, etc.)
   *              to preserve the original error information. Maintainers should use this when:
   *              - Wrapping network/connection errors from the HTTP client
   *              - Wrapping JSON parsing errors
   *              - Wrapping any other system-level errors that should be preserved for debugging
   *              The original error will be accessible via the 'cause' property for debugging purposes.
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
    } | null,
    public override readonly cause?: unknown,
  ) {
    // Use custom message if provided and meaningful, otherwise extract from response
    const finalMessage = (message && message.trim())
      ? message
      : (response ? XmApiError.extractErrorMessage(response) : message);
    super(finalMessage);
    this.name = 'XmApiError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, XmApiError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Extracts a meaningful error message from the HTTP response.
   * Prioritizes xMatters API's typical 'reason' and 'message' properties.
   */
  private static extractErrorMessage(response: {
    body: unknown;
    status: number;
  }): string {
    // Default fallback message
    const defaultMessage = `DEBUG: Request failed with status ${response.status}`;

    // If no response body, use default
    if (!response.body) {
      return defaultMessage;
    }

    // If response body is a string, use it directly if it's not empty
    if (typeof response.body === 'string') {
      const trimmed = response.body.trim();
      return trimmed || defaultMessage;
    }

    // If response body is not an object, use default
    if (typeof response.body !== 'object' || Array.isArray(response.body)) {
      return defaultMessage;
    }

    const body = response.body as Record<string, unknown>;

    // xMatters API typically uses 'reason' for error type and 'message' for details
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    // If we have both reason and message, combine them
    if (reason && message) {
      return `${reason}: ${message}`;
    }

    // If we only have one, use it
    if (reason) return reason;
    if (message) return message;

    // Fall back to default message
    return defaultMessage;
  }
}
