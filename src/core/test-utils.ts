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
  public requests: HttpRequest[] = [];

  send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    if (this.requests.length > this.requestResponsePairs.length) {
      return Promise.reject(
        new Error(
          `MockHttpClient: Unexpected request #${this.requests.length}. Expected ${this.requestResponsePairs.length} requests total.`,
        ),
      );
    }
    const currentPair = this.requestResponsePairs[this.requests.length - 1];
    this.validateRequest(request, currentPair.expectedRequest);
    if (currentPair.mockedError) {
      return Promise.reject(currentPair.mockedError);
    }
    if (!currentPair.mockedResponse) {
      return Promise.reject(
        new Error(
          `MockHttpClient: Request #${this.requests.length} must have either mockedResponse or mockedError`,
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
    // Auto-reset for next test
    this.requests = [];
    this.requestResponsePairs = [...pairs]; // Copy to avoid external mutation
  }

  /**
   * Validates that all expected requests were made.
   * Call this at the end of your test.
   * Automatically resets the client for the next test.
   */
  verifyAllRequestsMade(): void {
    expect(`request count: ${this.requests.length}`).toBe(
      `request count: ${this.requestResponsePairs.length}`,
    );
    // Auto-reset for next test
    this.requests = [];
    this.requestResponsePairs = [];
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
 * Expected log entry for testing
 */
interface ExpectedLog {
  level: keyof Logger;
  message: string | RegExp;
}

/**
 * Mock logger that prevents console output during tests and validates log calls.
 * Log calls are validated in order and must match exactly.
 */
export class MockLogger implements Logger {
  private expectedLogs: ExpectedLog[] = [];
  public logs: Array<{ level: keyof Logger; message: string }> = [];

  debug(message: string): void {
    this.log('debug', message);
  }
  info(message: string): void {
    this.log('info', message);
  }
  warn(message: string): void {
    this.log('warn', message);
  }
  error(message: string): void {
    this.log('error', message);
  }

  /**
   * Set up expected log calls in order.
   * Each actual log call will be validated against the expected log in order.
   * Automatically resets any previous expectations.
   *
   * @param logs Array of expected logs. Each log must have:
   *             - level: The log level (debug, info, warn, error)
   *             - message: Either a string for exact match or RegExp for pattern matching
   */
  setExpectedLogs(logs: ExpectedLog[]): void {
    // Reset state when setting new expectations
    this.logs = [];
    this.expectedLogs = [...logs]; // Copy to avoid external mutation
  }

  verifyAllLogsLogged(): void {
    // Only validate if logs were explicitly expected
    if (this.expectedLogs.length > 0) {
      expect(`log count: ${this.logs.length}`).toBe(`log count: ${this.expectedLogs.length}`);
    }
    // Auto-reset for next test
    this.logs = [];
    this.expectedLogs = [];
  }

  private log(level: keyof Logger, message: string): void {
    // If no expected logs were set, allow any logging (silent mode)
    if (this.expectedLogs.length === 0) {
      return;
    }
    this.logs.push({ level, message });
    // Verify we haven't exceeded expected log count
    expect(this.logs.length).toBeLessThanOrEqual(this.expectedLogs.length);
    const expected = this.expectedLogs[this.logs.length - 1];
    expect(`log level: ${level}`).toBe(`log level: ${expected.level}`);
    // Verify message matches (string or RegExp)
    if (typeof expected.message === 'string') {
      expect(message).toBe(expected.message);
    } else {
      expect(message).toMatch(expected.message);
    }
  }
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
