/**
 * @fileoverview Minimal test utilities for xMatters API library
 *
 * This module provides the bare essentials for testing:
 * - Mock HTTP client that prevents network calls and tracks requests
 * - Mock logger using Deno's stub functionality
 *
 * Testing Philosophy:
 * - Keep it SIMPLE and RELIABLE
 * - No HTTP requests should go over the wire during tests
 * - Mock only at the HTTP client boundary
 * - Test authors specify exact request-response pairs for predictability
 */

import type { HttpClient, HttpRequest, HttpResponse } from './types/internal/http.ts';
import type { Logger } from './types/internal/config.ts';
import { stub } from 'std/testing/mock.ts';

/**
 * Request-response pair for testing
 * Set up expected requests and their mocked responses.
 */
interface MockRequestResponse {
  expectedRequest: Partial<HttpRequest>;
  mockedResponse: HttpResponse;
}

/**
 * Mock HTTP client that prevents network calls during tests.
 * Responses are consumed in FIFO order and validated against expected requests.
 */
export class MockHttpClient implements HttpClient {
  private requestResponsePairs: MockRequestResponse[] = [];
  private requestIndex = 0;
  public requests: HttpRequest[] = [];

  send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    if (this.requestIndex >= this.requestResponsePairs.length) {
      throw new Error(
        `MockHttpClient: Unexpected request #${
          this.requestIndex + 1
        }. Expected ${this.requestResponsePairs.length} requests total.`,
      );
    }
    const currentPair = this.requestResponsePairs[this.requestIndex];
    this.validateRequest(request, currentPair.expectedRequest, this.requestIndex);
    const response = currentPair.mockedResponse;
    this.requestIndex++;
    return Promise.resolve(response);
  }

  /**
   * Set up expected requests and their mocked responses.
   * Each actual request will be validated against the expected request in order.
   * Responses are returned in the same order as the pairs are defined.
   */
  setReqRes(pairs: MockRequestResponse[]): void {
    this.requestResponsePairs = [...pairs]; // Copy to avoid external mutation
    this.requestIndex = 0;
  }

  /**
   * Validates that all expected requests were made.
   * Call this at the end of your test.
   * Automatically resets the client for the next test.
   */
  verifyAllRequestsMade(): void {
    if (this.requestIndex < this.requestResponsePairs.length) {
      throw new Error(
        `MockHttpClient: Expected ${this.requestResponsePairs.length} requests, but only ${this.requestIndex} were made.`,
      );
    }
    // Auto-reset for next test
    this.requests = [];
    this.requestResponsePairs = [];
    this.requestIndex = 0;
  }

  private validateRequest(
    actualRequest: HttpRequest,
    expectedRequest: Partial<HttpRequest>,
    requestNumber: number,
  ): void {
    const validationErrors: string[] = [];
    if (expectedRequest.method && actualRequest.method !== expectedRequest.method) {
      validationErrors.push(
        `method: expected "${expectedRequest.method}", got "${actualRequest.method}"`,
      );
    }
    if (expectedRequest.url && actualRequest.url !== expectedRequest.url) {
      validationErrors.push(`url: expected "${expectedRequest.url}", got "${actualRequest.url}"`);
    }
    if (expectedRequest.body !== undefined) {
      const actualBodyJson = JSON.stringify(actualRequest.body);
      const expectedBodyJson = JSON.stringify(expectedRequest.body);
      if (actualBodyJson !== expectedBodyJson) {
        validationErrors.push(`body: expected ${expectedBodyJson}, got ${actualBodyJson}`);
      }
    }
    if (expectedRequest.headers) {
      for (const [headerName, expectedValue] of Object.entries(expectedRequest.headers)) {
        const actualValue = actualRequest.headers?.[headerName];
        if (actualValue !== expectedValue) {
          validationErrors.push(
            `header "${headerName}": expected "${expectedValue}", got "${
              actualValue || 'undefined'
            }"`,
          );
        }
      }
    }
    if (validationErrors.length > 0) {
      throw new Error(
        `MockHttpClient: Request #${requestNumber + 1} validation failed:\n  ${
          validationErrors.join('\n  ')
        }`,
      );
    }
  }
}

/**
 * Creates a silent mock logger with pre-configured stubs for call verification.
 * Returns both the logger and the stubs for easy access.
 */
export function createMockLogger() {
  const noop = () => {};
  const mockLogger: Logger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  };
  return {
    mockLogger,
    debugSpy: stub(mockLogger, 'debug', noop),
    infoSpy: stub(mockLogger, 'info', noop),
    warnSpy: stub(mockLogger, 'warn', noop),
    errorSpy: stub(mockLogger, 'error', noop),
  };
}
