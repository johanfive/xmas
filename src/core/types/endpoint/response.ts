/**
 * Response wrapper types for endpoint implementations.
 * These provide standardized response shapes that endpoints can use.
 */

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
