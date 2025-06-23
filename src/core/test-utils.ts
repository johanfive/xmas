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
import { FakeTime } from 'std/testing/time.ts';
import { expect } from 'std/expect/mod.ts';

/**
 * Request-response pair for testing
 * Set up expected requests and their mocked responses or errors.
 */
interface MockRequestResponse {
  expectedRequest: Partial<HttpRequest>;
  mockedResponse?: HttpResponse;
  /** If provided, the request will throw this error instead of returning a response */
  mockedError?: Error;
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
      return Promise.reject(
        new Error(
          `MockHttpClient: Unexpected request #${
            this.requestIndex + 1
          }. Expected ${this.requestResponsePairs.length} requests total.`,
        ),
      );
    }
    const currentPair = this.requestResponsePairs[this.requestIndex];
    this.validateRequest(request, currentPair.expectedRequest);
    this.requestIndex++;
    if (currentPair.mockedError) {
      return Promise.reject(currentPair.mockedError);
    }
    if (!currentPair.mockedResponse) {
      return Promise.reject(
        new Error(
          `MockHttpClient: Request #${this.requestIndex} must have either mockedResponse or mockedError`,
        ),
      );
    }
    return Promise.resolve(currentPair.mockedResponse);
  }

  /**
   * Set up expected requests and their mocked responses or errors.
   * Each actual request will be validated against the expected request in order.
   * Responses/errors are returned in the same order as the pairs are defined.
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
  ): void {
    expect(actualRequest.method).toBe(expectedRequest.method);
    expect(actualRequest.url).toBe(expectedRequest.url);
    expect(actualRequest.body).toBe(expectedRequest.body);
    expect(actualRequest.headers).toEqual(expectedRequest.headers);
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

/**
 * Utility function to simplify testing with FakeTime.
 * Automatically manages FakeTime setup and cleanup.
 *
 * @param testFn - The test function to run with FakeTime control
 * @returns A promise that resolves when the test completes
 */
export async function withFakeTime(testFn: (fakeTime: FakeTime) => Promise<void>): Promise<void> {
  const fakeTime = new FakeTime();
  try {
    await testFn(fakeTime);
  } finally {
    fakeTime.restore();
  }
}
