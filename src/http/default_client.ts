import type { HttpClient, HttpRequestParams } from "../types.ts";
import { XmasApiError } from "../errors.ts";

export function createDefaultHttpClient(): HttpClient {
  return {
    sendRequest: async (params: HttpRequestParams) => {
      const { method, url, headers, data } = params;
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new XmasApiError(
          `Request failed with status ${response.status}`,
          response.status,
          responseData
        );
      }
      return responseData;
    },
    successAdapter: (response: unknown) => response,
    failureAdapter: (error: unknown) => {
      if (error instanceof XmasApiError) {
        throw error;
      }
      throw new XmasApiError("Request failed", 500, error);
    },
  };
}
