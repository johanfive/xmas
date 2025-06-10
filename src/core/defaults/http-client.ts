import { HttpClient, HttpRequest, HttpResponse } from '../types/internal/http.ts';

export class DefaultHttpClient implements HttpClient {
  async send(request: HttpRequest): Promise<HttpResponse> {
    let serializedRequestBody: string | undefined;
    if (request.body !== undefined && request.body !== null) {
      serializedRequestBody = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);
    }

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: serializedRequestBody,
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let responseBody: unknown;
    const responseType = headers['content-type'];
    if (responseType?.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch (_e) {
        // If JSON parsing fails, fall back to text
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    return {
      status: response.status,
      headers,
      body: responseBody,
    };
  }
}
