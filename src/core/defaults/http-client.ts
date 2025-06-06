import { HttpClient, HttpRequest, HttpResponse } from '../types.ts';

export class DefaultHttpClient implements HttpClient {
  async send(request: HttpRequest): Promise<HttpResponse> {
    // Handle body serialization based on content type
    let serializedBody: string | undefined;
    const contentType = request.headers?.['content-type'];
    if (request.body) {
      if (contentType?.includes('application/json')) {
        serializedBody = JSON.stringify(request.body);
      } else if (typeof request.body === 'string') {
        serializedBody = request.body;
      } else {
        // Default to JSON if no content type specified
        serializedBody = JSON.stringify(request.body);
      }
    }

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: serializedBody,
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body: unknown;
    const responseType = headers['content-type'];
    if (responseType?.includes('application/json')) {
      try {
        body = await response.json();
      } catch (_e) {
        // If JSON parsing fails, fall back to text
        body = await response.text();
      }
    } else {
      body = await response.text();
    }

    return {
      status: response.status,
      headers,
      body,
    };
  }
}
