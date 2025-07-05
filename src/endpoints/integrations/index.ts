import type { Headers } from 'types/http.ts';
import type { HttpResponse } from 'types/http.ts';
import type { RequestHandler } from '../../core/request-handler.ts';

/**
 * This class provides a method to trigger an inbound integration by sending a payload
 * to a specified URL.
 * The term "inbound" is relative to xMatters, meaning that these integrations
 * are designed to receive data from external systems into xMatters.
 */
export class IntegrationsEndpoint {
  constructor(
    private readonly http: RequestHandler,
  ) {}

  /**
   * Trigger an event by sending a POST request to an inbound integration URL,
   * which you can obtain from an inbound integration.
   * Inbound integration URLs use the following patterns:
   * POST /api/integration/1/functions/{id}/triggers
   * POST /api/integration/1/functions/{id}/triggers?apiKey={apiKey}
   *
   * @param url The URL of the integration trigger endpoint
   * @param payload The payload to send to the integration
   * @returns The HTTP response containing a paginated list of integrations
   * @throws {XmApiError} If the request fails
   */
  trigger(
    url: string,
    payload: unknown,
    options: { headers?: Headers } = {},
  ): Promise<HttpResponse<{ requestId: string }>> {
    return this.http.post<{ requestId: string }>({
      ...options,
      fullUrl: url,
      body: payload,
      skipAuth: true,
    });
  }
}
