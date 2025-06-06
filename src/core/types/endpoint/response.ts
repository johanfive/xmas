/**
 * Response wrapper types for endpoint implementations.
 * These provide standardized response shapes that endpoints can use.
 */

import type { HttpResponse } from '../internal/http.ts';

/**
 * Common response wrapper for paginated lists
 */
export interface PaginatedResponse<T> {
  /** Number of items in this response */
  count: number;
  /** Total number of items available */
  total: number;
  /** The items for this page */
  data: T[];
  /** HAL links for navigation */
  links?: {
    /** URL to current page */
    self: string;
    /** URL to next page, if available */
    next?: string;
    /** URL to previous page, if available */
    prev?: string;
  };
}

/**
 * Type alias for HTTP responses containing paginated data.
 * Use this for endpoint methods that return paginated lists.
 *
 * @template T The type of items in the paginated response
 *
 * @example
 * ```typescript
 * // Instead of: Promise<PaginatedResponse<Group>>
 * // Use: Promise<PaginatedHttpResponse<Group>>
 * getGroups(): Promise<PaginatedHttpResponse<Group>> {
 *   return this.http.get<PaginatedResponse<Group>>({ path: '/groups' });
 * }
 * ```
 */
export type PaginatedHttpResponse<T> = HttpResponse<PaginatedResponse<T>>;

// Note: For single resource responses, use HttpResponse<T> directly
// Example: Promise<HttpResponse<Group>> instead of creating an unnecessary alias

/**
 * Type alias for HTTP responses that don't return a body (like delete operations).
 * Use this for endpoint methods that perform actions without returning data.
 *
 * @example
 * ```typescript
 * // Instead of: Promise<void>
 * // Use: Promise<EmptyHttpResponse>
 * delete(id: string): Promise<EmptyHttpResponse> {
 *   return this.http.delete<void>({ path: `/${id}` });
 * }
 * ```
 */
export type EmptyHttpResponse = HttpResponse<void>;
