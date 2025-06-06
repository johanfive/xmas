/**
 * Common parameter types for endpoint implementations.
 * These provide standardized parameter shapes that endpoints can use and compose.
 */

/**
 * Common pagination parameters used across many endpoints
 */
export interface PaginationParams {
  /**
   * The maximum number of records to return
   * @default 100
   */
  limit?: number;

  /**
   * The number of records to skip
   * Used for pagination in combination with limit
   * @default 0
   */
  offset?: number;
}

/**
 * Common search parameters used across many endpoints
 */
export interface SearchParams {
  /**
   * A string used to filter records by matching on names or other searchable fields
   * The search is typically case-insensitive and matches any part of the searchable fields
   */
  search?: string;
}

/**
 * Common sorting parameters used across many endpoints
 */
export interface SortParams {
  /**
   * Field to sort by
   */
  sortBy?: string;

  /**
   * Sort direction
   * @default 'ASC'
   */
  sortOrder?: 'ASC' | 'DESC';
}
